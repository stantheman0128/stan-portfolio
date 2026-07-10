import { describe, it, expect } from "vitest";
import { ctaJS } from "../src/render/fx/cta.js";

describe("cta shatter wiring", () => {
  it("passes a face box and drives steps from watched count", () => {
    expect(ctaJS).toContain("faceBox");
    expect(ctaJS).toContain("setStep(q.watched.length)");
    expect(ctaJS).not.toContain("setStep(q.total)");
  });
  it("opens the face only on catch", () => {
    expect(ctaJS).toContain("revealFace()");
  });
});
