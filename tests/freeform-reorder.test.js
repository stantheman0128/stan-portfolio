import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { moveInArray } from "../src/studio/freeform.js";

describe("moveInArray", () => {
  it("moves an element forward to a later final index", () => {
    expect(moveInArray(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });
  it("moves an element backward to an earlier final index", () => {
    expect(moveInArray(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
  it("adjacent swap up (↑ button: from i to i-1)", () => {
    expect(moveInArray(["a", "b", "c"], 1, 0)).toEqual(["b", "a", "c"]);
  });
  it("adjacent swap down (↓ button: from i to i+1)", () => {
    expect(moveInArray(["a", "b", "c"], 1, 2)).toEqual(["a", "c", "b"]);
  });
  it("is a no-op when from === to", () => {
    expect(moveInArray(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
  it("returns a copy on out-of-range indices without throwing", () => {
    expect(moveInArray(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(moveInArray(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
  it("does not mutate the input array", () => {
    const src = ["a", "b", "c"];
    moveInArray(src, 0, 2);
    expect(src).toEqual(["a", "b", "c"]);
  });
});

// The drag drop maths in buildOrderPanel converts a "before/after row i" insertion
// slot into a final index for moveInArray. Reproduce that conversion here to lock in
// the intended drop behaviour (source of truth: src/studio/freeform.js drop handler).
function dropToFinalIndex(from, i, after, len) {
  const insertPos = after ? i + 1 : i;
  const to = from < insertPos ? insertPos - 1 : insertPos;
  return Math.max(0, Math.min(len - 1, to));
}

describe("order panel drop conversion", () => {
  const items = ["a", "b", "c", "d"];
  it("drag item 0 to before item 2 lands it just before c", () => {
    const to = dropToFinalIndex(0, 2, false, items.length);
    expect(moveInArray(items, 0, to)).toEqual(["b", "a", "c", "d"]);
  });
  it("drag item 0 to after the last item appends it to the end", () => {
    const to = dropToFinalIndex(0, 3, true, items.length);
    expect(moveInArray(items, 0, to)).toEqual(["b", "c", "d", "a"]);
  });
  it("drag item 3 to before item 1 lands it just before b", () => {
    const to = dropToFinalIndex(3, 1, false, items.length);
    expect(moveInArray(items, 3, to)).toEqual(["a", "d", "b", "c"]);
  });
});

describe("freeform order panel wiring", () => {
  const src = readFileSync(new URL("../src/studio/freeform.js", import.meta.url), "utf8");
  it("exposes an Order toggle button in the toolbar", () => {
    expect(src).toContain('mkBtn("↕ Order"');
  });
  it("keeps the panel open across render() via a module flag", () => {
    expect(src).toContain("if (orderPanelOpen) buildOrderPanel();");
  });
  it("tags the panel as chrome so it is excluded from editing and hover", () => {
    expect(src).toMatch(/panel\.setAttribute\("data-ff-chrome", ""\)/);
  });
  it("re-renders with a commit after a reorder", () => {
    expect(src).toMatch(/commitNow\(\);\s*render\("Reordered items"\)/);
  });
  it("debounces hover retargeting between cards", () => {
    expect(src).toContain("RETARGET_MS");
    expect(src).toContain("pendingTarget = cand");
  });
});
