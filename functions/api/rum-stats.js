// Owner-only RUM summary. Reads rum_events via the Analytics Engine SQL API
// (token is a Pages secret — never sent to the browser). Auth: creator IP or the
// same unlock key used for /api/unlock.
import { isCreatorIp } from "../_lib/creator.js";
import { fetchRumStats } from "../_lib/rum-query.js";
import { unlockOk } from "../_lib/unlock.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const ip = request.headers.get("cf-connecting-ip") || "";
  let body = {};
  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }

  const url = new URL(request.url);
  const key = body.k || url.searchParams.get("k") || "";
  const allowed =
    isCreatorIp(ip, env.CREATOR_IP || "") ||
    unlockOk(key, env.EDIT_SECRET || "");
  if (!allowed) {
    return json({ ok: false, error: "not authorized" }, 403);
  }

  const token = env.CF_ANALYTICS_TOKEN || env.ANALYTICS_TOKEN || "";
  if (!token) {
    return json(
      {
        ok: false,
        error:
          "server missing CF_ANALYTICS_TOKEN secret (Account Analytics: Read)",
      },
      500,
    );
  }

  const days = url.searchParams.get("days") || body.days || 1;
  try {
    const stats = await fetchRumStats(token, days);
    return json({ ok: true, ...stats });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 502);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
