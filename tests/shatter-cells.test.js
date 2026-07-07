import { describe, it, expect } from "vitest";
import { voronoiCells, randomSeeds } from "../src/render/fx/shatter.js";

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("voronoiCells", () => {
  it("assigns every pixel to the nearest of N seeds", () => {
    const seeds = [{ x: 0, y: 0 }, { x: 9, y: 9 }];
    const cells = voronoiCells(10, 10, seeds);
    expect(cells.length).toBe(100);
    expect(cells[0]).toBe(0);
    expect(cells[99]).toBe(1);
  });
  it("uses every seed at least once for spread seeds", () => {
    const seeds = randomSeeds(40, 40, 10, mulberry(1));
    const cells = voronoiCells(40, 40, seeds);
    const used = new Set(cells);
    expect(used.size).toBe(10);
  });
});
