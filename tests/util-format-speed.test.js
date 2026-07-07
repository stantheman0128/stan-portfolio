import { describe, it, expect } from "vitest";
import { formatSpeed } from "../src/render/util.js";

describe("formatSpeed", () => {
  it("rounds to whole ms", () => {
    expect(formatSpeed(41.7)).toBe("~42 ms");
  });
  it("floors tiny values to 0", () => {
    expect(formatSpeed(0.3)).toBe("~0 ms");
  });
  it("handles non-finite input", () => {
    expect(formatSpeed(NaN)).toBe("~0 ms");
    expect(formatSpeed(Infinity)).toBe("~0 ms");
  });
});
