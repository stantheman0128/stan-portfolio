# Hedgehog Lottie Skin Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-built SVG hedgehog skin with the licensed LottieFiles hedgehog (cand1), baked at build time into a WebP sprite sheet, while keeping the entire behavior engine (bother-loop / suggest / roam / quips) untouched.

**Architecture:** `src/render/fx/sprite.js` exposes three strings: `spriteCSS` (skin), `spriteHTML` (skin), `spriteJS` (bones). The bones only toggle mode classes (`s-idle/s-look/s-sniffa/s-scratch/s-yay/s-poke/s-roll/s-sleep` + `s-scurrying/s-face-left` flags) and set `#sprite`'s outer `transform` — so we rewrite only the two skin strings to a frame-stepped raster model and re-express every mode as a container-level CSS animation. A one-shot dev tool (`tools/bake-sprite.mjs`, puppeteer-core + system Chrome + lottie-web, all devDeps) rasterizes 24 of the 49 Lottie frames into one 24-column strip (`public/assets/sprite-hedgehog.webp`), same-origin like every other minimal-theme image. Zero runtime dependency.

**Tech Stack:** Vite 8, vanilla JS strings, lottie-web (dev-only), puppeteer-core driving `C:\Program Files\Google\Chrome\Application\chrome.exe`, WebP via canvas `toDataURL`.

## Global Constraints

- Zero runtime JS libraries on the site; sprite sheet must be a same-origin `/assets/` file (minimal theme already ships same-origin images).
- Featherweight untouched → `node tools/abe-check.mjs` must stay 9/9.
- Keep all 11 mode/flag class names exactly as today — `spriteJS` must not need behavioral edits.
- `prefers-reduced-motion: reduce` → static frame 0, no cycle animation (same discipline as current skin).
- License: LottieFiles "Lottie Simple License" (verified) — commercial use OK, no attribution required.
- TDD exemption: skin is pure visual CSS + a one-shot dev tool; no vitest surface. Verification = existing suite green + build + headless screenshot evidence.
- Windows/git-bash; commit with explicit paths only (no `git add -A`).

---

### Task 1: Extract animation JSON + bake tool + baked asset

**Files:**
- Create: `tools/bake-sprite.mjs`
- Create: `tasks/mascot-candidates/cand1-hedgehog.json` (extracted from the `.lottie` zip via python one-liner)
- Create: `public/assets/sprite-hedgehog.webp` (tool output)
- Modify: `package.json` (devDeps `puppeteer-core`, `lottie-web`; script `bake:sprite`)

**Interfaces:**
- Produces: `/assets/sprite-hedgehog.webp` — horizontal strip, 24 frames, cell 184×208 (2× of 92×104 display), total 4416×208, transparent background.
- Produces: `npm run bake:sprite` re-bakes deterministically (frames 0,2,4,…,46 of the 49-frame loop).

- [ ] **Step 1: Extract the Lottie JSON**

```bash
cd /c/Users/stans/Projects/stan-portfolio && python -c "
import zipfile
z = zipfile.ZipFile('tasks/mascot-candidates/cand1-hedgehog.lottie')
open('tasks/mascot-candidates/cand1-hedgehog.json','wb').write(z.read('animations/12345.json'))"
```

- [ ] **Step 2: Install dev deps**

Run: `npm i -D puppeteer-core lottie-web` — expect lockfile update, no runtime deps.

- [ ] **Step 3: Write `tools/bake-sprite.mjs`**

Core shape (complete logic; final file adds arg parsing + size log):

```js
import { launch } from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FRAMES = 24, STEP = 2, CELL_W = 184, CELL_H = 208;
const anim = readFileSync(resolve("tasks/mascot-candidates/cand1-hedgehog.json"), "utf8");
const lottieLib = readFileSync(resolve("node_modules/lottie-web/build/player/lottie.min.js"), "utf8");

const browser = await launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setContent(`<canvas id=c width=${CELL_W} height=${CELL_H}></canvas>
<canvas id=sheet width=${FRAMES * CELL_W} height=${CELL_H}></canvas>`);
await page.addScriptTag({ content: lottieLib });
const dataUrl = await page.evaluate(async (animData, FRAMES, STEP, CELL_W, CELL_H) => {
  const c = document.getElementById("c"), sheet = document.getElementById("sheet");
  const a = lottie.loadAnimation({
    renderer: "canvas", loop: false, autoplay: false,
    animationData: JSON.parse(animData),
    rendererSettings: { context: c.getContext("2d"), clearCanvas: true, preserveAspectRatio: "xMidYMid meet" }
  });
  await new Promise(r => a.addEventListener("DOMLoaded", r));
  const sctx = sheet.getContext("2d");
  for (let i = 0; i < FRAMES; i++) {
    a.goToAndStop(i * STEP, true);
    sctx.drawImage(c, i * CELL_W, 0, CELL_W, CELL_H);
  }
  return sheet.toDataURL("image/webp", 0.85);
}, anim, FRAMES, STEP, CELL_W, CELL_H);
writeFileSync(resolve("public/assets/sprite-hedgehog.webp"),
  Buffer.from(dataUrl.split(",")[1], "base64"));
await browser.close();
```

- [ ] **Step 4: Run + eyeball the output**

Run: `npm run bake:sprite` → expect `public/assets/sprite-hedgehog.webp` written, log size. Budget: ≤150 KB (drop quality to 0.8 or FRAMES to 16 if over). Open one frame via a quick headless screenshot or the Read tool to confirm transparency + full body in frame.

- [ ] **Step 5: Commit**

```bash
git add tools/bake-sprite.mjs tasks/mascot-candidates/cand1-hedgehog.json tasks/mascot-candidates/cand1-hedgehog.lottie public/assets/sprite-hedgehog.webp package.json package-lock.json
git commit -m "feat(sprite): bake LottieFiles hedgehog into WebP sprite strip (build-time tool, zero runtime)"
```

---

### Task 2: Skin swap in `sprite.js` (CSS + HTML strings, geometry constants)

**Files:**
- Modify: `src/render/fx/sprite.js:10-149` (spriteCSS + spriteHTML), `:189-192` + `:204-205` (geometry), header comment `:1-8`

**Interfaces:**
- Consumes: `/assets/sprite-hedgehog.webp` from Task 1.
- Produces: same class-name contract as today, so `spriteJS` (:151-499) needs **zero** behavior edits.

- [ ] **Step 1: Replace `spriteHTML` skin**

```html
<div id="sprite" class="s-idle" aria-hidden="true">
  <div class="hh-shadow"></div>
  <div class="skin"><div class="pose"><div class="sheet"></div></div></div>
</div>
```
(`#bubble` block unchanged.)

- [ ] **Step 2: Rewrite `spriteCSS` skin layer**

Layering contract (avoids transform collisions, mirrors old node split):
- `#sprite` — position (inline transform from JS, untouched)
- `.skin` — flip only: `#sprite.s-face-left .skin{transform:scaleX(-1)}`
- `.pose` — every mode animation/transform (hop/poke/wiggle/spin/look/sleep-tilt)
- `.sheet` — the frame cycle only: `background:url(/assets/sprite-hedgehog.webp) 0 0/2400% 100% no-repeat; animation:hh-cycle 1.92s steps(24,jump-none) infinite`
- `.hh-shadow` — CSS ellipse (absolute, bottom, %-sized so the 68px mobile width scales it)

Mode re-map (all inside `prefers-reduced-motion:no-preference`, like today):

| mode class | old target | new `.pose` visual |
|---|---|---|
| s-idle | .hh-body breathe / .hh-nose sniff / .hh-lid blink | sheet cycle already alive; no extra |
| s-look | .hh-face rotate+scale | `transform:rotate(-6deg) scale(1.06)` (transition) |
| s-sniffa | .hh-face keyframe | tilt-bob keyframe 1.6s ×1 |
| s-scratch | .hh-legB/.hh-body | wiggle rotate keyframe 1.2s ×1 |
| s-yay | .hh hop + shadow squash | hop keyframe ×2 + `.hh-shadow` squash ×2 |
| s-poke | .hh lunge + .hh-paw jab | lunge `translateX(9px) rotate(3deg)` ×2 |
| s-scurrying | legs run + .hh jog | jog bob ∞ + `#sprite.s-scurrying .sheet{animation-duration:.8s}` (hustle) |
| s-roll | .ball spin swap | `.pose` full `rotate(360deg)` spin ∞ (cartwheel) |
| s-sleep | opacity + face tilt | `#sprite{opacity:.6}` + pose tilt + `.sheet{animation-play-state:paused}` |

- [ ] **Step 3: Geometry constants in `spriteJS`**

New art is portrait (92×104 vs old ~92×77): `home()` y `vh()-104` → `vh()-120`; `place()` clamp `vh()-100` → `vh()-112`. `W=92` unchanged. Mobile width 68px → `.skin{width:68px;height:77px}` in the existing media query.

- [ ] **Step 4: Update header comment** (v6: licensed Lottie character baked to sprite strip; keep the asset-research history line honest).

- [ ] **Step 5: Verify + commit** (verification details in Task 3; commit once green)

```bash
git add src/render/fx/sprite.js
git commit -m "feat(sprite): swap hedgehog skin to baked Lottie sheet, keep behavior engine intact"
```

---

### Task 3: Verification evidence (before claiming done)

- [ ] **Step 1:** `npm test` → 3 suites green (cms-auth / cms-config / content-loader; sprite has no suite — regression net is elsewhere).
- [ ] **Step 2:** `npm run build` → dist OK; confirm `dist/assets/sprite-hedgehog.webp` shipped.
- [ ] **Step 3:** `node tools/abe-check.mjs` → 9/9 (featherweight untouched).
- [ ] **Step 4:** headless Chrome screenshot of `site.html?theme=minimal` from a local server over `dist/`, `--virtual-time-budget=8000`; Read the PNG → hedgehog visible bottom-right, no blue box, shadow under feet.
- [ ] **Step 5:** grep dist minimal HTML for `.hh-quills`/`feTurbulence` → 0 hits (old skin fully gone), `sprite-hedgehog.webp` → present.

### Task 4: Wrap-up

- [ ] Update `tasks/todo.md` Round 5 section (mascot item checked, note asset pipeline).
- [ ] Do **not** deploy; deploying the sprite preview is Stan-visible — report and let him say go (per repo convention all preview deploys so far were in-session OK'd, but this session's rule is 做一段就收).
