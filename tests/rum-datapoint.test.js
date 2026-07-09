import { describe, it, expect } from "vitest";
import { buildRumDataPoint } from "../functions/_lib/rum.js";

// The /api/rum Function turns a beacon body + Cloudflare request.cf into an
// Analytics Engine data point. The write API is strict (<=20 doubles, exactly one
// index <=96 bytes, blobs are strings), so pin the mapping and the sanitizing here.
describe("RUM data point builder", () => {
  it("maps timings to doubles and geo/context to blobs", () => {
    const dp = buildRumDataPoint(
      { path: "/", ttfb: 90, fcp: 120, dcl: 200, load: 240, rtt: 50, conn: "4g" },
      { colo: "TPE", country: "TW" },
    );
    expect(dp.blobs).toEqual(["TPE", "TW", "/", "4g"]);
    expect(dp.doubles).toEqual([90, 120, 200, 240, 50]);
    expect(dp.indexes).toEqual(["TW"]);
  });

  it("sanitizes non-numbers, negatives and Infinity to 0", () => {
    const dp = buildRumDataPoint(
      { ttfb: -5, fcp: "x", dcl: NaN, load: undefined, rtt: Infinity },
      {},
    );
    expect(dp.doubles).toEqual([0, 0, 0, 0, 0]);
  });

  it("defaults country to unknown and caps the path blob", () => {
    const dp = buildRumDataPoint({ path: "x".repeat(500) }, {});
    expect(dp.indexes).toEqual(["unknown"]);
    expect(dp.blobs[1]).toBe("unknown");
    expect(dp.blobs[2].length).toBeLessThanOrEqual(256);
  });

  it("always emits exactly one index within 96 bytes", () => {
    const dp = buildRumDataPoint({}, { country: "z".repeat(200) });
    expect(dp.indexes.length).toBe(1);
    expect(dp.indexes[0].length).toBeLessThanOrEqual(96);
  });

  it("tolerates missing body and cf entirely", () => {
    const dp = buildRumDataPoint(undefined, undefined);
    expect(dp.doubles).toEqual([0, 0, 0, 0, 0]);
    expect(dp.indexes).toEqual(["unknown"]);
  });
});
