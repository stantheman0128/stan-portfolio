// Parade theme — the work walks past. A deep indigo "night boulevard" where the
// first thing a visitor sees is the body of work itself, drifting by as framed
// slides. The strip is a real overflow-x scroller (scroll-snap base, no JS
// needed to be complete); inline JS adds the ambient drift with a seamless
// cloned loop. Hover/focus holds the parade, a persistent pause/play button
// latches it off entirely, and click goes straight to the work.
// Reduced motion swaps the strip for a static filmstrip grid.
import { esc, md, realLinks } from "../util.js";

export function render(content) {
  const p = content.profile || {};
  const about = content.about || {};
  const stats = content.stats || [];
  const items = content.items || [];
  const patent = content.patent || null;
  const experience = content.experience || [];
  const press = content.press || [];
  const education = content.education || [];
  const skills = content.skills || [];
  const year = new Date().getFullYear();
  const emailHref = p.email ? `mailto:${esc(p.email)}` : "";

  const rosette = (s) =>
    `<svg class="rosette" viewBox="0 0 48 48" width="${s}" height="${s}" aria-hidden="true" focusable="false">` +
    `<g fill="none" stroke="currentColor" stroke-width="1.6">` +
    `<circle cx="24" cy="24" r="15.5"/>` +
    `<circle cx="24" cy="24" r="11" stroke-dasharray="2.2 3"/>` +
    `<path d="M24 3.5v5M24 39.5v5M3.5 24h5M39.5 24h5M9.5 9.5l3.6 3.6M34.9 34.9l3.6 3.6M38.5 9.5l-3.6 3.6M13.1 34.9l-3.6 3.6"/>` +
    `<path d="M18.6 24.4l3.7 3.7 7.1-7.4" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g></svg>`;

  // One slide per work. The whole slide is a single anchor: primary link when
  // one exists, otherwise the item's own index row. Never a dead surface.
  const slideCard = (it) => {
    const links = realLinks(it.links);
    const primary = links[0] || null;
    const href = primary ? esc(primary.href) : `#ix-${esc(it.id || "")}`;
    const extAttrs = primary ? ' target="_blank" rel="noopener"' : "";
    const go = primary
      ? `${esc(primary.label)} <span class="ai" aria-hidden="true">&#8599;</span>`
      : `Index <span class="ai" aria-hidden="true">&#8595;</span>`;
    const meta = [it.status, it.year].filter(Boolean).map(esc).join(" · ");

    let frame;
    if (it.image) {
      const mode =
        it.imageMode === "icon" ? " icon" : it.imageMode === "contain" ? " contain" : "";
      frame =
        `<span class="frame${mode}">` +
        `<img src="${esc(it.image)}" alt="" draggable="false" decoding="async"></span>`;
    } else {
      const words = String(it.title || "").split(/\s+/).filter(Boolean);
      const glyph =
        words.length >= 2
          ? (words[0][0] + words[1][0]).toUpperCase()
          : (words[0] || "·").slice(0, 2).toUpperCase();
      frame = `<span class="frame tile"><span class="glyph" aria-hidden="true">${esc(glyph)}</span></span>`;
    }

    return (
      `<li><a class="slide" href="${href}"${extAttrs}>` +
      frame +
      `<span class="cap"><strong class="ct">${esc(it.title)}</strong>` +
      (meta ? `<span class="cm">${meta}</span>` : "") +
      `<span class="go">${go}</span></span>` +
      `</a></li>`
    );
  };

  const patentSlide = patent
    ? `<li><a class="slide" href="#patent">` +
      `<span class="frame tile ptile">${rosette(42)}` +
      `<span class="pids">${(patent.ids || []).map(esc).join("<br>")}</span></span>` +
      `<span class="cap"><strong class="ct">${esc(patent.title)}</strong>` +
      `<span class="cm">${["Patent", patent.year, patent.role].filter(Boolean).map(esc).join(" · ")}</span>` +
      `<span class="go">Details <span class="ai" aria-hidden="true">&#8595;</span></span></span>` +
      `</a></li>`
    : "";

  const slidesHTML = items.map(slideCard).join("") + patentSlide;

  // Quiet index below: bold title | one-line hook | links, plus a native
  // <details> expander for the longer markdown detail and tags.
  const rowsHTML = items
    .map((it) => {
      const links = realLinks(it.links);
      const primary = links[0] || null;
      const meta = [it.status, it.year].filter(Boolean).map(esc).join(" · ");
      const title = primary
        ? `<a href="${esc(primary.href)}" target="_blank" rel="noopener">${esc(it.title)} <span class="ai" aria-hidden="true">&#8599;</span></a>`
        : esc(it.title);
      const linkRow = links.length
        ? `<p class="rlinks">${links
            .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
            .join("")}</p>`
        : `<p class="nolink">No public link yet</p>`;
      const tags = (it.tags || []).map(esc).join(" · ");
      const more =
        it.detail || tags
          ? `<details><summary><span class="plus" aria-hidden="true">+</span>More</summary>` +
            `<div class="rowdetail">${it.detail ? md(it.detail) : ""}` +
            (tags ? `<p class="rtags">${tags}</p>` : "") +
            `</div></details>`
          : "";
      return (
        `<li class="row" id="ix-${esc(it.id || "")}">` +
        `<div class="lhs"><h3>${title}</h3>${meta ? `<p class="rstatus">${meta}</p>` : ""}</div>` +
        `<div class="rhs">` +
        (it.description ? `<p class="desc">${esc(it.description)}</p>` : "") +
        linkRow +
        more +
        `</div></li>`
      );
    })
    .join("");

  let patentHTML = "";
  if (patent) {
    const pmeta = [...(patent.ids || []), patent.year, patent.role]
      .filter(Boolean)
      .map(esc)
      .join(" · ");
    const hl = (patent.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("");
    patentHTML =
      `<article id="patent" class="ppanel">${rosette(52)}<div class="pbody">` +
      `<h3>${esc(patent.title)}</h3>` +
      (pmeta ? `<p class="pmeta">${pmeta}</p>` : "") +
      (patent.blurb ? `<p class="blurb">${esc(patent.blurb)}</p>` : "") +
      (hl ? `<ul>${hl}</ul>` : "") +
      `</div></article>`;
  }

  const tally =
    `${items.length} work${items.length === 1 ? "" : "s"}` + (patent ? " · 1 patent" : "");

  // Conditional sections — all empty today, render nothing.
  const statsHTML = stats.length
    ? `<section class="col extra" aria-label="At a glance"><div class="statrow">` +
      stats.map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("") +
      `</div></section>`
    : "";

  let aboutHTML = "";
  {
    const paras = about.paragraphs || [];
    const prins = about.principles || [];
    if (paras.length || prins.length) {
      aboutHTML =
        `<section id="about" class="col extra"><h2>About</h2>` +
        paras.map((t) => `<p class="lead">${esc(t)}</p>`).join("") +
        (prins.length
          ? `<dl class="prin">${prins
              .map((pr) => `<div><dt>${esc(pr.title)}</dt><dd>${esc(pr.body)}</dd></div>`)
              .join("")}</dl>`
          : "") +
        `</section>`;
    }
  }

  const entry = ({ title, role, metric, when, points, note }) => {
    const list = (points || []).filter(Boolean);
    return (
      `<article class="entry"><div class="top"><h3>${esc(title)}` +
      (role ? ` <span class="erole">— ${esc(role)}</span>` : "") +
      (metric ? ` <span class="emetric">${esc(metric)}</span>` : "") +
      `</h3>` +
      (when ? `<span class="when">${esc(when)}</span>` : "") +
      `</div>` +
      (list.length ? `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "") +
      (note ? `<p class="enote">${esc(note)}</p>` : "") +
      `</article>`
    );
  };

  const experienceHTML = experience.length
    ? `<section id="experience" class="col extra"><h2>Experience</h2><div class="entries">` +
      experience.map((e) => entry({ title: e.org, role: e.role, when: e.period, points: e.points })).join("") +
      `</div></section>`
    : "";

  const pressHTML = press.length
    ? `<section id="community" class="col extra"><h2>Community &amp; Press</h2><div class="entries">` +
      press
        .map((e) => entry({ title: e.org, role: e.role, metric: e.metric, when: e.period, points: e.points }))
        .join("") +
      `</div></section>`
    : "";

  const educationHTML = education.length
    ? `<section id="education" class="col extra"><h2>Education</h2><div class="entries">` +
      education.map((e) => entry({ title: e.school, role: e.program, when: e.period, note: e.note })).join("") +
      `</div></section>`
    : "";

  const skillsHTML = skills.length
    ? `<section id="skills" class="col extra"><h2>Skills</h2>` +
      skills
        .map((g) => {
          const list = (g.items || []).filter(Boolean);
          return (
            `<h3 class="sgh">${esc(g.group)}</h3>` +
            `<div class="skillg">${list.map((s) => `<span>${esc(s)}</span>`).join("")}</div>`
          );
        })
        .join("") +
      `</section>`
    : "";

  const contactLinks = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  const heroMeta = [
    p.email ? `<a href="${emailHref}">${esc(p.email)}</a>` : "",
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  const title = [p.name, p.role].filter(Boolean).map(esc).join(" — ");
  const desc = esc(p.subtagline || about.short || "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="color-scheme" content="dark">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23151b2e'/%3E%3Ctext x='16' y='22' font-family='-apple-system,Segoe UI,Roboto,sans-serif' font-size='18' font-weight='600' fill='%2382c7da' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E">
<style>
:root{color-scheme:dark;
--bg:oklch(24% 0.035 262);--bg2:oklch(28.5% 0.04 262);--bg3:oklch(33% 0.045 262);
--ink:oklch(94% 0.012 262);--ink2:oklch(79% 0.02 262);--ink3:oklch(70% 0.025 262);
--line:oklch(38% 0.035 262);--line2:oklch(48% 0.04 262);
--sky:oklch(80% 0.09 215);--sky-glow:oklch(80% 0.09 215 / .18);
--shadow:oklch(12% 0.03 262 / .55);--shadow-2:oklch(10% 0.03 262 / .65);
--ease:cubic-bezier(.16,1,.3,1);
--pad:clamp(1.25rem,4.5vw,2.5rem);
--s-1:.875rem;--s0:1.0625rem}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;overflow-x:clip}
body{margin:0;background:var(--bg);color:var(--ink);overflow-x:clip;overflow-wrap:break-word;
font:var(--s0)/1.62 -apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI",Roboto,Helvetica,Arial,system-ui,sans-serif;
font-feature-settings:"kern" 1,"liga" 1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
.col{max-width:68rem;margin-inline:auto;padding-inline:var(--pad)}
::selection{background:var(--sky);color:var(--bg)}
a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--line2);transition:color .15s ease-out,border-color .15s ease-out}
a:hover{color:var(--sky);border-bottom-color:var(--sky)}
:focus-visible{outline:2px solid var(--sky);outline-offset:3px;border-radius:3px}
.skip{position:absolute;left:-999px}
.skip:focus{left:.75rem;top:.75rem;z-index:9;background:var(--sky);color:var(--bg);padding:.5rem .9rem;border-radius:6px;border:0}
h1,h2,h3{margin:0;line-height:1.12;letter-spacing:-.022em;text-wrap:balance;font-weight:650}
p{margin:0}
h2{font-size:clamp(1.25rem,1.1rem + .8vw,1.6rem)}
.tally{font-size:var(--s-1);font-weight:400;color:var(--ink3);letter-spacing:.01em;margin-left:.6rem;white-space:nowrap}
.ai{display:inline-block;color:var(--sky);transition:transform .3s var(--ease)}

.hero{padding-top:clamp(2.8rem,7vw,5rem)}
.hero h1{font-size:clamp(2.7rem,1.5rem + 6.2vw,5.5rem);font-weight:700;letter-spacing:-.035em}
.hero .latin{margin-top:.5rem;font-size:var(--s-1);letter-spacing:.09em;text-transform:uppercase;color:var(--ink3)}
.hero .role{margin-top:1.15rem;font-weight:600;color:var(--ink2);font-size:clamp(1rem,.92rem + .5vw,1.2rem)}
.hero .tagline{margin-top:.4rem;font-size:clamp(1.35rem,1.05rem + 1.6vw,1.9rem);line-height:1.28;letter-spacing:-.02em;font-weight:600;max-width:30ch;text-wrap:balance}
.hero .sub{margin-top:.85rem;color:var(--ink3);max-width:65ch}
.hero .meta{margin-top:1.25rem;font-size:var(--s-1);display:flex;flex-wrap:wrap;gap:.3rem 1.5rem}
.hero .meta a{color:var(--ink2);border-bottom-color:var(--line)}

/* The parade. Base = native scroll-snap scroller, complete without JS.
   JS clones the set for a seamless loop and drifts scrollLeft. */
.parade{margin-top:clamp(1.7rem,4vw,2.9rem)}
#pstrip{position:relative;overflow-x:auto;scroll-snap-type:x proximity;scroll-padding-inline:var(--pad);
scrollbar-width:thin;scrollbar-color:var(--line) transparent;--fade:clamp(1rem,3vw,2.4rem);
/* Two mask layers: the edge fade rides only the card zone; the bottom 14px band
   (where the thin scrollbar lives) stays fully opaque so its ends never fade. */
-webkit-mask-image:linear-gradient(90deg,transparent,#000 var(--fade),#000 calc(100% - var(--fade)),transparent),linear-gradient(#000,#000);
-webkit-mask-size:100% calc(100% - 14px),100% 14px;-webkit-mask-position:top,bottom;-webkit-mask-repeat:no-repeat;
mask-image:linear-gradient(90deg,transparent,#000 var(--fade),#000 calc(100% - var(--fade)),transparent),linear-gradient(#000,#000);
mask-size:100% calc(100% - 14px),100% 14px;mask-position:top,bottom;mask-repeat:no-repeat}
#pstrip.js{scroll-snap-type:none}
#ptrack{display:flex;gap:clamp(.9rem,1.8vw,1.35rem);width:max-content;margin:0;padding:1rem var(--pad) 1.55rem;list-style:none}
.slide{display:block;width:clamp(13rem,26vw,17rem);color:var(--ink);border-bottom:0;scroll-snap-align:center;transition:transform .5s var(--ease)}
.slide:hover{color:var(--ink)}
.slide:hover,.slide:focus-visible{transform:translateY(-8px)}
.slide:focus-visible{outline-offset:6px;border-radius:8px}
.frame{display:flex;align-items:center;justify-content:center;aspect-ratio:16/11;border-radius:12px;overflow:hidden;
border:1px solid var(--line);background:var(--bg2);box-shadow:0 14px 30px -14px var(--shadow);
transition:border-color .3s ease-out,box-shadow .5s var(--ease)}
.slide:hover .frame,.slide:focus-visible .frame{border-color:var(--line2);box-shadow:0 26px 46px -18px var(--shadow-2)}
.frame img{width:100%;height:100%;object-fit:cover;display:block}
/* Light mat behind contain/icon assets so transparent-background logos read at night */
.frame.contain,.frame.icon{background:oklch(93% 0.008 262)}
.frame.contain img{object-fit:contain;padding:5.5%}
.frame.icon img{object-fit:contain;padding:27%}
.tile{flex-direction:column;gap:.55rem;background:var(--bg3)}
.tile .glyph{font-size:2.3rem;font-weight:700;letter-spacing:-.03em;color:var(--ink2)}
.ptile{color:var(--sky)}
.ptile .pids{font:600 .78rem/1.5 ui-monospace,SFMono-Regular,Consolas,"Cascadia Mono",Menlo,monospace;letter-spacing:.06em;color:var(--sky);text-align:center}
.cap{display:block;position:relative;padding:.7rem .15rem 0}
.cap .ct{display:block;font-size:.95rem;font-weight:600;letter-spacing:-.01em;line-height:1.3;text-wrap:balance}
/* Status · year is always visible — the resting caption is complete, no reserved
   dead band. Only the destination line reveals on hover/focus, and it lives out
   of flow (in the track's bottom padding) so revealing it never shifts layout. */
.cap .cm{display:block;margin-top:.2rem;font-size:.8rem;color:var(--ink3)}
.cap .go{position:absolute;top:100%;left:.15rem;right:0;margin-top:.15rem;font-size:.8rem;font-weight:600;color:var(--sky);
opacity:0;transform:translateY(-3px);transition:opacity .35s var(--ease),transform .35s var(--ease)}
.slide:hover .go,.slide:focus-visible .go{opacity:1;transform:none}
.pbar{margin-top:.35rem;display:flex;align-items:center;flex-wrap:wrap;gap:.5rem 1.1rem}
.phint{font-size:.8rem;color:var(--ink3)}
.phint .t{display:none}
/* Persistent pause/play latch (WCAG 2.2.2) — hover/touch holds auto-resume, this
   button does not: once paused, the parade stays paused until played again. */
.ppb{display:inline-flex;align-items:center;gap:.5rem;font:inherit;font-size:.78rem;font-weight:600;letter-spacing:.02em;
color:var(--ink2);background:var(--bg2);border:1px solid var(--line2);border-radius:999px;padding:.4rem .9rem;cursor:pointer;
transition:color .15s ease-out,border-color .15s ease-out}
.ppb:hover{color:var(--sky);border-color:var(--sky)}
.ppb[hidden]{display:none}
.pico{width:8px;height:10px;border-left:3px solid currentColor;border-right:3px solid currentColor}
.ppb.ispaused .pico{width:0;height:0;border-style:solid;border-color:transparent;border-width:5px 0 5px 8px;border-left-color:currentColor}
@media (hover:none){
.cap .go{opacity:1;transform:none}
.phint .m{display:none}
.phint .t{display:inline}}

.index{margin-top:clamp(2.6rem,6vw,4rem)}
.rows{list-style:none;margin:1.1rem 0 0;padding:0;border-top:1px solid var(--line)}
.row{display:grid;grid-template-columns:minmax(11rem,17rem) 1fr;gap:.4rem 2.4rem;padding:1.35rem 0;border-bottom:1px solid var(--line)}
.row .lhs h3{font-size:1.05rem;letter-spacing:-.012em}
.row .lhs h3 a{border-bottom:0}
.row h3 a:hover .ai{transform:translate(2px,-2px)}
.row .rstatus{margin-top:.3rem;font-size:var(--s-1);color:var(--ink3)}
.row .rhs{min-width:0}
.row .desc{color:var(--ink2);max-width:65ch}
.rlinks{margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.3rem 1.3rem;font-size:var(--s-1)}
.rlinks a{color:var(--ink2);border-bottom-color:var(--line)}
.nolink{margin-top:.5rem;font-size:var(--s-1);color:var(--ink3);font-style:italic}
.row details{margin-top:.6rem}
.row summary{list-style:none;cursor:pointer;width:max-content;font-size:var(--s-1);color:var(--ink3);display:inline-flex;align-items:center;gap:.45rem}
.row summary::-webkit-details-marker{display:none}
.row summary:hover{color:var(--sky)}
.row summary .plus{display:inline-block;font-weight:600;transition:transform .3s var(--ease)}
.row details[open] summary .plus{transform:rotate(45deg)}
.rowdetail{margin-top:.55rem}
.rowdetail p{color:var(--ink2);font-size:.95rem;max-width:65ch;margin:0}
.rowdetail p+p{margin-top:.5rem}
.rowdetail a{color:var(--ink2)}
.rtags{margin-top:.6rem;font-size:.85rem;color:var(--ink3);letter-spacing:.01em}

.ppanel{margin-top:2rem;border:1px solid var(--line);background:var(--bg2);border-radius:16px;
padding:clamp(1.4rem,3.5vw,2.1rem);display:grid;grid-template-columns:auto 1fr;gap:1.6rem}
.ppanel .rosette{color:var(--sky)}
.ppanel .pbody{min-width:0}
.ppanel h3{font-size:clamp(1.15rem,1rem + .9vw,1.45rem);letter-spacing:-.018em}
.ppanel .pmeta{margin-top:.5rem;font:600 .82rem/1.6 ui-monospace,SFMono-Regular,Consolas,"Cascadia Mono",Menlo,monospace;color:var(--sky);letter-spacing:.05em}
.ppanel .blurb{margin-top:.7rem;color:var(--ink2);max-width:65ch}
.ppanel ul{margin:.95rem 0 0;padding:0;list-style:none}
.ppanel li{position:relative;padding-left:1.2rem;margin-top:.45rem;max-width:65ch}
.ppanel li::before{content:"";position:absolute;left:0;top:.68em;width:.5rem;height:1px;background:var(--sky)}

.extra{margin-top:clamp(2.6rem,6vw,4rem)}
.statrow{display:flex;flex-wrap:wrap;gap:1rem 2.6rem}
.statrow b{display:block;font-size:1.5rem;letter-spacing:-.02em}
.statrow span{font-size:var(--s-1);color:var(--ink3)}
.lead{margin-top:.9rem;color:var(--ink2);max-width:65ch}
.prin{margin-top:1.1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem 2rem}
.prin div{margin:0}
.prin dt{font-weight:600}
.prin dd{margin:.2rem 0 0;color:var(--ink3);font-size:.95rem}
.entries{margin-top:1rem;border-top:1px solid var(--line)}
.entry{padding:1.1rem 0;border-bottom:1px solid var(--line)}
.entry .top{display:flex;justify-content:space-between;gap:.4rem 1rem;flex-wrap:wrap;align-items:baseline}
.entry h3{font-size:1rem}
.entry .erole{color:var(--ink2);font-size:var(--s-1);font-weight:400}
.entry .emetric{font-size:var(--s-1);color:var(--ink3);border:1px solid var(--line);border-radius:999px;padding:.02rem .55rem;font-weight:400}
.entry .when{color:var(--ink3);font-size:var(--s-1);white-space:nowrap}
.entry ul{margin:.5rem 0 0;padding-left:1.1rem;color:var(--ink2);font-size:.95rem}
.entry li{margin-top:.25rem;max-width:65ch}
.entry .enote{margin-top:.4rem;color:var(--ink2);font-size:.95rem;max-width:65ch}
.sgh{margin-top:1.2rem;font-size:1rem}
.skillg{margin-top:.6rem;display:flex;flex-wrap:wrap;gap:.45rem}
.skillg span{font-size:var(--s-1);color:var(--ink2);border:1px solid var(--line);border-radius:999px;padding:.16rem .7rem}

.contact{margin-top:clamp(2.8rem,6vw,4.2rem)}
.contact .big{margin-top:.9rem;font-size:clamp(1.5rem,1.2rem + 1.8vw,2.3rem);font-weight:650;letter-spacing:-.024em}
.contact .big a{border-bottom:2px solid var(--line2)}
.contact .big a:hover{border-bottom-color:var(--sky)}
.contact .cl{margin-top:.95rem;display:flex;flex-wrap:wrap;gap:.3rem 1.5rem}
.contact .cl a{color:var(--ink2);border-bottom-color:var(--line)}
.avail{margin-top:1.05rem;display:inline-flex;align-items:center;gap:.55rem;font-size:var(--s-1);color:var(--ink2)}
.avail::before{content:"";width:.5rem;height:.5rem;border-radius:50%;background:var(--sky);flex:none;box-shadow:0 0 0 3px var(--sky-glow)}

footer{margin-top:clamp(3rem,7vw,4.5rem)}
footer .fin{border-top:1px solid var(--line);padding:1.2rem var(--pad) 2rem;font-size:var(--s-1);color:var(--ink3);display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;align-items:baseline}
footer .grow{flex:1}

@media (max-width:44rem){
.row{grid-template-columns:1fr;gap:.25rem}
.row .rstatus{margin-top:.15rem}
.ppanel{grid-template-columns:1fr;gap:1rem}
}

/* Reduced motion: the parade is fully replaced by a static filmstrip grid.
   No drift, no clones (JS never adds them), captions fully visible. */
@media (prefers-reduced-motion:reduce){
html{scroll-behavior:auto}
*,*::before,*::after{transition:none!important;animation:none!important}
#pstrip{overflow:visible;scroll-snap-type:none;mask-image:none;-webkit-mask-image:none}
#ptrack{display:grid;width:auto;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:1.15rem;padding:1rem var(--pad) .4rem}
.slide{width:auto}
.dup{display:none}
.cap .go{position:static;opacity:1;transform:none}
.pbar{display:none}
}
img{max-width:100%}
</style>
</head>
<body>
<a class="skip" href="#work">Skip to the index</a>

<header class="hero col">
  <h1>${esc(p.name)}</h1>
  ${[p.latinName, p.location].filter(Boolean).length ? `<p class="latin">${[p.latinName, p.location].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
  ${p.role ? `<p class="role">${esc(p.role)}</p>` : ""}
  ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ""}
  ${p.subtagline ? `<p class="sub">${esc(p.subtagline)}</p>` : ""}
  ${heroMeta ? `<nav class="meta" aria-label="Profiles">${heroMeta}</nav>` : ""}
</header>

<main>
  ${
    slidesHTML
      ? `<section class="parade" aria-label="Selected work, a scrollable strip">
  <div id="pstrip"><ul id="ptrack">${slidesHTML}</ul></div>
  <div class="pbar col">
    <button id="ppause" class="ppb" type="button" hidden><span class="pico" aria-hidden="true"></span><span id="pplab">Pause</span></button>
    <p class="phint" aria-hidden="true"><span class="m" id="phm">Scroll sideways · click to open</span><span class="t">Swipe the strip · tap to open</span></p>
  </div>
</section>`
      : ""
  }

  ${statsHTML}

  ${
    items.length || patent
      ? `<section id="work" class="col index">
  <h2>Index<span class="tally">${tally}</span></h2>
  ${rowsHTML ? `<ul class="rows">${rowsHTML}</ul>` : ""}
  ${patentHTML}
</section>`
      : ""
  }

  ${aboutHTML}

  ${experienceHTML}

  ${pressHTML}

  ${educationHTML}

  ${skillsHTML}

  <section id="contact" class="col contact">
    <h2>Contact</h2>
    ${p.email ? `<p class="big"><a href="${emailHref}">${esc(p.email)}</a></p>` : ""}
    ${contactLinks ? `<p class="cl">${contactLinks}</p>` : ""}
    ${p.available ? `<p class="avail">${esc(p.available)}</p>` : ""}
  </section>
</main>

<footer>
  <div class="fin col">
    <span>&copy; ${year} ${esc(p.name)}${p.latinName ? " · " + esc(p.latinName) : ""}</span>
    <span class="grow"></span>
    <span>Parade · the work walks past · zero external requests</span>
  </div>
</footer>

<script>
(function () {
  var rm = matchMedia("(prefers-reduced-motion: reduce)");
  var sc = document.getElementById("pstrip");
  var track = document.getElementById("ptrack");
  if (!sc || !track) return;
  var origCount = track.children.length;
  if (!origCount) return;
  var pb = document.getElementById("ppause");
  var lab = document.getElementById("pplab");
  var hm = document.getElementById("phm");
  var HINT_STATIC = "Scroll sideways · click to open";
  var HINT_DRIFT = "Drifts on its own · hover to hold · click to open";

  var SPEED = 26; // px per second, ambient walking pace
  var pos = 0, loopW = 0, raf = 0, last = 0;
  var hovered = false, focused = false, userHold = false, holdT = 0;
  var paused = false; // pause/play latch — never auto-resumes (WCAG 2.2.2)

  function measure() {
    if (track.children.length <= origCount) { loopW = 0; return; }
    loopW = track.children[origCount].getBoundingClientRect().left -
            track.children[0].getBoundingClientRect().left;
  }

  function addSet() {
    for (var i = 0; i < origCount; i++) {
      var c = track.children[i].cloneNode(true);
      c.classList.add("dup");
      c.setAttribute("aria-hidden", "true");
      var links = c.querySelectorAll("a");
      for (var j = 0; j < links.length; j++) links[j].tabIndex = -1;
      track.appendChild(c);
    }
  }

  // Enough clone sets that the seam wrap never pins at the right clamp.
  // Called at build AND after resizes (narrow -> wide needs more sets).
  function ensureClones() {
    if (!(loopW > 0)) return;
    var guard = 0;
    while (sc.scrollWidth < sc.clientWidth * 2 + loopW && guard++ < 4) addSet();
  }

  function build() {
    addSet();
    measure();
    if (!(loopW > 0)) return false;
    ensureClones();
    return true;
  }

  function playing() { return !paused && !hovered && !focused && !userHold; }

  function step(t) {
    raf = requestAnimationFrame(step);
    if (!last) { last = t; return; }
    var dt = Math.min(t - last, 80);
    last = t;
    pos += SPEED * dt / 1000;
    if (pos >= loopW) pos -= loopW;
    sc.scrollLeft = pos;
    if (Math.abs(sc.scrollLeft - pos) > 2) pos = sc.scrollLeft;
  }

  function apply() {
    if (playing()) {
      if (!raf) { pos = sc.scrollLeft; last = 0; raf = requestAnimationFrame(step); }
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function hold(ms) {
    userHold = true;
    apply();
    clearTimeout(holdT);
    holdT = setTimeout(function () { userHold = false; apply(); }, ms);
  }

  sc.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") { hovered = true; apply(); } });
  sc.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") { hovered = false; apply(); } });
  sc.addEventListener("focusin", function () { focused = true; apply(); });
  sc.addEventListener("focusout", function (e) {
    if (!sc.contains(e.relatedTarget)) { focused = false; apply(); }
  });
  sc.addEventListener("pointerdown", function () { hold(2400); });
  sc.addEventListener("touchstart", function () { hold(3200); }, { passive: true });
  sc.addEventListener("scroll", function () {
    if (raf && Math.abs(sc.scrollLeft - pos) < 2) return; // our own drift
    pos = sc.scrollLeft;
    if (!hovered && !focused) hold(2400);
  }, { passive: true });

  if (pb) pb.addEventListener("click", function () {
    paused = !paused;
    pb.classList.toggle("ispaused", paused);
    lab.textContent = paused ? "Play" : "Pause";
    if (hm) hm.textContent = paused ? HINT_STATIC : HINT_DRIFT;
    apply();
  });

  var rz = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      measure();
      ensureClones();
      if (loopW > 0 && pos >= loopW) pos = pos % loopW;
    }, 150);
  });

  function start() {
    sc.classList.add("js"); // snap off while the strip can drift
    if (build()) {
      if (pb) pb.hidden = false;
      if (hm) hm.textContent = HINT_DRIFT;
      apply();
    }
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    clearTimeout(holdT);
    hovered = focused = userHold = paused = false;
    pos = loopW = 0;
    if (pb) { pb.hidden = true; pb.classList.remove("ispaused"); lab.textContent = "Pause"; }
    if (hm) hm.textContent = HINT_STATIC;
    sc.classList.remove("js");
    var d = track.querySelectorAll(".dup");
    for (var i = 0; i < d.length; i++) d[i].parentNode.removeChild(d[i]);
  }

  if (!rm.matches) start();
  if (rm.addEventListener) rm.addEventListener("change", function () { rm.matches ? stop() : start(); });
})();
</script>
</body>
</html>`;
}
