import {
  buildDialogueMessages,
  DIALOGUE_CONFIG,
  sanitizeDialogueRequest,
  validateDialogueResponse,
} from "../../../src/render/fx/paper-stan-dialogue.js";

const JSON_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store",
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
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
  try {
    return JSON.parse(value.trim());
  } catch {
    return null;
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

  try {
    const result = await env.AI.run(DIALOGUE_CONFIG.model, {
      messages: buildDialogueMessages(input.question),
      temperature: 0.7,
      max_tokens: 180,
    });
    const reply = validateDialogueResponse(parseModelResponse(result && result.response));
    if (!reply) return json({ error: "invalid_reply" }, 422);
    return json({ reply }, 200);
  } catch {
    return json({ error: "inference_failed" }, 502);
  }
}
