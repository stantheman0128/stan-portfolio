import { describe, it, expect } from "vitest";
import { commitTree } from "../functions/_lib/github.js";

// A scripted fake GitHub: each endpoint returns canned ids and records calls.
function fakeGitHub() {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, method: (opts && opts.method) || "GET", body: opts && opts.body });
    if (url.endsWith("/git/refs/heads/main")) {
      if (opts && opts.method === "PATCH") return { status: 200, json: async () => ({}) };
      return { status: 200, json: async () => ({ object: { sha: "COMMIT_OLD" } }) };
    }
    if (url.endsWith("/git/commits/COMMIT_OLD")) return { status: 200, json: async () => ({ tree: { sha: "TREE_OLD" } }) };
    if (url.endsWith("/git/blobs")) return { status: 201, json: async () => ({ sha: "BLOB" }) };
    if (url.endsWith("/git/trees")) return { status: 201, json: async () => ({ sha: "TREE_NEW" }) };
    if (url.endsWith("/git/commits")) return { status: 201, json: async () => ({ sha: "COMMIT_NEW" }) };
    return { status: 404 };
  };
  return { fetchImpl, calls };
}

describe("commitTree", () => {
  it("blobs each file, builds a tree on the old base, commits, and moves the ref", async () => {
    const { fetchImpl, calls } = fakeGitHub();
    const sha = await commitTree({
      token: "t", owner: "o", repo: "r", branch: "main",
      files: [
        { path: "data/content.json", content: "{}", encoding: "utf-8" },
        { path: "public/assets/x.png", content: "AAAA", encoding: "base64" },
      ],
      message: "m", fetchImpl,
    });
    expect(sha).toBe("COMMIT_NEW");
    const tree = JSON.parse(calls.find((c) => c.url.endsWith("/git/trees")).body);
    expect(tree.base_tree).toBe("TREE_OLD");
    expect(tree.tree).toHaveLength(2);
    const commit = JSON.parse(calls.find((c) => c.url.endsWith("/git/commits")).body);
    expect(commit.parents).toEqual(["COMMIT_OLD"]);
    const patch = calls.find((c) => c.method === "PATCH");
    expect(JSON.parse(patch.body).sha).toBe("COMMIT_NEW");
  });
});
