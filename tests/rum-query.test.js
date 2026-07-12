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

  it("builds a raw per-visit recent query with aliases and a row cap", () => {
    const q = rumQueries(14);
    expect(q.recent).toContain("SELECT timestamp");
    expect(q.recent).toContain("blob2 AS country");
    expect(q.recent).toContain("blob3 AS path");
    expect(q.recent).toContain("double1 AS ttfb");
    expect(q.recent).toContain("double4 AS load");
    expect(q.recent).toContain("double6 AS lcp");
    expect(q.recent).toContain("INTERVAL '14' DAY");
    expect(q.recent).toContain("ORDER BY timestamp DESC");
    expect(q.recent).toContain("LIMIT 80");
    // unweighted: no _sample_interval aggregation in the raw feed
    expect(q.recent).not.toContain("quantileWeighted");
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

  it("runs four SQL queries and rounds rows, including the recent feed", async () => {
    const stats = await fetchRumStats("token", 1);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(stats.days).toBe(1);
    expect(stats.overall[0].ttfb_p50).toBe(40);
    expect(stats.vitals[0].ttfb_p50).toBe(40);
    expect(stats.byCountry[0].ttfb_p50).toBe(40);
    expect(stats.recent[0].ttfb_p50).toBe(40);
  });

  it("keeps string timestamps intact while rounding latency doubles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              { timestamp: "2026-07-12 08:30:00", country: "TW", path: "/", ttfb: 42.7, load: 810.4, lcp: 0 },
            ],
          }),
      })),
    );
    const stats = await fetchRumStats("token", 7);
    const row = stats.recent[0];
    expect(row.timestamp).toBe("2026-07-12 08:30:00");
    expect(row.ttfb).toBe(43);
    expect(row.load).toBe(810);
    expect(row.country).toBe("TW");
  });
});
