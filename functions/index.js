// Front door on the edge. This Pages Function answers "/" from an embedded copy of
// the baked featherweight HTML, so a cache miss still stays inside resident edge code
// with no asset-origin fetch. A short CDN cache keeps the fast HIT path without letting
// stale-while-revalidate pin an old deployment at a POP for a day.
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
import { HTML, MARKDOWN } from "./_front-door.js";

// Pages does not apply public/_headers to Function responses. Match the dev-minimal
// policy in public/_headers while actively shipping; restore the perf profile in
// that file's comment block when stable.
const COMMON = {
  "cache-control": "no-cache",
  "cloudflare-cdn-cache-control": "no-store",
  "x-content-type-options": "nosniff",
  // Agent discovery (RFC 8288): points AI crawlers at the markdown profile.
  link: '</llms.txt>; rel="alternate"; type="text/markdown"',
  // Content negotiation below: caches must key on the Accept header.
  vary: "accept",
};

// Self-built "Markdown for Agents": Accept: text/markdown gets the markdown
// rendition of the same content.json bake; browsers keep getting HTML.
export function onRequest(context) {
  const accept = context?.request?.headers?.get("accept") || "";
  if (accept.includes("text/markdown")) {
    return new Response(MARKDOWN, {
      headers: {
        ...COMMON,
        "content-type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(Math.ceil(MARKDOWN.length / 4)),
      },
    });
  }
  return new Response(HTML, {
    headers: { ...COMMON, "content-type": "text/html; charset=utf-8" },
  });
}
