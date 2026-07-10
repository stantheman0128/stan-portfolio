// Shatter reveal: the reward photo is split into N irregular Voronoi shards over
// an opaque grey-green emulsion base (a just-ejected polaroid), so covered
// pixels leak nothing. Shards flip one per unlock step, developing dark ->
// sepia -> full color; two pinned face shards open only on the catch click.
// Pure geometry helpers here; DOM/canvas wiring is added in createShatterReveal.

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

// N = steps + 2 seeds: the first two are pinned inside the fractional face
// box (they open only on the catch click); the rest land outside it, so the
// face region can never develop early by luck.
export function pinnedSeeds(w, h, steps, faceBox, rnd = Math.random) {
  const bx = faceBox.x * w, by = faceBox.y * h, bw = faceBox.w * w, bh = faceBox.h * h;
  const seeds = [
    { x: bx + bw * (0.2 + rnd() * 0.25), y: by + bh * (0.25 + rnd() * 0.25) },
    { x: bx + bw * (0.55 + rnd() * 0.25), y: by + bh * (0.5 + rnd() * 0.25) },
  ];
  let guard = 0;
  while (seeds.length < steps + 2 && guard++ < 1000) {
    const x = rnd() * w, y = rnd() * h;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) continue;
    seeds.push({ x, y });
  }
  while (seeds.length < steps + 2) seeds.push({ x: rnd() * w, y: h - 1 });
  return seeds;
}

// Voronoi alone can't protect the face: a non-face seed placed just outside the
// box still owns box pixels near the edge, so those shards leak the face when
// they flip. Reassign every pixel inside the fractional box to the nearer of the
// two pinned face seeds (cells 0,1), which stay shut until the catch. Now the
// whole box is face-shard, and nothing develops there early.
export function clampFaceBox(cells, w, h, faceBox, seeds) {
  const bx = faceBox.x * w, by = faceBox.y * h, bw = faceBox.w * w, bh = faceBox.h * h;
  for (let y = 0; y < h; y++) {
    if (y < by || y > by + bh) continue;
    for (let x = 0; x < w; x++) {
      if (x < bx || x > bx + bw) continue;
      const dx0 = x - seeds[0].x, dy0 = y - seeds[0].y;
      const dx1 = x - seeds[1].x, dy1 = y - seeds[1].y;
      cells[y * w + x] = dx0 * dx0 + dy0 * dy0 <= dx1 * dx1 + dy1 * dy1 ? 0 : 1;
    }
  }
  return cells;
}

// One flip per progress step: a permutation of 1..steps, so shard i (of the
// non-face shards) opens exactly when the visitor finishes step order[i].
export function flipOrder(steps, rnd = Math.random) {
  const a = [];
  for (let i = 1; i <= steps; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Develop ramp for one shard: the first half of d fades the sepia layer in
// over the emulsion, the second half fades full color over the sepia.
export function developAlphas(d) {
  const t = Math.max(0, Math.min(1, d));
  return { sepia: Math.min(1, t * 2), full: Math.max(0, t * 2 - 1) };
}

// Wire a <canvas> to reveal the photo as emulsion shards. Undeveloped area is
// an OPAQUE grey-green emulsion (a just-ejected polaroid), so covered pixels
// carry zero information. A flipped shard develops dark -> warm sepia -> full
// color via two masked photo layers. Mask math runs at a capped width (MW);
// the canvas is scaled up by CSS.
export function createShatterReveal(canvas, imgSrc, opts = {}) {
  const MW = 300;
  const steps = opts.steps || 9;
  const reduce = !!opts.reduce;
  const faceBox = opts.faceBox || { x: 0.3, y: 0.12, w: 0.4, h: 0.38 };
  const N = steps + 2;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  let W = MW, H = 0, ready = false, step = 0, faceOpen = false, raf = 0;
  let cellIndex = null, stepOf = null;
  const dNow = new Float32Array(N), dGoal = new Float32Array(N);
  let base, sepia, tmp, tctx, mask, mctx, maskImg;

  function recut() {
    if (!ready) return;
    const seeds = pinnedSeeds(W, H, steps, faceBox);
    cellIndex = clampFaceBox(voronoiCells(W, H, seeds), W, H, faceBox, seeds);
    const order = flipOrder(steps);
    stepOf = [Infinity, Infinity];
    for (let i = 0; i < steps; i++) stepOf.push(order[i]);
    paintEmulsion();
    apply(step);
  }

  // Flat emulsion with a small deterministic per-shard tone shift, so the
  // undeveloped surface reads as physical pieces instead of one slab.
  function paintEmulsion() {
    const bctx = base.getContext("2d");
    const px = bctx.createImageData(W, H);
    const tones = [];
    for (let c = 0; c < N; c++) tones.push(((c * 53) % 17) - 8);
    for (let p = 0; p < W * H; p++) {
      const t = tones[cellIndex[p]];
      px.data[p * 4] = 58 + t;
      px.data[p * 4 + 1] = 66 + t;
      px.data[p * 4 + 2] = 59 + t;
      px.data[p * 4 + 3] = 255;
    }
    bctx.putImageData(px, 0, 0);
  }

  function apply(n) {
    step = Math.max(0, Math.min(steps, n));
    // cta.js may call setStep before the reward image's onload runs recut(),
    // so stepOf/cellIndex aren't cut yet. Keep the step; recut() re-applies it.
    if (!ready || !stepOf) return;
    for (let c = 0; c < N; c++) {
      dGoal[c] = c < 2 ? (faceOpen ? 1 : 0) : (stepOf[c] <= step ? 1 : 0);
    }
    if (reduce) { dNow.set(dGoal); render(); }
    else if (!raf) raf = requestAnimationFrame(anim);
  }

  function anim() {
    raf = 0;
    let moving = false;
    for (let c = 0; c < N; c++) {
      const dd = dGoal[c] - dNow[c];
      if (Math.abs(dd) > 0.003) { dNow[c] += dd * 0.1; moving = true; } else dNow[c] = dGoal[c];
    }
    render();
    if (moving) raf = requestAnimationFrame(anim);
  }

  function layer(src, alpha) {
    const d = maskImg.data;
    for (let p = 0; p < W * H; p++) d[p * 4 + 3] = alpha[cellIndex[p]];
    mctx.putImageData(maskImg, 0, 0);
    tctx.clearRect(0, 0, W, H);
    tctx.globalCompositeOperation = "source-over";
    tctx.drawImage(src, 0, 0, W, H);
    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(mask, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  }

  function render() {
    if (!ready) return;
    const aS = [], aF = [];
    for (let c = 0; c < N; c++) {
      const a = developAlphas(dNow[c]);
      aS.push(a.sepia * 255);
      aF.push(a.full * 255);
    }
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
    layer(sepia, aS);
    layer(img, aF);
  }

  img.onload = () => {
    H = Math.max(1, Math.round(MW * img.naturalHeight / img.naturalWidth));
    canvas.width = W; canvas.height = H;
    base = document.createElement("canvas"); base.width = W; base.height = H;
    sepia = document.createElement("canvas"); sepia.width = W; sepia.height = H;
    const sctx = sepia.getContext("2d");
    sctx.filter = "brightness(0.5) sepia(0.7) saturate(0.55)";
    sctx.drawImage(img, 0, 0, W, H);
    sctx.filter = "none";
    tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H; tctx = tmp.getContext("2d");
    mask = document.createElement("canvas"); mask.width = W; mask.height = H; mctx = mask.getContext("2d");
    maskImg = mctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { maskImg.data[i * 4] = 255; maskImg.data[i * 4 + 1] = 255; maskImg.data[i * 4 + 2] = 255; }
    ready = true;
    recut();
  };
  img.onerror = () => { ready = false; };
  img.src = imgSrc;

  return {
    setStep: apply,
    revealFace() { faceOpen = true; apply(step); },
    recut,
  };
}

// Inline-script form for the Minimal theme's <script> injection. The tested
// functions above are serialized (single source of truth, no hand-copied twin)
// into a global window.Shatter that cta.js's inline script can call, the same
// way it reaches window.QUEST. .name keeps the wiring minify-safe.
export const shatterJS = `
${pinnedSeeds.toString()}
${flipOrder.toString()}
${developAlphas.toString()}
${voronoiCells.toString()}
${clampFaceBox.toString()}
${createShatterReveal.toString()}
window.Shatter = { createShatterReveal: ${createShatterReveal.name} };
`;
