# Spec: Guide Sprite + Unified Quest + Rubber-band CTA (Minimal theme)

Owner vision (2026-07-05): unify all exploration into one system — a guide sprite that
welcomes/roams/points, engagement-based progress (expand to count, not scroll), tab-switch
moods (eager when returning from OUR outbound links vs homesick from unrelated tabs),
a rating gate whose feedback is collected server-side, and a CTA button that dodges the
pointer at a speed inversely proportional to progress, unlocking a reward at 100%.

## Objective
Make a first visit feel like a small game a stranger finishes with a smile: guided but
never forced, funny but accessible, and it ends with the visitor telling US whether it
was cool (rating collected), then receiving a meaningful reward.

Success = a cold visitor can reach 100% + rating + reward in under ~3 minutes using
mouse, keyboard, or touch; Featherweight stays untouched (9/9 abe-check); no rating
failure ever blocks a visitor.

## Architecture (three units + a bus)
- **Progress** (source of truth): engagement counter replacing IntersectionObserver logic.
  "Watched" = row expanded AND held ≥2.5s (dwell guard); patent = in view + interacted or
  2.5s expanded. 8 items total (7 works + patent). % = watched/8, derived, never stored.
  Free-roam counts identically to guided order — no punishment state.
- **Sprite** (view): 10-state machine — welcome → roam ⇄ suggest → watch → celebrate-step
  → rating-prompt → cta-unlocked-congrats, plus eager-return / homesick-return / idle-sleep.
  Positioning: fixed home corner + anchor-beside-target with arrow (mobile: fixed bubble +
  target outline pulse). Frequency caps (1 unsolicited bubble/20s, ≤3 suggests/session),
  dismissible ("don't guide me", persisted), silent while user scrolls/reads.
  Outbound-click flag (sessionStorage, set on click before tab hides) branches return mood:
  eager ("You went to look at my work! So? So??") vs homesick ("You're back. I kept your
  spot warm."). Body: TBD (revive robot SVG from git history vs new form) — owner decides.
- **CTA (rubber-band)**: new reward button (NOT the contact links — contact stays always
  clickable). Dodge on pointermove within R=120px: step = 90·(1−p) px, transition
  60+340·p ms, settleChance = p². Touch: hops N = ceil(3·(1−p)) taps before yielding.
  Keyboard: always focusable/activatable (witty acknowledgment pre-100%). At p=1 (all
  watched + rating done): stops, glows, opens reward for all input methods.
- **Rating backend**: Cloudflare Pages Functions (`functions/api/rating.js`, auto-uploaded
  by our existing `wrangler pages deploy dist` — verified against CF docs). POST /api/rating
  same-origin (no CORS), fire-and-forget, always 204; client unlocks reward regardless of
  outcome (losing a rating > blocking a visitor). Storage: Workers KV, one key per rating
  `rating:<iso>:<rand>` → {r 1-5, c ≤280, t theme, p path, ms quest-time, ts}. Guards:
  honeypot, server-side min quest time 3s, KV rate counter per hashed IP (hash never stored),
  1KB payload cap, silent-drop (fake 204). Privacy: no IP/PII/cookies stored; disclosure
  line "Anonymous feedback — we don't record who you are." Read-back: wrangler kv list or
  GET /api/rating/export?key=<EXPORT_KEY> (Pages secret; wrong key → 404).
  Preview (demo branch) binds a separate KV namespace from production.

## Accessibility (non-negotiable)
Keyboard: CTA in tab order at every %; Enter works at 100% identically. Touch: hop-count
equivalent, 0 hops at 100%. prefers-reduced-motion: sprite static w/ discrete snaps, CTA
NEVER dodges/hops (gated by progress, not precision). Screen readers: sprite aria-hidden;
milestones-only polite live region; CTA accessible name reflects state. Reward reachable
by pointer, keyboard, and touch equally at 100%.

## State (localStorage quest-v2, migrate from v1: keep eggs, discard scroll-based seen)
{ v, watched[], eggs{}, ratingDone, ctaUnlocked, spriteDismissed, visits, lastVisit,
  sessionSuggestCount } — outbound flag is session-only, never persisted.

## Boundaries
- Always: Featherweight untouched; abe-check stays 9/9; all interactions degrade on
  reduced-motion/touch/keyboard; rating failure never blocks.
- Ask first: reward CONTENT (owner decision), production KV binding, publishing rating
  export URL anywhere.
- Never: home address on the public site; IP/PII in stored records; CAPTCHA.

## Open questions (owner)
1. Sprite body: revive the robot SVG vs design a new creature.
2. Reward content: secret "now building" page (recommended) / call-booking link / other.
3. Rating scale: 1–5 (default in this spec) vs simpler cool/not-cool.

## Plan (phases, each independently verifiable)
1. Progress v2 (dwell-guard watched, schema migration, badge % label) — no sprite yet.
2. CTA rubber-band (all three input paths + reduced-motion) wired to Progress.
3. Rating UI + functions/api/rating.js + KV namespaces + deploy config (wrangler.toml).
4. Sprite (state machine, positioning, microcopy, moods incl. outbound flag).
5. Reward page/content + end-to-end verify (Playwright: mouse/keyboard/touch paths,
   reduced-motion, rating POST on preview) + Lighthouse regression + abe-check.
