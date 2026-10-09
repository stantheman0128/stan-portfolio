// Shared RUM SQL for Analytics Engine (dataset rum_events). Used by the owner
// /api/rum-stats endpoint and tools/rum-query.mjs.
export const RUM_ACCOUNT_ID = "97cf88bf307d6a78c496e80ae99677de";
// Older timing records have no fifth blob (read as an empty string). Reserve it
// for typed events, so clicks never become visits, timings or recent-visit rows.
export const RUM_TIMING_FILTER = "blob5 = ''";

export function rumDays(input) {
  const days = Number(input);
  if (!Number.isFinite(days) || days < 1) return 1;
  return Math.min(Math.floor(days), 30);
}

export function rumQueries(days) {
  const span = rumDays(days);
  const byCountry = `
SELECT blob2 AS country,
  SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double1, _sample_interval) AS ttfb_p50,
  quantileWeighted(0.95, double1, _sample_interval) AS ttfb_p95,
  quantileWeighted(0.95, double2, _sample_interval) AS fcp_p95,
  quantileWeighted(0.95, double4, _sample_interval) AS load_p95
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${span}' DAY AND ${RUM_TIMING_FILTER}
GROUP BY country ORDER BY visits DESC LIMIT 50`;

  const overall = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double1, _sample_interval) AS ttfb_p50,
  quantileWeighted(0.95, double1, _sample_interval) AS ttfb_p95,
  quantileWeighted(0.95, double4, _sample_interval) AS load_p95
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${span}' DAY AND ${RUM_TIMING_FILTER}`;

  const vitals = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double6, _sample_interval) AS lcp_p50,
  quantileWeighted(0.75, double6, _sample_interval) AS lcp_p75,
  quantileWeighted(0.75, double7, _sample_interval) AS cls_p75,
  quantileWeighted(0.50, double8, _sample_interval) AS bytes_p50,
  quantileWeighted(0.75, double8, _sample_interval) AS bytes_p75
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${span}' DAY AND ${RUM_TIMING_FILTER} AND double6 > 0`;

  // Raw per-visit rows for the owner panel's "recent visits" table. Unlike the
  // aggregate queries above this is not weighted by _sample_interval — each row is
  // one sampled beacon. timestamp comes back as a string; latency doubles round.
  const recent = `
SELECT timestamp, blob2 AS country, blob3 AS path,
  double1 AS ttfb, double4 AS load, double6 AS lcp
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${span}' DAY AND ${RUM_TIMING_FILTER}
ORDER BY timestamp DESC LIMIT 80`;

  const outbound = outboundQuery(span);
  return { span, overall, vitals, byCountry, recent, outbound };
}

// Aggregate click totals only, exposed through the existing owner-only stats
// endpoint. They are activation counts, never unique people or conversions.
export function outboundQuery(days) {
  return `SELECT blob3 AS path, blob7 AS product, blob8 AS destination,
  SUM(_sample_interval) AS clicks
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${rumDays(days)}' DAY
  AND blob5 = 'outbound-v1' AND blob6 = 'stan-shih.com'
GROUP BY path, product, destination
ORDER BY clicks DESC LIMIT 100`;
}

// DCL (double3) quantile ladder over the last 30 days. Powers the public
// /api/rum-baseline endpoint: the front door compares a visitor's own
// DOMContentLoaded time against these to say "faster than ~X% of visits".
export const RUM_BASELINE_QUERY = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.10, double3, _sample_interval) AS p10,
  quantileWeighted(0.25, double3, _sample_interval) AS p25,
  quantileWeighted(0.50, double3, _sample_interval) AS p50,
  quantileWeighted(0.75, double3, _sample_interval) AS p75,
  quantileWeighted(0.90, double3, _sample_interval) AS p90
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '30' DAY AND ${RUM_TIMING_FILTER} AND double3 > 0`;

export function roundRumRow(row) {
  const out = { ...row };
  for (const key of Object.keys(out)) {
    if (typeof out[key] === "number") out[key] = Math.round(out[key]);
  }
  return out;
}

export async function fetchRumStats(token, days, accountId = RUM_ACCOUNT_ID) {
  if (!token) throw new Error("missing analytics token");
  const queries = rumQueries(days);

  async function sql(query) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: query },
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
    return JSON.parse(text);
  }

  const [overall, vitals, byCountry, recent, outbound] = await Promise.all([
    sql(queries.overall),
    sql(queries.vitals),
    sql(queries.byCountry),
    sql(queries.recent),
    sql(queries.outbound),
  ]);

  return {
    days: queries.span,
    overall: (overall.data || []).map(roundRumRow),
    vitals: (vitals.data || []).map(roundRumRow),
    byCountry: (byCountry.data || []).map(roundRumRow),
    recent: (recent.data || []).map(roundRumRow),
    outbound: (outbound.data || []).map(roundRumRow),
  };
}
