# DESIGN.md — stan-portfolio

## Architecture
- `renderSite(content, theme)` in `src/render/renderSite.js` dispatches to theme modules
  (`src/render/themes/<key>.js`, each `render(content) → full HTML document string`).
- Shared helpers `src/render/util.js`: `esc()` (escape everything interpolated),
  `md()` (tiny markdown for item `detail`), `realLinks()` (drops `#TODO-` links).
- Same render powers the public site (`site.html`), Studio preview (`studio.html`),
  and freeform editor templates (`edit.html`).

## Existing themes (shipped identities — preserve, don't second-guess)
- **featherweight** — light, one-column, perfect-fourth type scale, hairlines,
  system fonts, no JS. Quiet product-page energy.
- **minimal** — warm paper (#f6f5f1), Georgia serif display with terracotta (#c2522d)
  italic accent, mono eyebrows, numbered index, click-to-expand rows, hover preview.
  NOTE: this occupies the "editorial-typographic" lane; new themes must NOT repeat it
  (saturated AI lane per impeccable brand register).

## Hard rules for any new theme
- System fonts only (no font CDNs), zero external requests, all CSS/JS inline.
- WCAG AA contrast (body ≥4.5:1), semantic landmarks, keyboard focus visible,
  `prefers-reduced-motion` honored.
- Responsive 375px → 1280px, no horizontal overflow.
- Items: handle `image: null` (typographic card), `imageMode` ("icon"/"contain"/""),
  empty `links` (subtle "No public link yet" or omit).
- Conditional sections: render nothing for empty arrays.
- Impeccable absolute bans apply (no side-stripe accents, no gradient text, no glass
  default, no hero-metric template, no identical card grids, no eyebrow-per-section,
  no numbered scaffolding unless a true sequence, no text overflow).

## Theme differentiation map (each theme owns one axis)
- featherweight → quiet light list (typographic restraint)
- minimal → editorial paper (legacy lane, frozen)
- new themes must each claim a DIFFERENT axis (e.g. imagery-led, color-drenched,
  one-screen density) and dodge: cream+serif+terracotta, near-black+acid accent,
  broadsheet hairline newspaper, editorial-typographic in general.
