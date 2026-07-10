// Shared RUM SQL for Analytics Engine (dataset rum_events). Used by the owner
// /api/rum-stats endpoint and tools/rum-query.mjs.
export const RUM_ACCOUNT_ID = "97cf88bf307d6a78c496e80ae99677de";

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
WHERE timestamp > NOW() - INTERVAL '${span}' DAY
GROUP BY country ORDER BY visits DESC LIMIT 50`;

  const overall = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double1, _sample_interval) AS ttfb_p50,
  quantileWeighted(0.95, double1, _sample_interval) AS ttfb_p95,
  quantileWeighted(0.95, double4, _sample_interval) AS load_p95
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${span}' DAY`;

  const vitals = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double6, _sample_interval) AS lcp_p50,
  quantileWeighted(0.75, double6, _sample_interval) AS lcp_p75,
  quantileWeighted(0.75, double7, _sample_interval) AS cls_p75,
  quantileWeighted(0.50, double8, _sample_interval) AS bytes_p50,
  quantileWeighted(0.75, double8, _sample_interval) AS bytes_p75
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${span}' DAY AND double6 > 0`;

  return { span, overall, vitals, byCountry };
}

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

  const [overall, vitals, byCountry] = await Promise.all([
    sql(queries.overall),
    sql(queries.vitals),
    sql(queries.byCountry),
  ]);

  return {
    days: queries.span,
    overall: (overall.data || []).map(roundRumRow),
    vitals: (vitals.data || []).map(roundRumRow),
    byCountry: (byCountry.data || []).map(roundRumRow),
  };
}
