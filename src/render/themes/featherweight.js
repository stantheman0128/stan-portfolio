// Featherweight theme: one root value, one hairline, one measure. Perfect-fourth
// type scale, system fonts, zero external requests, no JS. Ported from the demo
// so every value is read from `content`.
import { esc, md, realLinks, bindAttr, editLinksHTML } from "../util.js";
import { creatorEntryJS } from "../fx/creator-entry.js";

function thumbnailBase(image) {
  const match = String(image || "").match(/^\/assets\/(.+)\.[a-z0-9]+$/i);
  const segments = match ? match[1].split("/") : [];
  if (
    !match ||
    match[1].includes("\\") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) return "";
  return `/assets/thumbs/${match[1]}`;
}

export function render(content, opts = {}) {
  const edit = !!(opts && opts.edit);
  const p = content.profile || {};
  const about = content.about || {};
  const stats = content.stats || [];
  // Cross-theme entries: each theme hides the item that IS itself.
  const items = (content.items || [])
    .map((it, ci) => ({ it, ci }))
    .filter((x) => x.it.themeExclude !== "featherweight");
  const patent = content.patent || null;
  const experience = content.experience || [];
  const press = content.press || [];
  const education = content.education || [];
  const skills = content.skills || [];

  const shippedCount = items.length;
  const year = new Date().getFullYear();

  const emailHref = p.email ? `mailto:${esc(p.email)}` : "";
  // Wrap mailto links so Cloudflare Email Obfuscation leaves them alone and never
  // injects /cdn-cgi/scripts/.../email-decode.min.js into the zero-JS front door.
  const emailAnchor = (label) =>
    p.email
      ? `<!--email_off--><a href="${emailHref}">${esc(label)}</a><!--/email_off-->`
      : "";

  const metaHTML = [
    p.email ? emailAnchor(p.email) : "",
    p.githubUrl ? `<a href="${esc(p.githubUrl)}">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="dot">·</span>');

  // Quick-nav only lists sections that actually have content.
  const nav = [
    ["work", "Work", items.length],
    ["patent", "Patent", patent ? 1 : 0],
    ["about", "About", about.paragraphs && about.paragraphs.length],
    ["experience", "Experience", experience.length],
    ["community", "Community", press.length],
    ["skills", "Skills", skills.length],
    ["contact", "Contact", 1],
  ]
    .filter(([, , n]) => n)
    .map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`)
    .join('<span class="sep">/</span>');

  // PROOF STRIP — a comparable scoreboard of substance.
  const proofHTML = stats
    .map(
      (s) =>
        `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`
    )
    .join("");

  // WORK ITEMS ------------------------------------------------------------
  const workHTML = items
    .map(({ it, ci }) => {
      const status = [it.status, it.year].filter(Boolean).map(esc).join(" · ");
      const links = realLinks(it.links);

      // Thumb: real image respecting imageMode, or a typographic card when null.
      let thumb;
      if (it.image) {
        const mode =
          it.imageMode === "icon" ? " icon" : it.imageMode === "contain" ? " contain" : "";
        const thumbBase = edit ? "" : thumbnailBase(it.image);
        const imageAttrs = thumbBase
          ? `src="${esc(thumbBase + "-88.webp")}" ` +
            `srcset="${esc(thumbBase + "-88.webp")} 88w, ${esc(thumbBase + "-132.webp")} 132w" ` +
            `sizes="(max-width: 30rem) 38px, 44px"`
          : `src="${esc(it.image)}"`;
        thumb =
          `<span class="thumb${mode}">` +
          `<img ${imageAttrs} alt="${esc(it.title)} thumbnail" ` +
          `width="44" height="44" loading="lazy" decoding="async"></span>`;
      } else {
        // Derive a short glyph from the title so the card never reads "undefined".
        const words = String(it.title || "")
          .split(/\s+/)
          .filter(Boolean);
        const glyph =
          words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : (words[0] || "•").slice(0, 2).toUpperCase();
        thumb = `<span class="thumb text" aria-hidden="true">${esc(glyph)}</span>`;
      }

      const foot =
        `<div class="foot">` +
        (edit
          ? `<span class="links ff-links" data-item="${ci}">` + editLinksHTML(it.links, ci) + `</span>`
          : (links.length
              ? `<span class="links">` +
                links
                  .map(
                    (l) =>
                      `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`
                  )
                  .join("") +
                `</span>`
              : `<span class="nolink">No public link yet</span>`)) +
        `</div>`;

      return (
        `<article class="item">` +
        thumb +
        `<div class="head"><h3${bindAttr("items." + ci + ".title", edit)}>${esc(it.title)}</h3>` +
        (status ? `<span class="status">${status}</span>` : "") +
        `</div>` +
        (edit
          ? `<p class="blurb"${bindAttr("items." + ci + ".description", edit)}>${esc(it.description || "")}</p>`
          : (it.description ? `<p class="blurb">${esc(it.description)}</p>` : "")) +
        (edit
          ? `<div class="detail"${bindAttr("items." + ci + ".detail", edit, "md")}>${md(it.detail)}</div>`
          : (it.detail ? `<div class="detail">${md(it.detail)}</div>` : "")) +
        foot +
        `</article>`
      );
    })
    .join("");

  // PATENT ----------------------------------------------------------------
  let patentHTML = "";
  if (patent) {
    const ids = (patent.ids || []).map(esc).join(" · ");
    const stamp = [ids, [patent.year, patent.role].filter(Boolean).map(esc).join(" · ")]
      .filter(Boolean)
      .join(" &nbsp;·&nbsp; ");
    const highlights = (patent.highlights || [])
      .map((h) => `<li>${esc(h)}</li>`)
      .join("");
    const fig = patent.image
      ? `<a class="pt-img" href="${esc(patent.image)}">` +
        `<img src="${esc(patent.image)}" alt="${esc(patent.imageAlt || "Patent document, first page")}" ` +
        `width="${patent.imageWidth | 0 || 935}" height="${patent.imageHeight | 0 || 1210}" loading="lazy" decoding="async"></a>`
      : "";
    patentHTML =
      `<section id="patent"><h2 class="eyebrow">Patent</h2>` +
      `<div class="patent">` +
      `<div class="head"><h3${bindAttr("patent.title", edit)}>${esc(patent.title)}</h3></div>` +
      (stamp ? `<p class="ids">${stamp}</p>` : "") +
      (patent.blurb ? `<p class="blurb"${bindAttr("patent.blurb", edit)}>${esc(patent.blurb)}</p>` : "") +
      (highlights ? `<ul>${highlights}</ul>` : "") +
      fig +
      `</div></section>`;
  }

  // Shared entry renderer for experience / press / education.
  const entry = ({ title, role, metric, when, points, note }) => {
    const roleHTML = role ? ` <span class="role">— ${esc(role)}</span>` : "";
    const metricHTML = metric ? `<span class="metric">${esc(metric)}</span>` : "";
    const whenHTML = when ? `<span class="when">${esc(when)}</span>` : "";
    const list = (points || []).filter(Boolean);
    const listHTML = list.length
      ? `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : "";
    const noteHTML = note ? `<p class="note">${esc(note)}</p>` : "";
    return (
      `<article class="entry">` +
      `<div class="top"><h3>${esc(title)}${roleHTML}${metricHTML}</h3>${whenHTML}</div>` +
      listHTML +
      noteHTML +
      `</article>`
    );
  };

  const experienceHTML = experience.length
    ? `<section id="experience"><h2 class="eyebrow">Experience</h2><div class="entries">` +
      experience
        .map((e) => entry({ title: e.org, role: e.role, when: e.period, points: e.points }))
        .join("") +
      `</div></section>`
    : "";

  const pressHTML = press.length
    ? `<section id="community"><h2 class="eyebrow">Community &amp; Press</h2><div class="entries">` +
      press
        .map((e) =>
          entry({ title: e.org, role: e.role, metric: e.metric, when: e.period, points: e.points })
        )
        .join("") +
      `</div></section>`
    : "";

  const educationHTML = education.length
    ? `<section id="education"><h2 class="eyebrow">Education</h2><div class="entries">` +
      education
        .map((e) =>
          entry({ title: e.school, role: e.program, when: e.period, note: e.note })
        )
        .join("") +
      `</div></section>`
    : "";

  // ABOUT -----------------------------------------------------------------
  let aboutHTML = "";
  if ((about.paragraphs && about.paragraphs.length) || (about.principles && about.principles.length)) {
    const paras = (about.paragraphs || [])
      .map((t, idx) => `<p class="lead"${bindAttr("about.paragraphs." + idx, edit)}>${esc(t)}</p>`)
      .join("");
    const principles = (about.principles || [])
      .map((pr) => `<div><dt>${esc(pr.title)}</dt><dd>${esc(pr.body)}</dd></div>`)
      .join("");
    aboutHTML =
      `<section id="about"><h2 class="eyebrow">About</h2>` +
      paras +
      (principles ? `<dl class="principles">${principles}</dl>` : "") +
      `</section>`;
  }

  // SKILLS — native <details>, first group open. ------------------------
  const skillsHTML = skills.length
    ? `<section id="skills"><h2 class="eyebrow">Skills</h2><div class="skills">` +
      skills
        .map((g, i) => {
          const list = (g.items || []).filter(Boolean);
          const chips = list.map((s) => `<span>${esc(s)}</span>`).join("");
          return (
            `<details${i === 0 ? " open" : ""}>` +
            `<summary>${esc(g.group)} <span class="count">${list.length}</span>` +
            `<span class="glyph" aria-hidden="true"></span></summary>` +
            `<div class="body">${chips}</div>` +
            `</details>`
          );
        })
        .join("") +
      `</div></section>`
    : "";

  // CONTACT ---------------------------------------------------------------
  const contactLinks = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}">LinkedIn</a>` : "",
    p.email ? emailAnchor("Email") : "",
    p.instagramUrl ? `<a href="${esc(p.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>` : "",
    p.dcardUrl ? `<a href="${esc(p.dcardUrl)}" target="_blank" rel="noopener">Dcard</a>` : "",
    p.threadsUrl ? `<a href="${esc(p.threadsUrl)}" target="_blank" rel="noopener">Threads</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="sep">·</span>');

  const contactHTML =
    `<section id="contact" class="contact"><h2 class="eyebrow">Contact</h2>` +
    `<p class="big">Building something? ` +
    (p.email ? emailAnchor(p.email) : "Let's talk.") +
    `</p>` +
    (contactLinks ? `<p class="links">${contactLinks}</p>` : "") +
    (p.available ? `<span class="avail">${esc(p.available)}</span>` : "") +
    `</section>`;

  // HERO lede: role + tagline woven into the one human sentence.
  const lede = p.tagline
    ? `<p class="lede"${bindAttr("profile.tagline", edit)}>${esc(p.tagline)}</p>`
    : "";
  const roleLine = p.role ? `<p class="lede"><b>${esc(p.role)}</b></p>` : "";

  const title = [p.name, p.role].filter(Boolean).map(esc).join(" — ");
  const desc = esc(p.subtagline || about.short || "");

  return `<!doctype html>
<html lang="en" data-theme="featherweight">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2316161a'/%3E%3Ctext x='16' y='22' font-family='-apple-system,Segoe UI,Roboto,sans-serif' font-size='18' font-weight='600' fill='%23fbfbfa' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E">
<style>
:root{--root:1.0625rem;--r:1.333;--s-1:calc(var(--root) / var(--r));--s0:var(--root);--s1:calc(var(--root) * var(--r));--s2:calc(var(--s1) * var(--r));--s3:calc(var(--s2) * var(--r));--lh:1.62;--measure:64ch;--prose:42rem;--proof-w:52rem;--rule:1px;--ink:#16161a;--ink-2:#4a4a52;--ink-3:#5e5e66;--line:#e3e3e6;--line-2:#cfcfd4;--bg:#fbfbfa;--accent:#16161a;--focus:#1a55ff;--live:#1f8a3b;--space:1.62rem}
@media (prefers-color-scheme:dark){:root{--ink:#ecedee;--ink-2:#b7b8bc;--ink-3:#9a9ba0;--line:#2a2a2e;--line-2:#3a3a40;--bg:#0e0e10;--accent:#ecedee;--focus:#6f9bff;--live:#3fb950}}
*{box-sizing:border-box}
html{font-size:100%;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:var(--s0)/var(--lh) -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,system-ui,sans-serif;font-feature-settings:"kern" 1,"liga" 1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;padding:0 1.5rem}
.wrap{max-width:var(--prose);margin:0 auto;padding:clamp(2.2rem,6vw,4.5rem) 0 3rem}
.skip{position:absolute;left:-999px;top:0}
.skip:focus{left:0;top:0;z-index:9;background:var(--ink);color:var(--bg);padding:.5rem .85rem;border-radius:3px;text-decoration:none}
h1,h2,h3{font-weight:600;line-height:1.15;letter-spacing:-.018em;margin:0}
p{margin:0}
a{color:var(--accent);text-decoration:none;text-underline-offset:.18em;text-decoration-thickness:from-font;border-bottom:var(--rule) solid var(--line-2);transition:border-color .12s ease}
a:hover{border-color:var(--ink)}
a:focus-visible{outline:2px solid var(--focus);outline-offset:3px;border-radius:2px;border-bottom-color:transparent}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px;border-radius:2px}
.hero h1{font-size:var(--s3);letter-spacing:-.032em;margin-bottom:.35rem}
.hero .latin{font-size:var(--s-1);letter-spacing:.04em;color:var(--ink-3);margin-bottom:calc(var(--space)*.9)}
.lede{font-size:var(--s1);line-height:1.4;letter-spacing:-.014em;color:var(--ink);max-width:34ch;margin-bottom:calc(var(--space)*.85)}
.lede b{font-weight:600}
.lede + .lede{margin-top:calc(var(--space)*-.55)}
.sub{color:var(--ink-2);max-width:var(--measure);margin-bottom:calc(var(--space)*1.1)}
.quicknav{font-size:var(--s-1);color:var(--ink-3);letter-spacing:.01em;line-height:2}
.quicknav a{border-bottom-color:var(--line)}
.quicknav .sep{padding:0 .55rem;color:var(--line-2);border:0}
.meta-row{margin-top:.6rem;font-size:var(--s-1);color:var(--ink-3)}
.meta-row .dot{padding:0 .5rem;color:var(--line-2)}
section{margin-top:calc(var(--space)*2.1)}
.eyebrow{font-size:var(--s-1);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);font-weight:600;display:flex;align-items:baseline;gap:.85rem;margin-bottom:calc(var(--space)*.9)}
.eyebrow::after{content:"";flex:1;height:0;border-top:var(--rule) solid var(--line);transform:translateY(-.18em)}
.lead{max-width:var(--measure);color:var(--ink-2)}
.lead + .lead{margin-top:.8rem}
.proof-wrap{margin-bottom:calc(var(--space)*.4)}
@media (min-width:48rem){.proof-wrap{width:min(var(--proof-w),100%);margin-left:calc(50% - min(var(--proof-w),100%)/2)}}
.proof{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:var(--rule) solid var(--line);border-radius:6px;overflow:hidden}
.proof div{position:relative;padding:.9rem 1rem;border-right:var(--rule) solid var(--line);border-bottom:var(--rule) solid var(--line);display:flex;flex-direction:column;gap:.18rem}
.proof div::before{content:"";position:absolute;left:1rem;top:.9rem;width:.85rem;height:2px;border-radius:2px;background:var(--live);opacity:.9}
.proof b{padding-top:.5rem;display:flex;align-items:baseline;gap:.12em;font-size:var(--s1);font-weight:600;letter-spacing:-.02em;line-height:1.05;font-feature-settings:"tnum" 1,"cv01" 1;font-variant-numeric:tabular-nums}
.proof div:nth-child(3n){border-right:0}
.proof div:nth-last-child(-n+3){border-bottom:0}
.proof span{font-size:var(--s-1);color:var(--ink-3);letter-spacing:.01em;line-height:1.35}
.principles{margin-top:calc(var(--space)*1.1);display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:var(--rule) solid var(--line)}
.principles div{padding:.95rem 0;border-bottom:var(--rule) solid var(--line)}
.principles div:nth-child(odd){padding-right:1.4rem;border-right:var(--rule) solid var(--line)}
.principles div:nth-child(even){padding-left:1.4rem}
.principles dt{font-weight:600;letter-spacing:-.01em}
.principles dd{margin:.18rem 0 0;font-size:var(--s-1);color:var(--ink-2);line-height:1.5}
.work{border-top:var(--rule) solid var(--line)}
.item{display:grid;grid-template-columns:2.75rem 1fr;gap:0 1.1rem;padding:calc(var(--space)*.95) 0;border-bottom:var(--rule) solid var(--line);align-items:start}
.thumb{grid-row:1 / span 4;width:2.75rem;height:2.75rem;border-radius:7px;border:var(--rule) solid var(--line-2);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg)}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb.contain img,.thumb.icon img{object-fit:contain;padding:14%}
.thumb.text{background:var(--ink);color:var(--bg);border-color:var(--ink);font-weight:600;font-size:var(--s1);letter-spacing:-.02em}
.item .head{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}
.item h3{font-size:var(--s1);letter-spacing:-.018em}
.item .status{font-size:var(--s-1);color:var(--ink-3);letter-spacing:.02em;white-space:nowrap}
.item .status::before{content:"· "}
.item .blurb{margin-top:.3rem;color:var(--ink-2);max-width:var(--measure)}
.item .detail{margin-top:.4rem;color:var(--ink-3);font-size:var(--s-1);max-width:var(--measure)}
.item .detail p{margin:0}
.item .detail p + p{margin-top:.4rem}
.item .detail a{color:var(--ink-2);border-bottom-color:var(--line-2)}
.item .foot{margin-top:.55rem;font-size:var(--s-1);color:var(--ink-3);display:flex;flex-wrap:wrap;align-items:baseline;gap:.4rem .9rem}
.item .links{display:flex;flex-wrap:wrap;gap:.9rem}
.item .links a{border-bottom-color:var(--line-2);font-weight:500;color:var(--ink)}
.item .nolink{color:var(--ink-3);font-style:italic}
.patent{border:var(--rule) solid var(--line-2);border-radius:8px;padding:1.4rem 1.4rem 1.5rem;margin-top:calc(var(--space)*.2)}
.patent .head{display:flex;align-items:baseline;gap:.7rem;flex-wrap:wrap}
.patent h3{font-size:var(--s1);letter-spacing:-.018em}
.patent .ids{font-size:var(--s-1);color:var(--ink-3);font-feature-settings:"tnum" 1;letter-spacing:.02em}
.patent .blurb{margin-top:.55rem;color:var(--ink-2);max-width:var(--measure)}
.patent ul{margin:.9rem 0 0;padding:0;list-style:none}
.patent li{position:relative;padding-left:1.15rem;margin-top:.42rem;color:var(--ink);font-size:var(--s0)}
.patent li::before{content:"";position:absolute;left:0;top:.62em;width:.4rem;height:.4rem;border:var(--rule) solid var(--ink-2);border-radius:50%}
.patent .pt-img{display:block;margin-top:1rem;max-width:13rem;border:var(--rule) solid var(--line-2);border-radius:6px;overflow:hidden}
.patent .pt-img img{width:100%;height:auto;display:block}
.entries{border-top:var(--rule) solid var(--line)}
.entry{display:grid;grid-template-columns:1fr;padding:calc(var(--space)*.85) 0;border-bottom:var(--rule) solid var(--line)}
.entry .top{display:flex;align-items:baseline;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
.entry h3{font-size:var(--s0);font-weight:600;letter-spacing:-.01em}
.entry .role{color:var(--ink-2);font-size:var(--s-1)}
.entry .when{color:var(--ink-3);font-size:var(--s-1);white-space:nowrap;font-feature-settings:"tnum" 1}
.entry .metric{display:inline-block;margin-left:.5rem;font-size:var(--s-1);color:var(--ink-3);border:var(--rule) solid var(--line-2);border-radius:99px;padding:.02rem .5rem}
.entry ul{margin:.55rem 0 0;padding:0;list-style:none}
.entry li{position:relative;padding-left:1.05rem;margin-top:.3rem;color:var(--ink-2);font-size:var(--s-1);line-height:1.5;max-width:var(--measure)}
.entry li::before{content:"";position:absolute;left:0;top:.62em;width:.4rem;border-top:var(--rule) solid var(--line-2)}
.entry .note{margin-top:.3rem;color:var(--ink-2);font-size:var(--s-1);max-width:var(--measure)}
.skills{border-top:var(--rule) solid var(--line)}
.skills details{border-bottom:var(--rule) solid var(--line)}
.skills summary{list-style:none;cursor:pointer;display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:calc(var(--space)*.62) 0;font-weight:600;letter-spacing:-.005em}
.skills summary::-webkit-details-marker{display:none}
.skills summary .count{font-size:var(--s-1);color:var(--ink-3);font-weight:400;letter-spacing:.02em}
.skills summary .glyph{margin-left:auto;flex:0 0 auto;width:.85rem;height:.85rem;position:relative;align-self:center}
.skills summary .glyph::before,.skills summary .glyph::after{content:"";position:absolute;background:var(--ink-3);transition:transform .18s ease,opacity .18s ease}
.skills summary .glyph::before{left:0;right:0;top:50%;height:var(--rule);transform:translateY(-50%)}
.skills summary .glyph::after{top:0;bottom:0;left:50%;width:var(--rule);transform:translateX(-50%)}
.skills details[open] summary .glyph::after{opacity:0;transform:translateX(-50%) scaleY(0)}
.skills summary:hover{color:var(--ink)}
.skills .body{padding:0 0 calc(var(--space)*.75);margin-top:-.2rem;display:flex;flex-wrap:wrap;gap:.45rem}
.skills .body span{font-size:var(--s-1);color:var(--ink-2);border:var(--rule) solid var(--line);border-radius:99px;padding:.16rem .65rem;background:var(--bg)}
@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}
@media (prefers-reduced-motion:no-preference){
.thumb{transition:transform .18s cubic-bezier(.165,.84,.44,1)}
.item:hover .thumb{transform:translateY(-2px)}
}
.contact{margin-top:calc(var(--space)*2.1)}
.contact .big{font-size:var(--s2);letter-spacing:-.026em;font-weight:600;line-height:1.18;max-width:24ch;margin-bottom:.85rem}
.contact .big a{border-bottom-width:2px}
.contact .links{font-size:var(--s0);color:var(--ink-2);line-height:2}
.contact .links a{color:var(--ink)}
.contact .links .sep{padding:0 .55rem;color:var(--line-2);border:0}
.contact .avail{margin-top:.7rem;font-size:var(--s-1);color:var(--ink-3);display:inline-flex;align-items:center;gap:.5rem}
.contact .avail::before{content:"";width:.5rem;height:.5rem;border-radius:50%;background:var(--live);flex:0 0 auto;box-shadow:0 0 0 3px color-mix(in srgb,var(--live) 16%,transparent)}
footer{margin-top:calc(var(--space)*2);padding-top:calc(var(--space)*.9);border-top:var(--rule) solid var(--line);font-size:var(--s-1);color:var(--ink-3);display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;align-items:baseline}
footer a{color:var(--ink-3);border-bottom-color:var(--line)}
footer .grow{flex:1}
@media (max-width:30rem){body{padding:0 1.15rem}
:root{--root:1rem}
.hero h1{font-size:var(--s2)}
.proof{grid-template-columns:repeat(2,1fr)}
.proof div:nth-child(3n){border-right:var(--rule) solid var(--line)}
.proof div:nth-child(2n){border-right:0}
.proof div:nth-last-child(-n+3){border-bottom:var(--rule) solid var(--line)}
.proof div:nth-last-child(-n+2){border-bottom:0}
.principles{grid-template-columns:1fr}
.principles div:nth-child(odd){padding-right:0;border-right:0}
.principles div:nth-child(even){padding-left:0}
.item{grid-template-columns:2.4rem 1fr;gap:0 .85rem}
.thumb{width:2.4rem;height:2.4rem}
.entry .top{flex-direction:column;gap:.1rem}
}
img{max-width:100%;height:auto}
.fw-speed{display:inline-flex;visibility:hidden;min-height:2.3rem;align-items:baseline;gap:.5rem;margin-top:calc(var(--space)*.8);font-size:var(--s-1);color:var(--ink-3);letter-spacing:.01em}
.fw-speed.on{visibility:visible}
.fw-speed .dot{align-self:center;width:.42rem;height:.42rem;border-radius:50%;background:var(--live);flex:0 0 auto;animation:fw-pulse 2.6s ease-out infinite}
.fw-speed .n{font-weight:700;color:var(--ink);font-size:var(--s1);letter-spacing:-.015em;font-feature-settings:"tnum" 1}
.fw-speed .u{color:var(--ink-2)}
@keyframes fw-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--live) 55%,transparent)}70%{box-shadow:0 0 0 .55rem color-mix(in srgb,var(--live) 0%,transparent)}100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--live) 0%,transparent)}}
@media (prefers-reduced-motion:reduce){.fw-speed .dot{animation:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--live) 16%,transparent)}}
</style>
</head>
<body>
<a class="skip" href="#work">Skip to work</a>
<div class="wrap">

  <header class="hero">
    <h1${bindAttr("profile.name", edit)}>${esc(p.name)}</h1>
    ${[p.latinName, p.location].filter(Boolean).length ? `<p class="latin">${[p.latinName, p.location].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
    ${roleLine}
    ${lede}
    ${p.subtagline ? `<p class="sub"${bindAttr("profile.subtagline", edit)}>${esc(p.subtagline)}</p>` : ""}
    ${nav ? `<nav class="quicknav" aria-label="Sections">${nav}</nav>` : ""}
    ${metaHTML ? `<p class="meta-row">${metaHTML}</p>` : ""}
    <p class="fw-speed" id="fw-speed" role="status" aria-live="polite"></p>
  </header>

  <main>

    ${
      stats.length
        ? `<section aria-label="At a glance"><div class="proof-wrap"><div class="proof">${proofHTML}</div></div></section>`
        : ""
    }

    ${
      items.length
        ? `<section id="work"><h2 class="eyebrow">Selected work · ${shippedCount} shipped</h2><div class="work">${workHTML}</div></section>`
        : ""
    }

    ${patentHTML}

    ${aboutHTML}

    ${experienceHTML}

    ${pressHTML}

    ${educationHTML}

    ${skillsHTML}

    ${contactHTML}

  </main>

  <footer>
    <span>© ${year} ${esc(p.name)}${p.latinName ? " · " + esc(p.latinName) : ""}</span>
    <span class="grow"></span>
    <span>Featherweight · system fonts · nothing blocks first paint</span>
    <a href="/interactive">Full interactive version &rarr;</a>
  </footer>

</div>
<script>
(function(){
  var rumLcp = 0;
  var rumCls = 0;
  var rumSent = false;
  try {
    new PerformanceObserver(function(list){
      var entries = list.getEntries();
      if (entries.length) rumLcp = entries[entries.length - 1].startTime || 0;
    }).observe({type:"largest-contentful-paint", buffered:true});
    new PerformanceObserver(function(list){
      list.getEntries().forEach(function(entry){
        if (!entry.hadRecentInput) rumCls += entry.value || 0;
      });
    }).observe({type:"layout-shift", buffered:true});
  } catch (e) {}
  function navEntry(){
    return performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  }
  function transferBytes(nav){
    var total = nav && nav.transferSize ? nav.transferSize : 0;
    var resources = performance.getEntriesByType ? performance.getEntriesByType("resource") : [];
    for (var i = 0; i < resources.length; i++) total += resources[i].transferSize || 0;
    return Math.round(total);
  }
  function readout(nav){
    var ms = nav && nav.domContentLoadedEventEnd ? nav.domContentLoadedEventEnd : performance.now();
    var n = isFinite(ms) && ms > 0 ? Math.round(ms) : 0;
    var el = document.getElementById("fw-speed");
    if (!el) return;
    el.textContent = "";
    var dot = document.createElement("span"); dot.className = "dot"; dot.setAttribute("aria-hidden", "true");
    var lbl = document.createElement("span"); lbl.className = "lbl"; lbl.textContent = "this page loaded in";
    var b = document.createElement("span"); b.className = "n"; b.textContent = "~" + n;
    var u = document.createElement("span"); u.className = "u"; u.textContent = "ms";
    el.appendChild(dot); el.appendChild(lbl); el.appendChild(b); el.appendChild(u);
    el.classList.add("on");
  }
  // Anonymous RUM: report this visit's real timings so latency can be measured from
  // actual traffic. colo + country are stamped server-side from request.cf.
  function beacon(nav){
    try {
      if (!nav || !navigator.sendBeacon || rumSent) return;
      rumSent = true;
      var paint = performance.getEntriesByType("paint").filter(function(p){
        return p.name === "first-contentful-paint";
      })[0];
      var c = navigator.connection || {};
      navigator.sendBeacon("/api/rum", JSON.stringify({
        path: location.pathname,
        ttfb: nav.responseStart,
        fcp: paint ? paint.startTime : 0,
        dcl: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd || nav.duration,
        rtt: c.rtt || 0,
        lcp: rumLcp,
        cls: rumCls,
        bytes: transferBytes(nav),
        conn: c.effectiveType || ""
      }));
    } catch (e) {}
  }
  function go(){
    readout(navEntry());
    // Give buffered vitals and lazy-threshold resources a moment to settle.
    setTimeout(function(){ beacon(navEntry()); }, 1000);
    addEventListener("pagehide", function(){ beacon(navEntry()); }, {once:true});
  }
  if (document.readyState === "complete") go();
  else addEventListener("load", go);
})();
</script>
${edit ? "" : `<script>${creatorEntryJS}</script>`}
</body>
</html>`;
}
