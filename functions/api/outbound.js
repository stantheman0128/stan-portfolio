import { buildOutboundDataPoint, OUTBOUND_HOST } from "../_lib/outbound.js";

const ORIGIN = "https://" + OUTBOUND_HOST;
const MAX_BODY_BYTES = 512;
const reply = status => new Response(null, { status, headers: { "cache-control": "no-store", ...(status === 405 ? { allow: "POST" } : {}) } });

async function boundedBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return reply(405);
  const url = new URL(request.url);
  const site = request.headers.get("sec-fetch-site");
  if (url.origin !== ORIGIN || url.pathname !== "/api/outbound" || url.search ||
      request.headers.get("origin") !== ORIGIN || (site && site !== "same-origin")) return reply(403);
  if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return reply(204);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply(400);
  let point;
  try {
    const text = await boundedBody(request);
    if (text === null) return reply(413);
    point = buildOutboundDataPoint(JSON.parse(text));
  } catch {
    return reply(400);
  }
  if (!point) return reply(400);
  try {
    env.RUM?.writeDataPoint(point);
  } catch {
    // Telemetry failure must not affect navigation; 204 is not storage proof.
  }
  return reply(204);
}
