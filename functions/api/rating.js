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
    const key = "pr:" + id + ":" + new Date().toISOString() + ":" + Math.random().toString(36).slice(2, 8);
    await env.RATINGS.put(key, JSON.stringify(rec));
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

  // Public aggregate.
  const projects = {};
  for (const row of rows) {
    const s = (projects[row.id] ||= { n: 0, sum: 0 });
    s.n++;
    s.sum += row.r;
  }
  for (const id of Object.keys(projects)) {
    projects[id] = { n: projects[id].n, avg: projects[id].sum / projects[id].n };
  }
  const latest = rows
    .filter((row) => row.c)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)
    .map((row) => ({ id: row.id, r: row.r, c: row.c, ts: row.ts }));

  return new Response(JSON.stringify({ projects, latest }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
}
