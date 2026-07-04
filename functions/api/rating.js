// /api/rating — per-project ratings (1-10) with a public read-back.
// POST: anonymous rating {id, r 1-10, c ≤140, ms, hp}. Every failure path
//   returns 204 (silent drop): visitors never depend on it, abusers get no
//   signal. Records hold no IP/PII.
// GET: without a key → PUBLIC aggregate (per-project avg/count + latest
//   comments, 60s cache). With ?key=<EXPORT_KEY> → full export (else the
//   public shape; the secret path is indistinguishable from outside).

const OK = () => new Response(null, { status: 204 });
const ID_RE = /^[a-z0-9-]{1,40}$/;

export async function onRequestPost({ request, env }) {
  try {
    if ((request.headers.get("content-length") | 0) > 1024) return OK();
    const b = await request.json();

    if (b.hp) return OK(); // honeypot
    const id = String(b.id || "");
    if (!ID_RE.test(id)) return OK();
    const voter = String(b.v || "");
    if (!/^[a-z0-9]{8,40}$/.test(voter)) return OK();
    const r = b.r | 0;
    if (r < 1 || r > 10) return OK();
    if ((b.ms | 0) < 3000) return OK(); // server-side minimum time-on-page

    // Rate limit: 30/hour per hashed IP; the hash exists only as a counter key.
    const ip = request.headers.get("cf-connecting-ip") || "0";
    const hour = new Date().toISOString().slice(0, 13);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + hour));
    const rlKey = "rl:" + [...new Uint8Array(digest)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
    const count = ((await env.RATINGS.get(rlKey)) | 0) + 1;
    if (count > 30) return OK();
    await env.RATINGS.put(rlKey, String(count), { expirationTtl: 3600 });

    const rec = {
      r,
      c: String(b.c || "").slice(0, 140),
      ts: Math.floor(Date.now() / 1000),
    };
    // One vote per visitor per project: the key is derived from the anonymous
    // voter token, so re-rating OVERWRITES the previous vote (no box stuffing).
    const vDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(voter + ":" + id));
    const vHash = [...new Uint8Array(vDigest)].slice(0, 10).map((x) => x.toString(16).padStart(2, "0")).join("");
    await env.RATINGS.put("pr:" + id + ":" + vHash, JSON.stringify(rec));
  } catch (e) {
    // Losing a rating beats surfacing an error.
  }
  return OK();
}

async function readAll(env) {
  const rows = [];
  let cursor;
  do {
    const page = await env.RATINGS.list({ prefix: "pr:", cursor });
    for (const k of page.keys) {
      const v = await env.RATINGS.get(k.name);
      if (!v) continue;
      const id = k.name.split(":")[1];
      try { rows.push({ id, key: k.name, ...JSON.parse(v) }); } catch (e) {}
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return rows;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const rows = await readAll(env);

  if (env.EXPORT_KEY && url.searchParams.get("key") === env.EXPORT_KEY) {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: { "content-type": "application/json" },
    });
  }

  // Public aggregate: per-project count/avg plus that project's own latest
  // comments (the site shows them inline under each project — no global wall).
  const projects = {};
  for (const row of rows) {
    const s = (projects[row.id] ||= { n: 0, sum: 0, comments: [] });
    s.n++;
    s.sum += row.r;
    if (row.c) s.comments.push({ r: row.r, c: row.c, ts: row.ts });
  }
  for (const id of Object.keys(projects)) {
    const s = projects[id];
    s.comments.sort((a, b) => b.ts - a.ts);
    projects[id] = { n: s.n, avg: s.sum / s.n, comments: s.comments.slice(0, 4) };
  }

  return new Response(JSON.stringify({ projects }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
}
