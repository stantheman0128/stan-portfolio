import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { creatorEntryJS } from "../src/render/fx/creator-entry.js";

const freeform = readFileSync(new URL("../src/studio/freeform.js", import.meta.url), "utf8");

describe("creator-entry key persistence", () => {
  it("persists the edit key to localStorage on unlock", () => {
    expect(creatorEntryJS).toContain("localStorage.setItem(SESSION_KEY, k)");
  });
  it("exposes a readEditKey helper that prefers localStorage over sessionStorage", () => {
    expect(creatorEntryJS).toContain("function readEditKey");
    expect(creatorEntryJS).toMatch(
      /localStorage\.getItem\(SESSION_KEY\)[\s\S]*sessionStorage\.getItem\(SESSION_KEY\)/,
    );
  });
  it("reads the RUM key via readEditKey, not a bare sessionStorage read", () => {
    expect(creatorEntryJS).toContain("key = readEditKey()");
  });
});

describe("freeform publish sends the key", () => {
  it("has a readEditKey helper preferring localStorage", () => {
    expect(freeform).toContain("function readEditKey");
    expect(freeform).toMatch(
      /localStorage\.getItem\("edit-key"\)[\s\S]*sessionStorage\.getItem\("edit-key"\)/,
    );
  });
  it("includes k in the /api/publish body", () => {
    expect(freeform).toMatch(/JSON\.stringify\(\{[^}]*k:\s*readEditKey\(\)/);
  });
});
