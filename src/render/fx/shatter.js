// Shatter reveal: the reward photo is split into N irregular Voronoi shards,
// each with its own random develop schedule, so some shards stay blurred until
// the very last unlock. Pure geometry helpers here; DOM/canvas wiring is added
// in createShatterReveal below.

export function randomSeeds(w, h, n, rnd = Math.random) {
  const s = [];
  for (let i = 0; i < n; i++) s.push({ x: rnd() * w, y: rnd() * h });
  return s;
}

// For each pixel, the index of the nearest seed. Returns a flat Uint8Array of
// length w*h (row-major). N is expected small (<= ~16), so a linear scan wins.
export function voronoiCells(w, h, seeds) {
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let bd = Infinity, bi = 0;
      for (let j = 0; j < seeds.length; j++) {
        const dx = x - seeds[j].x, dy = y - seeds[j].y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bi = j; }
      }
      cells[y * w + x] = bi;
    }
  }
  return cells;
}

// One cumulative-clarity curve per cell across `steps` unlocks. Each step's
// increment is random, so cells develop at different paces; the last step is
// pinned to 1 so every shard is fully sharp once exploration completes.
export function revealSchedule(cellCount, steps, rnd = Math.random) {
  const out = [];
  for (let c = 0; c < cellCount; c++) {
    const inc = [];
    let sum = 0;
    for (let s = 0; s < steps; s++) { const v = 0.15 + rnd(); inc.push(v); sum += v; }
    let cum = 0;
    const row = [];
    for (let s = 0; s < steps; s++) { cum += inc[s] / sum; row.push(cum); }
    row[steps - 1] = 1;
    out.push(row);
  }
  return out;
}
