import { describe, it, expect } from "vitest";
import { makeHistory } from "../src/studio/history.js";

describe("makeHistory", () => {
  it("commits, undoes, and redoes", () => {
    const h = makeHistory("A");
    h.commit("B"); h.commit("C");
    expect(h.undo()).toBe("B");
    expect(h.undo()).toBe("A");
    expect(h.undo()).toBe(null);
    expect(h.redo()).toBe("B");
    expect(h.redo()).toBe("C");
    expect(h.redo()).toBe(null);
  });
  it("no-ops on an unchanged commit", () => {
    const h = makeHistory("A");
    h.commit("A");
    expect(h.canUndo()).toBe(false);
  });
  it("a new commit after undo clears the redo future", () => {
    const h = makeHistory("A");
    h.commit("B");
    h.undo();
    h.commit("C");
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBe("A");
  });
  it("caps history length", () => {
    const h = makeHistory("0", 3);
    for (let i = 1; i <= 10; i++) h.commit(String(i));
    let n = 0; while (h.undo() !== null) n++;
    expect(n).toBe(3);
  });
});
