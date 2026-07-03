# PRODUCT.md — stan-portfolio

**What**: Stan Shih's personal work-index site. A pure portfolio (not a resume): hero
identity, 7 shipped works, one patent, contact. Owner curates content himself via the
Live Studio (`studio.html`) and the freeform editor (`edit.html`).

**Audience**: engineers, founders, and collaborators who click through from GitHub /
LinkedIn / communities. They skim; artifacts and links carry the trust.

**Register**: brand — design IS the product (portfolio). Voice words: **built, direct,
quietly confident**. No self-promotion prose; the works speak.

**The page's single job**: within seconds, show WHO he is (builder · inventor ·
AI-first) and WHAT he shipped, with links out.

**Non-negotiable constraints**
- Zero external requests: system font stacks only, all CSS/JS inline in the rendered
  document. Fast on any device, any network (Hiroshi-Abe philosophy).
- Content comes from `data/content.json` via `renderSite(content, theme)`; themes are
  pluggable modules in `src/render/themes/`.
- Empty sections (stats/about/experience/press/education/skills are currently empty
  arrays) must render as nothing — no empty shells.
- Links: only render real links; `#TODO-` prefixed hrefs are hidden. Never a dead button.
- English copy on the site; Traditional Chinese in conversations with the owner.
