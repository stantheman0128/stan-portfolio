// Query the RUM data that /api/rum writes to Analytics Engine (dataset rum_events).
// Prints p50/p95 latency by country and overall for the last N days.
//
// Setup once: create an API token with the "Account Analytics: Read" permission at
//   https://dash.cloudflare.com/profile/api-tokens
// Then run (PowerShell):
//   $env:CF_ANALYTICS_TOKEN="<token>"; node tools/rum-query.mjs
//   $env:CF_ANALYTICS_TOKEN="<token>"; node tools/rum-query.mjs 7   # last 7 days
//
// The same token is stored as a Pages secret for the owner-only /api/rum-stats panel:
//   wrangler pages secret put CF_ANALYTICS_TOKEN --project-name=stan-portfolio
import { fetchRumStats } from "../functions/_lib/rum-query.js";

const TOKEN = process.env.CF_ANALYTICS_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const DAYS = process.argv[2] || 1;

if (!TOKEN) {
  console.error("Set CF_ANALYTICS_TOKEN to an API token with 'Account Analytics: Read'.");
  process.exit(1);
}

try {
  const stats = await fetchRumStats(TOKEN, DAYS);
  console.log(`\n=== RUM overall (last ${stats.days}d) ===`);
  console.table(stats.overall);
  console.log(`=== expanded vitals (post-upgrade rows, ms / bytes) ===`);
  console.table(stats.vitals);
  console.log(`=== by country (ms) ===`);
  console.table(stats.byCountry);
} catch (e) {
  console.error("Query failed:", e.message);
  process.exit(1);
}
