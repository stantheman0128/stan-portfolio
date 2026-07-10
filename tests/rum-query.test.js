import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rumDays, rumQueries, roundRumRow, fetchRumStats } from "../functions/_lib/rum-query.js";

describe("rumQueries", () => {
  it("clamps days between 1 and 30", () => {
    expect(rumDays(0)).toBe(1);
    expect(rumDays(7)).toBe(7);
    expect(rumDays(99)).toBe(30);
    expect(rumDays("bad")).toBe(1);
  });

  it("embeds the clamped day span in SQL", () => {
    const q = rumQueries(7);
    expect(q.span).toBe(7);
    expect(q.overall).toContain("INTERVAL '7' DAY");
    expect(q.vitals).toContain("double6 > 0");
  });
});

describe("roundRumRow", () => {
  it("rounds numeric fields", () => {
    expect(roundRumRow({ ttfb_p50: 12.6, country: "TW" })).toEqual({
      ttfb_p50: 13,
      country: "TW",
    });
  });
});

describe("fetchRumStats", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({ data: [{ visits: 2, ttfb_p50: 40.2 }] }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs three SQL queries and rounds rows", async () => {
    const stats = await fetchRumStats("token", 1);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(stats.days).toBe(1);
    expect(stats.overall[0].ttfb_p50).toBe(40);
    expect(stats.vitals[0].ttfb_p50).toBe(40);
    expect(stats.byCountry[0].ttfb_p50).toBe(40);
  });
});
