// Public load-time baseline: DCL quantiles aggregated from real visits, so the
// front door can tell a visitor how their load compares. No auth on purpose —
// the response is a handful of aggregate milliseconds, nothing sensitive.
// Edge-cached (zone respects origin) so Analytics Engine sees at most one SQL
// query per cache window, not one per visitor.
import { RUM_ACCOUNT_ID, RUM_BASELINE_QUERY } from "../_lib/rum-query.js";

const CACHE_SECONDS = 600;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=${CACHE_SECONDS}`,
      "cloudflare-cdn-cache-control": `max-age=${CACHE_SECONDS}`,
    },
  });
}

export async function onRequestGet({ env }) {
  const token = env.CF_ANALYTICS_TOKEN || env.ANALYTICS_TOKEN || "";
  if (!token) return json({ ok: false }, 503);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${RUM_ACCOUNT_ID}/analytics_engine/sql`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: RUM_BASELINE_QUERY }
    );
    if (!res.ok) return json({ ok: false }, 502);
    const data = await res.json();
    const row = data && Array.isArray(data.data) ? data.data[0] : null;
    if (!row || !(+row.visits > 0)) return json({ ok: false }, 404);
    return json(
      {
        ok: true,
        visits: Math.round(+row.visits),
        dcl: {
          p10: Math.round(+row.p10),
          p25: Math.round(+row.p25),
          p50: Math.round(+row.p50),
          p75: Math.round(+row.p75),
          p90: Math.round(+row.p90),
        },
      },
      200
    );
  } catch {
    return json({ ok: false }, 502);
  }
}
