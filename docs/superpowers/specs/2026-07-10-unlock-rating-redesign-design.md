# Spec: Emulsion-shard photo unlock + rubber-stamp ratings (Minimal theme)

Owner decisions (2026-07-10): the photo unlock switches from blur-based
develop to opaque emulsion shards with a per-shard develop animation
(option C of the brainstorm); the rating strips switch from dot-radio forms
to a rubber stamp + paper-strip wall (option A).

## Problem

The reward photo reads as a whole at 30-40% progress. Root cause: the base
layer is the ENTIRE photo at blur(18px) from 0% (shatter.js render()). Blur
is a low-pass filter — silhouette, colors, and composition, exactly what
makes a portrait recognizable, survive it. The clarity-squared ease-in
(added earlier for this same complaint) only governs the sharp top layer and
cannot fix the leaking base. Secondary leaks: random continuous schedules
give some shards 0.5-0.6 clarity by 35%.

Ratings and comments work correctly (anonymous voter token, overwrite on
re-rate, per-project walls) but read as a generic form, off-world from the
site's paper/polaroid identity.

## Design 1 — photo unlock v2: emulsion shards (shatter.js + small cta.js wiring)

Concealment. Drop the blurred-photo base layer entirely. Undeveloped area =
opaque dark grey-green emulsion (the look of a just-ejected polaroid), with
per-shard lightness variation of a few percent so shards read as physical
pieces. Covered area carries zero information — at 35% the visitor sees
literally 35% of the picture.

Shard count and scheduling. Continuous clarity curves become discrete
flips. N = steps + 2 shards, where steps = quest total (currently 8, read
dynamically as today). Two seeds are pinned inside a hardcoded fractional
face box (owner tunes the constant against the real photo); the remaining
`steps` seeds are placed outside it. Mapping: the non-face shards map 1:1
onto the progress steps — every step flips exactly one shard, so every
watched work gives visible feedback. The two face shards are excluded from
the steps and flip only on the catch click after 100%: the face is the
payoff for catching, not a formality.

Develop animation. A flipped shard animates ~0.6s: dark -> warm sepia
low-saturation -> full color sharp (per-shard clip + canvas
brightness/saturate ramp). prefers-reduced-motion: instant flips, identical
coverage. Screen-reader milestone announcements unchanged.

Unchanged: the photo stays a public asset (/assets/reward-photo.jpg remains
fetchable — this is presentation, not secrecy); the dodge/chase behavior,
the "developing · N%" caption, and the quest event protocol all stay as-is.

## Design 2 — ratings v4: rubber stamp + paper-strip wall (rate.js only; API untouched)

Stamping. The ten dot-radios become ten square stamp-face buttons (mono).
Clicking stamps "N / 10" onto the project row corner: double-line border,
ink #c2522d, per-project fixed rotation derived from the project id (each
project looks hand-stamped at its own angle), squash stamp-in animation.
Return visits show the stamp already in place; clicking the stamp re-opens
the faces to re-stamp (the server already overwrites by voter token, so no
box stuffing). "You: 8/10 · current average 7.9/10" becomes a small mono
annotation beside the stamp.

Wall. Comments render as taped paper strips: cream paper, a tape chip at the
top (left/right alternating by index), alternating rotation of about ±1.2
degrees, mono quote + "— n/10" meta. The server-side cap of 4 latest per
project is unchanged; the visitor's own comment appears as a strip after
send (existing 1.5s aggregate refresh kept).

A11y and guards. Stamp buttons keep radiogroup semantics and aria-labels;
the stamp-in animation is gated by reduced-motion (static strip rotation is
not motion and stays); honeypot, 140-char cap, and owner-device strip
removal (can-edit flag) all stay. POST/GET /api/rating shapes untouched.

## Boundaries

- Minimal theme fx/ layer only (shatter.js, cta.js, rate.js). Featherweight
  untouched; abe-check stays 9/9.
- No backend changes this round.
- Do not touch feat/paper-stan-alive (in flight in another session).

## Risk

Per-shard canvas filter cost during the develop animation — the internal
canvas is 300px wide with ~10 shards, one rAF pass is fine; the fallback is
a one-shot filtered snapshot per shard for the animation window.

## Testing

- Shard-to-step assignment as a pure exported function with unit tests:
  every non-face shard assigned to exactly one step, face shards catch-only,
  seed pinning keeps exactly two shards in the face box.
- Rate strip markup contract extended in tests/rate-flag-inject.test.js.
- Playwright: mouse/keyboard/touch + reduced-motion paths; acceptance check
  that a 35% screenshot leaks nothing (covered pixels carry no source-image
  information).

## Plan (phases, each independently verifiable)

1. shatter v2: emulsion base + discrete flip schedule + pinned face seeds +
   unit tests (no animation yet).
2. Develop animation + reduced-motion path + face-box constant tuning
   against the real photo.
3. rate v4: stamp interaction + strip wall + inject-test extension.
4. E2E verify (Playwright paths, 35% leak check) + abe-check regression.
