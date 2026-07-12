// One-click publish. Authorization is dual-track (2026-07-12): either the request
// comes from the creator's IP, OR it carries the correct EDIT_SECRET unlock key in
// the body (body.k). The IP track keeps working from the creator's network; the key
// track exists because the creator is on a dynamic HiNet IP that changes on every
// reconnect, which would otherwise 403 a valid owner. GITHUB_TOKEN, CREATOR_IP and
// EDIT_SECRET are encrypted Pages secrets. This mirrors the same gate already used by
// /api/rum-stats (isCreatorIp || unlockOk).
import { isCreatorIp } from "../_lib/creator.js";
import { commitTree } from "../_lib/github.js";
import { unlockOk } from "../_lib/unlock.js";

// Images are committed straight into the repo tree, so the path is attacker-influenced
// input. Only allow paths that land under public/assets/ — reject traversal, absolute
// paths, and backslashes so a crafted body can't overwrite source, workflows, or config.
function isSafeAssetPath(p) {
  return (
    typeof p === "string" &&
    p.startsWith("public/assets/") &&
    p.length > "public/assets/".length &&
    !p.includes("..") &&
    !p.includes("\\") &&
    !p.startsWith("/")
  );
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  // Body must be parsed before authorization because the unlock key lives in it.
  // Parse defensively: a malformed body just yields null, so an unauthorized caller
  // gets the same neutral 403 and can't probe the parser.
  let body = null;
  try {
    body = await request.json();
  } catch (e) {
    body = null;
  }
  const authorized =
    isCreatorIp(ip, env.CREATOR_IP || "") ||
    unlockOk(body && body.k, env.EDIT_SECRET || "");
  if (!authorized) {
    // Neutral message on purpose: don't reveal which track (IP vs key) failed.
    return json({ ok: false, error: "not authorized" }, 403);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ ok: false, error: "server missing GITHUB_TOKEN secret" }, 500);
  }
  if (body === null) {
    return json({ ok: false, error: "bad JSON body" }, 400);
  }
  if (typeof body.content !== "object" || Array.isArray(body.content)) {
    return json({ ok: false, error: "missing content object" }, 400);
  }
  // content.json (utf-8) plus any swapped-in images (base64) go in one atomic commit.
  const files = [{
    path: "data/content.json",
    content: JSON.stringify(body.content, null, 2) + "\n",
    encoding: "utf-8",
  }];
  for (const img of (body.images || [])) {
    if (!img || typeof img.path !== "string" || typeof img.base64 !== "string") continue;
    if (!isSafeAssetPath(img.path)) {
      return json({ ok: false, error: "invalid image path" }, 400);
    }
    files.push({ path: img.path, content: img.base64, encoding: "base64" });
  }
  try {
    const sha = await commitTree({
      token: env.GITHUB_TOKEN,
      owner: env.PUBLISH_OWNER || "stantheman0128",
      repo: env.PUBLISH_REPO || "stan-portfolio",
      // Publish to the branch THIS deployment was built from (CF_PAGES_BRANCH),
      // so editing on the preview updates the preview and never touches production
      // by accident. PUBLISH_BRANCH overrides if ever needed.
      branch: env.PUBLISH_BRANCH || env.CF_PAGES_BRANCH || "main",
      files,
      message: "content: update from editor",
    });
    return json({ ok: true, commit: sha });
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
