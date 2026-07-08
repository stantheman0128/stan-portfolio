import { describe, it, expect } from "vitest";
import { bindAttr } from "../src/render/util.js";

describe("bindAttr", () => {
  it("is empty when not editing", () => {
    expect(bindAttr("profile.name", false)).toBe("");
    expect(bindAttr("profile.name", undefined)).toBe("");
  });
  it("emits a leading-space data-bind attribute when editing", () => {
    expect(bindAttr("profile.name", true)).toBe(' data-bind="profile.name"');
  });
  it("adds data-edit when a kind is given", () => {
    expect(bindAttr("items.0.detail", true, "md")).toBe(' data-bind="items.0.detail" data-edit="md"');
  });
});
