import { esc } from "./util.js";
import { displayName, ORIGIN, publicUrl, seoHead } from "./seo.js";

// Extends the existing Featherweight typography and color tokens. These pages
// are plain HTML, with no client-side fetch required to read the main content.
const styles = `
:root{color-scheme:light dark;--bg:#fbfbfa;--ink:#16161a;--muted:#4a4a52;--line:#cfcfd4;--focus:#1a55ff;--space:1.5rem;--measure:46rem}
@media(prefers-color-scheme:dark){:root{--bg:#0e0e10;--ink:#ecedee;--muted:#b7b8bc;--line:#3a3a40;--focus:#6f9bff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:1.0625rem/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,system-ui,sans-serif}
.wrap{max-width:var(--measure);margin:auto;padding:0 var(--space)}
a{color:inherit;text-underline-offset:.2em;text-decoration-thickness:1px;overflow-wrap:anywhere}
a:hover{text-decoration-thickness:2px}a:focus-visible{outline:2px solid var(--focus);outline-offset:4px;border-radius:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:1rem;top:1rem;background:var(--bg);padding:1rem;z-index:2}
.site-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:1.5rem 0;border-bottom:1px solid var(--line)}
.site-nav a,.language,.source-links a{display:inline-flex;align-items:center;min-height:44px}
.site-nav .links{display:flex;gap:1.5rem;flex-wrap:wrap}.brand{font-weight:650;text-decoration:none}
main{padding:3rem 0 4rem}.breadcrumb{display:flex;gap:.65rem;flex-wrap:wrap;font-size:.875rem;color:var(--muted);margin:0 0 2rem}
h1,h2,h3{line-height:1.2;letter-spacing:-.025em;font-weight:650}h1{font-size:clamp(2rem,5vw,3rem);margin:0 0 1rem}h2{font-size:1.5rem;margin:2.5rem 0 1rem}h3{font-size:1.25rem;margin:0 0 .5rem}
p{margin:0 0 1.15rem;max-width:68ch}.intro{font-size:1.25rem;line-height:1.5;color:var(--muted)}.meta{font-size:.875rem;color:var(--muted)}
.profile-intro{display:grid;grid-template-columns:minmax(0,1fr) 128px;gap:2rem;align-items:start}.portrait{width:128px;height:160px;object-fit:cover;object-position:center 42%;border-radius:6px}
.role{color:var(--muted);margin-top:1rem}.identity{display:grid;grid-template-columns:8rem minmax(0,1fr);gap:.65rem 1rem;padding:1.5rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}
.work-list{padding:0;list-style:none}.work-list li{padding:1.5rem 0;border-bottom:1px solid var(--line)}.work-list p{color:var(--muted);margin-bottom:.25rem}.work-list a{display:inline-flex;align-items:center;min-height:44px}
.source-links{padding-left:1.25rem}.source-links li{margin:.4rem 0}footer{padding:1.5rem 0 2rem;border-top:1px solid var(--line);font-size:.875rem;color:var(--muted)}
@media(max-width:30rem){.profile-intro{grid-template-columns:1fr;gap:1rem}.portrait{width:96px;height:120px}.identity{grid-template-columns:1fr;gap:.25rem}.identity dd{margin-bottom:.75rem}.site-nav .links{gap:1rem}main{padding-top:2rem}}
`;

export function publishedStudies(c) {
  const ids = new Set((c.items || []).filter(i => i?.title).map(i => i.id));
  const studies = (c.caseStudies || []).filter(s => s && ids.has(s.itemId));
  const slugs = new Set();
  for (const study of studies) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(study.slug) || slugs.has(study.slug)) {
      throw new Error("Case-study slugs must be unique, simple URL segments");
    }
    if (!study.title || !study.summary || !study.sections?.length) throw new Error(`Incomplete case study: ${study.slug}`);
    slugs.add(study.slug);
  }
  return studies;
}

export function profileNav() {
  return '<nav class="identity-nav" aria-label="About and case studies"><a href="/about">About Stan</a><a href="/work">Case studies</a><a href="/zh/about" lang="zh-Hant">中文介紹</a></nav>';
}

const paragraphs = list => (list || []).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("\n");
const sources = list => `<ul class="source-links">${(list || []).map(s => {
  const href = publicUrl(s.href);
  return href ? `<li><a href="${esc(href)}">${esc(s.label)}</a></li>` : "";
}).join("")}</ul>`;

function workList(c, zh = false) {
  return `<ul class="work-list">${publishedStudies(c).map(s => `<li><h3><a href="/work/${esc(s.slug)}">${esc(s.title)}</a></h3><p>${esc(s.summary)}</p><a href="/work/${esc(s.slug)}">${zh ? "閱讀英文案例" : "Read the case study"} →</a></li>`).join("")}</ul>`;
}

function shell(c, { path, title, description, lang = "en", pageType = "WebPage", alternates = [], article, breadcrumbs, body }) {
  const p = c.profile || {};
  const zh = lang === "zh-Hant";
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
${seoHead(p, { path, title, desc: description, lang, pageType, alternates, article, breadcrumbs })}
<style>${styles}</style></head><body>
<a class="skip" href="#main">${zh ? "跳至主要內容" : "Skip to content"}</a>
<div class="wrap"><header><nav class="site-nav" aria-label="${zh ? "主要導覽" : "Main navigation"}"><a class="brand" href="/">${esc(displayName(p))}</a><div class="links"><a href="${zh ? "/zh/about" : "/about"}">${zh ? "關於我" : "About"}</a><a href="/work">${zh ? "作品案例" : "Case studies"}</a><a href="/#contact">${zh ? "聯絡" : "Contact"}</a></div></nav></header>
<main id="main">${body}</main>
<footer>${esc(displayName(p))} · ${zh ? "台北，台灣" : esc(p.location || "Taipei, Taiwan")}<br><a href="/">${zh ? "個人網站與作品集" : "Personal website and portfolio"}</a></footer>
</div></body></html>`;
}

function aboutPage(c, zh) {
  const p = c.profile || {};
  const a = c.about || {};
  const path = zh ? "/zh/about" : "/about";
  const title = zh ? a.zhHant.title : `About ${displayName(p)} — AI Product Developer`;
  const description = zh ? a.zhHant.description : a.short;
  const identity = zh
    ? [["中文姓名", p.chineseName], ["英文姓名", p.name], ["另用英文姓名", p.latinName], ["GitHub", "stantheman0128"], ["所在地", "台北，台灣"]]
    : [["Name", p.name], ["Chinese name", p.chineseName], ["Also known as", p.latinName], ["GitHub", "stantheman0128"], ["Based in", p.location]];
  const body = `<div class="profile-intro"><div><h1>${zh ? esc(p.chineseName + " · " + p.name) : esc(displayName(p))}</h1><p class="intro">${zh ? "AI 產品開發者 · AI Agent Builder" : esc(p.role)}</p><a class="language" href="${zh ? "/about" : "/zh/about"}" lang="${zh ? "en" : "zh-Hant"}">${zh ? "Read in English" : "閱讀繁體中文介紹"} →</a></div>${p.imageUrl ? `<img class="portrait" src="${esc(p.imageUrl)}" width="128" height="160" alt="${esc(displayName(p))}" decoding="async">` : ""}</div>
  <section aria-label="${zh ? "個人介紹" : "Introduction"}">${paragraphs(zh ? a.zhHant.paragraphs : a.paragraphs)}</section>
  <h2>${zh ? "姓名與公開身分" : "Names and public identity"}</h2>
  <dl class="identity">${identity.filter(x => x[1]).map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join("")}</dl>
  <p>${zh ? "這個網站介紹的是開發 Antnest Chatbot、ClaudePulse for Windows 與 Notify+ 的施博瀚。你可以從以下本人帳號與作品連結核對我的工作。" : "This profile belongs to the developer of Antnest Chatbot, ClaudePulse for Windows, and Notify+. The accounts and project links below connect these names to my software work."}</p>
  <h2>${zh ? "作品與實作" : "Projects and implementation"}</h2>${workList(c, zh)}
  <h2>${zh ? "本人公開帳號" : "Find my work elsewhere"}</h2>${sources([{ label: "GitHub · stantheman0128", href: p.githubUrl }, { label: "LinkedIn · Po-Han (Stan) Shih", href: p.linkedinUrl }])}
  <p>${zh ? "Notify+ 的 Google Play 商店頁也列出開發者 Stan Shih。" : "The Notify+ Google Play listing also identifies its developer as Stan Shih."}</p>${sources([{ label: "Notify+ · Google Play", href: "https://play.google.com/store/apps/details?id=com.stanslab.linenotify" }])}`;
  return { path, html: shell(c, { path, title, description, lang: zh ? "zh-Hant" : "en", pageType: "ProfilePage", alternates: [{ lang: "en", path: "/about" }, { lang: "zh-Hant", path: "/zh/about" }, { lang: "x-default", path: "/about" }], body }) };
}

export function editorialPages(c) {
  const p = c.profile || {};
  const pages = [aboutPage(c, false), aboutPage(c, true)];
  const title = `Case studies — ${displayName(p)}`;
  pages.push({ path: "/work", html: shell(c, { path: "/work", title, description: `AI products, developer tools, and Android apps by ${displayName(p)}. Read how the projects work and explore their public sources.`, body: `<h1>Case studies</h1><p class="intro">AI products, developer tools, and the decisions behind them.</p><p>By <a href="/about">${esc(displayName(p))}</a> · ${esc(p.location)}</p>${workList(c)}` }) });
  for (const s of publishedStudies(c)) {
    const path = "/work/" + s.slug;
    const project = c.items.find(i => i.id === s.itemId);
    const pageTitle = `${s.title} — ${displayName(p)}`;
    const body = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/work">Case studies</a><span aria-hidden="true">/</span><span>${esc(s.title)}</span></nav>
    <article><header><h1>${esc(s.title)}</h1><p class="intro">${esc(s.subtitle)}</p><p class="meta">By <a rel="author" href="/about">${esc(displayName(p))}</a> · Updated <time datetime="${esc(s.modified)}">${esc(s.modified)}</time></p><p>${esc(s.summary)}</p></header>
    ${s.sections.map(section => `<section><h2>${esc(section.title)}</h2>${paragraphs(section.paragraphs)}</section>`).join("")}
    <section><h2>Explore the project</h2>${sources(s.sources)}</section></article>
    <section><h2>About the developer</h2><p>${esc(c.about.short)}</p><a href="/about">About Stan Shih 施博瀚 →</a></section>`;
    pages.push({ path, html: shell(c, { path, title: pageTitle, description: s.summary, article: { ...s, image: project.image }, breadcrumbs: [{ name: "Home", path: "/" }, { name: "Case studies", path: "/work" }, { name: s.title, path }], body }) });
  }
  return pages;
}

export function sitemapXml(paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(paths)].map(path => `<url><loc>${esc(ORIGIN + path)}</loc></url>`).join("\n")}\n</urlset>\n`;
}
