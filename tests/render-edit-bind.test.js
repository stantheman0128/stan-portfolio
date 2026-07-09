import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));

describe("minimal edit-mode data-bind", () => {
  const edit = renderSite(content, "minimal", { edit: true });
  const plain = renderSite(content, "minimal");

  it("binds profile fields", () => {
    expect(edit).toContain('data-bind="profile.tagline"');
    expect(edit).toContain('data-bind="profile.subtagline"');
    expect(edit).toContain('data-bind="profile.name"');
  });
  it("binds item fields with indices", () => {
    expect(edit).toContain('data-bind="items.0.title"');
    expect(edit).toContain('data-bind="items.0.description"');
    expect(edit).toContain('data-bind="items.0.detail" data-edit="md"');
    expect(edit).toContain('data-bind="items.0.image" data-edit="image"');
  });
  it("uses the true content index, not the filtered index", () => {
    // content index 8 = site-featherweight, which minimal SHOWS (it excludes only
    // itself, site-minimal at index 9). So items.8 must appear, items.9 must not.
    expect(edit).toContain('data-bind="items.8.title"');
    expect(edit).not.toContain('data-bind="items.9');
  });
  it("binds patent fields", () => {
    expect(edit).toContain('data-bind="patent.title"');
    expect(edit).toContain('data-bind="patent.blurb"');
  });
  it("emits NO data-bind when not editing", () => {
    expect(plain).not.toContain("data-bind");
  });
  it("drops interactive fx scripts in edit mode", () => {
    expect(edit).not.toContain("window.QUEST");
    expect(plain).toContain("window.QUEST");
  });
});

describe("featherweight edit-mode data-bind", () => {
  const edit = renderSite(content, "featherweight", { edit: true });
  const plain = renderSite(content, "featherweight");

  it("binds representative fields", () => {
    expect(edit).toContain('data-bind="profile.name"');
    expect(edit).toContain('data-bind="profile.tagline"');
    expect(edit).toContain('data-bind="items.0.title"');
    expect(edit).toContain('data-bind="items.0.detail" data-edit="md"');
    expect(edit).toContain('data-bind="patent.title"');
  });
  it("uses the true content index (site-minimal is index 9)", () => {
    expect(edit).toContain('data-bind="items.9.title"');
    expect(edit).not.toContain('data-bind="items.8');
  });
  it("stays clean when not editing", () => {
    expect(plain).not.toContain("data-bind");
  });
});
