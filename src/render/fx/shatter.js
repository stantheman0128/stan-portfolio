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

// Wire a <canvas> to develop the photo as shards. Returns { setStep, recut }.
// Mask math runs at a capped width (MW) for perf; the canvas is scaled up by CSS.
// Bottom layer is the whole photo blurred; the top layer is the sharp photo
// masked by per-shard alpha (destination-in), so clear shards punch through.
export function createShatterReveal(canvas, imgSrc, opts = {}) {
  const N = 10, MW = 300;
  const steps = opts.steps || 9;
  const reduce = !!opts.reduce;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  let W = MW, H = 0, ready = false, step = 0, raf = 0;
  let cellIndex = null, schedule = null;
  const clarity = new Float32Array(N), target = new Float32Array(N);
  let tmp, tctx, mask, mctx, maskImg;

  function recut() {
    if (!ready) return;
    cellIndex = voronoiCells(W, H, randomSeeds(W, H, N));
    schedule = revealSchedule(N, steps);
    apply(step);
  }
  function apply(n) {
    step = Math.max(0, Math.min(steps, n));
    for (let c = 0; c < N; c++) target[c] = step === 0 ? 0 : schedule[c][step - 1];
    if (reduce) { clarity.set(target); render(); }
    else if (!raf) raf = requestAnimationFrame(anim);
  }
  function anim() {
    raf = 0;
    let moving = false;
    for (let c = 0; c < N; c++) {
      const d = target[c] - clarity[c];
      if (Math.abs(d) > 0.003) { clarity[c] += d * 0.18; moving = true; } else clarity[c] = target[c];
    }
    render();
    if (moving) raf = requestAnimationFrame(anim);
  }
  function render() {
    if (!ready) return;
    const d = maskImg.data;
    for (let p = 0; p < W * H; p++) d[p * 4 + 3] = clarity[cellIndex[p]] * 255;
    mctx.putImageData(maskImg, 0, 0);
    tctx.clearRect(0, 0, W, H);
    tctx.globalCompositeOperation = "source-over";
    tctx.drawImage(img, 0, 0, W, H);
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(mask, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0b0b0d";
    ctx.fillRect(0, 0, W, H);
    ctx.filter = "blur(11px)";
    ctx.drawImage(img, 0, 0, W, H);
    ctx.filter = "none";
    ctx.drawImage(tmp, 0, 0);
  }
  img.onload = () => {
    H = Math.max(1, Math.round(MW * img.naturalHeight / img.naturalWidth));
    canvas.width = W; canvas.height = H;
    tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; tctx = tmp.getContext("2d");
    mask = document.createElement("canvas"); mask.width = W; mask.height = H; mctx = mask.getContext("2d");
    maskImg = mctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { maskImg.data[i * 4] = 255; maskImg.data[i * 4 + 1] = 255; maskImg.data[i * 4 + 2] = 255; }
    ready = true;
    recut();
  };
  img.onerror = () => { ready = false; };
  img.src = imgSrc;

  return { setStep: apply, recut };
}

// Inline-script form for the Minimal theme's <script> injection. The tested
// functions above are serialized (single source of truth, no hand-copied twin)
// into a global window.Shatter that cta.js's inline script can call, the same
// way it reaches window.QUEST. .name keeps the wiring minify-safe.
export const shatterJS = `
${randomSeeds.toString()}
${voronoiCells.toString()}
${revealSchedule.toString()}
${createShatterReveal.toString()}
window.Shatter = { createShatterReveal: ${createShatterReveal.name} };
`;
