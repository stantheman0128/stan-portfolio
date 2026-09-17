# Name-search verification — 2026-09-18

## Scope and outcome
Preserve current visible copy and styling. Strengthen the existing homepage as the
identity for Stan Shih / 施博瀚 / Po-Han Shih. The owner explicitly requested that
/about redirect to https://www.youtube.com/watch?v=dQw4w9WgXcQ.

- /about, /about/, /about.html: 302 to the exact requested YouTube URL.
- /about is no longer generated as a profile page or included in sitemap.
- Person.url, author links, navigation targets and Markdown identity link use /.
- Homepage JSON-LD is ProfilePage with mainEntity referencing the stable #person.
- Removed hreflang references to the now-redirecting English profile; the homepage
  and Chinese profile are not represented as exact translations.
- No changes to data/content.json, theme CSS, visible prose or project descriptions.

## Evidence from Google Search Console
Read on 2026-09-18 around 01:29–01:33 Asia/Taipei. Selected range: 3 months;
chart data available September 13–15; last update 6 hours earlier.

- Verified owner; robots.txt marked Valid.
- Overview: 4 indexed pages, 5 not indexed.
- Performance: 4 clicks, 9 impressions, 44.4% CTR, average position 1.9.
- Queries table: No data. The aggregate position does NOT establish name-query rank.
- Pages table: homepage 4 clicks / 9 impressions; /zh/about 0 / 4; /about 0 / 1.
  Page-level impressions can differ from property-level totals.
- Search generative AI: inherited domain default; Current control: Include.
  No setting change was required.
- Actual signed-in Taiwan Google first-page snapshots for 施博瀚 and Stan Shih
  did not show stan-shih.com. Results were personalized snapshots, not a rank tracker;
  the former mainly showed the designer and the latter Acer's founder.

## Open SEO Advisor audit and review
User-requested skill installed at C:/Users/stans/.agents/skills/open-seo-advisor,
version 0.3.5, upstream commit ada1a526c6c27c6e7298a483ef9960c35b0483e8.
CLI installed in an isolated, ignored .tmp/seo-venv. Public HTTP Consultant mode,
max 15 URLs / depth 1; 12 pages crawled. Raw report: .tmp/seo-advisor-before/.
The raw heuristic score 77.6/100 is not a ranking score and contains false positives.

| Finding | Manual assessment |
| --- | --- |
| Invalid sitemap XML | False positive: HTTPConnector.fetch_url clears non-HTML body; crawler reads the empty html field. Direct XML parse succeeded, 9 URLs before release. |
| robots lacks Sitemap | Same non-HTML body issue. Direct HTTP response contains Sitemap: https://stan-shih.com/sitemap.xml. |
| Duplicate title | Includes /fast/ (deliberate canonical duplicate) and /#contact (same document). /interactive is an alternate presentation. No body rewrite justified. |
| 4xx URL | Cloudflare email protection endpoint, not a content page. Preserve existing email privacy behavior. |
| Invalid hreflang zh-Hant | Scanner only accepts language/region pattern, omits script subtags. This release removes the profile pair because /about becomes a redirect, not because zh-Hant is invalid. |
| Image dimensions hints | Static hints, including decorative/hidden interaction images. No measured CLS regression; preserve styling. |

HTTP smoke requests using Googlebot, OAI-SearchBot and ChatGPT-User strings each
received 200. These are not verified crawler-IP tests and do not prove WAF behavior
for actual bots. WAF configuration/logs, field Core Web Vitals and AI citations were
not checked in this pass. No new external-profile edits were made.

## Verification
- 25 focused tests passed across editorial SEO, metadata, front-door negotiation,
  and Markdown rendering.
- Production build passed.
- Local isolated Pages routing: 19 routes passed, including exact 302 Location
  for all three /about variants, 404 for unknown URLs and noindex for editors.
- Homepage Markdown equals llms.txt.
- Homepage and interactive visible text and CSS match pre-release production;
  normalized Cloudflare's existing email obfuscation for the comparison.
- Remote main was fetched and confirmed at 1745854 before changes.

## Search acceptance and remaining work
The technical acceptance target is a crawlable, correctly attributed homepage with
consistent names, canonical identity and public account references. Organic rank for
bare names remains unproven and was not achieved in the observed first-page snapshots.
Review actual name-query impressions when Search Console exposes sufficient data.
Public profile website/name consistency is the next practical off-site action; it
requires reviewing the specific profile before editing. Do not add repeated biography
pages or rewrite visible copy as an automatic SEO fix.

## Production release
- Source commit: 01c7ed3; preview deployment 8faf90f5 succeeded.
- Production deployment 0feb49e3-d7e5-4479-8ed9-206ba322c423 succeeded on main.
- At 01:38:58 Asia/Taipei, the production /about response returned 302 with exact
  Location https://www.youtube.com/watch?v=dQw4w9WgXcQ.
- A fresh Chrome navigation to https://stan-shih.com/about landed on that exact
  YouTube URL and showed the Rick Astley video title. Closed the verification tab.
- All 8 remaining canonical pages returned 200 with static content and schema;
  sitemap contains exactly those 8 URLs. All three redirect variants, unknown-URL
  404, editor noindex, and homepage Markdown parity passed on production.
- Homepage index inspection: indexed; last crawl Sep 17, 2026, 9:38:12 AM,
  Googlebot smartphone, fetch successful, crawling and indexing allowed;
  Google-selected canonical matches https://stan-shih.com/.
- The inspection's sitemap subsection said Temporary processing error, while the
  dedicated Sitemaps report showed the existing submission Success (last read Sep 14).
  The updated sitemap was resubmitted after deployment; acceptance recorded below.
- All temporary Sentinel command exemptions used for this task were revoked by
  their wrappers after command completion; no global protection was disabled.

- Google Search Console confirmed: Sitemap submitted successfully after the release.
  Submission acceptance does not mean all URLs have already been recrawled.
