// A deliberately finite measurement vocabulary. Never store submitted URLs,
// headers, user identifiers, geography, or arbitrary strings in click records.
export const OUTBOUND_HOST = "stan-shih.com";
export const OUTBOUND_EVENT = "outbound-v1";
export const OUTBOUND_PATHS = {
  "/work/notify-plus": ["notify-plus"],
  "/zh/work/notify-plus": ["notify-plus"],
  "/work/claudepulse": ["claudepulse"],
  "/zh/work/claudepulse": ["claudepulse"],
  "/software": ["notify-plus", "claudepulse"],
};
export const OUTBOUND_TARGETS = [
  { product: "notify-plus", destination: "store", href: "https://play.google.com/store/apps/details?id=com.stanslab.linenotify" },
  { product: "notify-plus", destination: "source", href: "https://github.com/stantheman0128/line-notify-plus" },
  { product: "claudepulse", destination: "source", href: "https://github.com/stantheman0128/claudepulse-win" },
  { product: "claudepulse", destination: "release", href: "https://github.com/stantheman0128/claudepulse-win/releases" },
];

export function buildOutboundDataPoint(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body).sort().join(",");
  if (keys !== "destination,path,product,v" || body.v !== 1) return null;
  if (typeof body.path !== "string" || typeof body.product !== "string" || typeof body.destination !== "string") return null;
  if (!Object.hasOwn(OUTBOUND_PATHS, body.path) || !OUTBOUND_PATHS[body.path].includes(body.product)) return null;
  if (!OUTBOUND_TARGETS.some(t => t.product === body.product && t.destination === body.destination)) return null;
  // Keep legacy timing columns in their original positions. blob5 marks these
  // rows so every timing/visit query can exclude them. No country is recorded.
  return {
    blobs: ["", "", body.path, "", OUTBOUND_EVENT, OUTBOUND_HOST, body.product, body.destination],
    doubles: [1],
    indexes: [OUTBOUND_EVENT + ":" + OUTBOUND_HOST],
  };
}
