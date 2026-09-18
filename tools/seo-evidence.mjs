// Read-only HTTP evidence, not a search-rank or real-crawler measurement.
// Usage: node tools/seo-evidence.mjs [output.json]
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const origin = 'https://stan-shih.com';
const paths = ['/', '/zh/about', '/work', '/work/antnest-chatbot',
  '/work/paper-stan', '/work/claudepulse', '/work/notify-plus', '/interactive',
  '/software', '/open-source', '/zh/open-source', '/notes/windows-open-source-fixes', '/research'];
const capturedAt = new Date().toISOString();

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map(([, key, , value]) => [key.toLowerCase(), value]));
}

async function read(path) {
  const response = await fetch(origin + path, {
    redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'StanPortfolioEvidence/1.0 (owner read-only audit)' },
  });
  return { status: response.status, location: response.headers.get('location'),
    xRobotsTag: response.headers.get('x-robots-tag'), text: await response.text() };
}

const report = {
  capturedAt, origin,
  limitations: ['HTTP observations do not prove indexing, rankings or AI citations.',
    'This is an ordinary client, not a verified search crawler IP.',
    'HTML extraction covers this site\'s quoted metadata; it is not a general HTML validator.'],
  pages: [], checks: [],
};

for (const path of paths) {
  try {
    const response = await read(path);
    const tags = [...response.text.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(([tag]) => attributes(tag));
    const schema = [];
    let schemaErrors = 0;
    for (const [block] of response.text.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)) {
      if (attributes(block.slice(0, block.indexOf('>') + 1)).type !== 'application/ld+json') continue;
      try { schema.push(JSON.parse(block.slice(block.indexOf('>') + 1, block.lastIndexOf('</')))); }
      catch { schemaErrors++; }
    }
    const nodes = schema.flatMap(item => Array.isArray(item) ? item : item['@graph'] ?? [item]);
    const canonical = tags.find(tag => tag.rel === 'canonical')?.href ?? null;
    const person = nodes.find(node => node['@type'] === 'Person');
    report.pages.push({ path, status: response.status, location: response.location,
      canonical, canonicalMatches: canonical === origin + (path === '/' ? '/' : path),
      title: response.text.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null,
      robots: tags.find(tag => tag.name === 'robots')?.content ?? null,
      xRobotsTag: response.xRobotsTag, schemaErrors,
      schemaTypes: nodes.flatMap(node => node['@type'] ?? []),
      person: person ? { id: person['@id'], url: person.url, sameAs: person.sameAs } : null,
    });
  } catch (error) { report.pages.push({ path, error: error.name }); }
}

for (const path of ['/robots.txt', '/sitemap.xml', '/about']) {
  try {
    const response = await read(path);
    const evidence = { path, status: response.status, location: response.location };
    if (path === '/robots.txt') evidence.sitemaps = [...response.text.matchAll(/^Sitemap:\s*(.+)$/gmi)].map(match => match[1].trim());
    if (path === '/sitemap.xml') {
      evidence.urls = [...response.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
      evidence.matchesExpectedPages = evidence.urls.length === paths.length
        && paths.every(page => evidence.urls.includes(origin + page));
    }
    report.checks.push(evidence);
  } catch (error) { report.checks.push({ path, error: error.name }); }
}

report.failures = report.pages.filter(page => page.error || page.status !== 200 || !page.canonicalMatches || page.schemaErrors || /noindex/i.test(`${page.robots ?? ''} ${page.xRobotsTag ?? ''}`)).map(page => page.path);
report.failures.push(...report.checks.filter(check => check.error ||
  (check.path === '/about' ? check.status !== 302 || check.location !== 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    : check.status !== 200 || (check.path === '/sitemap.xml' && !check.matchesExpectedPages) ||
      (check.path === '/robots.txt' && !check.sitemaps?.includes(origin + '/sitemap.xml')))).map(check => check.path));

if (process.argv[2]) {
  const output = resolve(process.argv[2]);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
