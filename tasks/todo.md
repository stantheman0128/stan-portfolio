# Live Studio — self-serve portfolio editor

Goal: a HackMD-style editor (left = fields, right = live preview of the real site),
two switchable themes (Featherweight, Minimal), content Stan edits himself and publishes
to GitHub. Built on branch `demo/personal-site-concepts`; `main`/production untouched
until Stan approves.

## Architecture
- `data/content.json` — single source of truth (items + text sections).
- `src/render/renderSite.js` — `renderSite(content, theme)` → full HTML string.
  Same function powers the public site AND the studio's live preview (WYSIWYG).
- `src/render/themes/{featherweight,minimal}.js` — `render(content)` → full HTML doc.
- `studio.html` + `src/studio/studio.js` — the editor (left forms / right iframe preview).
- Persistence: localStorage draft (instant) + Publish → commit to GitHub via the existing
  `stan-portfolio-cms-auth` OAuth worker → auto-deploy.

## Content fields per item (Stan's ask)
name (title) · description · detailed description (markdown) · links[] (label+url) · image

## Tasks
- [x] P0 content model: `data/content.json` with `detail` on each item
- [x] P0 render contract: `renderSite.js` dispatcher + theme stubs
- [x] P1 theme: Featherweight `render(content)` (ported by agent, verified)
- [x] P1 theme: Minimal `render(content)` (ported by agent, verified)
- [x] P1 studio shell: left forms (profile/about/items), right live iframe, theme toggle
- [x] P1 local persistence: localStorage draft + load + export JSON
- [x] P1 image: local object-URL preview
- [x] P1 VERIFIED: theme toggle + live edit tested via Playwright (both pass)
- [x] Freeform on-page editor `edit.html` (owner chose pure DOM editing over data-bound;
      theme = starting template, artifact = static HTML; verified: edits/delete/duplicate
      survive reload, export strips chrome). Publish for freeform = commit exported HTML.
- [ ] P1b editable text sections beyond profile/about/items (patent/experience/press/edu/skills)
- [ ] P2 GitHub publish: OAuth handshake + commit content.json via worker
- [ ] P2 image upload: commit new images to public/assets
- [ ] P2 public site: index renders active theme from content.json
- [ ] P3 verify end-to-end (add item in studio → preview → publish → deploy)
- [ ] P3 deploy to preview URL for Stan to test

## Interactive touches (2026-07-04)
- [x] Collision-avoidance cursor (owner's patent as UX): TTC-gated amber warn ring,
      shared fx module, applied to featherweight + minimal; reveal line in patent block.
      Verified: fast approach fires, slow doesn't, clears after HOLD, no regressions.
- [x] "Status Monitor · Stan" under-construction stub section (both themes).
- [x] Featherweight: hero entrance animation + thumb hover lift (accepted trade-off:
      no longer zero-JS; first paint still unblocked).

## Roadmap — Live Action (Status Monitor · Stan)
Owner-approved idea, deferred. Phases:
1. P1 (no phone needed): "last shipped Xh ago" via GitHub public API (lazy fetch,
   hide on failure) + ClaudePulse reports coding-state to a small Cloudflare Worker/KV.
2. P2: phone reports curated states (LINE / on the move) via shortcut/webhook.
   Privacy: coarse states only, no location, owner kill-switch.
3. P3: per-product live numbers via daily cron Worker (CWS users, GitHub stars,
   site analytics) — only real numbers, never estimates.

## Round 4 (2026-07-05) — photo reward, inline comments, hedgehog v5, routing, patent image
- [x] Patent certificate image (Google Patents PDF p.1 → PNG) on both themes; featherweight abe-check stays 9/9
- [x] ETF Tracker item + cross-theme twin entries (`themeExclude` filter: minimal shows the featherweight twin, and vice versa)
- [x] Connection-aware routing: minimal auto-hands-off to /fast/ on saveData / 2g-3g / deviceMemory≤2 / prefers-reduced-data; `?v=full|fast` sticky override; footer links both ways
- [x] Ratings: comments now render inline under each project (avg + latest 4); global "What visitors say" wall removed; KV per-visitor overwrite semantics unchanged (KV IS the ratings database)
- [x] Photo reward: goofy face grows in the unlocked button → polaroid card → click develops the FULL photo via /api/reward; bottom EXPLORER-100 panel kept
- [x] Server-side gate: /api/quest sessions in KV (first-seen timestamps), token minted only for humanly-paced runs (≥45s, ≥900ms gaps, count from content.json); full photo lives ONLY in KV — verified: instant replay 204, garbage/tampered token 404, paced run 200
- [x] Hedgehog v5: hand-drawn look (feTurbulence wobble on quills, ink contour, hatching), front paw, bother-loop (walks over and boops the cursor; sulks if it fled), score-aware rating quips, chase commentary, speed-reader callout
- [x] Asset research (5 parallel agents): no free "hand-drawn + layered + hedgehog" asset exists; Rive/DragonBones runtimes 220KB-700KB → verdict: upgrade own SVG (0KB runtime). Done.

### Production launch checklist (before merging to prod)
- [ ] Set `REWARD_SECRET` Pages secret (preview currently uses a dev fallback — tokens are forgeable there by design, placeholder photo only)
- [ ] Upload Stan's REAL photos: replace `public/assets/reward-tease.svg` (goofy crop, public) + `wrangler kv key put asset:reward-full --path <full.jpg> --metadata '{"ct":"image/jpeg"}' --namespace-id=<prod> --remote`
- [ ] Freeze `content._build` in tools/postbuild.mjs (every deploy currently resets visitor quest state)
- [ ] Bind RATINGS prod KV + set EXPORT_KEY (ask Stan first)
- [ ] /fast/ footer link points to `/site?theme=minimal&v=full` — change to `/?v=full` when minimal becomes the root page

## Review
Round 4 verified end-to-end on https://sprite.stan-portfolio.pages.dev (deployed preview):
15/15 render smoke checks, featherweight abe-check 9/9 (6.5KB gzip, 9 imgs lazy+dimensioned),
API negative/positive paths via curl, full polaroid develop flow + inline comments + v=fast/full
routing round-trip via Playwright on the live preview.
