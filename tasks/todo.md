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

## Review
(to be filled after implementation)
