// Shared HMAC-SHA256 token helpers for the reward gate.
// Token shape: "<voter>.<expiryMs>.<hexsig>", signed with REWARD_SECRET.
const enc = new TextEncoder();

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function sign(msg, secret) {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function verify(msg, hex, secret) {
  const expect = await sign(msg, secret);
  if (typeof hex !== "string" || hex.length !== expect.length) return false;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ hex.charCodeAt(i);
  return diff === 0;
}

// Preview deploys may not have the secret configured yet; the fallback keeps
// the flow testable there. Production MUST set the REWARD_SECRET Pages secret.
export function secretOf(env) {
  return env.REWARD_SECRET || "dev-only-preview-secret";
}
