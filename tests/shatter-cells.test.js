import { describe, it, expect } from "vitest";
import { voronoiCells, pinnedSeeds, clampFaceBox } from "../src/render/fx/shatter.js";

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
    const seeds = pinnedSeeds(40, 40, 8, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, mulberry(1));
    const cells = voronoiCells(40, 40, seeds);
    expect(new Set(cells).size).toBe(10);
  });
});

describe("clampFaceBox", () => {
  const box = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }; // 20x20 grid => box x,y in [5,15]

  it("leaves the face box owned ONLY by the two face shards", () => {
    // seeds[2] sits just outside the box's right edge and, by raw Voronoi, would
    // own box-edge pixels (the leak). clampFaceBox must reclaim them for 0/1.
    const seeds = [{ x: 7, y: 7 }, { x: 12, y: 12 }, { x: 16, y: 10 }, { x: 3, y: 3 }];
    const w = 20, h = 20;
    const raw = voronoiCells(w, h, seeds);
    expect(raw[10 * w + 15]).toBe(2); // pre-clamp: an outside shard leaks into the box
    const cells = clampFaceBox(voronoiCells(w, h, seeds), w, h, box, seeds);
    for (let y = 5; y <= 15; y++) {
      for (let x = 5; x <= 15; x++) {
        expect(cells[y * w + x]).toBeLessThanOrEqual(1);
      }
    }
  });

  it("does not disturb pixels outside the box", () => {
    const seeds = [{ x: 7, y: 7 }, { x: 12, y: 12 }, { x: 18, y: 18 }, { x: 1, y: 18 }];
    const w = 20, h = 20;
    const raw = voronoiCells(w, h, seeds);
    const clamped = clampFaceBox(voronoiCells(w, h, seeds), w, h, box, seeds);
    expect(clamped[18 * w + 18]).toBe(raw[18 * w + 18]); // far corner untouched
    expect(clamped[18 * w + 1]).toBe(raw[18 * w + 1]);
    expect(new Set(clamped).size).toBeGreaterThan(2); // outside shards survive
  });
});
