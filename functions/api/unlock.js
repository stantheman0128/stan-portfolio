// Server-verified device unlock: compare the posted key against EDIT_SECRET
// (an encrypted Pages secret; never in client code). On match the client sets a
// localStorage flag. Called ONCE per device, not per page view.
import { unlockOk } from "../_lib/unlock.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }
  const ok = unlockOk(body && body.k, env.EDIT_SECRET || "");
  return new Response(JSON.stringify({ ok }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
