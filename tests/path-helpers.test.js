import { describe, it, expect } from "vitest";
import { getPath, setPath } from "../src/render/util.js";

describe("getPath", () => {
  const o = { profile: { name: "Stan" }, items: [{ title: "A" }, { title: "B" }] };
  it("reads a nested object path", () => {
    expect(getPath(o, "profile.name")).toBe("Stan");
  });
  it("reads an array index path", () => {
    expect(getPath(o, "items.1.title")).toBe("B");
  });
  it("returns undefined for a missing branch (no throw)", () => {
    expect(getPath(o, "about.paragraphs.0")).toBe(undefined);
  });
});

describe("setPath", () => {
  it("writes a nested object path in place", () => {
    const o = { profile: { name: "old" } };
    setPath(o, "profile.name", "new");
    expect(o.profile.name).toBe("new");
  });
  it("writes an array index path", () => {
    const o = { items: [{ title: "A" }] };
    setPath(o, "items.0.title", "Z");
    expect(o.items[0].title).toBe("Z");
  });
  it("creates missing steps: array when next key is numeric, object otherwise", () => {
    const o = {};
    setPath(o, "items.0.title", "hi");
    expect(Array.isArray(o.items)).toBe(true);
    expect(o.items[0].title).toBe("hi");
  });
  it("returns the root object", () => {
    const o = {};
    expect(setPath(o, "a.b", 1)).toBe(o);
  });
});
