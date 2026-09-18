import { esc } from './util.js';
import { publicUrl, displayName } from './seo.js';
import { shell } from './editorial.js';

const link = (href,label) => {
  const url=publicUrl(href);
  return url ? `<a href="${esc(url)}">${esc(label)}</a>` : esc(label);
};
const links = rows => `<ul class="source-links">${rows.map(l=>`<li>${link(l.href,l.label)}</li>`).join('')}</ul>`;

export function validateDiscovery(data, evidence) {
  const ids=new Set();
  for(const p of data.catalog){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)||ids.has(p.id)||!p.name||!p.description||!p.links?.length) throw new Error('Invalid catalog entry');
    ids.add(p.id);
    if(p.links.some(l=>!publicUrl(l.href))) throw new Error('Invalid catalog link');
  }
  const prs=evidence.pullRequests;
  if(new Set(prs.map(p=>p.url)).size!==prs.length || evidence.pullRequestCount!==prs.length || evidence.repositoryCount!==new Set(prs.map(p=>p.repository)).size) throw new Error('Contribution counts do not match evidence');
  if(prs.some(p=>p.repository.split('/')[0].toLowerCase()===evidence.login.toLowerCase() || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(p.url) || p.url!==`https://github.com/${p.repository}/pull/${p.number}` || !Number.isFinite(Date.parse(p.mergedAt)))) throw new Error('Invalid contribution evidence');
  for(const p of data.selectedContributions){
    if(!prs.some(row=>row.url===p.url&&row.mergedAt===p.mergedAt)) throw new Error('Selected contribution is not in merged evidence');
  }
}

function software(c,data){
  const path='/software';
  const body=`<h1>Software by ${esc(displayName(c.profile))}</h1>
  <p class="intro">Android apps, browser extensions, AI tools and web applications from Taipei, Taiwan.</p>
  <p lang="zh-Hant">施博瀚的公開軟體與工具：查看用途、安裝入口、原始碼及使用限制。</p>
  <p>Store listings, downloadable releases and source-only tools are labeled separately. This directory includes tools maintained or adapted by Stan; upstream work is credited in the linked documentation.</p>
  <p class="meta">Links and publication status checked ${esc(data.checkedAt)}. See also ${link('/open-source','upstream contributions')} and ${link('/research','public research notes')}.</p>
  <ul class="work-list">${data.catalog.map(p=>`<li id="${esc(p.id)}"><h2>${esc(p.name)}</h2><p class="meta">${esc(p.category)} · ${esc(p.status)}</p><p>${esc(p.description)}</p>${p.zh?`<p lang="zh-Hant">${esc(p.zh)}</p>`:''}${p.limits?`<p>${esc(p.limits)}</p>`:''}${links(p.links)}</li>`).join('')}</ul>`;
  return {path,html:shell(c,{path,title:`Software and tools — ${displayName(c.profile)}`,description:'Published Android apps, Chrome extensions, Windows AI developer tools and web applications by Stan Shih (施博瀚) in Taiwan, with source and installation links.',pageType:'CollectionPage',body})};
}

function contributions(c,data,evidence,zh){
  const path=zh?'/zh/open-source':'/open-source';
  const title=zh?'施博瀚 Stan Shih 的開源貢獻 — 台灣開發者':'Open-source contributions — Stan Shih, Taiwan';
  const description=zh?'施博瀚（Stan Shih／stantheman0128）在 Apache Kafka、Ray、ToolHive、Claude-mem 等專案的已合併 PR、修正內容與公開證據。':'Merged contributions by Taiwan-based developer Stan Shih (stantheman0128) to Apache Kafka, Ray, ToolHive, Claude-mem and other public projects.';
  const grouped=new Map();
  for(const pr of evidence.pullRequests){
    if(!grouped.has(pr.repository)) grouped.set(pr.repository,[]);
    grouped.get(pr.repository).push(pr);
  }
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(evidence.checkedAt));
  const body=`<h1>${esc(title)}</h1><p class="intro">${zh?'我是施博瀚，位於台北的 AI 產品開發者與開源貢獻者，GitHub 帳號是 stantheman0128。':'I am Stan Shih (施博瀚 / Po-Han Shih), an AI product developer and open-source contributor based in Taipei, Taiwan. I contribute as stantheman0128 on GitHub.'}</p>
  <p>${zh?'我的公開貢獻包含 Windows 相容性、AI 開發工具、測試可靠性與中文內容。以下列出已被上游合併的修改，以及可直接核對的 PR。':'My public contributions include Windows compatibility, AI developer tools, test reliability and Chinese-language content. The records below link to changes merged into upstream projects.'}</p>
  <a class="language" href="${zh?'/open-source':'/zh/open-source'}" lang="${zh?'en':'zh-Hant'}">${zh?'Read in English':'閱讀繁體中文'} →</a>
  <h2>${zh?'已合併貢獻快照':'Merged contribution snapshot'}</h2>
  <p>${zh?`截至 ${date}，公開查詢找到我提出並已合併的 ${evidence.pullRequestCount} 個 PR，分布於其他帳號所擁有的 ${evidence.repositoryCount} 個 repositories。`:`As of ${date}, public GitHub search identifies ${evidence.pullRequestCount} authored, merged pull requests across ${evidence.repositoryCount} repositories owned by other accounts.`}</p>
  <p>${zh?'統計排除自己帳號下的 repositories、尚未合併的 PR 與私人紀錄，不代表所有貢獻，也不是貢獻者排名或專案背書。PR 數量不能取代對修改內容的評估。':'This excludes repositories under my own account, unmerged pull requests and private records. It is not an exhaustive contribution count, a contributor ranking or an endorsement by these projects. Counts do not measure the significance of each change.'}</p>
  <p>${link(evidence.searchUrl,zh?'核對公開 GitHub 查詢':'Check the public GitHub query')}</p>
  <h2>${zh?'代表性修改':'Selected changes'}</h2>
  <ul class="work-list">${data.selectedContributions.map(p=>`<li><h3>${link(p.url,`${p.repository} #${p.number}`)}</h3><p>${esc(zh?p.zh:p.en)}</p><p class="meta">${zh?'合併日期':'Merged'} ${esc(p.mergedAt.slice(0,10))}</p></li>`).join('')}</ul>
  <p>${link('/notes/windows-open-source-fixes',zh?'閱讀修正背後的重現方法與測試限制（英文）':'Read the reproduction methods and testing limits behind these fixes')}</p>
  <h2>${zh?'工具、協作與歸屬':'Tools, collaboration and attribution'}</h2>
  <p>${zh?'部分貢獻使用 AI 輔助工具；相關 PR 中保留工具使用、測試與限制說明。這裡描述的是我的提交紀錄，不代表獨力完成整個專案、取得上游維護者職位，或獲得機構推薦。':'Some contributions use AI-assisted development tools; the linked PRs retain the assistance disclosures, review context and validation limits. These are my contribution records, not claims of sole project authorship, an upstream maintainer role or institutional endorsement.'}</p>
  <p>${link('https://github.com/stantheman0128/oss-contrib-starter',zh?'開源貢獻入門指南（繁體中文）':'Traditional Chinese guide to starting OSS contributions')}</p>
  <h2>${zh?'完整快照：依 repository 分組':'Full snapshot by repository'}</h2>
  ${[...grouped].sort((a,b)=>a[0].localeCompare(b[0])).map(([repo,prs])=>`<details><summary>${esc(repo)} · ${prs.length} PR${prs.length===1?'':'s'}</summary><ul class="source-links">${prs.map(p=>`<li>${link(p.url,`#${p.number} ${p.title}`)} <span class="meta">(${esc(p.mergedAt.slice(0,10))})</span></li>`).join('')}</ul></details>`).join('')}`;
  return {path,html:shell(c,{path,title,description,lang:zh?'zh-Hant':'en',alternates:[{lang:'en',path:'/open-source'},{lang:'zh-Hant',path:'/zh/open-source'}],body})};
}

function notes(c,data){
  const path='/notes/windows-open-source-fixes';
  const title='Windows compatibility and reliability: lessons from merged OSS fixes';
  const description='Five source-linked examples of debugging filenames, socket URLs, shell quoting, consumer polling and provider message validation in public open-source projects.';
  const body=`<article><h1>${esc(title)}</h1><p class="meta">By ${link('/',displayName(c.profile))} · ${esc(data.checkedAt)}</p><p class="intro">Small platform assumptions can break a workflow far from the line that introduced them.</p><p>These notes connect five merged changes to their reproductions and validation records. Test results below are attributed to the original PR reports; the upstream suites were not rerun to publish this page.</p>${data.selectedContributions.map(p=>`<section><h2>${esc(p.repository)}</h2><p>${esc(p.en)}</p><p>${esc(p.lesson)}</p><p>${esc(p.validation)}</p><p>${link(p.url,`Read the patch and review: #${p.number}`)}</p></section>`).join('')}<h2>A reproducible contribution workflow</h2><p>Start with the exact failure, identify which platform or provider assumption is wrong, and add a regression check that fails before the repair. Keep the change narrow, document what was not tested, and let the upstream review record show what was accepted.</p><p>${link('/open-source','Contribution record')} · ${link('/software','My software and tools')}</p></article>`;
  return {path,html:shell(c,{path,title:`${title} — ${displayName(c.profile)}`,description,article:{title,modified:data.checkedAt,sources:data.selectedContributions.map(p=>({href:p.url}))},body})};
}

function research(c,data){
  const path='/research';
  const body=`<h1>Public research and experiments</h1><p class="intro">Source-linked experiments by ${esc(displayName(c.profile))}.</p><p>Research artifacts are separate from released products. Each project defines its own methods, evidence and limitations.</p><ul class="work-list">${data.research.map(p=>`<li><h2>${link(p.url,p.name)}</h2><p>${esc(p.description)}</p><p>${esc(p.limits)}</p></li>`).join('')}</ul><p>${link('/software','Software directory')} · ${link('/open-source','Open-source contributions')}</p>`;
  return {path,html:shell(c,{path,title:`Research and experiments — ${displayName(c.profile)}`,description:'Public speech-recognition, ink-depth validation and quantitative research experiments by Stan Shih, with original sources and stated limitations.',pageType:'CollectionPage',body})};
}

export function discoveryPages(c,data,evidence){
  validateDiscovery(data,evidence);
  return [software(c,data),contributions(c,data,evidence,false),contributions(c,data,evidence,true),notes(c,data),research(c,data)];
}
