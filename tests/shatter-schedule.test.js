import { describe, it, expect } from "vitest";
import { revealSchedule } from "../src/render/fx/shatter.js";

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("revealSchedule", () => {
  it("each cell reaches exactly 1 at the last step", () => {
    const sched = revealSchedule(10, 9, mulberry(2));
    expect(sched.length).toBe(10);
    for (const row of sched) {
      expect(row.length).toBe(9);
      expect(row[8]).toBeCloseTo(1, 6);
    }
  });
  it("is monotonically non-decreasing per cell", () => {
    const sched = revealSchedule(10, 9, mulberry(3));
    for (const row of sched) {
      for (let i = 1; i < row.length; i++) expect(row[i]).toBeGreaterThanOrEqual(row[i - 1]);
    }
  });
});
