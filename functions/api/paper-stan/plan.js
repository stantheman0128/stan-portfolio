import {
  DIRECTOR_CONFIG,
  directorPlanShape,
  sanitizeDirectorContext,
  validateDirectorPlan,
} from "../../../src/render/fx/sprite-director.js";

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

function hasValidIncomingContext(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (!DIRECTOR_CONFIG.allowedEvents.includes(body.event)) return false;
  if (!DIRECTOR_CONFIG.remoteEligibleEvents.includes(body.event)) return false;
  if (body.event === "section" && !DIRECTOR_CONFIG.allowedSections.includes(body.section)) return false;
  if (body.dwell && !DIRECTOR_CONFIG.allowedDwellBuckets.includes(body.dwell)) return false;
  return true;
}

function permittedPlans(context) {
  return DIRECTOR_CONFIG.allowedMoods
    .map((mood) => directorPlanShape(context, mood))
    .filter((plan) => validateDirectorPlan(plan, context));
}

function buildMessages(context) {
  const plans = permittedPlans(context);
  return [
    {
      role: "system",
      content: [
        "You are Paper Stan's constrained animation director.",
        "Return exactly one JSON object, selected unchanged from the permitted plans.",
        "Do not write dialogue, action names, code, explanations, or extra keys.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({ context, permittedPlans: plans }),
    },
  ];
}

function parseModelResponse(response) {
  if (response && typeof response === "object" && !Array.isArray(response)) return response;
  if (typeof response !== "string") return null;
  try {
    return JSON.parse(response.trim());
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  // The endpoint is dormant by default, including preview deployments.
  if (env.PAPER_STAN_AI_ENABLED !== "true") return json({ error: "disabled" }, 403);
  if (!env.AI || typeof env.AI.run !== "function") return json({ error: "ai_unavailable" }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "content_type" }, 415);
  }

  const parsed = await readJsonWithinLimit(request, DIRECTOR_CONFIG.maxRequestBytes);
  if (parsed.error === "too_large") return json({ error: "too_large" }, 413);
  if (parsed.error || !hasValidIncomingContext(parsed.value)) return json({ error: "bad_context" }, 400);

  const context = sanitizeDirectorContext(parsed.value);
  try {
    const result = await env.AI.run(DIRECTOR_CONFIG.model, {
      messages: buildMessages(context),
      temperature: 0.1,
      max_tokens: 120,
    });
    const plan = validateDirectorPlan(parseModelResponse(result && result.response), context);
    if (!plan) return json({ error: "invalid_plan" }, 422);
    return json({ plan }, 200);
  } catch {
    return json({ error: "inference_failed" }, 502);
  }
}
