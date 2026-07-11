# Moana Paper Puppet Guide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.
> Steps use checkbox syntax. Executed inline this session.

**Goal:** Swap the hedgehog guide for the Moana paper puppet in the interactive
edition, preserve the whole behavior engine, upgrade the action vocabulary, and
add scroll-pointing, click-to-cycle eggs, and a first-visit tour.

**Architecture:** Keep `#sprite` as the position layer and the entire behavior
engine. Re-implement only `setMode`/`face` via a PuppetActor adapter that drives
`MoanaPuppet`. Export the mode/section/click maps as real objects and interpolate
them into the inlined script so tests and runtime share one source.

**Tech Stack:** Vanilla JS (inlined strings in a Vite build), MoanaPuppet kit,
vitest.

## Global Constraints

- Do not regenerate / recut / recolor / edit artwork; use only the kit's PNGs.
- Respect `prefers-reduced-motion`; shrink on mobile (<=640px).
- `greeting`/`waveRight` are the character's own right hand (viewer-left).
- `shy` rotates the existing arm (no added hand / overlay).
- Do not showcase `bow`, `paperBendIn`, `paperBendOut` (compat only).
- Missing `window.MoanaPuppet` must degrade silently (no crash).
- Interactive (minimal) edition only; featherweight untouched.
- Commit with explicit paths (dirty tree has other sessions' files).

---

## Task 1: Exported maps + failing unit test

**Files:** Modify `src/render/fx/sprite.js` (add exports); Test
`tests/sprite-puppet-map.test.js`.

**Produces:** `PUPPET_MODE_MAP` (engine mode -> {action, orientation?}),
`SECTION_ACTION_MAP` (section key -> {action, orientation?}),
`CLICK_CYCLE` (array of action names), plus existing `spriteCSS/HTML/JS`.

- [ ] Write `tests/sprite-puppet-map.test.js`: read `motions.json` action keys;
  assert every `PUPPET_MODE_MAP` / `SECTION_ACTION_MAP` action and every
  `CLICK_CYCLE` entry is a real kit action; assert `PUPPET_MODE_MAP` covers
  `idle,look,sniffa,scratch,yay,poke,roll,sleep`; assert `spriteHTML` has
  `id="puppet-host"` and `spriteCSS`+`spriteJS`+`spriteHTML` contain no
  `sprite-hedgehog`.
- [ ] Run `npx vitest run tests/sprite-puppet-map.test.js` -> FAIL (no exports).
- [ ] Add the three exported maps to `sprite.js`.
- [ ] Re-run -> the map assertions pass; HTML/CSS assertions still fail (sprite
  not rewritten yet). That is expected; finish in Task 2.

## Task 2: Rewrite sprite.js (CSS + HTML + adapter)

**Files:** Modify `src/render/fx/sprite.js`.

- [ ] `spriteCSS`: drop `.sheet/.pose/.hh-shadow/.skin` hedgehog rules and the
  `hh-*` keyframes. Keep `#sprite` positioning + transition, all `#bubble`
  styles, print/mobile media. Add: `#sprite{pointer-events:auto}`,
  `#puppet-host{width:100%;height:100%}`, `#sprite.s-face-left #puppet-host
  {transform:scaleX(-1)}`, reduced-motion + `<=640px` size rules.
- [ ] `spriteHTML`: `#sprite` contains `<div id="puppet-host"></div>` only
  (bubble unchanged).
- [ ] `spriteJS`: interpolate `const MODE_MAP = ${JSON.stringify(...)}` etc.
  Add PuppetActor: mount `MoanaPuppet` into `#puppet-host` (guard missing
  global), `setMode(m)` -> `puppet.setAction(MODE_MAP[m].action, ...)`,
  `face(left)` -> toggle `s-face-left`. Replace old `setMode`/`face`. Update
  `W`/height constants to the puppet size. Keep every loop/handler.
- [ ] Run map test -> HTML/CSS/JS assertions now pass.

## Task 3: Wire the kit into minimal.js

**Files:** Modify `src/render/themes/minimal.js`.

- [ ] Add to `<head>`: `<link rel="stylesheet" href="/moana-puppet-kit/moana-puppet.css">`.
- [ ] Add before `${spriteJS}`: `<script src="/moana-puppet-kit/moana-puppet.js"></script>`.
- [ ] `npx vitest run` -> whole suite green.

## Task 4: New capabilities in spriteJS

**Files:** Modify `src/render/fx/sprite.js`.

- [ ] Scroll-pointing: IntersectionObserver over sections keyed by
  `SECTION_ACTION_MAP`; on dominant + idle, travel near + themed action; gate
  vs guidance/bubble/dismissed/reduced-motion; throttle.
- [ ] Click-to-cycle: `#sprite` click cycles `CLICK_CYCLE` (flips via
  `playOnce`); keep boop.
- [ ] First-visit tour: upgrade "Show me around" to a 3-stop scripted tour
  (about/works/patent) with themed actions + bubble lines; reduced-motion skips
  travel.

## Task 5: Live verification

- [ ] `npm run dev`; preview mount + idle.
- [ ] Trigger greet, scroll-point, click-flip; screenshot.
- [ ] `preview_resize` mobile + `colorScheme`/reduced-motion emulation.
- [ ] Console/network clean; screenshots to Stan.

## Task 6: Commit

- [ ] Granular commits per task with explicit paths (spec+plan, kit, sprite,
  minimal, tests). Bump nothing global; this is a feature branch.
