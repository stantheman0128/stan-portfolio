import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {discoveryPages,validateDiscovery} from '../src/render/discovery.js';
import {summarizeContributions} from '../tools/collect-oss-evidence.mjs';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const content=json('../data/content.json'),data=json('../data/discovery.json'),evidence=json('../data/oss-evidence.json');
describe('public discovery evidence',()=>{
  it('renders every catalog item and every contribution as static linked text',()=>{
    const pages=discoveryPages(content,data,evidence);
    const software=pages.find(p=>p.path==='/software').html;
    for(const p of data.catalog){expect(software).toContain(`id="${p.id}"`);expect(software).toContain(p.name);}
    for(const path of ['/open-source','/zh/open-source']){
      const html=pages.find(p=>p.path===path).html;
      for(const p of evidence.pullRequests)expect(html).toContain(`href="${p.url}"`);
      expect(html).toContain(`hreflang="en" href="https://stan-shih.com/open-source"`);
      expect(html).toContain(`hreflang="zh-Hant" href="https://stan-shih.com/zh/open-source"`);
    }
    const note=pages.find(p=>p.path.startsWith('/notes/')).html;
    const graph=JSON.parse(note.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    expect(graph.find(n=>n['@type']==='Article').citation).toHaveLength(data.selectedContributions.length);
    expect(graph.some(n=>n['@type']==='SoftwareSourceCode')).toBe(false);
  });
  it('fails closed on inflated counts, own-repository PRs and unverified selections',()=>{
    expect(()=>validateDiscovery(data,{...evidence,pullRequestCount:999})).toThrow();
    const altered=structuredClone(evidence);altered.pullRequests[0].repository='stantheman0128/example';
    expect(()=>validateDiscovery(data,altered)).toThrow();
    const fake=structuredClone(data);fake.selectedContributions[0].url='https://github.com/example/repo/pull/999';
    expect(()=>validateDiscovery(fake,evidence)).toThrow();
  });
  it('escapes untrusted contribution titles and rejects executable links',()=>{
    const altered=structuredClone(evidence);altered.pullRequests[0].title='<img src=x onerror=alert(1)>';
    const html=discoveryPages(content,data,altered).find(p=>p.path==='/open-source').html;
    expect(html).not.toContain('<img src=x');expect(html).toContain('&lt;img');
    const fake=structuredClone(data);fake.catalog[0].links[0].href='javascript:alert(1)';
    expect(()=>validateDiscovery(fake,evidence)).toThrow();
  });
  it('counts only merged authored external PRs and rejects incomplete pagination',()=>{
    const item=(id,owner,merged,author='stan')=>({id,number:id,title:'change',html_url:`https://github.com/${owner}/repo/pull/${id}`,repository_url:`https://api.github.com/repos/${owner}/repo`,user:{login:author},pull_request:{merged_at:merged}});
    const page={total_count:4,incomplete_results:false,items:[item(1,'upstream','2026-09-01'),item(2,'stan','2026-09-01'),item(3,'upstream',null),item(4,'upstream','2026-09-01','other')]};
    expect(summarizeContributions([page],'stan','2026-09-19').pullRequestCount).toBe(1);
    expect(()=>summarizeContributions([{...page,total_count:5}],'stan','2026-09-19')).toThrow();
    expect(()=>summarizeContributions([{...page,incomplete_results:true}],'stan','2026-09-19')).toThrow();
  });
});
