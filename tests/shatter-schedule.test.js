import { describe, it, expect } from "vitest";
import { pinnedSeeds, flipOrder, developAlphas } from "../src/render/fx/shatter.js";

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("pinnedSeeds", () => {
  const box = { x: 0.3, y: 0.1, w: 0.4, h: 0.4 };
  it("returns steps + 2 seeds", () => {
    expect(pinnedSeeds(300, 360, 8, box, mulberry(1)).length).toBe(10);
  });
  it("pins exactly the first two seeds inside the face box", () => {
    const seeds = pinnedSeeds(300, 360, 8, box, mulberry(2));
    const inBox = (s) => s.x >= 90 && s.x <= 210 && s.y >= 36 && s.y <= 180;
    expect(inBox(seeds[0])).toBe(true);
    expect(inBox(seeds[1])).toBe(true);
    for (const s of seeds.slice(2)) expect(inBox(s)).toBe(false);
  });
});

describe("flipOrder", () => {
  it("is a permutation of 1..steps", () => {
    const order = flipOrder(8, mulberry(3));
    expect([...order].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("varies with the rng", () => {
    expect(flipOrder(8, mulberry(4))).not.toEqual(flipOrder(8, mulberry(9)));
  });
});

describe("developAlphas", () => {
  it("fades sepia in first, full color second", () => {
    expect(developAlphas(0)).toEqual({ sepia: 0, full: 0 });
    expect(developAlphas(0.5)).toEqual({ sepia: 1, full: 0 });
    expect(developAlphas(1)).toEqual({ sepia: 1, full: 1 });
    expect(developAlphas(0.25).sepia).toBeCloseTo(0.5, 6);
    expect(developAlphas(0.75).full).toBeCloseTo(0.5, 6);
  });
  it("clamps outside 0..1", () => {
    expect(developAlphas(-1)).toEqual({ sepia: 0, full: 0 });
    expect(developAlphas(2)).toEqual({ sepia: 1, full: 1 });
  });
});
