# Emulsion-Shard Unlock + Rubber-Stamp Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blur-based photo develop with opaque emulsion shards (face opens only on catch) and restyle per-project ratings as a rubber stamp + taped paper-strip wall.

**Architecture:** All changes live in the Minimal theme's inline-script fx layer (`src/render/fx/`). shatter.js keeps its "pure exported functions + serialized `shatterJS` string" pattern; the blurred base layer becomes an opaque emulsion layer, continuous clarity curves become discrete per-step flips, and two face shards open only via a new `revealFace()` API that cta.js calls on the catch click. rate.js keeps its strip/wall data flow and API calls untouched; only markup, CSS, and the done-state rendering change. Backend (`functions/api/rating.js`) is not touched.

**Tech Stack:** Vanilla JS inline scripts (serialized via `.toString()`), canvas 2D, vitest, vite.

**Spec:** `docs/superpowers/specs/2026-07-10-unlock-rating-redesign-design.md`

## Global Constraints

- Work in the `C:/Users/stans/Projects/_claude_worktrees/portfolio-layout` worktree on branch `feat/unlock-rating-redesign` (created in Task 1). NEVER touch the primary checkout at `Projects/stan-portfolio` — it holds `feat/paper-stan-alive`, in flight in another session.
- Minimal theme only. Featherweight untouched; `node tools/abe-check.mjs` must stay 9/9.
- No backend changes: POST/GET `/api/rating` shapes untouched.
- The photo stays a public asset (`/assets/reward-photo.jpg`); this is presentation, not secrecy.
- `prefers-reduced-motion`: identical coverage/logic, animations snap or are disabled.
- `git add` explicit paths only. Commit messages end with `Co-Authored-By:` trailer per house style.
- Run all test commands from the worktree root.

---

### Task 1: Shatter geometry — `pinnedSeeds`, `flipOrder`, `developAlphas` (add-only)

**Files:**
- Modify: `src/render/fx/shatter.js` (add three exported functions; delete nothing yet)
- Test: `tests/shatter-schedule.test.js` (replace file contents)

**Interfaces:**
- Consumes: nothing new.
- Produces (Task 2 relies on these exact signatures):
  - `pinnedSeeds(w, h, steps, faceBox, rnd = Math.random) -> Array<{x,y}>` of length `steps + 2`; indices 0-1 inside `faceBox` (fractional `{x,y,w,h}`), the rest outside.
  - `flipOrder(steps, rnd = Math.random) -> number[]` — a permutation of `1..steps`.
  - `developAlphas(d) -> { sepia: number, full: number }` — sepia ramps over d∈[0,0.5], full color over d∈[0.5,1]; clamped.

- [ ] **Step 1: Create the branch**

```bash
cd "C:/Users/stans/Projects/_claude_worktrees/portfolio-layout"
git checkout -b feat/unlock-rating-redesign
```

- [ ] **Step 2: Replace `tests/shatter-schedule.test.js` with the failing tests**

```js
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/shatter-schedule.test.js`
Expected: FAIL — `pinnedSeeds` / `flipOrder` / `developAlphas` are not exported.

- [ ] **Step 4: Add the three functions to `src/render/fx/shatter.js`** (below `voronoiCells`, above `createShatterReveal`; keep `randomSeeds`/`revealSchedule` in place for now — Task 2 removes them)

```js
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
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/shatter-schedule.test.js`
Expected: PASS (6 tests). Then run the whole suite — `npx vitest run` — expected all green (old `revealSchedule` tests are gone with the file replacement; nothing else imports them yet).

- [ ] **Step 6: Commit**

```bash
git add src/render/fx/shatter.js tests/shatter-schedule.test.js
git commit -m "feat: add pinned-seed flip scheduling for the shatter reveal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Shatter renderer v2 — emulsion base, discrete flips, `revealFace()`

**Files:**
- Modify: `src/render/fx/shatter.js` (rewrite `createShatterReveal` + `shatterJS`; delete `randomSeeds` and `revealSchedule`)
- Modify: `tests/shatter-cells.test.js` (swap `randomSeeds` for `pinnedSeeds`)
- Test: `tests/shatter-inject.test.js` (add one assertion)

**Interfaces:**
- Consumes: `pinnedSeeds`, `flipOrder`, `developAlphas`, `voronoiCells` from Task 1.
- Produces (Task 3 relies on these): `createShatterReveal(canvas, imgSrc, opts = {})` where `opts = { steps, reduce, faceBox }`, returning `{ setStep(n), revealFace(), recut() }`. `setStep(n)` opens the non-face shards scheduled at steps ≤ n; `revealFace()` opens the two face shards. Function `.length` must stay 2 (existing inject test asserts it).

- [ ] **Step 1: Add the failing inject assertion to `tests/shatter-inject.test.js`** (inside the existing describe block)

```js
  it("serializes the face reveal API and the new schedulers", () => {
    const win = {};
    new Function("window", shatterJS)(win);
    expect(shatterJS).toContain("revealFace");
    expect(shatterJS).toContain("function pinnedSeeds");
    expect(shatterJS).not.toContain("revealSchedule");
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/shatter-inject.test.js`
Expected: FAIL — `shatterJS` does not yet contain `revealFace`.

- [ ] **Step 3: Rewrite the renderer half of `src/render/fx/shatter.js`**

Delete `randomSeeds` and `revealSchedule` entirely. Replace `createShatterReveal` and `shatterJS` with:

```js
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
    cellIndex = voronoiCells(W, H, pinnedSeeds(W, H, steps, faceBox));
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
${createShatterReveal.toString()}
window.Shatter = { createShatterReveal: ${createShatterReveal.name} };
`;
```

Also update the file's top comment block (lines 1-4) to describe emulsion shards instead of "random develop schedule" blur.

- [ ] **Step 4: Update `tests/shatter-cells.test.js`** — replace the `randomSeeds` import and second test:

```js
import { voronoiCells, pinnedSeeds } from "../src/render/fx/shatter.js";
```

```js
  it("uses every seed at least once for spread seeds", () => {
    const seeds = pinnedSeeds(40, 40, 8, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, mulberry(1));
    const cells = voronoiCells(40, 40, seeds);
    expect(new Set(cells).size).toBe(10);
  });
```

(If this ever fails on a swallowed cell, bump the mulberry seed constant — the property being tested is "spread seeds all own pixels", not one specific RNG draw.)

- [ ] **Step 5: Verify nothing else imports the deleted functions**

Run: `grep -rn "randomSeeds\|revealSchedule" src/ tests/ tools/`
Expected: zero matches.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS, all files green.

- [ ] **Step 7: Commit**

```bash
git add src/render/fx/shatter.js tests/shatter-cells.test.js tests/shatter-inject.test.js
git commit -m "feat: emulsion-shard reveal replaces blur develop

Undeveloped shards are now opaque emulsion (zero leak at partial progress);
flips are discrete per step; two face shards open only via revealFace().

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: cta.js wiring — face box, watched-driven steps, reveal on catch

**Files:**
- Modify: `src/render/fx/cta.js` (three edits inside `ctaJS`)
- Test: `tests/cta-inject.test.js` (create)

**Interfaces:**
- Consumes: `createShatterReveal(canvas, src, { steps, reduce, faceBox })` and `revealFace()` from Task 2 (via `window.Shatter`).
- Produces: nothing downstream; behavior contract is asserted by string-contract tests (repo pattern, cf. `rate-flag-inject.test.js`).

- [ ] **Step 1: Create `tests/cta-inject.test.js` with the failing tests**

```js
import { describe, it, expect } from "vitest";
import { ctaJS } from "../src/render/fx/cta.js";

describe("cta shatter wiring", () => {
  it("passes a face box and drives steps from watched count", () => {
    expect(ctaJS).toContain("faceBox");
    expect(ctaJS).toContain("setStep(q.watched.length)");
    expect(ctaJS).not.toContain("setStep(q.total)");
  });
  it("opens the face only on catch", () => {
    expect(ctaJS).toContain("revealFace()");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/cta-inject.test.js`
Expected: FAIL on both tests.

- [ ] **Step 3: Apply the three edits to `src/render/fx/cta.js`**

Edit 1 — creation call (currently `{ steps: Math.max(1, q.total), reduce: reduce }`). The face box is the owner-tunable constant; fractions are relative to the photo, top-left origin:

```js
  var FACE_BOX = { x: 0.30, y: 0.12, w: 0.40, h: 0.38 }; // owner tunes vs the real photo
  var shatter = window.Shatter ? window.Shatter.createShatterReveal(img, "/assets/reward-photo.jpg", { steps: Math.max(1, q.total), reduce: reduce, faceBox: FACE_BOX }) : null;
```

Edit 2 — in `paint()`, the step drive (currently `shatter.setStep(unlocked() ? q.total : q.watched.length)`):

```js
    if (shatter && !developed) shatter.setStep(q.watched.length);
```

Edit 3 — in `develop()` (currently `if (shatter) shatter.setStep(q.total);`):

```js
    if (shatter) shatter.revealFace();
```

Also update the file's top comment: the photo no longer "develops (blur 16px -> 3px)"; it un-covers shard by shard and the face opens on catch.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/cta-inject.test.js`
Expected: PASS. Then `npx vitest run` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/render/fx/cta.js tests/cta-inject.test.js
git commit -m "feat: face shards open on catch, steps follow watched count

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: rate.js v4 — rubber stamp + taped paper-strip wall

**Files:**
- Modify: `src/render/fx/rate.js` (new `stampAngle` export; rewrite `rateCSS`, `rateStripHTML` done-block, `showResult`)
- Test: `tests/rate-stamp.test.js` (create); `tests/rate-flag-inject.test.js` (unchanged, must stay green)

**Interfaces:**
- Consumes: existing `/api/rating` aggregate shape `{ projects: { [id]: { n, avg, comments: [{r, c, ts}] } } }` — unchanged.
- Produces: `stampAngle(id) -> integer degrees in [-4, 4], never 0`, deterministic per id. Serialized into `rateJS`.

- [ ] **Step 1: Create `tests/rate-stamp.test.js` with the failing tests**

```js
import { describe, it, expect } from "vitest";
import { stampAngle, rateStripHTML, rateJS, rateCSS } from "../src/render/fx/rate.js";

describe("stampAngle", () => {
  it("is deterministic per id", () => {
    expect(stampAngle("colonist-tracker")).toBe(stampAngle("colonist-tracker"));
  });
  it("stays within ±4 degrees and never 0", () => {
    for (const id of ["a", "etf-tracker", "line-notify", "course", "antnest", "x1", "x2", "x3"]) {
      const a = stampAngle(id);
      expect(Math.abs(a)).toBeLessThanOrEqual(4);
      expect(a).not.toBe(0);
    }
  });
});

describe("rate v4 markup", () => {
  it("renders a stamp button and note in the done state", () => {
    const html = rateStripHTML("demo");
    expect(html).toContain("rate-stamp");
    expect(html).toContain("rate-note");
  });
  it("keeps radiogroup semantics and stamp labels", () => {
    const html = rateStripHTML("demo");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Stamp 7 of 10"');
  });
  it("gates the stamp animation behind reduced-motion", () => {
    expect(rateCSS).toContain("prefers-reduced-motion");
  });
  it("serializes stampAngle into the inline script", () => {
    expect(rateJS).toContain("function stampAngle");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/rate-stamp.test.js`
Expected: FAIL — `stampAngle` not exported, markup missing `rate-stamp`.

- [ ] **Step 3: Implement in `src/render/fx/rate.js`**

3a — add above `rateCSS`:

```js
// A fixed hand-stamped angle per project: deterministic from the id, ±4°,
// never 0 so it always reads as stamped rather than typeset.
export function stampAngle(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = (Math.abs(h) % 9) - 4;
  return a === 0 ? 2 : a;
}
```

3b — replace `rateCSS` with:

```js
export const rateCSS = `
.rate{margin-top:14px;padding-top:12px;border-top:1px dashed #e3dccf;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.rate .rate-q{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8b877f}
.rate .rate-dots{margin-top:8px;display:flex;gap:4px;flex-wrap:wrap}
.rate .rate-dots button{all:unset;cursor:pointer;width:26px;height:26px;border:1.5px solid #d8d0c4;border-radius:6px;font-size:11.5px;text-align:center;line-height:26px;color:#716a62}
.rate .rate-dots button.on{background:#c2522d;border-color:#c2522d;color:#fffdfa}
.rate .rate-dots button:hover,.rate .rate-dots button:focus-visible{border-color:#c2522d;color:#c2522d}
.rate .rate-dots button.on:hover{color:#fffdfa}
.rate .rate-dots button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
.rate .rate-row2{margin-top:8px;display:flex;gap:8px;align-items:center}
.rate input[type="text"]{flex:1;border:1px solid #d8d0c4;border-radius:7px;padding:.42rem .6rem;font:inherit;font-size:12.5px;background:#fffdfa;min-width:0}
.rate .rate-go{all:unset;cursor:pointer;border:1px solid #17151a;background:#17151a;color:#fffdfa;border-radius:999px;padding:.4rem .9rem;font-size:12px}
.rate .rate-go:disabled{opacity:.35;cursor:default}
.rate .rate-go:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
.rate .rate-done{display:none;align-items:center;gap:12px;flex-wrap:wrap;font-size:12.5px;color:#3a3833}
.rate.done .rate-done{display:flex}
.rate.done .rate-dots,.rate.done .rate-row2,.rate.done .rate-q{display:none}
.rate .rate-stamp{all:unset;cursor:pointer;display:inline-block;font-weight:700;font-size:14px;letter-spacing:.08em;color:#c2522d;border:2px solid #c2522d;border-radius:6px;padding:.18rem .55rem;background:#fffdfa;box-shadow:inset 0 0 0 2px #fffdfa,inset 0 0 0 3.5px #c2522d;transform:rotate(var(--stamp-rot,-3deg))}
.rate .rate-stamp.stamped{animation:rate-stampin .35s ease-out}
.rate .rate-stamp:focus-visible{outline:2px solid #c2522d;outline-offset:3px}
.rate .rate-note{color:#716a62}
.rate .rate-wall{margin-top:14px;display:none;flex-direction:column;gap:10px}
.rate .rate-wall.on{display:flex}
.rate .rw-head{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b7b2a8}
.rate .rw-c{position:relative;background:#fdf8ec;border:1px solid #e9e2d5;border-radius:2px;padding:.55rem .7rem .5rem;font-size:12.5px;color:#3a3833;transform:rotate(-1.1deg)}
.rate .rw-c:nth-child(odd){transform:rotate(1.2deg)}
.rate .rw-c::before{content:"";position:absolute;top:-6px;left:18px;width:34px;height:11px;background:#e8dfc9;opacity:.85}
.rate .rw-c:nth-child(odd)::before{left:auto;right:22px}
.rate .rw-c .rw-meta{font-family:ui-monospace,monospace;font-size:10.5px;color:#b7b2a8;margin-top:.25rem}
@keyframes rate-stampin{0%{transform:rotate(var(--stamp-rot,-3deg)) scale(1.6);opacity:0}60%{transform:rotate(var(--stamp-rot,-3deg)) scale(.94)}100%{transform:rotate(var(--stamp-rot,-3deg)) scale(1)}}
@media (prefers-reduced-motion:reduce){.rate .rate-stamp.stamped{animation:none}}
`;
```

3c — in `rateStripHTML`, change the dot buttons' aria-label and the done block:

```js
  for (let i = 1; i <= 10; i++) dots += `<button type="button" data-v="${i}" aria-label="Stamp ${i} of 10">${i}</button>`;
```

```js
    `<div class="rate-done">` +
    `<button class="rate-stamp" type="button" aria-label="Your stamp — click to re-rate"></button>` +
    `<span class="rate-note"></span>` +
    `</div>` +
```

3d — in `rateJS`: serialize `stampAngle` by putting `${stampAngle.toString()}` on the first line inside the template (right after the backtick, before `(function () {`). Then inside `boxes.forEach`, replace the `youEl`/`avgEl` lookups and `showResult` with:

```js
    var stampEl = box.querySelector(".rate-stamp");
    var noteEl = box.querySelector(".rate-note");
```

```js
    function showResult(r, animate) {
      box.classList.add("done");
      stampEl.textContent = r + " / 10";
      stampEl.style.setProperty("--stamp-rot", stampAngle(id) + "deg");
      if (animate) {
        stampEl.classList.remove("stamped");
        void stampEl.offsetWidth;
        stampEl.classList.add("stamped");
      }
      noteEl.textContent = "";
      agg().then(function (data) {
        var s = data.projects && data.projects[id];
        if (s && s.n) noteEl.textContent = "avg " + s.avg.toFixed(1) + "/10 (" + s.n + (s.n === 1 ? " vote)" : " votes)");
      });
    }
    stampEl.addEventListener("click", function () { box.classList.remove("done"); });
```

Call sites: `if (prior) showResult(prior);` becomes `if (prior) showResult(prior, false);` and the send handler's `showResult(chosen);` becomes `showResult(chosen, true);`. Everything else in `rateJS` (agg fetch, walls, honeypot payload, can-edit gate) stays byte-identical.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/rate-stamp.test.js tests/rate-flag-inject.test.js`
Expected: PASS (both files — the creator-gate contract must survive untouched). Then `npx vitest run` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/render/fx/rate.js tests/rate-stamp.test.js
git commit -m "feat: rubber-stamp ratings with taped paper-strip walls

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: End-to-end verification

**Files:**
- None created; verification only. Fix-forward any issue found, then re-run.

- [ ] **Step 1: Full suite + build**

Run: `npx vitest run` — expected: all green.
Run: `npm run build` — expected: success, postbuild completes.

- [ ] **Step 2: Featherweight regression**

Run: `node tools/abe-check.mjs`
Expected: 9/9.

- [ ] **Step 3: Manual pass on the Minimal theme**

Run: `npm run dev`, open `http://127.0.0.1:5173/interactive` in a fresh profile (or clear localStorage `quest-v2`).

Checklist:
1. 0%: polaroid is fully opaque emulsion — no silhouette, no colors from the photo.
2. Expand 3 of 8 items (dwell ≥2s each): exactly 3 shards developed (each with the dark→sepia→color ramp); face region still covered; caption "developing · 38%". A screenshot at this point must not let you guess the picture.
3. 100%: all non-face shards open, face still covered, caption "100% · catch it".
4. Click to catch: face shards develop; reward panel shows.
5. Keyboard: Tab to the photo button, Enter — same behavior, witty line pre-100%.
6. DevTools → emulate `prefers-reduced-motion: reduce` → flips are instant, stamp animation off.
6b. DevTools device emulation (touch): pre-100% taps make the polaroid hop (existing behavior), at 100% a tap catches it and the face develops.
7. Rating strip: pick a number, Send — stamp lands with the squash animation at a per-project angle; note shows "avg …" (in dev without CF functions the fetch fails silently and the note stays empty — expected); click the stamp → faces reopen for re-stamp.
8. Comment strips render as taped paper (alternating tape side and tilt) once an aggregate with comments is available (preview/production).

- [ ] **Step 4: (Optional, for live rating data) preview deploy**

Per the existing flow: `npm run build` then `wrangler pages deploy dist` to the preview branch used before (separate KV binding from production). Verify one POST lands and the wall strips render with real comments.

- [ ] **Step 5: Wrap up**

Leave the branch unpushed; report status. Merging/pushing is the owner's call (superpowers:finishing-a-development-branch when asked).
