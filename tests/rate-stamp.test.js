import { describe, it, expect } from "vitest";
import { stampAngle, rateStripHTML, rateJS, rateCSS } from "../src/render/fx/rate.js";

describe("stampAngle", () => {
  it("is deterministic per id", () => {
    expect(stampAngle("colonist-tracker")).toBe(stampAngle("colonist-tracker"));
  });
  it("stays within ±4 degrees and never 0", () => {
    for (const id of ["a", "etf-tracker", "line-notify", "course", "antnest", "x1", "x2", "x3"]) {
      const a = stampAngle(id);
      expect(Math.abs(a)).toBeLessThanOrEqual(4);
      expect(a).not.toBe(0);
    }
  });
});

describe("rate v4 markup", () => {
  it("renders a stamp button and note in the done state", () => {
    const html = rateStripHTML("demo");
    expect(html).toContain("rate-stamp");
    expect(html).toContain("rate-note");
  });
  it("keeps radiogroup semantics and stamp labels", () => {
    const html = rateStripHTML("demo");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Stamp 7 of 10"');
  });
  it("gates the stamp animation behind reduced-motion", () => {
    expect(rateCSS).toContain("prefers-reduced-motion");
  });
  it("serializes stampAngle into the inline script", () => {
    expect(rateJS).toContain("function stampAngle");
  });
});
