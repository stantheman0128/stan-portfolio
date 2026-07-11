# Moana Paper Puppet Guide — Design

Date: 2026-07-09
Branch: `feat/moana-puppet-guide` (off `feat/sprite-quest`)
Status: approved by Stan, ready for plan

## Goal

Replace the hedgehog guide sprite in the interactive (minimal) edition with the
approved Moana paper-puppet kit, without changing any of the guide's behavior,
personality, or quest wiring. Upgrade the guide's expressive vocabulary using
the puppet's richer action catalog, and add three docent capabilities:
scroll-aware section pointing, click-to-cycle easter eggs, and a first-visit
mini tour. Respect `prefers-reduced-motion`; shrink on mobile.

Do not regenerate, recut, recolor, or edit the artwork. Use only the supplied
split PNGs in the kit.

## Key realization

The current "sprite" is two things fused: a **visual actor** (hedgehog WebP
strip + CSS class-driven modes) and a **behavior/personality engine** (roaming,
cursor-boop, quest-guiding, speech bubbles, quips, quest-event reactions). The
Moana kit only replaces the actor layer, and does it with a far richer action
set. So the whole change concentrates on swapping the actor while leaving the
engine untouched.

## Architecture: a thin PuppetActor adapter

The engine drives the character through exactly two calls — `setMode(m)` and
`face(left)` — plus positioning via `transform: translate()` on `#sprite`.
Keep all of that. Only re-implement the internals of `setMode`/`face`.

DOM:

```
#sprite            position layer (place/travel/home/anchors unchanged)
  └─ #puppet-host  MoanaPuppet.mount() target (the .moana-puppet element)
```

- `setMode(m)` → look up `PUPPET_MODE_MAP[m]` → `puppet.setAction(action)`
  (and optional orientation). No more CSS `s-<mode>` class on the character.
- `face(left)` → toggle `s-face-left` on `#sprite`; CSS flips `#puppet-host`
  with `transform: scaleX(-1)` (controller never sets host transform, safe).
- The puppet supplies its own drop shadow (`.moana-puppet::after`), so the
  hedgehog `.hh-shadow` is dropped.

`PUPPET_MODE_MAP`, `SECTION_ACTION_MAP`, and `CLICK_CYCLE` are exported as real
JS objects from `sprite.js` and interpolated into the inlined behavior script
with `JSON.stringify`, so the unit tests and the runtime share one source.

### Mode -> action map

| engine mode | puppet action | note |
|---|---|---|
| idle | idle | ambient breathing |
| look | curious | look-at-you / came-back |
| sniffa | playful | idle life |
| scratch | thinking | idle life |
| yay | happy | watched an item / success |
| poke | beckon | boop the cursor / poke a target |
| roll | playful | long travel (paper can't ball-roll) |
| sleep | shy | dismissed / settled |

New engine intents get direct actions: onboarding greet -> `greeting`, tour
kickoff / big celebration -> `bothBigWave`, guidance pointing -> `beckon` /
`beckonLeft` by direction, 404 / empty -> `sad`, click easter eggs ->
`playOnce("frontFlip" | "backFlip")`.

## New capability 1: scroll-aware section pointing

IntersectionObserver over the major sections. When one dominates the viewport
and the puppet is idle (not travelling, no open bubble, not dismissed, not
mid-guidance), the puppet moves near it and plays a themed action:

| section | action |
|---|---|
| hero | greeting |
| about | playful |
| works list | beckon (face the list) |
| patent | happy |
| contact / footer | bothBigWave |

Throttled; yields to the existing `suggest()` guidance; under reduced-motion it
changes action in place without travelling.

## New capability 2: click-to-cycle easter eggs

Enable `pointer-events` on `#sprite`. Clicking the puppet cycles a showcase
list `frontFlip -> backFlip -> weird -> playful` (flips via `playOnce`). Keeps
the cursor-boop behavior. Under reduced-motion the controller already plays the
low-amplitude flip branch.

## New capability 3: first-visit mini tour

Upgrade the existing onboarding "Show me around" branch (currently one
`suggest(true)`) into a scripted three-stop tour: about -> works -> patent,
each with a themed action and a bubble line, then hand back to normal behavior.
"I'll explore" is unchanged. Under reduced-motion, skip the travel and show the
lines in place.

## Files

- New: `public/moana-puppet-kit/**` (whole kit, served at `/moana-puppet-kit/`).
- Rewrite: `src/render/fx/sprite.js` (CSS drop hedgehog, HTML puppet host, JS
  adapter + three capabilities, exported maps).
- Edit: `src/render/themes/minimal.js` (add kit `<link>` + `<script>` refs;
  guard so a missing `window.MoanaPuppet` degrades silently, no crash).
- Unused after: `public/assets/sprite-hedgehog.webp` (leave for now; trivial
  later cleanup).

## Verification

- Unit (vitest): `PUPPET_MODE_MAP` / `SECTION_ACTION_MAP` / `CLICK_CYCLE` cover
  every engine mode and every mapped action exists in the kit's `motions.json`;
  `spriteHTML`/`spriteCSS`/`spriteJS` no longer reference `sprite-hedgehog`.
- Live (preview + Playwright): mount, idle, greet, scroll-point, click-flip,
  reduced-motion, mobile shrink; screenshots for Stan.

## Defaults (override on request)

1. Scope: interactive (`/interactive`) edition only, where the hedgehog lives.
   The featherweight front page stays as-is. Front-page port is a follow-up.
2. Facing uses whole-puppet mirror (matches today's hedgehog flip). Trade-off:
   waves mirror to the other hand. Acceptable for a roaming guide; switch to
   `lookLeft/Right` orientation if hand-accuracy is wanted.
