import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequest } from "../functions/api/rum-stats.js";

describe("/api/rum-stats", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => JSON.stringify({ data: [{ visits: 1, lcp_p50: 200 }] }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects requests without creator IP or unlock key", async () => {
    const res = await onRequest({
      request: new Request("https://portfolio.stan-shih.com/api/rum-stats", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "9.9.9.9" },
        body: JSON.stringify({ k: "wrong" }),
      }),
      env: { EDIT_SECRET: "secret", CREATOR_IP: "1.2.3.4", CF_ANALYTICS_TOKEN: "tok" },
    });
    expect(res.status).toBe(403);
  });

  it("returns stats when the unlock key matches", async () => {
    const res = await onRequest({
      request: new Request("https://portfolio.stan-shih.com/api/rum-stats?days=7", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "9.9.9.9" },
        body: JSON.stringify({ k: "secret" }),
      }),
      env: { EDIT_SECRET: "secret", CREATOR_IP: "1.2.3.4", CF_ANALYTICS_TOKEN: "tok" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.days).toBe(7);
    expect(body.vitals[0].lcp_p50).toBe(200);
  });

  it("reports a missing analytics token", async () => {
    const res = await onRequest({
      request: new Request("https://portfolio.stan-shih.com/api/rum-stats", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
        body: JSON.stringify({}),
      }),
      env: { EDIT_SECRET: "secret", CREATOR_IP: "1.2.3.4" },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("CF_ANALYTICS_TOKEN");
  });
});
