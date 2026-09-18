// Public GitHub evidence only. Explicit invocation; never runs during a build.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function summarizeContributions(pages, login, checkedAt) {
  if (!pages.length || pages.some(p => p.incomplete_results)) throw new Error('Incomplete GitHub search');
  const items = pages.flatMap(p => p.items || []);
  if (new Set(items.map(p => p.id)).size !== pages[0].total_count) throw new Error('Missing or duplicated search results');
  const prs = items.filter(p => p.user?.login?.toLowerCase() === login.toLowerCase()
    && p.pull_request?.merged_at && p.repository_url?.startsWith('https://api.github.com/repos/')
    && p.repository_url.split('/')[4].toLowerCase() !== login.toLowerCase())
    .map(p => ({ repository: p.repository_url.slice('https://api.github.com/repos/'.length),
      number: p.number, title: p.title, url: p.html_url, mergedAt: p.pull_request.merged_at }))
    .sort((a,b) => b.mergedAt.localeCompare(a.mergedAt) || a.url.localeCompare(b.url));
  return { checkedAt, login, method: 'Public authored merged pull requests; excludes repositories owned by the author. Snapshot, not a ranking or a count of all contributions.',
    searchUrl: `https://github.com/search?q=author%3A${login}+is%3Apr+is%3Amerged+is%3Apublic&type=pullrequests`,
    pullRequestCount: prs.length, repositoryCount: new Set(prs.map(p => p.repository)).size, pullRequests: prs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [output, login = 'stantheman0128'] = process.argv.slice(2);
  if (!output || !/^[a-z\d-]+$/i.test(login)) throw new Error('Usage: node tools/collect-oss-evidence.mjs <output.json> [GitHub login]');
  const query = encodeURIComponent(`author:${login} is:pr is:merged is:public`);
  const pages = [];
  for (let page=1; ; page++) {
    const result = JSON.parse(execFileSync('gh', ['api', `search/issues?q=${query}&per_page=100&page=${page}&sort=updated`], {encoding:'utf8'}));
    if (result.total_count > 1000) throw new Error('GitHub search cap reached; partition query before publishing');
    pages.push(result);
    if (page * 100 >= result.total_count) break;
  }
  const evidence = summarizeContributions(pages, login, new Date().toISOString());
  writeFileSync(output, JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({pullRequests:evidence.pullRequestCount,repositories:evidence.repositoryCount,output}));
}
