import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequestPost } from "../functions/api/publish.js";

// commitTree walks the GitHub Git Data API (ref -> commit -> blobs -> tree ->
// commit -> patch ref). A single stubbed response satisfying every field it reads
// lets the happy path resolve without hitting the network.
function stubGitHubOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ object: { sha: "old" }, tree: { sha: "tree" }, sha: "newsha" }),
      text: async () => "",
    })),
  );
}

function req(body, ip) {
  return new Request("https://portfolio.stan-shih.com/api/publish", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ip ? { "cf-connecting-ip": ip } : {}),
    },
    body: JSON.stringify(body),
  });
}

const ENV = { GITHUB_TOKEN: "gh", CREATOR_IP: "1.2.3.4", EDIT_SECRET: "s3cret" };
const CONTENT = { title: "x" };

describe("/api/publish authorization", () => {
  beforeEach(() => stubGitHubOk());
  afterEach(() => vi.unstubAllGlobals());

  it("creator IP with no key still publishes (unchanged path)", async () => {
    const res = await onRequestPost({ request: req({ content: CONTENT }, "1.2.3.4"), env: ENV });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.commit).toBe("newsha");
  });

  it("wrong IP but correct key publishes", async () => {
    const res = await onRequestPost({
      request: req({ content: CONTENT, k: "s3cret" }, "9.9.9.9"),
      env: ENV,
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("wrong IP and wrong key is rejected", async () => {
    const res = await onRequestPost({
      request: req({ content: CONTENT, k: "nope" }, "9.9.9.9"),
      env: ENV,
    });
    expect(res.status).toBe(403);
  });

  it("wrong IP and no key is rejected", async () => {
    const res = await onRequestPost({ request: req({ content: CONTENT }, "9.9.9.9"), env: ENV });
    expect(res.status).toBe(403);
  });

  it("correct key but EDIT_SECRET unset is rejected", async () => {
    const res = await onRequestPost({
      request: req({ content: CONTENT, k: "s3cret" }, "9.9.9.9"),
      env: { GITHUB_TOKEN: "gh", CREATOR_IP: "1.2.3.4" },
    });
    expect(res.status).toBe(403);
  });

  it("403 message does not reveal which gate failed", async () => {
    const res = await onRequestPost({ request: req({ content: CONTENT }, "9.9.9.9"), env: ENV });
    const body = await res.json();
    expect(body.error.toLowerCase()).not.toContain("ip");
    expect(body.error.toLowerCase()).not.toContain("key");
    expect(body.error.toLowerCase()).not.toContain("secret");
  });

  it("still reports a missing GITHUB_TOKEN once authorized", async () => {
    const res = await onRequestPost({
      request: req({ content: CONTENT }, "1.2.3.4"),
      env: { CREATOR_IP: "1.2.3.4", EDIT_SECRET: "s3cret" },
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("GITHUB_TOKEN");
  });
});

describe("/api/publish image path allow-list", () => {
  beforeEach(() => stubGitHubOk());
  afterEach(() => vi.unstubAllGlobals());

  const ok = (images) =>
    onRequestPost({ request: req({ content: CONTENT, images }, "1.2.3.4"), env: ENV });

  it("accepts a public/assets path", async () => {
    const res = await ok([{ path: "public/assets/pic.png", base64: "AAAA" }]);
    expect(res.status).toBe(200);
  });

  it("rejects parent-traversal in the path", async () => {
    const res = await ok([{ path: "public/assets/../../secret.txt", base64: "AAAA" }]);
    expect(res.status).toBe(400);
  });

  it("rejects an absolute path", async () => {
    const res = await ok([{ path: "/etc/passwd", base64: "AAAA" }]);
    expect(res.status).toBe(400);
  });

  it("rejects a backslash path", async () => {
    const res = await ok([{ path: "public\\assets\\pic.png", base64: "AAAA" }]);
    expect(res.status).toBe(400);
  });

  it("rejects a path outside public/assets", async () => {
    const res = await ok([{ path: "public/other/pic.png", base64: "AAAA" }]);
    expect(res.status).toBe(400);
  });
});
