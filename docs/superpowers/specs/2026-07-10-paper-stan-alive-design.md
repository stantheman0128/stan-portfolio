# Paper Stan "Alive" Upgrade — Design

Date: 2026-07-10
Branch: `feat/moana-puppet-guide` (continues the 10-commit puppet line)
Status: approved by Stan (route: rich combinatorial library + baked lines;
live-LLM director/chat deferred to a separate future project)

## Goal

Make the corner guide feel like a living character rather than a menu of canned
reactions: moods that persist and decay, a gaze that follows the visitor,
multi-step performances with a visible "thought process", an unlocked facial
expression axis, and line pools large enough that repeats feel rare. All
offline, deterministic, free, and fully reviewable. No runtime LLM calls.

Constraints carried over: artwork untouched (PNGs as shipped in
/moana-puppet-kit), engine contract (setMode/face/#sprite positioning)
unchanged, interactive (minimal) edition only, prefers-reduced-motion degrades
gracefully, all visitor-facing copy is first-person Paper Stan with no em
dashes and no emoji.

## 1. Expression axis unlock (no art changes)

The kit hard-wires the frown overlay to the `sad` action inside
`applyHeadEffects`. After mounting, the adapter shadows that method on the
puppet *instance* (prototype untouched) so expression becomes independent
state: `expression in {smile, frown}`; frown opacity = (expression === "frown"
|| action === "sad"). This turns 25 usable actions x 9 orientations into ~450
poses (x2 expressions). Exported: `EXPRESSIONS`.

## 2. Mood engine

Exported `MOODS` table; four moods, each defining allowed/weighted idle
actions, orientations, expression bias, line-pool key, and pacing multiplier:

| mood | enter on | flavor | speech |
|---|---|---|---|
| cheerful | gentle hover, opening projects, high rating | playful/happy/bothWave, tilts | warm, chattier |
| calm (default) | baseline / decay target | thinking/handsIn/nod, paper turns | short, dry |
| sleepy | idle > 90s or late-night local time | slow, sparse, shyDown/leanBack | rare lines |
| miffed | pestering taps, dragging a lot, low rating | shakeHead, frown, turns away | terse, salty; decays to calm in ~45s |

Mood is in-memory (session only), has an intensity that decays over time, and
modulates: lifeLoop pool weights and intervals, line pool choice, gaze
eagerness, and reaction choreography. This is the anti-"random flailing"
mechanism: every animation choice must be consistent with the current mood.

## 3. Gaze system

Cursor position relative to the puppet maps to a 3x3 gaze grid using the nine
orientations (lookLeft/front/lookRight x heroUp/front/shyDown). Throttled
(zone change + >=400ms), idle-only, always below gestures/performances in
priority. Miffed mood inverts it (turns away from the cursor); sleepy makes it
lag. Reduced-motion keeps gaze (subtle) but drops roaming.

## 4. Performance sequencer

`perform([{action, orientation, expression, ms}, ...])` plays short scripted
chains and is cancellable by drag/click/travel. Tap and section reactions
upgrade from single actions to 2-3 step mood-consistent mini-scenes (e.g.
tapped while cheerful: leanBack 0.5s -> curious-toward-cursor 0.7s -> happy
0.9s; tapped while miffed: frown shakeHead 0.8s -> paper-turn away 1s).
Exported: `PERFORMANCES` (validated by tests).

## 5. Baked line pools

`LINES[situation][mood]` with ~6-12 variants per cell, generated in-session by
Claude (no build pipeline; YAGNI) and human-reviewed by Stan in the commit.
Selection avoids repeating the most recent line per situation. A hygiene test
scans every string: no em/en dashes, no emoji, first-person voice spot checks.

## 6. File split and tests

New `src/render/fx/sprite-data.js` holds pure data (MOODS, LINES,
PERFORMANCES, pools); `sprite.js` keeps the runtime and interpolates the data
into the inlined script. minimal.js unchanged (still imports sprite.js only).
Tests extend `tests/sprite-puppet-map.test.js` (or a sibling data test): every
action/orientation/expression referenced by MOODS/PERFORMANCES/pools exists in
motions.json; full-coverage guard stays; line hygiene test as above.

## Out of scope (separate future project)

Live LLM director / chat box ("ask Paper Stan about this project"): would run
through a Cloudflare Pages Function proxy with rate caps and a constrained
persona prompt. The motion vocabulary, mood engine, and performance protocol
built here are its foundation and carry over unchanged.
