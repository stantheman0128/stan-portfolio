// POST /api/rating — anonymous quest-completion ratings.
// Design: docs/superpowers/specs/2026-07-05-sprite-quest-design.md
// Every failure path returns 204 (silent drop): the visitor experience never
// depends on this endpoint, and abusers get no signal.
// GET /api/rating?key=<EXPORT_KEY> — owner-only export (wrong key → 404).

const OK = () => new Response(null, { status: 204 });

export async function onRequestPost({ request, env }) {
  try {
    if ((request.headers.get("content-length") | 0) > 1024) return OK();
    const b = await request.json();

    // Guards: honeypot, rating shape, minimum quest time (server-side).
    if (b.hp) return OK();
    const r = b.r | 0;
    if (r < 1 || r > 5) return OK();
    if ((b.ms | 0) < 3000) return OK();

    // Rate limit per hashed IP: 20/hour. The hash is only ever a counter key;
    // no IP (raw or hashed) is stored in the rating record itself.
    const ip = request.headers.get("cf-connecting-ip") || "0";
    const hour = new Date().toISOString().slice(0, 13);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + hour));
    const rlKey = "rl:" + [...new Uint8Array(digest)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
    const count = ((await env.RATINGS.get(rlKey)) | 0) + 1;
    if (count > 20) return OK();
    await env.RATINGS.put(rlKey, String(count), { expirationTtl: 3600 });

    const rec = {
      r,
      c: String(b.c || "").slice(0, 280),
      t: String(b.t || "").slice(0, 24),
      p: String(b.p || "").slice(0, 64),
      ms: Math.min(b.ms | 0, 86_400_000),
      ts: Math.floor(Date.now() / 1000),
    };
    const key = "rating:" + new Date().toISOString() + ":" + Math.random().toString(36).slice(2, 8);
    await env.RATINGS.put(key, JSON.stringify(rec));
  } catch (e) {
    // Losing a rating beats surfacing an error.
  }
  return OK();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!env.EXPORT_KEY || key !== env.EXPORT_KEY) return new Response("Not found", { status: 404 });

  const out = [];
  let cursor;
  do {
    const page = await env.RATINGS.list({ prefix: "rating:", cursor });
    for (const k of page.keys) {
      const v = await env.RATINGS.get(k.name);
      if (v) out.push({ key: k.name, ...JSON.parse(v) });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
