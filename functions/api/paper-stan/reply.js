// Plain JSON import (no `with { type: "json" }` attribute): this file is only
// ever bundled by esbuild (wrangler), which supports JSON natively; the cloud
// build's wrangler 3.x esbuild rejects import attributes.
import content from "../../../data/content.json";
import {
  buildDialogueMessages,
  completeDialogueTurn,
  createFallbackDialogueTurn,
  createProjectContinuationTurn,
  DIALOGUE_CONFIG,
  DIALOGUE_RESPONSE_FORMAT,
  initPaperStanKnowledge,
  sanitizeDialogueRequest,
} from "../../../src/render/fx/paper-stan-dialogue.js";

initPaperStanKnowledge(content);

const JSON_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store",
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Server-side rate limiting for the Workers AI dialogue endpoint. The browser
// cooldown (DIALOGUE_CONFIG.clientCooldownMs) is cosmetic: a direct POST can
// ignore it, so these KV counters are the real guard on inference spend.
//
// Both counters live in the shared RATINGS KV under a `ps-rl:` prefix so they
// never collide with the rating counters (`rl:` / `pr:`). Two layers:
//   1. Per-IP fixed window: RL_IP_MAX requests per RL_IP_WINDOW_MS. Counted for
//      every well-formed request, including the local continuation shortcut,
//      since that path is still server work an attacker could hammer.
//   2. Site-wide daily fuse: RL_DAY_MAX inferences per UTC day. Only the path
//      that actually calls env.AI.run spends this budget, so the free local
//      continuation shortcut never eats the day's inference allowance.
//
// KV is eventually consistent (roughly one write per second per key, plus
// cross-POP replication lag), so these counts are approximate: the goal is to
// stop mindless flooding, not to enforce an exact quota. When KV itself throws
// we fail OPEN (allow the request): this is a low-traffic personal portfolio
// where a brief KV hiccup breaking the assistant for real visitors is worse
// than letting a few extra inferences through, and Cloudflare's account-level
// Workers AI limits stay as the final backstop.
export const RL_IP_MAX = 6;
export const RL_IP_WINDOW_MS = 5 * 60 * 1000;
export const RL_DAY_MAX = 200;
const RL_TTL_MARGIN_SECONDS = 60;

async function hashIp(ip) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Increment-then-compare against a bounded window counter. Returns true when the
// budget is spent (caller should refuse). The raw IP is never stored: only its
// hash keys the counter, matching the privacy stance in api/rating.js.
async function ipWindowExceeded(env, request) {
  const ip = request.headers.get("cf-connecting-ip") || "0";
  const windowId = Math.floor(Date.now() / RL_IP_WINDOW_MS);
  try {
    const key = "ps-rl:ip:" + (await hashIp(ip)) + ":" + windowId;
    const next = ((await env.RATINGS.get(key)) | 0) + 1;
    if (next > RL_IP_MAX) return true;
    await env.RATINGS.put(key, String(next), {
      expirationTtl: Math.ceil(RL_IP_WINDOW_MS / 1000) + RL_TTL_MARGIN_SECONDS,
    });
    return false;
  } catch {
    // Fail open: availability beats a strict cap on this low-traffic site.
    return false;
  }
}

// Only call this on a path that is about to run inference, so the local
// continuation shortcut never consumes the day's allowance. Returns true when
// the site-wide daily budget is spent.
async function dailyFuseExceeded(env) {
  const day = new Date().toISOString().slice(0, 10);
  try {
    const key = "ps-rl:day:" + day;
    const next = ((await env.RATINGS.get(key)) | 0) + 1;
    if (next > RL_DAY_MAX) return true;
    await env.RATINGS.put(key, String(next), {
      expirationTtl: 24 * 60 * 60 + RL_TTL_MARGIN_SECONDS,
    });
    return false;
  } catch {
    // Fail open, same reasoning as the per-IP window above.
    return false;
  }
}

async function readJsonWithinLimit(request, maxBytes) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return { error: "too_large" };
  if (!request.body) return { error: "bad_json" };

  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return { error: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { error: "bad_json" };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A canceled stream may already have released the reader lock.
    }
  }

  try {
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { value: JSON.parse(new TextDecoder().decode(joined)) };
  } catch {
    return { error: "bad_json" };
  }
}

function parseModelResponse(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  const fenced = value.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const response = fenced ? fenced[1].trim() : value.trim();
  try {
    return JSON.parse(response);
  } catch {
    // Some small instruction models answer correctly in text despite the JSON
    // request. It still has to pass the same strict reply validator below.
    return { reply: response };
  }
}

export async function onRequestPost({ request, env }) {
  if (env.PAPER_STAN_AI_ENABLED !== "true") return json({ error: "disabled" }, 403);
  if (!env.AI || typeof env.AI.run !== "function") return json({ error: "ai_unavailable" }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "content_type" }, 415);
  }

  const parsed = await readJsonWithinLimit(request, DIALOGUE_CONFIG.maxRequestBytes);
  if (parsed.error === "too_large") return json({ error: "too_large" }, 413);
  const input = parsed.error ? null : sanitizeDialogueRequest(parsed.value);
  if (!input) return json({ error: "bad_question" }, 400);

  // Per-IP guard runs once the request is well-formed: malformed spam is already
  // rejected cheaply above without touching KV. This counts every valid request,
  // including the local shortcut below.
  if (await ipWindowExceeded(env, request)) return json({ error: "rate_limited" }, 429);

  const continuation = createProjectContinuationTurn(input.context, input.history, input.question);
  if (continuation) return json(continuation, 200);

  // Daily fuse is charged only here, on the path that actually reaches Workers AI.
  if (await dailyFuseExceeded(env)) return json({ error: "rate_limited" }, 429);

  try {
    const result = await env.AI.run(DIALOGUE_CONFIG.model, {
      messages: buildDialogueMessages(input.question, input.context, input.history),
      temperature: DIALOGUE_CONFIG.temperature,
      max_tokens: DIALOGUE_CONFIG.maxReplyTokens,
      response_format: DIALOGUE_RESPONSE_FORMAT,
    });
    const rawModelResponse = result && result.response;
    const turn = completeDialogueTurn(parseModelResponse(rawModelResponse), input.context);
    const safeTurn = turn || createFallbackDialogueTurn(input.context, input.history, input.question);
    if (!safeTurn) return json({ error: "invalid_reply" }, 422);
    return json(safeTurn, 200);
  } catch {
    const safeTurn = createFallbackDialogueTurn(input.context, input.history, input.question);
    if (!safeTurn) return json({ error: "inference_failed" }, 502);
    return json(safeTurn, 200);
  }
}
