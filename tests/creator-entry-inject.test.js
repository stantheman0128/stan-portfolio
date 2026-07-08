import { describe, it, expect } from "vitest";
import { creatorEntryJS } from "../src/render/fx/creator-entry.js";

describe("creatorEntryJS", () => {
  it("fetches whoami and links to /edit", () => {
    expect(creatorEntryJS).toContain("/api/whoami");
    expect(creatorEntryJS).toContain('a.href = "/edit"');
  });
  it("is a self-invoking string with no import/export", () => {
    expect(creatorEntryJS).toContain("(function");
    expect(creatorEntryJS).not.toContain("import ");
  });
});
