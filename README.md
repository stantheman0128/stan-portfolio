# Stan Shih — Personal Website

Personal website for Stan Shih (施博瀚 / Po-Han Shih), positioned as an AI Product
Developer and AI Agent Builder. Vite and vanilla JavaScript power a static
homepage, an interactive edition, and the existing Live Studio editor.

- Canonical website: <https://stan-shih.com/>
- Interactive edition: <https://stan-shih.com/interactive>
- Repository: <https://github.com/stantheman0128/stan-portfolio>
- Cloudflare Pages project: `stan-portfolio`
- Older aliases: `portfolio.stan-shih.com`, `stan-portfolio.pages.dev`

## Local workspace

Use `C:\Users\stans\Projects\stan-portfolio` for new work.
The 2026-09-14 refresh branch is `codex/portfolio-seo-refresh`, based on remote
`main` at `af44ea5`. Local edits do not automatically publish.

`stan-portfolio-perf-final` is a linked Git worktree, not another repository.
At the audit it held local `main` at `e8c1e18`, 11 commits behind remote main.
It is retained, including its ignored build/tool files. The old
`feat/moana-puppet-guide` branch is preserved in Git.

Ten empty portfolio directories were moved to
`C:\Users\stans\Projects\_archive\portfolio-empty-2026-09-14`.
See [the audit and roadmap](docs/portfolio-seo-audit-2026-09-14.md).

## Current content and code

- `data/content.json`: current website content and Live Studio source.
- `src/render/themes/featherweight.js`: static public homepage.
- `src/render/themes/minimal.js`: interactive edition.
- `src/render/seo.js`: canonical, social metadata, and identity JSON-LD.
- `src/render/editorial.js`: English/Chinese profile, work index, and case-study pages.
- `src/render/markdown.js`: Markdown rendition of current content.
- `tools/postbuild.mjs`: builds homepage, full interactive HTML, /about, /zh/about,
  /work and its case studies, /fast/, sitemap, llms.txt,
  and the generated `functions/_front-door.js` edge payload.
- `functions/index.js`: homepage HTML / Markdown content negotiation.
- `src/studio/` and `studio.html`: existing Live Studio editor.
- `public/404.html` and `public/_redirects`: missing pages and legacy URLs.

The original `data/site.json`, `data/projects/`, and Sveltia `/admin/`
are retained legacy files, not the current homepage's content source.
Do not reintroduce the old CMS based on historical handoff entries.

## Development and verification

On Stan's machine, check Resource Sentinel and use its admission wrapper before
installs, tests, or builds, as required by the global AGENTS instructions.

```text
npm install
npm run dev
npm test -- --maxWorkers=1
npm run build
npm run preview
```

The build bakes thumbnails, runs Vite, then runs postbuild. Review the generated
`functions/_front-door.js` alongside content changes.
`/llms.txt` and `/sitemap.xml` are build outputs; inspect them from dist.
Vite preview does not emulate Pages Functions or Cloudflare routing.

Cloudflare Pages Git integration is active: remote commit `af44ea5` has a successful
`Cloudflare Pages` check linked to its deployment. There is no tracked GitHub Actions
deploy workflow. Verify preview and production checks after pushing; a local build
does not prove deployment, search indexing, or improved ranking.

## Public content

Keep the main portfolio and case studies in English. `/zh/about` is the intentional
Traditional Chinese profile, paired with `/about` through reciprocal hreflang.
Use public evidence for availability, impact, and credentials. Preserve sections
intentionally removed by the owner. Do not invent URLs or expose private project
data. AI-readable content must not restore an independently maintained biography
with facts removed from the website.
