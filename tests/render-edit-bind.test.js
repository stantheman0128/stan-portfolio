import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));
// Indices resolved dynamically: the owner reorders/deletes items in the live
// editor, so hard-coded positions would break on every content edit.
const fwIdx = content.items.findIndex((it) => it.id === "site-featherweight");
const minIdx = content.items.findIndex((it) => it.id === "site-minimal");

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
    // minimal SHOWS the featherweight card and excludes only itself, so the
    // featherweight card must be bound at its TRUE index and the minimal card
    // must not appear at all.
    expect(edit).toContain(`data-bind="items.${fwIdx}.title"`);
    expect(edit).not.toContain(`data-bind="items.${minIdx}.title"`);
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
  it("uses the true content index for the cross-theme cards", () => {
    expect(edit).toContain(`data-bind="items.${minIdx}.title"`);
    expect(edit).not.toContain(`data-bind="items.${fwIdx}.title"`);
  });
  it("stays clean when not editing", () => {
    expect(plain).not.toContain("data-bind");
  });
});
