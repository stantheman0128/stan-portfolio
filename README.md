# Stan Portfolio

Static Vite portfolio for Stan Shih's Colonist Product Developer Intern application.

- Live: <https://portfolio.stan-shih.com>
- Pages fallback: <https://stan-portfolio.pages.dev>
- CMS: <https://portfolio.stan-shih.com/admin/>
- Cloudflare Pages project: `stan-portfolio`

## Content Editing

Projects live in `data/projects/*.md` as YAML frontmatter. Site-wide copy and stable
Colonist project references live in `data/site.json`.

Sveltia CMS provides form-based editing at `/admin/`. Publishing commits the content
change to `main`; GitHub Actions then tests, builds, and deploys the site.

The build validates required project fields and all `colonistProject` /
`colonistRelated` slug references. Invalid CMS content fails before deployment.

## Local Development

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
npm run preview
```

Routes covered by the SPA fallback:

- `/`
- `/projects`
- `/colonist`
- `/admin/`

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which executes:

```bash
npm ci
npm test
npm run build
npx --yes wrangler@4.98.0 pages deploy dist --project-name=stan-portfolio --branch=main --commit-dirty=true
```

Required GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with Cloudflare Pages edit access

The current workflow secret was bootstrapped from the authenticated Wrangler session and
has been verified by a successful deployment. Replace it with a dedicated scoped
Cloudflare API token for long-term CI credential hygiene.

## CMS Authentication

The OAuth flow is based on the official `sveltia/sveltia-cms-auth` Worker and is deployed at:

`https://stan-portfolio-cms-auth.stanshih888.workers.dev`

It allows only `portfolio.stan-shih.com` and `stan-portfolio.pages.dev`. The GitHub
OAuth App is configured with:

- Name: `Stan Portfolio CMS`
- Homepage: `https://portfolio.stan-shih.com/admin/`
- Callback: `https://stan-portfolio-cms-auth.stanshih888.workers.dev/callback`

The Worker stores `ALLOWED_DOMAINS`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET`
as encrypted secrets. Rotate the GitHub OAuth secret in GitHub Developer Settings and
write the replacement with `wrangler secret put`; never commit it.

The versioned Worker source in `cms-auth/` deliberately requests only `public_repo` and
`read:user`, rather than access to private repositories or full user data.

## TODO / Placeholders

Links beginning with `#TODO-` remain in source data but are hidden from visitors:

- `#TODO-resume-pdf`: add only a sanitized, public-safe resume PDF.
- `#TODO-chrome-web-store`: add after the Colonist tracker is published.
- `#TODO-line-notify-play-store`: add after LINE Notify+ is public.
- `#TODO-traffic-demo`, `#TODO-english-companion-demo`: add when public demos exist.

Do not replace these with fabricated or unconfirmed URLs.
