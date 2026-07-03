// Peek theme — "text until touched". The page reads as a quiet two-column
// index (bold title left, one-line hook right, demiculus-style); every touch
// reveals pictures. Hover/focus/arrow onto a row and its REAL screenshot
// floats in beside the column (viewport-clamped, never under the cursor,
// ~160ms easeOutQuint crossfade between rows). The owner's name reveals a
// typographic "Hello." plate; the patent row reveals a certificate plate.
// Boldness is spent entirely on that one mechanic — everything else is quiet.
//
// PALETTE (committed strategy: single-hue verdigris ink, all OKLCH hue
// 163–172, AA-verified): paper oklch(97.2% .008 168) ≈ #f2f8f4 · ink
// oklch(24% .038 172) ≈ #0f2a22 (≈13:1) · ink-2 oklch(38% .052 170) (≈7:1) ·
// ink-3 oklch(46% .048 170) (≈6:1, holds ≥4.5:1 on the hover tint too) ·
// accent oklch(45% .105 163) deep viridian (≈5.4:1, also the focus ring).
// Dodges every taken lane: no warm paper/serif/terracotta, no oxblood field,
// no cool-gray gallery, no iris one-screen table, no near-black+acid.
//
// FALLBACKS ARE THE DESIGN: touch first-tap opens the row's inline drawer
// (screenshot + detail + links) and arms the row; a row whose drawer is
// already open counts as armed, so tapping its title always follows the link.
// An explicit "+" expander button does the same thing discoverably.
// Without JS every drawer is simply open — the page is complete text+images,
// nothing hidden. prefers-reduced-motion: previews appear instantly, no
// crossfade, no slides. Keyboard: Tab or ArrowUp/Down move between rows and
// the floating preview follows focus; Escape closes the focused row's open
// drawer first, then the preview. The name reveal is hover sugar only (no tab
// stop) — its content (tagline, latin name, location) is already printed in
// the hero on every device, so nothing is lost on touch or keyboard.
// GEOMETRY: side placement needs indexRight + gap + card + 16. From 64–70em
// the card slims to 17rem with a 16px gap so "beside the column" engages at
// exactly 1024 instead of falling back over the text. Very tall screenshots
// (phone captures) are swapped from cover-crop to contained 3:4 plates at
// runtime so no reveal ever reads blank.
import { esc, md, realLinks } from "../util.js";

// Short glyph for image-less items so a tile never reads "undefined".
const initialsOf = (title) => {
  const words = String(title || "").split(/\s+/).filter(Boolean);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (words[0] || "•").slice(0, 2).toUpperCase();
};

const modeClass = (it) =>
  it.image
    ? it.imageMode === "icon"
      ? "m-icon"
      : it.imageMode === "contain"
        ? "m-contain"
        : "m-cover"
    : "m-tile";

// Image plate. Peek-layer copies are decorative duplicates (alt="", the layer
// is aria-hidden); drawer copies carry the real alt text and lazy-load.
const plate = (it, { forPeek }) => {
  if (it.image) {
    const alt = forPeek
      ? ""
      : `${esc(it.title)} ${it.imageMode === "icon" ? "app icon" : "screenshot"}`;
    const load = forPeek ? "eager" : "lazy";
    return (
      `<span class="ph ${modeClass(it)}">` +
      `<img src="${esc(it.image)}" alt="${alt}" loading="${load}" decoding="async"></span>`
    );
  }
  return (
    `<span class="ph m-tile" aria-hidden="true">` +
    `<b>${esc(initialsOf(it.title))}</b><i>${esc(it.title)}</i></span>`
  );
};

export function render(content) {
  const p = content.profile || {};
  const about = content.about || {};
  const stats = content.stats || [];
  const items = content.items || [];
  const patent = content.patent && content.patent.title ? content.patent : null;
  const experience = content.experience || [];
  const press = content.press || [];
  const education = content.education || [];
  const skills = content.skills || [];
  const year = new Date().getFullYear();
  const emailHref = p.email ? `mailto:${esc(p.email)}` : "";

  // WORK ROWS + PEEK CARDS ------------------------------------------------
  const rows = items
    .map((it, i) => {
      const key = `w${i}`;
      const title = esc(it.title);
      const links = realLinks(it.links);
      const primary =
        links.find((l) => /live|demo|site|app|store/i.test(l.label || "")) || links[0];
      const status = [it.status, it.year].filter(Boolean).map(esc).join(" · ");

      const t = primary
        ? `<a class="go" href="${esc(primary.href)}" target="_blank" rel="noopener">${title}` +
          `<svg class="arr" aria-hidden="true"><use href="#s-live"/></svg></a>`
        : `<span class="go static">${title}</span>`;

      const icons = links
        .map((l) => {
          const sym = /github/i.test(l.label || "") ? "s-gh" : "s-live";
          return (
            `<a class="ic" href="${esc(l.href)}" target="_blank" rel="noopener" ` +
            `aria-label="${title}: ${esc(l.label)}">` +
            `<svg aria-hidden="true"><use href="#${sym}"/></svg></a>`
          );
        })
        .join("");

      const plinks = links.length
        ? `<p class="plinks">` +
          links
            .map(
              (l) =>
                `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`
            )
            .join("") +
          `</p>`
        : `<p class="nolink">No public link yet</p>`;

      const tags = (it.tags || []).map(esc).join(" · ");

      return (
        `<li class="row" data-peek="${key}">` +
        `<div class="rowline">` +
        `<h3 class="t">${t}</h3>` +
        (it.description ? `<p class="d">${esc(it.description)}</p>` : `<p class="d"></p>`) +
        `<span class="rmeta">${icons}` +
        `<button class="more" type="button" aria-expanded="false" aria-controls="p-${key}">` +
        `<svg aria-hidden="true"><use href="#s-plus"/></svg>` +
        `<span class="vh">Details: ${title}</span></button></span>` +
        `</div>` +
        `<div class="panel" id="p-${key}">` +
        `<figure class="shot">${plate(it, { forPeek: false })}` +
        (status ? `<figcaption>${status}</figcaption>` : "") +
        `</figure>` +
        `<div class="pb">` +
        (it.detail ? md(it.detail) : "") +
        (tags ? `<p class="tags">${tags}</p>` : "") +
        plinks +
        `</div></div></li>`
      );
    })
    .join("");

  const itemCards = items
    .map((it, i) => {
      const cap = [it.status, it.year].filter(Boolean).map(esc).join(" · ");
      return (
        `<figure class="card" data-card="w${i}">${plate(it, { forPeek: true })}` +
        `<figcaption class="cap"><strong>${esc(it.title)}</strong>` +
        (cap ? ` · ${cap}` : "") +
        `</figcaption></figure>`
      );
    })
    .join("");

  // PATENT: one distinguished row + a certificate plate --------------------
  let patentRow = "";
  let patentCard = "";
  if (patent) {
    const ids = (patent.ids || []).map(esc);
    const meta = [...ids, patent.year ? esc(patent.year) : "", patent.role ? esc(patent.role) : ""]
      .filter(Boolean)
      .join(" · ");
    const hl = (patent.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("");
    patentRow =
      `<li class="row patent" data-peek="pat">` +
      `<div class="rowline">` +
      `<h3 class="t"><span class="go static">` +
      `<svg class="seal-s" aria-hidden="true"><use href="#s-seal"/></svg>${esc(patent.title)}</span></h3>` +
      `<p class="d ids">${meta}</p>` +
      `<span class="rmeta">` +
      `<button class="more" type="button" aria-expanded="false" aria-controls="p-pat">` +
      `<svg aria-hidden="true"><use href="#s-plus"/></svg>` +
      `<span class="vh">Details: ${esc(patent.title)}</span></button></span>` +
      `</div>` +
      `<div class="panel" id="p-pat"><div class="pb wide">` +
      (patent.blurb ? `<p>${esc(patent.blurb)}</p>` : "") +
      (hl ? `<ul class="hl">${hl}</ul>` : "") +
      `</div></div></li>`;
    patentCard =
      `<div class="card cert" data-card="pat"><div class="in">` +
      `<svg class="seal" aria-hidden="true"><use href="#s-seal"/></svg>` +
      (ids[0] ? `<p class="pid">${ids[0]}</p>` : "") +
      (ids.length > 1 ? `<p class="pid2">${ids.slice(1).join(" · ")}</p>` : "") +
      `<p class="pt">${esc(patent.title)}</p>` +
      `<p class="pm">${[patent.year, patent.role].filter(Boolean).map(esc).join(" · ")}</p>` +
      `</div></div>`;
  }

  const helloCard =
    `<div class="card hello" data-card="hello">` +
    `<p class="hi">Hello.</p>` +
    (p.tagline ? `<p class="tg">${esc(p.tagline)}</p>` : "") +
    ([p.latinName, p.location].filter(Boolean).length
      ? `<p class="lc">${[p.latinName, p.location].filter(Boolean).map(esc).join(" · ")}</p>`
      : "") +
    `</div>`;

  const peekHTML = `<div id="peek" aria-hidden="true">${helloCard}${itemCards}${patentCard}</div>`;

  const indexHTML =
    rows || patentRow
      ? `<section id="workx"><h2 class="vh">Work</h2>` +
        `<p class="hint"><svg class="eyeg" aria-hidden="true"><use href="#s-eye"/></svg>` +
        `Point, tap, or tab. Every row shows itself.</p>` +
        `<ul id="index" role="list">${rows}${patentRow}</ul></section>`
      : "";

  // OPTIONAL SECTIONS (empty today; render nothing when empty) ------------
  const factsHTML = stats.length
    ? `<p class="facts">${stats
        .map((s) => `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>`)
        .join('<span class="sep"> · </span>')}</p>`
    : "";

  let aboutHTML = "";
  if ((about.paragraphs && about.paragraphs.length) || (about.principles && about.principles.length)) {
    aboutHTML =
      `<section class="opt" id="about"><h2 class="shead">About</h2>` +
      (about.paragraphs || []).map((t) => `<p class="prose">${esc(t)}</p>`).join("") +
      (about.principles && about.principles.length
        ? `<dl class="prin">${about.principles
            .map((pr) => `<div><dt>${esc(pr.title)}</dt><dd>${esc(pr.body)}</dd></div>`)
            .join("")}</dl>`
        : "") +
      `</section>`;
  }

  const entLine = (title, sub, when, points, note) =>
    `<li><div class="etop"><strong>${esc(title)}</strong>` +
    (sub ? ` <span class="esub">${esc(sub)}</span>` : "") +
    (when ? `<span class="ewhen">${esc(when)}</span>` : "") +
    `</div>` +
    (points && points.filter(Boolean).length
      ? `<ul class="epts">${points.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : "") +
    (note ? `<p class="enote">${esc(note)}</p>` : "") +
    `</li>`;

  const entriesSection = (id, label, list, mapFn) =>
    list.length
      ? `<section class="opt" id="${id}"><h2 class="shead">${label}</h2>` +
        `<ul class="ent" role="list">${list.map(mapFn).join("")}</ul></section>`
      : "";

  const expHTML = entriesSection("experience", "Experience", experience, (e) =>
    entLine(e.org, e.role, e.period, e.points)
  );
  const pressHTML = entriesSection("press", "Community &amp; Press", press, (e) =>
    entLine(e.org, e.role, e.period, e.points)
  );
  const eduHTML = entriesSection("education", "Education", education, (e) =>
    entLine(e.school, e.program, e.period, null, e.note)
  );

  const skillsHTML = skills.length
    ? `<section class="opt" id="skills"><h2 class="shead">Skills</h2>` +
      `<ul class="skl" role="list">${skills
        .map(
          (g) =>
            `<li><strong>${esc(g.group)}</strong> ${(g.items || []).filter(Boolean).map(esc).join(" · ")}</li>`
        )
        .join("")}</ul></section>`
    : "";

  // HERO + CONTACT ---------------------------------------------------------
  const metaHTML = [
    p.email ? `<a href="${emailHref}">${esc(p.email)}</a>` : "",
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="sep"> · </span>');

  const contactHTML =
    p.email || p.githubUrl || p.linkedinUrl || p.available
      ? `<section id="contact"><h2 class="vh">Contact</h2>` +
        (p.email ? `<p class="cbig"><a href="${emailHref}">${esc(p.email)}</a></p>` : "") +
        (metaHTML ? `<p class="cline">${metaHTML}</p>` : "") +
        (p.available ? `<p class="avail">${esc(p.available)}</p>` : "") +
        `</section>`
      : "";

  const title = [p.name, p.role].filter(Boolean).map(esc).join(" · ");
  const desc = esc(p.subtagline || p.tagline || "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f2f8f4">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230f2a22'/%3E%3Ctext x='16' y='22' font-family='-apple-system,Segoe UI,Roboto,sans-serif' font-size='18' font-weight='700' fill='%23f2f8f4' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E">
<style>
:root{
 --bg:oklch(97.2% .008 168);
 --plate:oklch(98.6% .005 168);
 --well:oklch(93.5% .015 168);
 --tint:oklch(94.5% .013 168);
 --edge:oklch(88% .022 168);
 --edge2:oklch(79% .033 168);
 --ink:oklch(24% .038 172);
 --ink-2:oklch(38% .052 170);
 --ink-3:oklch(46% .048 170);
 --accent:oklch(45% .105 163);
 --eo:cubic-bezier(.22,1,.36,1);
 --s-1:.82rem;--s0:1.0625rem;--s1:1.33rem;--s2:1.66rem;--s3:2.08rem;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);overflow-x:clip;
 font:var(--s0)/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
 font-feature-settings:"kern" 1,"liga" 1;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
h1,h2,h3,p,ul,ol,li,figure,figcaption,dl,dt,dd{margin:0;padding:0}
img{max-width:100%;height:auto;display:block}
::selection{background:var(--ink);color:var(--bg)}
a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--edge2);transition:border-color .14s var(--eo),color .14s var(--eo)}
a:hover{color:var(--accent);border-bottom-color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}
.vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:-999px;top:0}
.skip:focus{left:.6rem;top:.6rem;z-index:99;background:var(--ink);color:var(--bg);padding:.5rem .85rem;border-radius:5px;border-bottom:0}
.wrap{max-width:46rem;padding:clamp(2.6rem,7vh,5rem) clamp(1.25rem,6vw,4rem) 4rem;
 margin-left:clamp(0px,calc((100vw - 80rem)*.5),10rem)}

/* HERO */
.hero h1{font-size:clamp(2.7rem,1.7rem + 4.2vw,4.4rem);font-weight:750;letter-spacing:-.035em;line-height:1.04;text-wrap:balance}
.who{cursor:default;border-bottom:3px dotted var(--edge2);transition:border-color .14s var(--eo)}
.who:hover{border-bottom-color:var(--accent)}
.latin{margin-top:.7rem;font-size:var(--s-1);letter-spacing:.05em;color:var(--ink-3)}
.role{margin-top:1.5rem;font-weight:600;letter-spacing:-.008em}
.lede{margin-top:.5rem;font-size:var(--s1);letter-spacing:-.014em;line-height:1.4;max-width:30ch;text-wrap:balance}
.sub{margin-top:.9rem;color:var(--ink-2);max-width:66ch}
.meta{margin-top:1.3rem;font-size:var(--s-1);color:var(--ink-3)}
.meta a{color:var(--ink-2);border-bottom-color:var(--edge)}
.meta a:hover{color:var(--accent)}
.sep{color:var(--ink-3);border:0;padding:0 .15rem}
.facts{margin-top:1.2rem;font-size:var(--s-1);color:var(--ink-3)}
.facts b{color:var(--ink);font-weight:650;font-variant-numeric:tabular-nums}

/* INDEX */
#workx{margin-top:3.4rem}
.hint{display:flex;align-items:center;gap:.55rem;font-size:var(--s-1);color:var(--ink-3);margin-bottom:.9rem}
.eyeg{width:1.05rem;height:.66rem;color:var(--accent);flex:0 0 auto}
#index{list-style:none}
.row + .row{margin-top:.15rem}
.rowline{display:grid;grid-template-columns:minmax(12rem,16.5rem) 1fr auto;gap:.3rem 1.3rem;align-items:baseline;
 padding:.72rem .7rem;margin:0 -.7rem;border-radius:9px;transition:background-color .14s var(--eo)}
.rowline>*{min-width:0}
@media (hover:hover){.row:hover .rowline{background:var(--tint)}}
.row:focus-within .rowline{background:var(--tint)}
.t{font-size:1.15rem;font-weight:700;letter-spacing:-.016em;line-height:1.3;text-wrap:balance;overflow-wrap:break-word}
.t .go{border-bottom:0;color:var(--ink)}
.t a.go:hover{color:var(--accent)}
.arr{width:.68em;height:.68em;margin-left:.32em;color:var(--accent);transition:transform .16s var(--eo)}
.row:hover .arr,.go:focus-visible .arr{transform:translate(2px,-2px)}
.d{font-size:.95rem;color:var(--ink-2);line-height:1.5;overflow-wrap:break-word}
.d.ids{font-variant-numeric:tabular-nums;color:var(--ink-3)}
.rmeta{display:flex;align-items:center;gap:.3rem;justify-self:end}
.ic,.more{width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;
 color:var(--ink-3);border-bottom:0;transition:color .14s var(--eo),background-color .14s var(--eo)}
.ic:hover,.more:hover{color:var(--accent);background:var(--well)}
.ic svg{width:1.05rem;height:1.05rem}
.more{appearance:none;background:none;border:0;padding:0;cursor:pointer;font:inherit;position:relative}
.more svg{width:1rem;height:1rem;transition:transform .18s var(--eo)}
.row.expanded .more svg{transform:rotate(45deg)}

/* PATENT ROW: the one drawn rule on the page */
.row.patent{margin-top:2rem;border-top:4px double var(--edge2);padding-top:1.3rem}
.seal-s{width:.9em;height:.9em;margin-right:.45em;color:var(--accent);vertical-align:-.06em}

/* DRAWERS (inline reveal; open by default without JS) */
.panel{display:grid;grid-template-columns:minmax(11rem,15rem) 1fr;gap:1rem 1.4rem;padding:.4rem .7rem 1.25rem;margin:0 -.7rem}
.panel>*{min-width:0}
.js .panel{display:none}
.js .panel.open{display:grid;animation:pin .18s var(--eo)}
@keyframes pin{from{opacity:0;transform:translateY(-3px)}}
.shot{margin:0}
.panel .ph{border:1px solid var(--edge);border-radius:9px}
.panel figcaption{margin-top:.45rem;font-size:var(--s-1);color:var(--ink-3)}
.pb{max-width:65ch;font-size:.95rem;color:var(--ink-2);line-height:1.6}
.pb p{margin:0 0 .6rem}
.pb a{color:var(--accent);border-bottom-color:var(--edge2)}
.pb .tags{font-size:var(--s-1);color:var(--ink-3)}
.plinks{display:flex;flex-wrap:wrap;gap:.3rem 1.2rem}
.plinks a{font-weight:600;font-size:.9rem}
.nolink{font-size:var(--s-1);color:var(--ink-3);font-style:italic}
.pb.wide{grid-column:1/-1}
.hl{list-style:none;margin-top:.2rem}
.hl li{position:relative;padding-left:1.1rem;margin-top:.4rem;color:var(--ink)}
.hl li::before{content:"";position:absolute;left:0;top:.58em;width:.38em;height:.38em;border:1px solid var(--ink-2);border-radius:50%}

/* image plates (shared by drawer + peek layer) */
.ph{display:grid;place-items:center;width:100%;aspect-ratio:4/3;background:var(--well);overflow:hidden;position:relative}
.ph img{grid-area:1/1}
.ph.m-cover img{width:100%;height:100%;object-fit:cover;object-position:top center}
.ph.m-contain img{width:100%;height:100%;object-fit:contain;padding:5%}
.ph.m-icon img{width:42%;height:auto;max-height:58%;object-fit:contain}
.ph.tall{aspect-ratio:3/4}
.ph.tall img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:4%}
.ph.m-tile{background:var(--ink);color:var(--plate);place-content:center;text-align:center;padding:1rem;gap:.35rem}
.ph.m-tile b{font-size:2.4rem;font-weight:750;letter-spacing:-.03em;line-height:1}
.ph.m-tile i{font-style:normal;font-size:var(--s-1);color:oklch(85% .02 168)}

/* PEEK LAYER: the signature */
#peek{position:fixed;left:0;top:0;width:20rem;z-index:9;pointer-events:none;opacity:0;display:grid;will-change:transform;
 filter:drop-shadow(0 18px 38px oklch(25% .04 170/.16)) drop-shadow(0 2px 8px oklch(25% .04 170/.1));
 transition:opacity .16s var(--eo),transform .2s var(--eo)}
#peek.show{opacity:1}
#peek.snap{transition:opacity .16s var(--eo)}
@media (min-width:64em) and (max-width:69.99em){#peek{width:17rem}}
#peek .card{grid-area:1/1;display:none;background:var(--plate);border:1px solid var(--edge);border-radius:11px;overflow:hidden}
#peek .card.on{display:block;animation:cardin .16s var(--eo)}
#peek .card.out{display:block;opacity:0;transition:opacity .14s var(--eo)}
@keyframes cardin{from{opacity:0;transform:translateY(4px)}}
#peek .cap{padding:.68rem .95rem .78rem;font-size:var(--s-1);color:var(--ink-3);line-height:1.45}
#peek .cap strong{color:var(--ink);font-weight:650}
.card.hello{background:var(--ink);color:var(--bg);padding:1.5rem 1.4rem 1.4rem}
.hello .hi{font-size:2.7rem;font-weight:750;letter-spacing:-.03em;line-height:1}
.hello .tg{margin-top:.75rem;font-size:1rem;line-height:1.45;color:oklch(92% .015 168)}
.hello .lc{margin-top:1rem;font-size:var(--s-1);letter-spacing:.04em;color:oklch(82% .025 168)}
.card.cert{padding:.55rem}
.cert .in{border:1.5px solid var(--ink-2);border-radius:7px;padding:1.4rem 1.1rem;text-align:center}
.cert .seal{display:block;width:2.7rem;height:2.7rem;margin:0 auto .7rem;color:var(--accent)}
.cert .pid{font-size:1.3rem;font-weight:700;letter-spacing:.01em;font-variant-numeric:tabular-nums}
.cert .pid2{margin-top:.15rem;font-size:.95rem;font-weight:600;color:var(--ink-2);font-variant-numeric:tabular-nums}
.cert .pt{margin-top:.6rem;font-size:var(--s-1);color:var(--ink-2);line-height:1.45;text-wrap:balance}
.cert .pm{margin-top:.55rem;font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}

/* OPTIONAL SECTIONS */
.opt{margin-top:3rem}
.shead{font-size:var(--s0);font-weight:650;letter-spacing:-.01em;margin-bottom:.8rem}
.prose{max-width:66ch;color:var(--ink-2)}
.prose + .prose{margin-top:.7rem}
.prin{margin-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem 2rem}
.prin dt{font-weight:650}
.prin dd{margin-top:.15rem;font-size:var(--s-1);color:var(--ink-2)}
.ent{list-style:none}
.ent>li{padding:.7rem 0}
.ent>li + li{border-top:1px solid var(--edge)}
.etop{display:flex;flex-wrap:wrap;align-items:baseline;gap:.3rem .7rem}
.esub{color:var(--ink-2);font-size:var(--s-1)}
.ewhen{margin-left:auto;color:var(--ink-3);font-size:var(--s-1);font-variant-numeric:tabular-nums}
.epts{list-style:none;margin-top:.35rem}
.epts li{position:relative;padding-left:1rem;margin-top:.25rem;color:var(--ink-2);font-size:var(--s-1);max-width:66ch}
.epts li::before{content:"";position:absolute;left:0;top:.65em;width:.4em;border-top:1px solid var(--edge2)}
.enote{margin-top:.3rem;color:var(--ink-2);font-size:var(--s-1);max-width:66ch}
.skl{list-style:none}
.skl li{margin-top:.4rem;color:var(--ink-2);font-size:.95rem}
.skl strong{color:var(--ink)}

/* CONTACT + FOOTER */
#contact{margin-top:4.2rem}
.cbig a{font-size:clamp(1.45rem,1.1rem + 1.8vw,2.08rem);font-weight:650;letter-spacing:-.024em;border-bottom:2px solid var(--edge2)}
.cbig a:hover{border-bottom-color:var(--accent)}
.cline{margin-top:1rem;font-size:.95rem;color:var(--ink-3)}
.cline a{color:var(--ink-2);border-bottom-color:var(--edge)}
.avail{margin-top:.55rem;font-size:var(--s-1);color:var(--ink-3)}
footer{margin-top:4rem;padding-top:1.1rem;border-top:1px solid var(--edge);font-size:var(--s-1);color:var(--ink-3);
 display:flex;flex-wrap:wrap;gap:.4rem 1rem}
footer .grow{flex:1}

/* RESPONSIVE */
@media (max-width:46rem){
 .rowline{grid-template-columns:1fr auto;padding:.85rem .55rem;margin:0 -.55rem}
 .t{grid-column:1}
 .rmeta{grid-column:2;grid-row:1;align-self:start}
 .d{grid-column:1/-1}
 .panel{grid-template-columns:1fr;padding:.3rem .55rem 1.3rem;margin:0 -.55rem}
 .shot{max-width:24rem}
 .prin{grid-template-columns:1fr}
 .ewhen{margin-left:0;width:100%}
}

/* REDUCED MOTION: everything appears instantly */
@media (prefers-reduced-motion:reduce){
 *{transition:none !important;animation:none !important}
 #peek .card.out{display:none}
}
</style>
</head>
<body>
<a class="skip" href="#workx">Skip to work</a>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
 <symbol id="s-gh" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></symbol>
 <symbol id="s-live" viewBox="0 0 16 16"><path d="M4.7 11.3 11 5M5.8 4.6h5.6v5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
 <symbol id="s-plus" viewBox="0 0 16 16"><path d="M8 3.2v9.6M3.2 8h9.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></symbol>
 <symbol id="s-eye" viewBox="0 0 20 12"><path d="M1 6C4 1.6 7.8.8 10 .8S16 1.6 19 6c-3 4.4-6.8 5.2-9 5.2S4 10.4 1 6Z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="6" r="2.3" fill="currentColor"/></symbol>
 <symbol id="s-seal" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="15.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2.4 2.6"/><path d="M24 15l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" fill="currentColor"/></symbol>
</svg>
<div class="wrap">

<header class="hero">
  <h1><span class="who" data-peek="hello">${esc(p.name)}</span></h1>
  ${[p.latinName, p.location].filter(Boolean).length ? `<p class="latin">${[p.latinName, p.location].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
  ${p.role ? `<p class="role">${esc(p.role)}</p>` : ""}
  ${p.tagline ? `<p class="lede">${esc(p.tagline)}</p>` : ""}
  ${p.subtagline ? `<p class="sub">${esc(p.subtagline)}</p>` : ""}
  ${metaHTML ? `<p class="meta">${metaHTML}</p>` : ""}
  ${factsHTML}
</header>

<main>
${indexHTML}
${aboutHTML}
${expHTML}
${pressHTML}
${eduHTML}
${skillsHTML}
${contactHTML}
</main>

<footer>
  <span>© ${year} ${esc(p.name)}${p.latinName ? " · " + esc(p.latinName) : ""}</span>
  <span class="grow"></span>
  <span>Peek · text until touched · system fonts · zero requests</span>
</footer>

</div>
${peekHTML}
<script>
(function(){
var d=document;d.documentElement.className+=' js';
var peek=d.getElementById('peek'),index=d.getElementById('index');
var wide=window.matchMedia('(min-width:64em)');
var lastTouch=0,armed=null,cur=null,anchor=null,hideT=0,snapT=0;
function touchy(){return Date.now()-lastTouch<700}
d.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')lastTouch=Date.now()},true);

// Drawers: explicit expander + touch first-tap arms the row, second follows.
function setPanel(row,open){
 var pan=row.querySelector('.panel'),btn=row.querySelector('.more');
 if(!pan)return;
 pan.classList.toggle('open',open);
 row.classList.toggle('expanded',open);
 if(btn)btn.setAttribute('aria-expanded',open?'true':'false');
}
d.addEventListener('click',function(e){
 var btn=e.target.closest?e.target.closest('.more'):null;
 if(btn){
  var row=btn.closest('.row');
  var open=btn.getAttribute('aria-expanded')!=='true';
  setPanel(row,open);
  armed=open?row:(armed===row?null:armed);
  return;
 }
 var a=e.target.closest?e.target.closest('a.go'):null;
 if(a&&touchy()){
  var r2=a.closest('.row');
  if(armed!==r2&&!r2.classList.contains('expanded')){e.preventDefault();setPanel(r2,true);armed=r2}
 }
});

// Very tall screenshots (phone captures) crop to their top third under
// object-fit:cover — swap those plates to contained portrait framing.
function unCrop(im){
 if(im.naturalWidth&&im.naturalHeight>im.naturalWidth*1.4){
  var ph=im.parentNode;
  ph.classList.remove('m-cover');ph.classList.add('tall');
 }
}
[].forEach.call(d.querySelectorAll('.ph.m-cover img'),function(im){
 if(im.complete)unCrop(im);
 else im.addEventListener('load',function(){unCrop(im)});
});

// Peek layer: hover/focus floats the row's picture beside the column.
if(!peek)return;
function cardFor(k){return peek.querySelector('[data-card="'+k+'"]')}
function place(){
 if(!anchor)return true;
 var w=peek.offsetWidth,h=peek.offsetHeight,vw=innerWidth,vh=innerHeight;
 var r=anchor.getBoundingClientRect();
 var base=index?index.getBoundingClientRect().right:r.right;
 var gap=vw<1120?16:28;
 var x=base+gap,y=Math.round(r.top+r.height/2-h/2);
 if(x+w>vw-16){
  var below=r.bottom+14+h<=vh-12,above=r.top-14-h>=12;
  if(!below&&!above)return false;
  x=Math.min(vw-w-16,Math.max(16,Math.round(r.right-w)));
  y=below?Math.round(r.bottom+14):Math.round(r.top-14-h);
 }
 x=Math.max(16,Math.min(x,vw-w-16));
 y=Math.max(12,Math.min(y,vh-h-12));
 peek.style.transform='translate3d('+x+'px,'+y+'px,0)';
 return true;
}
function show(el){
 if(!wide.matches)return;
 var c=cardFor(el.getAttribute('data-peek'));
 if(!c)return;
 clearTimeout(hideT);
 var first=!peek.classList.contains('show');
 if(cur&&cur!==c){
  var old=cur;
  old.classList.add('out');old.classList.remove('on');
  setTimeout(function(){old.classList.remove('out')},220);
 }
 if(cur!==c){c.classList.remove('out');c.classList.add('on')}
 cur=c;anchor=el;
 if(first)peek.classList.add('snap');
 if(!place()){hide();return}
 peek.classList.add('show');
 if(first)requestAnimationFrame(function(){requestAnimationFrame(function(){peek.classList.remove('snap')})});
}
function hide(){clearTimeout(hideT);peek.classList.remove('show');anchor=null}
function delayHide(){clearTimeout(hideT);hideT=setTimeout(hide,120)}
d.addEventListener('pointerover',function(e){
 if(e.pointerType==='touch')return;
 var t=e.target.closest?e.target.closest('[data-peek]'):null;
 if(t)show(t);else delayHide();
});
d.addEventListener('focusin',function(e){
 var t=e.target.closest?e.target.closest('[data-peek]'):null;
 if(t){if(!touchy())show(t)}else hide();
});
addEventListener('scroll',function(){
 if(anchor&&peek.classList.contains('show')){
  peek.classList.add('snap');place();
  clearTimeout(snapT);snapT=setTimeout(function(){peek.classList.remove('snap')},90);
 }
},{passive:true});
addEventListener('resize',function(){hide()});
if(wide.addEventListener)wide.addEventListener('change',function(){if(!wide.matches)hide()});
d.addEventListener('keydown',function(e){
 if(e.key==='Escape'){
  // First Escape closes the focused row's open drawer, second hides the peek.
  var ax=d.activeElement,ar=ax&&ax.closest?ax.closest('.row'):null;
  if(ar&&ar.classList.contains('expanded')){
   setPanel(ar,false);
   if(armed===ar)armed=null;
   var mb=ar.querySelector('.more');
   if(mb)mb.focus();
   return;
  }
  hide();return;
 }
 if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
 var ae=d.activeElement;
 if(!ae||!ae.closest)return;
 var rows=[].slice.call(d.querySelectorAll('#index .row'));
 if(!rows.length)return;
 var row=ae.closest('.row'),i;
 if(row){i=rows.indexOf(row)+(e.key==='ArrowDown'?1:-1)}
 else return;
 if(i<0||i>=rows.length)return;
 e.preventDefault();
 var f=rows[i].querySelector('a.go,button.more');
 if(f){f.focus();show(rows[i])}
});
})();
</script>
</body>
</html>`;
}
