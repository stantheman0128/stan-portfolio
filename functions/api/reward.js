// /api/reward — serves the full photo ONLY against a valid, unexpired token
// minted by /api/quest. The photo bytes live in KV (key asset:reward-full,
// uploaded via wrangler), never in the repo or the deployed static assets,
// so there is no URL to guess and nothing to scrape out of git history.
import { verify } from "../_lib/hmac.js";
import { secretOf } from "../_lib/hmac.js";

const NO = () => new Response("Not found", { status: 404 });

export async function onRequestGet({ request, env }) {
  try {
    const t = new URL(request.url).searchParams.get("t") || "";
    const parts = t.split(".");
    if (parts.length !== 3) return NO();
    const [voter, expStr, sig] = parts;
    if (!/^[a-z0-9]{8,40}$/.test(voter)) return NO();
    const exp = parseInt(expStr, 10);
    if (!exp || Date.now() > exp) return NO();
    if (!(await verify(voter + "." + exp, sig, secretOf(env)))) return NO();

    const got = await env.RATINGS.getWithMetadata("asset:reward-full", { type: "arrayBuffer" });
    if (!got || !got.value) return NO();
    return new Response(got.value, {
      headers: {
        "content-type": (got.metadata && got.metadata.ct) || "image/jpeg",
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return NO();
  }
}
