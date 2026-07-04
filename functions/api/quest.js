// /api/quest — server-side exploration sessions backing the photo reward.
// The client fire-and-forgets progress events; the server records first-seen
// timestamps per visitor and only mints a short-lived token when the recorded
// sequence looks humanly paced. Every failure path returns 204 (silent drop),
// so abusers get no signal and visitors never depend on it.
//
// Threat model: this blocks URL-guessing, repo-scraping, and naive curl.
// A scripted browser that replays plausible events over 45+ seconds still
// wins — the right bar for a photo easter egg, not a state secret.
import { sign, secretOf } from "../_lib/hmac.js";

const OK = () => new Response(null, { status: 204 });
const V_RE = /^[a-z0-9]{8,40}$/;
const ID_RE = /^[a-z0-9-]{1,40}$/;
const SESSION_TTL = 604800; // 7 days
const MIN_SESSION_MS = 45000; // dwell rules make a real run far longer
const MIN_GAP_MS = 900; // client dwell is 1500ms; sub-second spacing is a replay
const TOKEN_TTL_MS = 600000;

async function rateLimited(env, request) {
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const hour = new Date().toISOString().slice(0, 13);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("q" + ip + hour));
  const key = "rl:" + [...new Uint8Array(digest)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
  const count = ((await env.RATINGS.get(key)) | 0) + 1;
  if (count > 120) return true;
  await env.RATINGS.put(key, String(count), { expirationTtl: 3600 });
  return false;
}

// The quest total is derived from the deployed content itself, so the server
// and the Minimal page always agree on how many things "everything" is.
async function requiredCount(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL("/data/content.json", request.url));
    const c = await res.json();
    const items = (c.items || []).filter((it) => it.themeExclude !== "minimal");
    return items.length + (c.patent && c.patent.title ? 1 : 0);
  } catch (e) {
    return 9999; // fail closed: no content, no tokens
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if ((request.headers.get("content-length") | 0) > 1024) return OK();
    const b = await request.json();
    const voter = String(b.v || "");
    if (!V_RE.test(voter)) return OK();
    if (await rateLimited(env, request)) return OK();
    const kvKey = "qs:" + voter;
    const now = Date.now();

    if (b.e === "start") {
      const cur = await env.RATINGS.get(kvKey, { type: "json" });
      if (!cur) await env.RATINGS.put(kvKey, JSON.stringify({ t0: now, items: {} }), { expirationTtl: SESSION_TTL });
      return OK();
    }

    if (b.e === "item") {
      const id = String(b.id || "");
      if (!ID_RE.test(id)) return OK();
      const cur = await env.RATINGS.get(kvKey, { type: "json" });
      if (!cur || cur.items[id]) return OK(); // first-seen only; replays can't rewrite history
      cur.items[id] = now;
      await env.RATINGS.put(kvKey, JSON.stringify(cur), { expirationTtl: SESSION_TTL });
      return OK();
    }

    if (b.e === "claim") {
      const cur = await env.RATINGS.get(kvKey, { type: "json" });
      if (!cur) return OK();
      const need = await requiredCount(env, request);
      const stamps = Object.values(cur.items).sort((a, z) => a - z);
      if (stamps.length < need) return OK();
      if (now - cur.t0 < MIN_SESSION_MS) return OK();
      if (stamps[0] - cur.t0 < MIN_GAP_MS) return OK();
      for (let i = 1; i < stamps.length; i++) {
        if (stamps[i] - stamps[i - 1] < MIN_GAP_MS) return OK();
      }
      const exp = now + TOKEN_TTL_MS;
      const msg = voter + "." + exp;
      const t = msg + "." + (await sign(msg, secretOf(env)));
      return new Response(JSON.stringify({ t }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
  } catch (e) {
    // A lost event beats surfacing an error.
  }
  return OK();
}
