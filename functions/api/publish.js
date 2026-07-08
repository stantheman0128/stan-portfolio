// One-click publish (IP-only, no OAuth, per the 2026-07-08 decision): if the request
// comes from the creator's IP, commit the posted content.json to the repo using a
// server-held GitHub token. GITHUB_TOKEN and CREATOR_IP are encrypted Pages secrets.
// The IP is the real cf-connecting-ip seen at Cloudflare's edge, so only requests
// actually originating from the creator's network get through.
import { isCreatorIp } from "../_lib/creator.js";
import { putJsonFile } from "../_lib/github.js";

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!isCreatorIp(ip, env.CREATOR_IP || "")) {
    return json({ ok: false, error: "not authorized for this IP" }, 403);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ ok: false, error: "server missing GITHUB_TOKEN secret" }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "bad JSON body" }, 400);
  }
  if (!body || typeof body.content !== "object" || Array.isArray(body.content)) {
    return json({ ok: false, error: "missing content object" }, 400);
  }
  try {
    const res = await putJsonFile({
      token: env.GITHUB_TOKEN,
      owner: env.PUBLISH_OWNER || "stantheman0128",
      repo: env.PUBLISH_REPO || "stan-portfolio",
      // Publish to the branch THIS deployment was built from (CF_PAGES_BRANCH),
      // so editing on the preview updates the preview and never touches production
      // by accident. PUBLISH_BRANCH overrides if ever needed.
      branch: env.PUBLISH_BRANCH || env.CF_PAGES_BRANCH || "main",
      path: "data/content.json",
      obj: body.content,
      message: "content: update from editor",
    });
    return json({ ok: true, commit: (res.commit && res.commit.sha) || null });
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
