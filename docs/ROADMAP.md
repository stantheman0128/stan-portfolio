# Roadmap — stan-portfolio

Owner-approved direction, 2026-07-13. Ordered roughly by intent, not by date.

## 1. Freeform visual editor v2 ("Word-like")

Owner wish: pick fonts and colors, drag elements around — style and layout
freedom without asking Claude for every tweak.

What this actually requires, honestly:

- **Style tokens as content.** A `style` block in content.json (font pairs,
  accent color, spacing scale) + a small style panel in the editor. Both themes
  read the tokens. This is the cheap 80%: fonts/colors/sizes become
  self-service without breaking the two-theme architecture. **Recommended
  first step.**
- **Drag-to-place is a different architecture.** Today the page layout lives
  in theme templates and content is pure data — that's why publishing is a
  10 KB JSON commit and the site stays fast. True free-position dragging means
  per-element coordinates in content, absolute-position rendering, and manual
  responsive behavior per breakpoint (the Wix/Framer trade-off). Verdict:
  don't rebuild for it; instead grow **block-level controls** — reorder
  sections, toggle sections on/off, choose per-section variants — which gives
  the "move things around" feeling while staying content-driven.

## 2. Spec-for-Sonnet ("small edits without the big model")

Owner idea: write the project spec down well enough that a smaller model can
execute routine changes. Ingredients already half-done:

- HANDOFF.md carries session context; PRODUCT.md / DESIGN.md carry contracts.
- Missing: a single `docs/EDITING-SPEC.md` that maps "what I want to change"
  → "which file/knob," plus the invariants (runtime-string rules, edit-mode
  binding contract, cache no-store policy, test commands). Write it once,
  point any model at it.

## 3. Multi-page site (tabs)

Owner wish: separate pages for resume and autobiography (自傳).

- Architecture fits already: `renderSite(content, theme)` can grow
  `content.pages[]` (id, title, blocks) + per-page routes (`/resume`, `/about`)
  rendered by the same themes; nav grows tabs. The editor edits pages the same
  way it edits items today.
- Resume needs a content model (experience/education/skills already have
  dormant schema + featherweight sections — revive those first).

## 4. Continuous

- RWD sweep on every visual change (mobile 375px on both editions).
- Paper Stan AI: keep an eye on the daily fuse (200/day) once traffic grows.
- Ratings KV: periodic look at what visitors say.
