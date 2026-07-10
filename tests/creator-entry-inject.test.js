import { describe, it, expect } from "vitest";
import { creatorEntryJS } from "../src/render/fx/creator-entry.js";

describe("creatorEntryJS", () => {
  it("does the unlock POST and reads the can-edit flag", () => {
    expect(creatorEntryJS).toContain("/api/unlock");
    expect(creatorEntryJS).toContain("can-edit");
  });
  it("loads /editor.js on the Edit button, not a page nav", () => {
    expect(creatorEntryJS).toContain("/editor.js");
    expect(creatorEntryJS).not.toContain('href = "/edit"');
  });
  it("offers an owner RUM panel backed by /api/rum-stats", () => {
    expect(creatorEntryJS).toContain("cst-rum-btn");
    expect(creatorEntryJS).toContain("/api/rum-stats");
    expect(creatorEntryJS).toContain("edit-key");
    expect(creatorEntryJS).toContain("function metricCard");
    expect(creatorEntryJS).toContain("var METRIC");
  });
  it("keeps bottom offsets parseable (semicolon before bottom: in cssText)", () => {
    expect(creatorEntryJS).toMatch(/box-shadow:[^"]+;\s*"/);
    expect(creatorEntryJS).toContain('BTN + "bottom:14px"');
    expect(creatorEntryJS).toContain('BTN + "bottom:58px"');
  });
  it("keeps ?unlock= in the URL after a successful verify", () => {
    expect(creatorEntryJS).toMatch(/showButtons\(\);\s*ensureDevUrl\(\);\s*\} else \{/);
    expect(creatorEntryJS).toContain("function ensureDevUrl()");
  });
  it("is a self-invoking string with no import/export", () => {
    expect(creatorEntryJS).toContain("(function");
    expect(creatorEntryJS).not.toContain("import ");
  });
});
