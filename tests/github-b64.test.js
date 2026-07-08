import { describe, it, expect } from "vitest";
import { b64, putJsonFile } from "../functions/_lib/github.js";

function btoaUtf8(s) {
  const b = new TextEncoder().encode(s);
  let x = "";
  for (const c of b) x += String.fromCharCode(c);
  return btoa(x);
}

describe("b64", () => {
  it("base64-encodes ascii", () => {
    expect(b64("hi")).toBe("aGk=");
  });
  it("handles multibyte utf-8 without throwing", () => {
    expect(b64("café ☕")).toBe(btoaUtf8("café ☕"));
  });
});

describe("putJsonFile", () => {
  it("creates a fresh file (GET 404 -> PUT with no sha) and base64 content", async () => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, opts });
      if (!opts || opts.method !== "PUT") return { status: 404 };
      return { status: 201, json: async () => ({ commit: { sha: "abc123" } }) };
    };
    const res = await putJsonFile({
      token: "t", owner: "o", repo: "r", branch: "main",
      path: "data/content.json", obj: { a: 1 }, message: "m", fetchImpl,
    });
    expect(res.commit.sha).toBe("abc123");
    const put = calls.find((c) => c.opts && c.opts.method === "PUT");
    const body = JSON.parse(put.opts.body);
    expect(body.branch).toBe("main");
    expect(body.sha).toBe(undefined);
    expect(typeof body.content).toBe("string");
  });

  it("updates an existing file with its sha", async () => {
    let putBody;
    const fetchImpl = async (url, opts) => {
      if (!opts || opts.method !== "PUT") return { status: 200, json: async () => ({ sha: "old" }) };
      putBody = JSON.parse(opts.body);
      return { status: 200, json: async () => ({ commit: { sha: "new" } }) };
    };
    await putJsonFile({
      token: "t", owner: "o", repo: "r", branch: "main",
      path: "p", obj: {}, message: "m", fetchImpl,
    });
    expect(putBody.sha).toBe("old");
  });

  it("throws on a non-2xx PUT", async () => {
    const fetchImpl = async (url, opts) => {
      if (!opts || opts.method !== "PUT") return { status: 404 };
      return { status: 422, text: async () => "boom" };
    };
    await expect(putJsonFile({
      token: "t", owner: "o", repo: "r", branch: "main",
      path: "p", obj: {}, message: "m", fetchImpl,
    })).rejects.toThrow("GitHub PUT 422");
  });
});
