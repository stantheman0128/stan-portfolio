import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));

describe("featherweight paint behavior", () => {
  const html = renderSite(content, "featherweight");

  it("does not hide or stagger hero content behind a reveal animation", () => {
    expect(html).not.toMatch(/\.hero\s*>\s*\*\{[^}]*animation/);
    expect(html).not.toContain("@keyframes fwrise");
  });

  it("reserves the speed readout's final layout space before it becomes visible", () => {
    expect(html).toMatch(
      /\.fw-speed\{[^}]*display:inline-flex[^}]*visibility:hidden[^}]*min-height:2\.3rem/
    );
    expect(html).toContain(".fw-speed.on{visibility:visible}");
    expect(html).not.toContain(".fw-speed{display:none}");
  });
});
