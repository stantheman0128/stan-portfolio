// Front door on the edge. This Pages Function answers "/" from an embedded copy of
// the baked featherweight HTML, so every Cloudflare POP serves it from resident code
// with no origin fetch and no cache dependency. That removes the cold-POP cache-MISS
// penalty (a first visitor at a low-traffic POP otherwise waits ~300-470ms to refill).
// Warm and cold now behave identically: ~10-40ms TTFB worldwide.
//
// Only "/" runs on compute; every other path (/interactive, /fast/, /editor.js,
// /assets/*, /api/*) stays as-is. The existing functions/api/* handlers are untouched
// because Pages file-based routing keeps them separate. Do NOT convert this to a
// top-level _worker.js: that would disable the whole functions/ directory (the API).
import { HTML, BR_B64 } from "./_front-door.js";

// Decode the pre-compressed payload once per isolate, not per request.
const BR = Uint8Array.from(atob(BR_B64), (c) => c.charCodeAt(0));

// Same browser cache policy as the static _headers rule: short browser TTL +
// stale-while-revalidate so return visits are instant without a 304 round trip.
const BASE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=300, stale-while-revalidate=86400, stale-if-error=604800",
  "vary": "Accept-Encoding",
  "x-content-type-options": "nosniff",
};

export function onRequest({ request }) {
  const accept = request.headers.get("Accept-Encoding") || "";
  if (accept.includes("br")) {
    return new Response(BR, { headers: { ...BASE_HEADERS, "content-encoding": "br" } });
  }
  // Rare non-Brotli client: hand back raw HTML; Cloudflare may still gzip it at the edge.
  return new Response(HTML, { headers: BASE_HEADERS });
}
