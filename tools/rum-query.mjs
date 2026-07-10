// Query the RUM data that /api/rum writes to Analytics Engine (dataset rum_events).
// Prints p50/p95 latency by country and overall for the last N days.
//
// Setup once: create an API token with the "Account Analytics: Read" permission at
//   https://dash.cloudflare.com/profile/api-tokens
// Then run (PowerShell):
//   $env:CF_ANALYTICS_TOKEN="<token>"; node tools/rum-query.mjs
//   $env:CF_ANALYTICS_TOKEN="<token>"; node tools/rum-query.mjs 7   # last 7 days
//
// Column map (from functions/_lib/rum.js):
//   blob1=colo blob2=country blob3=path blob4=conn
//   double1=ttfb double2=fcp double3=dcl double4=load double5=rtt
//   double6=lcp double7=cls double8=bytes ; index1=country
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "97cf88bf307d6a78c496e80ae99677de";
const TOKEN = process.env.CF_ANALYTICS_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const DAYS = Number(process.argv[2] || 1);

if (!TOKEN) {
  console.error("Set CF_ANALYTICS_TOKEN to an API token with 'Account Analytics: Read'.");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`,
    { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: query },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

// SUM(_sample_interval) = true count; percentiles must be sample-weighted.
const byCountry = `
SELECT blob2 AS country,
  SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double1, _sample_interval) AS ttfb_p50,
  quantileWeighted(0.95, double1, _sample_interval) AS ttfb_p95,
  quantileWeighted(0.95, double2, _sample_interval) AS fcp_p95,
  quantileWeighted(0.95, double4, _sample_interval) AS load_p95
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${DAYS}' DAY
GROUP BY country ORDER BY visits DESC LIMIT 50`;

const overall = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double1, _sample_interval) AS ttfb_p50,
  quantileWeighted(0.95, double1, _sample_interval) AS ttfb_p95,
  quantileWeighted(0.95, double4, _sample_interval) AS load_p95
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${DAYS}' DAY`;

// Rows written before the expanded beacon have double6=0. Keep them in the
// historical timing table above, but exclude them from the new vitals summary.
const vitals = `
SELECT SUM(_sample_interval) AS visits,
  quantileWeighted(0.50, double6, _sample_interval) AS lcp_p50,
  quantileWeighted(0.75, double6, _sample_interval) AS lcp_p75,
  quantileWeighted(0.75, double7, _sample_interval) AS cls_p75,
  quantileWeighted(0.50, double8, _sample_interval) AS bytes_p50,
  quantileWeighted(0.75, double8, _sample_interval) AS bytes_p75
FROM rum_events
WHERE timestamp > NOW() - INTERVAL '${DAYS}' DAY AND double6 > 0`;

const round = (r) => {
  for (const k of Object.keys(r)) if (typeof r[k] === "number") r[k] = Math.round(r[k]);
  return r;
};

try {
  const o = await sql(overall);
  console.log(`\n=== RUM overall (last ${DAYS}d) ===`);
  console.table((o.data || []).map(round));
  const v = await sql(vitals);
  console.log(`=== expanded vitals (post-upgrade rows, ms / bytes) ===`);
  console.table((v.data || []).map(round));
  const c = await sql(byCountry);
  console.log(`=== by country (ms) ===`);
  console.table((c.data || []).map(round));
} catch (e) {
  console.error("Query failed:", e.message);
  process.exit(1);
}
