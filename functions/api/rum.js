// Real User Monitoring endpoint. The front-door beacon POSTs navigation timings
// here; we stamp colo + country server-side from request.cf (the client can't spoof
// it and the beacon stays tiny) and write one Analytics Engine data point. Query it
// later via the SQL API (dataset "rum_events"). Fire-and-forget, always 204 so a
// failed write never surfaces to the visitor.
import { buildRumDataPoint } from "../_lib/rum.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    // sendBeacon posts text/plain; parse regardless of Content-Type.
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  try {
    if (env.RUM) env.RUM.writeDataPoint(buildRumDataPoint(body, request.cf));
  } catch {
    // never fail a beacon
  }
  return new Response(null, { status: 204 });
}
