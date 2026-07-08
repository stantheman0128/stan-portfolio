// Tells the client whether this request comes from the owner's IP, so the
// Minimal page can hide the rating strips (and, later, reveal the editor).
// CREATOR_IP is an encrypted Pages secret; it never appears in the repo.
import { isCreatorIp } from "../_lib/creator.js";

export async function onRequestGet({ request, env }) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const creator = isCreatorIp(ip, env.CREATOR_IP || "");
  return new Response(JSON.stringify({ creator }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
