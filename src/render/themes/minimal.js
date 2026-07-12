// Minimal / kafagoz theme — warm paper, serif display with a terracotta italic accent,
// a numbered index of work with click-to-expand panels and a floating desktop hover preview.
// Extended beyond the demo with About, Patent, Experience, Press, Education, Skills, and stats.
import { esc, md, realLinks, bindAttr, editLinksHTML } from "../util.js";
import { questCSS, questBadgeHTML, questJS } from "../fx/quest.js";
import { ctaCSS, ctaTopHTML, ctaJS } from "../fx/cta.js";
import { shatterJS } from "../fx/shatter.js";
import { creatorEntryJS } from "../fx/creator-entry.js";
import { spriteCSS, spriteHTML, spriteJS } from "../fx/sprite.js";
import { rateCSS, rateStripHTML, rateJS } from "../fx/rate.js";

// Split a tagline into "lead — <em>rest</em>" so the accent italic lands on the clause
// after the dash. Falls back to the whole string when there's no dash.
function accentTagline(t) {
  const s = String(t || "");
  const m = s.match(/^(.*?)([—–-])\s*(.+)$/);
  if (!m) return esc(s);
  return `${esc(m[1].trim())} <em>${esc(m[3].trim())}</em>`;
}

function itemThumb(it, ci, edit) {
  const mode = it.imageMode || "";
  if (it.image) {
    const cls = mode === "contain" ? "thumb thumb-contain" : mode === "icon" ? "thumb thumb-icon" : "thumb";
    // Intrinsic dimensions from content.json keep CLS at 0; the 4:3 fallback
    // matches the .thumb card so an item without baked dims still reserves space.
    const w = it.imageWidth | 0 || 800;
    const h = it.imageHeight | 0 || 600;
    return `<div class="${cls}"><img src="${esc(it.image)}" alt="${esc(it.title)} preview" width="${w}" height="${h}" loading="lazy" decoding="async"${bindAttr("items." + ci + ".image", edit, "image")}></div>`;
  }
  // No image: a typographic card built from the initials, never a broken <img>.
  const initials = esc(
    String(it.title || "")
      .split(/\s+/)
      .map((w) => w[0] || "")
      .join("")
      .slice(0, 3)
      .toUpperCase()
  );
  return `<div class="thumb thumb-empty" aria-hidden="true"><span class="thumb-mark">${initials}</span></div>`;
}

function itemLinks(links, ci, edit) {
  if (edit) {
    return `<div class="links ff-links" data-item="${ci}">${editLinksHTML(links, ci)}</div>`;
  }
  const ls = realLinks(links);
  if (!ls.length) return `<div class="links"><span class="nolink">No public link yet</span></div>`;
  return `<div class="links">${ls
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
    .join("")}</div>`;
}

function itemRow(it, i, ci, edit) {
  const num = String(i + 1).padStart(2, "0");
  const detail = md(it.detail);
  const detailHTML = edit
    ? `<div class="detail"${bindAttr("items." + ci + ".detail", edit, "md")}>${detail}</div>`
    : (detail ? `<div class="detail">${detail}</div>` : "");
  return `<section class="item${edit ? " open" : ""}" data-img="${esc(it.image || "")}" data-quest="${esc(it.id || "item-" + num)}">
    <h3 class="row-h">
      <button class="row" type="button" aria-expanded="${edit ? "true" : "false"}">
        <span class="num">${num}</span>
        <span class="title"${bindAttr("items." + ci + ".title", edit)}>${esc(it.title)}</span>
      </button>
    </h3>
    <div class="panel">
      <div class="panel-inner">
        <div class="panel-grid">
          <div class="body">
            <p class="desc"${bindAttr("items." + ci + ".description", edit)}>${esc(it.description)}</p>
            ${detailHTML}
            ${itemLinks(it.links, ci, edit)}
            ${edit ? "" : rateStripHTML(esc(it.id || "item-" + num))}
          </div>
          ${itemThumb(it, ci, edit)}
        </div>
      </div>
    </div>
  </section>`;
}

function statsRow(stats) {
  if (!stats || !stats.length) return "";
  const cells = stats
    .map(
      (s) => `<div class="stat">
        <div class="stat-v">${esc(s.value)}</div>
        <div class="stat-l">${esc(s.label)}</div>
      </div>`
    )
    .join("");
  return `<section class="block stats" aria-label="By the numbers">
    <div class="block-eyebrow">By the numbers</div>
    <div class="stat-grid">${cells}</div>
  </section>`;
}

function aboutBlock(about, edit) {
  if (!about || !(about.paragraphs || []).length) return "";
  const paras = about.paragraphs.map((p, idx) => `<p${bindAttr("about.paragraphs." + idx, edit)}>${esc(p)}</p>`).join("");
  const principles = (about.principles || [])
    .map(
      (pr) => `<div class="principle">
        <div class="pr-t">${esc(pr.title)}</div>
        <div class="pr-b">${esc(pr.body)}</div>
      </div>`
    )
    .join("");
  return `<section class="block" id="about">
    <div class="block-eyebrow">About</div>
    <div class="about-grid">
      <div class="about-prose">${paras}</div>
      ${principles ? `<div class="principles">${principles}</div>` : ""}
    </div>
  </section>`;
}

function patentBlock(pt, edit) {
  if (!pt || !pt.title) return "";
  const ids = (pt.ids || []).map((x, i) => `<span class="pt-id"${bindAttr("patent.ids." + i, edit)}>${esc(x)}</span>`).join("");
  const meta = edit
    ? `<span${bindAttr("patent.role", edit)}>${esc(pt.role || "")}</span> · <span${bindAttr("patent.year", edit)}>${esc(pt.year || "")}</span>`
    : [pt.role, pt.year].filter(Boolean).map(esc).join(" · ");
  const hi = (pt.highlights || []).map((h, i) => `<li${bindAttr("patent.highlights." + i, edit)}>${esc(h)}</li>`).join("");
  const fig = pt.image
    ? `<figure class="pt-fig">
        <a href="${esc(pt.image)}" target="_blank" rel="noopener">
          <img src="${esc(pt.image)}" alt="${esc(pt.imageAlt || "Patent document, first page")}"
            width="${pt.imageWidth | 0 || 935}" height="${pt.imageHeight | 0 || 1210}" loading="lazy" decoding="async">
        </a>
        <figcaption>${esc((pt.ids || [])[0] || "Patent")} · page 1 — click to zoom</figcaption>
      </figure>`
    : "";
  return `<section class="block" id="patent">
    <div class="block-eyebrow">Patent</div>
    <div class="patent${fig ? " has-fig" : ""}">
      <div class="pt-body">
        <h3 class="patent-title"${bindAttr("patent.title", edit)}>${esc(pt.title)}</h3>
        ${meta ? `<div class="patent-meta">${meta}</div>` : ""}
        ${ids ? `<div class="pt-ids">${ids}</div>` : ""}
        ${pt.blurb || edit ? `<p class="patent-blurb"${bindAttr("patent.blurb", edit)}>${esc(pt.blurb || "")}</p>` : ""}
        ${hi ? `<ul class="patent-hi">${hi}</ul>` : ""}
      </div>
      ${fig}
    </div>
  </section>`;
}

// One shared shape for Experience and Press/Community entries.
function entryList(entries, opts) {
  const o = opts || {};
  return (entries || [])
    .map((e) => {
      const heading = esc(e.org || e.school || "");
      const sub = esc(e.role || e.program || "");
      const period = esc(e.period || "");
      const metric = e.metric ? `<span class="entry-metric">${esc(e.metric)}</span>` : "";
      const points = (e.points || []).map((p) => `<li>${esc(p)}</li>`).join("");
      const note = e.note ? `<p class="entry-note">${esc(e.note)}</p>` : "";
      return `<div class="entry">
        <div class="entry-head">
          <div class="entry-lead">
            <span class="entry-org">${heading}</span>
            ${sub ? `<span class="entry-role">${sub}</span>` : ""}
          </div>
          <div class="entry-side">${metric}${period ? `<span class="entry-period">${period}</span>` : ""}</div>
        </div>
        ${points ? `<ul class="entry-points">${points}</ul>` : ""}
        ${o.showNote ? note : ""}
      </div>`;
    })
    .join("");
}

function experienceBlock(exp) {
  if (!exp || !exp.length) return "";
  return `<section class="block" id="experience">
    <div class="block-eyebrow">Experience</div>
    <div class="entries">${entryList(exp)}</div>
  </section>`;
}

function pressBlock(press) {
  if (!press || !press.length) return "";
  return `<section class="block" id="press">
    <div class="block-eyebrow">Press &amp; Community</div>
    <div class="entries">${entryList(press)}</div>
  </section>`;
}

function educationBlock(edu) {
  if (!edu || !edu.length) return "";
  return `<section class="block" id="education">
    <div class="block-eyebrow">Education</div>
    <div class="entries">${entryList(edu, { showNote: true })}</div>
  </section>`;
}

function skillsBlock(skills) {
  if (!skills || !skills.length) return "";
  const rows = skills
    .map(
      (g) => `<div class="skill-row">
        <div class="skill-group">${esc(g.group)}</div>
        <div class="skill-items">${(g.items || [])
          .map((it) => `<span class="skill">${esc(it)}</span>`)
          .join("")}</div>
      </div>`
    )
    .join("");
  return `<section class="block" id="skills">
    <div class="block-eyebrow">Skills</div>
    <div class="skills">${rows}</div>
  </section>`;
}

export function render(content, opts = {}) {
  const c = content || {};
  const edit = !!(opts && opts.edit);
  const p = c.profile || {};
  // Cross-theme entries: each theme hides the item that IS itself.
  const items = (c.items || [])
    .map((it, ci) => ({ it, ci }))
    .filter((x) => x.it.themeExclude !== "minimal");
  const years = items.map((x) => x.it.year).filter(Boolean);
  const yearSpan = years.length ? `${Math.min(...years.map(Number))} — ${Math.max(...years.map(Number))}` : "";

  const contacts = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
    p.email ? `<a href="mailto:${esc(p.email)}">Email</a>` : "",
    p.instagramUrl ? `<a href="${esc(p.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>` : "",
    p.dcardUrl ? `<a href="${esc(p.dcardUrl)}" target="_blank" rel="noopener">Dcard</a>` : "",
    p.threadsUrl ? `<a href="${esc(p.threadsUrl)}" target="_blank" rel="noopener">Threads</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  const title = `${esc(p.name || "Portfolio")}${p.role ? " — " + esc(p.role) : ""}`;
  const metaDesc = esc(p.subtagline || p.tagline || "");

  return `<!doctype html>
<html lang="en" data-theme="minimal">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${metaDesc}">
<meta name="build" content="${esc(String(c._build || "dev"))}">
<link rel="stylesheet" href="/moana-puppet-kit/moana-puppet.css">
<script>
// Connection-aware routing: on slow/lite environments, hand off to the
// zero-JS twin at /fast/. ?v=full|fast is a sticky manual override.
(function(){try{
  if(window!==top)return;
  var pth=location.pathname;
  if(pth!=="/"&&pth!=="/site"&&pth!=="/site.html"&&pth!=="/index.html")return;
  var v=new URLSearchParams(location.search).get("v");
  if(v==="full"){try{localStorage.setItem("site-ver","full")}catch(e){}return}
  if(v==="fast"){try{localStorage.setItem("site-ver","fast")}catch(e){}}
  var pref=null;try{pref=localStorage.getItem("site-ver")}catch(e){}
  if(pref==="full")return;
  var c=navigator.connection||{};
  var slow=c.saveData===true||["slow-2g","2g","3g"].indexOf(c.effectiveType)>-1;
  var lowEnd=(navigator.deviceMemory||8)<=2;
  var rd=false;try{rd=matchMedia("(prefers-reduced-data: reduce)").matches}catch(e){}
  if(pref==="fast"||slow||lowEnd||rd)location.replace("/fast/");
}catch(e){}})();
</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23f6f5f1'/%3E%3Cpolygon points='8,22 3,18 8,15' fill='%23efe7da'/%3E%3Cpolygon points='8,22 20,22 15,12' fill='%23c2522d'/%3E%3Cpolygon points='11,20 17,20 13,13' fill='%238f351f'/%3E%3Cpolygon points='20,22 26,18 21,15' fill='%23efe7da'/%3E%3Cpolygon points='26,18 29,19 26,21' fill='%2317151a'/%3E%3C/svg%3E">
<style>
:root{
  --bg:#f6f5f1; --ink:#17161a; --muted:#8b877f; --faint:#b7b2a8;
  --line:rgba(23,22,26,.12); --line-strong:rgba(23,22,26,.28); --accent:#c2522d;
  --card:#fffdfa;
  --serif:Georgia,"Times New Roman","Songti SC",serif;
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
  font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  overflow-x:hidden;}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:920px;margin:0 auto;padding:clamp(28px,7vw,88px) clamp(20px,6vw,48px) 80px}

/* masthead */
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--muted);display:flex;justify-content:space-between;align-items:center;gap:16px;
  padding-bottom:22px;border-bottom:1px solid var(--line)}
.eyebrow .badge{border:1px solid var(--line-strong);border-radius:999px;padding:3px 10px;
  color:var(--ink);font-size:11px;letter-spacing:.18em}

.hero{padding:clamp(40px,9vw,96px) 0 clamp(30px,6vw,56px)}
.hero h1{font-family:var(--serif);font-weight:400;font-size:clamp(34px,6.4vw,62px);
  line-height:1.06;letter-spacing:-.01em;margin:0 0 26px;max-width:16ch}
.hero h1 em{font-style:italic;color:var(--accent)}
.hero .sub{font-size:clamp(16px,2.1vw,19px);color:var(--muted);max-width:54ch;margin:0 0 30px}
.contacts{display:flex;flex-wrap:wrap;gap:10px 26px;font-family:var(--mono);font-size:13px;letter-spacing:.02em}
.contacts-foot{margin-top:70px}
.contacts a{color:var(--ink);padding-bottom:3px;border-bottom:1px solid var(--line-strong);
  transition:border-color .2s,color .2s}
.contacts a:hover,.contacts a:focus-visible{color:var(--accent);border-color:var(--accent)}
.avail{margin-top:22px;font-family:var(--mono);font-size:12px;letter-spacing:.04em;color:var(--muted)}
.avail::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;
  background:var(--accent);margin-right:9px;vertical-align:middle}

/* generic content block */
.block{padding:clamp(30px,5vw,52px) 0;border-top:1px solid var(--line)}
.block-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--faint);margin-bottom:22px}

/* stats */
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px 20px}
.stat-v{font-family:var(--serif);font-size:clamp(24px,4vw,34px);line-height:1;letter-spacing:-.01em}
.stat-l{font-family:var(--mono);font-size:11px;letter-spacing:.04em;color:var(--muted);
  text-transform:uppercase;margin-top:8px;line-height:1.4}

/* about */
.about-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:44px}
.about-prose p{margin:0 0 16px;max-width:58ch}
.about-prose p:last-child{margin-bottom:0}
.principles{display:flex;flex-direction:column;gap:18px}
.pr-t{font-family:var(--mono);font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--accent)}
.pr-b{font-size:14.5px;color:#3a3833;margin-top:5px}

/* index of work */
.index-head{display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--faint);padding:0 0 12px;
  border-top:1px solid var(--line);padding-top:clamp(30px,5vw,52px)}
.item{border-bottom:1px solid var(--line)}
.row-h{margin:0;font-weight:inherit;font-size:inherit}
.row{display:grid;grid-template-columns:46px 1fr;align-items:baseline;gap:18px;width:100%;
  background:none;border:0;text-align:left;cursor:pointer;padding:22px 0;color:var(--ink);
  font-family:inherit}
.row:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
.row .num{font-family:var(--mono);font-size:12px;color:var(--faint);transition:color .25s}
.row:hover .num,.item.open .num,.row:focus-visible .num{color:var(--accent)}
.row .title{font-family:var(--serif);font-size:clamp(21px,3.2vw,30px);font-weight:400;
  line-height:1.12;letter-spacing:-.01em}

.panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .36s cubic-bezier(.2,.7,.2,1)}
.item.open .panel{grid-template-rows:1fr}
.panel-inner{overflow:hidden}
.panel-grid{display:grid;grid-template-columns:1fr 240px;gap:30px;padding:2px 0 30px 64px;
  opacity:0;transform:translateY(6px);transition:opacity .3s .06s,transform .3s .06s}
.item.open .panel-grid{opacity:1;transform:none}
.panel-grid .desc{font-size:15.5px;color:#2c2a28;margin:0 0 14px;max-width:52ch}
.detail{color:#3a3833;font-size:14.5px;margin:0 0 16px;max-width:52ch}
.detail p{margin:0 0 10px}.detail p:last-child{margin-bottom:0}
.detail a{border-bottom:1px solid var(--accent);color:var(--accent)}
.links{display:flex;flex-wrap:wrap;gap:8px 18px;font-family:var(--mono);font-size:13px}
.links a{display:inline-flex;align-items:center;gap:6px;border-bottom:1px solid var(--line-strong);
  padding-bottom:2px;transition:color .2s,border-color .2s}
.links a:hover,.links a:focus-visible{color:var(--accent);border-color:var(--accent)}
.links a::after{content:"↗";font-size:11px;color:var(--faint)}
.links .nolink{color:var(--faint)}
.thumb{align-self:start;background:var(--card);border:1px solid var(--line);border-radius:10px;
  aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;overflow:hidden}
.thumb img{max-width:86%;max-height:86%;object-fit:contain}
.thumb-contain img{max-width:100%;max-height:100%}
.thumb-empty{background:linear-gradient(135deg,#fffdfa,#efece5)}
.thumb-mark{font-family:var(--serif);font-size:38px;color:var(--faint);letter-spacing:.04em}

/* patent */
.patent.has-fig{display:grid;grid-template-columns:1fr 240px;gap:36px;align-items:start}
.pt-fig{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;
  box-shadow:0 12px 34px rgba(41,31,23,.10)}
.pt-fig a{display:block}
.pt-fig img{width:100%;height:auto;display:block}
.pt-fig figcaption{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--faint);padding:8px 11px;border-top:1px solid var(--line)}
@media (max-width:640px){.patent.has-fig{grid-template-columns:1fr}.pt-fig{max-width:260px}}
.patent-title{font-family:var(--serif);font-weight:400;font-size:clamp(22px,3.4vw,30px);
  margin:0 0 8px;line-height:1.15;letter-spacing:-.01em}
.patent-meta{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);margin-bottom:14px}
.pt-ids{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.pt-id{font-family:var(--mono);font-size:11px;letter-spacing:.04em;border:1px solid var(--line);
  border-radius:6px;padding:3px 9px;color:var(--muted)}
.patent-blurb{margin:0 0 16px;max-width:58ch;color:#2c2a28}
.patent-hi{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:9px}
.patent-hi li{position:relative;padding-left:20px;font-size:14.5px;color:#3a3833;max-width:60ch}
.patent-hi li::before{content:"";position:absolute;left:2px;top:.62em;width:6px;height:6px;
  border-radius:50%;background:var(--accent)}

/* experience / press / education entries */
.entries{display:flex;flex-direction:column;gap:30px}
.entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.entry-lead{display:flex;flex-direction:column;gap:2px}
.entry-org{font-family:var(--serif);font-size:clamp(18px,2.6vw,22px);line-height:1.2}
.entry-role{font-size:14px;color:var(--muted)}
.entry-side{text-align:right;font-family:var(--mono);font-size:11.5px;letter-spacing:.04em;
  color:var(--muted);display:flex;flex-direction:column;gap:3px;align-items:flex-end}
.entry-metric{color:var(--accent)}
.entry-period{white-space:nowrap}
.entry-points{margin:12px 0 0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.entry-points li{position:relative;padding-left:20px;font-size:14.5px;color:#3a3833;max-width:64ch}
.entry-points li::before{content:"";position:absolute;left:2px;top:.62em;width:6px;height:6px;
  border-radius:50%;background:var(--line-strong)}
.entry-note{margin:10px 0 0;font-size:14px;color:var(--muted);max-width:60ch}

/* skills */
.skills{display:flex;flex-direction:column;gap:16px}
.skill-row{display:grid;grid-template-columns:150px 1fr;gap:20px;align-items:baseline;
  padding-bottom:16px;border-bottom:1px solid var(--line)}
.skill-row:last-child{border-bottom:0;padding-bottom:0}
.skill-group{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.skill-items{display:flex;flex-wrap:wrap;gap:7px}
.skill{font-size:13.5px;color:#2c2a28;border:1px solid var(--line);border-radius:999px;padding:3px 11px}

/* floating hover preview (desktop) */
.float{position:fixed;top:0;left:0;width:260px;height:195px;background:var(--card);
  border:1px solid var(--line);border-radius:12px;box-shadow:0 24px 60px rgba(40,30,23,.16);
  overflow:hidden;display:flex;align-items:center;justify-content:center;pointer-events:none;
  opacity:0;transform:translate(-50%,-50%) scale(.96);transition:opacity .18s,transform .18s;z-index:50}
.float img{max-width:88%;max-height:88%;object-fit:contain}
.float.show{opacity:1;transform:translate(-50%,-50%) scale(1)}

footer{margin-top:70px;padding-top:22px;border-top:1px solid var(--line);font-family:var(--mono);
  font-size:11.5px;letter-spacing:.04em;color:var(--faint);display:flex;justify-content:space-between;
  flex-wrap:wrap;gap:10px}

@media (max-width:760px){
  .about-grid{grid-template-columns:1fr;gap:28px}
  .stat-grid{gap:22px 16px}
}
@media (max-width:640px){
  .row{grid-template-columns:30px 1fr}
  .row .meta{display:none}
  .panel-grid{grid-template-columns:1fr;padding-left:0}
  .panel-grid .thumb{grid-row:1;order:-1;max-width:220px}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .skill-row{grid-template-columns:1fr;gap:8px}
  .float{display:none}
}
@media (prefers-reduced-motion:reduce){*{transition:none !important}}
${questCSS}
${ctaCSS}
${spriteCSS}
${rateCSS}
</style>
</head>
<body>
<div class="wrap">
  <header class="eyebrow">
    <span><span${bindAttr("profile.name", edit)}>${esc(p.name || "Portfolio")}</span> — Selected Work</span>
    ${p.location ? `<span class="badge">${esc(p.location)}</span>` : ""}
  </header>

  <section class="hero">
    <h1${bindAttr("profile.tagline", edit)}>${accentTagline(p.tagline)}</h1>
    ${p.subtagline || edit ? `<p class="sub"${bindAttr("profile.subtagline", edit)}>${esc(p.subtagline || "")}</p>` : ""}
    ${p.available || edit ? `<p class="avail"${bindAttr("profile.available", edit)}>${esc(p.available || "")}</p>` : ""}
  </section>

  ${ctaTopHTML}

  ${statsRow(c.stats)}
  ${aboutBlock(c.about, edit)}

  <main>
    <div class="index-head">
      <span>Index — Selected Work</span>
      <span><button class="count-btn" type="button" data-n="${items.length}" title="Click to re-count">${items.length} works</button>${yearSpan ? ` · ${esc(yearSpan)}` : ""}</span>
    </div>
    <div id="list">
      ${items.map(({ it, ci }, i) => itemRow(it, i, ci, edit)).join("")}
    </div>
  </main>

  ${patentBlock(c.patent, edit)}
  ${experienceBlock(c.experience)}
  ${pressBlock(c.press)}
  ${educationBlock(c.education)}
  ${skillsBlock(c.skills)}

  ${contacts ? `<nav class="contacts contacts-foot" aria-label="Contact">${contacts}</nav>` : ""}

  <footer>
    <span>© ${new Date().getFullYear()} <span${bindAttr("profile.name", edit)}>${esc(p.name || "")}</span></span>
    <span><span${bindAttr("footer.interactive", edit)}>${esc((c.footer && c.footer.interactive) || "Built end-to-end")}</span>${p.location || edit ? ` · <span${bindAttr("profile.location", edit)}>${esc(p.location || "")}</span>` : ""} · <a id="lite-link" href="/fast/">Lite version</a></span>
  </footer>
</div>

<div class="float" id="float" aria-hidden="true"></div>
${questBadgeHTML}
${spriteHTML}

${edit ? "" : `<script>
(function(){
  var list = document.getElementById("list");
  var float = document.getElementById("float");
  var canHover = window.matchMedia("(hover: hover)").matches;
  // Built lazily on first hover so the preview never ships as an empty image box.
  var floatImg = null;
  function ensureImg(){
    if(!floatImg){ floatImg = new Image(); floatImg.alt = ""; float.appendChild(floatImg); }
    return floatImg;
  }

  list.querySelectorAll(".item").forEach(function(item){
    var row = item.querySelector(".row");
    var img = item.getAttribute("data-img");

    row.addEventListener("click", function(){
      var isOpen = item.classList.contains("open");
      list.querySelectorAll(".item.open").forEach(function(el){
        el.classList.remove("open");
        el.querySelector(".row").setAttribute("aria-expanded","false");
      });
      if(!isOpen){
        item.classList.add("open");
        row.setAttribute("aria-expanded","true");
      }
    });

    if(img){
      row.addEventListener("mouseenter", function(){
        if(window.matchMedia("(hover: hover)").matches){
          ensureImg().src = img;
          float.classList.add("show");
        }
      });
      row.addEventListener("mouseleave", function(){ float.classList.remove("show"); });
    }
  });

  var lite = document.getElementById("lite-link");
  if(lite) lite.addEventListener("click", function(){
    try{ localStorage.setItem("site-ver","fast"); }catch(e){}
  });

  if(canHover){
    window.addEventListener("mousemove", function(e){
      var x = Math.min(window.innerWidth - 150, Math.max(150, e.clientX + 150));
      var y = Math.min(window.innerHeight - 120, Math.max(120, e.clientY));
      float.style.left = x + "px";
      float.style.top = y + "px";
    });
  }
})();
</script>
<script>${questJS}</script>
<script>${shatterJS}</script>
<script>${ctaJS}</script>
<script>${rateJS}</script>
<script src="/moana-puppet-kit/moana-puppet.js"></script>
<script>${spriteJS}</script>
<script>${creatorEntryJS}</script>`}
</body>
</html>`;
}
