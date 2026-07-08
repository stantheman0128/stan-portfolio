import { describe, it, expect } from "vitest";
import { rateJS } from "../src/render/fx/rate.js";

describe("rateJS creator gate", () => {
  it("uses the local can-edit flag, not whoami", () => {
    expect(rateJS).toContain("can-edit");
    expect(rateJS).not.toContain("/api/whoami");
  });
  it("still defines initRatings for normal visitors", () => {
    expect(rateJS).toContain("function initRatings");
  });
});
