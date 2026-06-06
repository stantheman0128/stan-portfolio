# Stan Portfolio CMS Auth

Cloudflare Worker OAuth bridge for Sveltia CMS, based on the MIT-licensed
[`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) flow.

This project intentionally supports GitHub only and requests the least privileges needed
for the public `stantheman0128/stan-portfolio` repository:

- `public_repo`: read and write public repositories
- `read:user`: read the signed-in user's profile

Required encrypted Worker secrets:

- `ALLOWED_DOMAINS`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Deploy without printing secrets:

```bash
npm run deploy:cms-auth
```
