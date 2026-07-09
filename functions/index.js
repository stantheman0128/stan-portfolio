// Front door on the edge. This Pages Function answers "/" from an embedded copy of
// the baked featherweight HTML, so every Cloudflare POP serves it from resident code
// with no origin fetch and no cache dependency. That removes the cold-POP cache-MISS
// penalty (a first visitor at a low-traffic POP otherwise waits ~300-470ms to refill).
// Warm and cold now behave identically: ~25-50ms TTFB worldwide.
//
// We return RAW HTML and let the Cloudflare edge apply Brotli/gzip. Setting
// Content-Encoding ourselves double-compresses once the brotli_content_encoding
// runtime flag is on (which our compatibility_date enables), so the browser would
// only strip one layer and render garbage. Letting the edge compress is both simpler
// and correct, and it still ships the ~6.4KB Brotli wire.
//
// Only "/" runs on compute; every other path (/interactive, /fast/, /editor.js,
// /assets/*, /api/*) stays as-is. The existing functions/api/* handlers are untouched
// because Pages file-based routing keeps them separate. Do NOT convert this to a
// top-level _worker.js: that would disable the whole functions/ directory (the API).
import { HTML } from "./_front-door.js";

// Same browser cache policy as the static _headers rule: short browser TTL +
// stale-while-revalidate so return visits are instant without a 304 round trip.
const HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=300, stale-while-revalidate=86400, stale-if-error=604800",
  "x-content-type-options": "nosniff",
};

export function onRequest() {
  return new Response(HTML, { headers: HEADERS });
}
