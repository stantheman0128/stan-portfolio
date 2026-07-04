# Round 4 — Photo Reward, Inline Comments, Hedgehog v5, Cross-theme Routing, Patent Image

> **For agentic workers:** executed inline in-session (superpowers:executing-plans style); the planner is the implementer with full context. Steps use checkbox syntax.

**Goal:** Ship Stan's round-4 feedback: a server-gated goofy→full photo reward, per-project inline comments (wall removed), a snarkier and more bothersome hedgehog, ETF Tracker + cross-theme site entries with connection-aware routing, and a real patent certificate image.

**Architecture:** All progress/reward trust moves server-side: the client reports exploration events to a new `/api/quest` Pages Function which stores a per-visitor session in KV and only mints a short-lived HMAC token when the reported sequence is humanly plausible; `/api/reward` serves the full photo bytes from KV (never in git/dist) only against a valid token. Everything else stays in the existing content.json → render(theme) pipeline.

**Tech Stack:** Vite 8 static build, Cloudflare Pages Functions + KV (`RATINGS` namespace reused), vanilla JS fx modules, Playwright + headless Chrome for verification.

## Global Constraints

- Website copy is English; Traditional Chinese only in dev docs.
- Featherweight stays zero-JS, zero external requests — abe-check must stay 9/9.
- All API failure paths return 204/404 silently; client is fire-and-forget; a lost event never blocks a visitor.
- No PII in KV records; hashed-IP only as transient rate counters.
- Deploy-stamp reset (`_build`) stays ON during testing; freeze before production launch.
- Preview namespace id `0f18e001510f41faa6c476809cbab224`; prod `6ac0b3e4dc6d4b89a010abb0b5dbfe65`. Production KV binding + secrets = ask Stan first.

---

### Task 1: Patent certificate image
**Files:** Create `public/assets/patent-us10699576-p1.png` (pdftoppm -r 110, ~935×1210). Modify `data/content.json` (patent.image/imageAlt), `src/render/themes/minimal.js` (patentBlock figure, grid 1fr/240px), `src/render/themes/featherweight.js` (dimensioned lazy img in .patent).
**Verify:** `node tools/abe-check.mjs` still 9/9; minimal renders `<figure class="pt-fig">`.

### Task 2: ETF Tracker + cross-theme entries
**Files:** `data/content.json` — add items `etf-tracker` (image `/assets/etf-tracker-screenshot.png`, links Live `https://etf-tracker-seven.vercel.app` + GitHub), `site-featherweight` (`themeExclude:"featherweight"`, link `/fast/`), `site-minimal` (`themeExclude:"minimal"`, link `/site?theme=minimal&v=full`). Both themes filter `it.themeExclude !== <own name>` before rendering.
**Interfaces:** `themeExclude` is the single flag both themes and the quest server count consume.
**Verify:** minimal lists 9 items incl. site-featherweight, not site-minimal; featherweight vice-versa.

### Task 3: Ratings API — per-project comments
**Files:** `functions/api/rating.js` GET public shape becomes `{projects:{id:{n,avg,comments:[{r,c,ts}]≤4}}}` (newest-first, comment-bearing only). EXPORT_KEY full export unchanged.
**Verify:** deployed curl shows comments nested under project id.

### Task 4: Inline comments under each project (wall removed)
**Files:** `src/render/fx/rate.js` — delete `voicesHTML`/wall; add `.rate-wall` under each strip, lazy-filled from shared `agg()` on first panel open; XSS-safe textContent. `src/render/themes/minimal.js` — remove voices import/placement.
**Verify:** Playwright: open panel → comment visible under project; #voices absent.

### Task 5: Reward backend — /api/quest + /api/reward
**Files:** Create `functions/api/quest.js`, `functions/api/reward.js`, `functions/_lib/hmac.js` (shared sign/verify).
**Design:**
- POST /api/quest `{v,e:"start"}` → KV `qs:<voter>` `{t0,items:{}}` (TTL 7d, t0 only set once). `{v,e:"item",id}` → items[id]=now (validated regexes; silent 204 always; hashed-IP 120/hr limiter).
- POST `{v,e:"claim"}` → server fetches own `/data/content.json` via `env.ASSETS.fetch`, computes N = items where themeExclude!=="minimal" (+1 patent). Mint iff: session exists, count≥N, now−t0 ≥ 45s, sorted item timestamps have ≥900ms gaps. Token `voter.exp.hex(HMAC-SHA256(voter+"."+exp, REWARD_SECRET||dev-fallback))`, exp = now+10min. Else 204.
- GET /api/reward?t= → verify sig+expiry → serve KV `asset:reward-full` bytes (`ct` from KV metadata), `cache-control:no-store`; else 404.
- Full photo lives ONLY in KV (uploaded via wrangler, placeholder SVG now); never in git/dist. Threat model: blocks URL-guessing/repo-scraping/naive curl; a scripted browser replaying 45s of plausible events still wins — right bar for a photo easter egg.
**Verify:** deployed curl: bad token→404; instant-replay claim→204; a paced scripted session mints and fetches.

### Task 6: Client quest reporting + claim
**Files:** `src/render/fx/quest.js` — fire-and-forget POST start on load, item on watched(); expose `QUEST.claim(cb)`.
**Verify:** network tab shows /api/quest posts; claim returns token after paced exploration.

### Task 7: Goofy→full photo unlock UI (bottom panel stays)
**Files:** `src/render/fx/cta.js` — at 100% the button grows the goofy face (`/assets/reward-tease.svg`, public placeholder); click opens the existing bottom EXPLORER-100 panel AND a polaroid card under the button; polaroid click → QUEST.claim → fetch /api/reward → blob URL swaps tease→full portrait; graceful caption on failure. Create `public/assets/reward-tease.svg` placeholder.
**Verify:** Playwright with a completed state + paced server session: polaroid swaps to full image.

### Task 8: Hedgehog v5 behaviors (art deferred to asset research)
**Files:** `src/render/fx/sprite.js` — more snark (suggest pool, low/high rating reactions, fast-scroll callout, cta:chase commentary), bother-loop (walks to cursor, pokes it, "…it was right here" if cursor fled), all gated on !dismissed/!reduce. `src/render/fx/cta.js` emits throttled `cta:chase`.
**Verify:** Playwright: dispatch rate:sent r=2 → ouch line; bother-loop fires with mocked timers or shortened interval in dev check.

### Task 9: Connection-aware version routing
**Files:** `src/render/themes/minimal.js` — tiny inline head script: skip if in iframe or pathname not "/"|"/site"|"/site.html"; `?v=full/fast` stores pref; auto → `/fast/` on saveData, effectiveType 2g/3g, deviceMemory≤2, prefers-reduced-data (unless pref full). Footer gains "Lite version" link (stores pref fast on click). `src/render/themes/featherweight.js` footer gains "Full interactive version →" link to `/site?theme=minimal&v=full`.
**Verify:** Playwright CDP emulate slow connection → lands on /fast/; ?v=full sticks.

### Task 10: Build, verify, deploy preview, granular commits
Commits: one per task cluster (patent img / content entries / comments / reward stack / hedgehog / routing). `npm run build` + abe-check + Playwright suite + deployed curl checks; deploy `wrangler pages deploy dist` on feat/sprite-quest; wipe stale KV test keys.

**Deferred:** sprite art upgrade decision (asset-scout research in flight → report options to Stan; behaviors land now, art swap is its own task later). Production checklist additions: REWARD_SECRET secret, real goofy/full photos, freeze `_build`.
