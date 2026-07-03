// Compact theme: one-screen density. The whole site as a precise, instantly
// scannable index — identity block, seven dense work rows, one inverted patent
// bar, a colophon. No rule-lines anywhere: hierarchy comes from weight, size,
// and spacing only. Fixed column grid + tabular numerals carry the alignment.
// Rows expand in place via native <details name> (exclusive accordion, no JS
// required); a tiny script keeps row links from toggling the row. Palette:
// pale iris field, everything on hue 285, one deep-iris block. Status, patent
// ids, and the colophon sit in ui-monospace to sharpen the ledger read. No
// entrance motion at all — the page should feel loaded before the click
// finishes.
import { esc, md, realLinks } from "../util.js";

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

  // IDENTITY BLOCK ---------------------------------------------------------
  const net = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="mid">·</span>');

  const reachHTML =
    `<div class="reach">` +
    (p.email ? `<a class="mail" href="${emailHref}">${esc(p.email)}</a>` : "") +
    (net ? `<p class="net">${net}</p>` : "") +
    (p.location ? `<p class="loc">${esc(p.location)}</p>` : "") +
    (p.available
      ? `<p class="avail"><span class="pip" aria-hidden="true"></span>${esc(p.available)}</p>`
      : "") +
    `</div>`;

  // WORK ROWS --------------------------------------------------------------
  const rowsHTML = items
    .map((it) => {
      const hot = /live|production/i.test(it.status || "");
      const statusHTML =
        `<span class="c-status${hot ? " hot" : ""}">` +
        [it.status ? esc(it.status) : "", it.year ? `<span class="yr">${esc(it.year)}</span>` : ""]
          .filter(Boolean)
          .join(" ") +
        `</span>`;

      const links = realLinks(it.links);
      const linkHTML = links
        .map(
          (l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`
        )
        .join("");
      const tags = (it.tags || []).map(esc).join(" · ");

      // Expanded state only: small image if present, never a broken <img>.
      let shot = "";
      if (it.image) {
        const mode =
          it.imageMode === "icon" ? " icon" : it.imageMode === "contain" ? " contain" : "";
        shot =
          `<span class="shot${mode}"><img src="${esc(it.image)}" ` +
          `alt="${esc(it.title)} preview" loading="lazy" decoding="async"></span>`;
      }

      const more =
        `<div class="more"><div class="moretext">` +
        (it.detail ? `<div class="detail">${md(it.detail)}</div>` : "") +
        (tags ? `<p class="tags">${tags}</p>` : "") +
        (!links.length ? `<p class="nolink">No public link yet</p>` : "") +
        `</div>${shot}</div>`;

      return (
        `<details class="row" name="idx"><summary>` +
        `<span class="c-title">${esc(it.title)}</span>` +
        statusHTML +
        `<span class="c-desc">${esc(it.description || "")}</span>` +
        `<span class="c-links">${linkHTML}<span class="tgl" aria-hidden="true"></span></span>` +
        `</summary>${more}</details>`
      );
    })
    .join("");

  // PATENT — one distinguished (inverted) row ------------------------------
  let patentHTML = "";
  if (patent) {
    const meta = [...(patent.ids || []), patent.year].filter(Boolean).map(esc).join(" · ");
    const highlights = (patent.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("");
    patentHTML =
      `<details class="row patent" name="idx"><summary>` +
      `<span class="p-kicker">Patent</span>` +
      `<span class="p-title">${esc(patent.title)}</span>` +
      (meta ? `<span class="p-ids">${meta}</span>` : "") +
      `<span class="tgl" aria-hidden="true"></span>` +
      `</summary><div class="pmore">` +
      (patent.role ? `<p class="p-role">${esc(patent.role)}</p>` : "") +
      (patent.blurb ? `<p class="p-blurb">${esc(patent.blurb)}</p>` : "") +
      (highlights ? `<ul class="p-high">${highlights}</ul>` : "") +
      `</div></details>`;
  }

  // OPTIONAL SECTIONS (all empty today; render nothing when empty) ---------
  const statsHTML = stats.length
    ? `<p class="stats">${stats
        .map((s) => `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>`)
        .join("")}</p>`
    : "";

  let aboutHTML = "";
  {
    const paras = about.paragraphs || [];
    const prins = about.principles || [];
    if (about.short || paras.length || prins.length) {
      aboutHTML =
        `<section class="opt"><h2 class="lbl">About</h2>` +
        (about.short ? `<p class="optline">${esc(about.short)}</p>` : "") +
        paras.map((t) => `<p class="optline">${esc(t)}</p>`).join("") +
        (prins.length
          ? `<p class="optline">${prins
              .map((pr) => `<b>${esc(pr.title)}.</b> ${esc(pr.body)}`)
              .join(" ")}</p>`
          : "") +
        `</section>`;
    }
  }

  const lrow = (a, b, c) =>
    `<div class="lrow"><span class="l-title">${a}</span>` +
    `<span class="l-when">${b}</span><span class="l-desc">${c}</span></div>`;
  const listSection = (label, rows) =>
    rows.length
      ? `<section class="opt"><h2 class="lbl">${esc(label)}</h2>${rows.join("")}</section>`
      : "";

  const expHTML = listSection(
    "Experience",
    experience.map((e) =>
      lrow(
        esc(e.org || ""),
        esc(e.period || ""),
        [e.role, ...(e.points || [])].filter(Boolean).map(esc).join(" · ")
      )
    )
  );
  const pressHTML = listSection(
    "Community",
    press.map((e) =>
      lrow(
        esc(e.org || ""),
        esc(e.period || ""),
        [e.role, e.metric, ...(e.points || [])].filter(Boolean).map(esc).join(" · ")
      )
    )
  );
  const eduHTML = listSection(
    "Education",
    education.map((e) =>
      lrow(
        esc(e.school || ""),
        esc(e.period || ""),
        [e.program, e.note].filter(Boolean).map(esc).join(" · ")
      )
    )
  );
  const skillsHTML = listSection(
    "Skills",
    skills.map((g) =>
      lrow(esc(g.group || ""), "", (g.items || []).filter(Boolean).map(esc).join(" · "))
    )
  );

  const title = [p.name, p.role].filter(Boolean).map(esc).join(" — ");
  const desc = esc(p.subtagline || about.short || "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#efeef8">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232b2749'/%3E%3Ctext x='16' y='22' font-family='-apple-system,Segoe UI,Roboto,sans-serif' font-size='18' font-weight='600' fill='%23efeef8' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E">
<style>
:root{
--bg:oklch(95.6% 0.017 285);
--bg-2:oklch(92.2% 0.027 285);
--ink:oklch(23% 0.037 285);
--ink-2:oklch(37% 0.05 285);
--ink-3:oklch(46.5% 0.055 285);
--acc:oklch(42% 0.17 282);
--block:oklch(25% 0.05 285);
--block-2:oklch(30.5% 0.055 285);
--bink:oklch(95.5% 0.014 285);
--bink-2:oklch(81% 0.035 285);
--well:oklch(97.6% 0.008 285);
--focus:oklch(45% 0.19 282);
--t-sm:.8125rem;--t-md:.9375rem;--t-lg:1.25rem;
--mono:ui-monospace,"Cascadia Mono","Segoe UI Mono",Consolas,Menlo,monospace;
--c1:13.5rem;--c2:8rem;--gapx:1.35rem;--pad:.75rem;
--out:cubic-bezier(.22,1,.36,1)}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);
font:var(--t-md)/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,system-ui,sans-serif;
font-feature-settings:"kern" 1,"liga" 1;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.page{max-width:72rem;margin:0 auto;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;
padding:clamp(1.2rem,3.5vh,2.2rem) clamp(1.1rem,3.2vw,2.6rem) 1.1rem}
main{flex:1 0 auto}
p{margin:0}
img{max-width:100%;height:auto}
a{color:var(--acc);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.18em;
text-decoration-color:color-mix(in oklab,var(--acc) 40%,transparent);transition:text-decoration-color .12s var(--out)}
a:hover{text-decoration-color:var(--acc)}
a:focus-visible,summary:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:6px}
.vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.skip{position:absolute;left:-999px;top:0}
.skip:focus{left:.5rem;top:.5rem;z-index:9;background:var(--ink);color:var(--bg);padding:.45rem .8rem;border-radius:6px;text-decoration:none}
/* identity block */
.id{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem 2.6rem;align-items:start;margin-bottom:clamp(1rem,2.8vh,1.9rem)}
h1{margin:0;font-size:clamp(2rem,1.1rem + 2.6vw,3.1rem);font-weight:700;letter-spacing:-.035em;line-height:1.04;text-wrap:balance}
h1 .latin{font-size:var(--t-md);font-weight:400;letter-spacing:.01em;color:var(--ink-3);margin-left:.55rem;white-space:nowrap}
.role{margin-top:.5rem;font-size:var(--t-md);font-weight:600;color:var(--ink-2)}
.tag{margin-top:.7rem;font-size:var(--t-lg);font-weight:600;letter-spacing:-.02em;line-height:1.25;max-width:38ch;text-wrap:balance}
.sub{margin-top:.4rem;font-size:var(--t-sm);color:var(--ink-3);max-width:62ch}
.reach{display:flex;flex-direction:column;align-items:flex-end;gap:.3rem;padding-top:.55rem;font-size:var(--t-sm);text-align:right}
.reach .mail{font-weight:600}
.reach .net a{font-weight:500}
.reach .mid{padding:0 .5rem;color:var(--ink-3)}
.reach .loc{color:var(--ink-3)}
.avail{display:flex;align-items:center;gap:.45rem;color:var(--ink-2);font-weight:500}
.pip{width:.5rem;height:.5rem;border-radius:50%;background:var(--acc);flex:0 0 auto}
/* stats (inline, all one size — never a hero-metric block) */
.stats{display:flex;flex-wrap:wrap;gap:.3rem 1.7rem;font-size:var(--t-sm);color:var(--ink-2);margin-bottom:1rem}
.stats b{color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums}
/* the index */
.index{margin:0 calc(-1*var(--pad))}
.cols{display:grid;grid-template-columns:var(--c1) var(--c2) minmax(0,1fr) auto;gap:0 var(--gapx);
padding:.1rem var(--pad) .45rem;font-size:var(--t-sm);font-weight:600;color:var(--ink-3)}
.cols .hint{justify-self:end;font-weight:400}
.row{border-radius:10px}
.row summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:var(--c1) var(--c2) minmax(0,1fr) auto;
gap:0 var(--gapx);align-items:baseline;padding:.52rem var(--pad);border-radius:10px;transition:background-color .12s var(--out)}
.row summary::-webkit-details-marker{display:none}
.row summary:hover{background:var(--bg-2)}
.row[open]{background:var(--bg-2)}
.c-title{font-weight:600;letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c-status{font-family:var(--mono);font-size:var(--t-sm);color:var(--ink-3);white-space:nowrap;font-variant-numeric:tabular-nums}
.c-status.hot{color:var(--ink);font-weight:600}
.c-status .yr{color:var(--ink-3);font-weight:400;margin-left:.5rem}
.c-desc{font-size:var(--t-sm);color:var(--ink-2);min-width:0;overflow:hidden;
display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.4}
.row[open] .c-title,.row[open] .c-desc{white-space:normal;overflow:visible;text-overflow:clip}
.row[open] .c-desc{display:block;-webkit-line-clamp:none}
.c-links{justify-self:end;display:flex;align-items:baseline;gap:.85rem;font-size:var(--t-sm);white-space:nowrap}
.c-links a{font-weight:600}
.tgl{width:1rem;text-align:center;color:var(--ink-3)}
.tgl::after{content:"+"}
.row[open] .tgl::after{content:"\\2212"}
/* expanded state — indented to the summary column */
.more{display:flex;gap:1.6rem;align-items:flex-start;
padding:.15rem var(--pad) 1rem calc(var(--pad) + var(--c1) + var(--c2) + 2*var(--gapx))}
.moretext{min-width:0}
.detail{font-size:var(--t-sm);color:var(--ink-2);line-height:1.55;max-width:66ch}
.detail p{margin:0}
.detail p+p{margin-top:.45rem}
.tags{margin-top:.55rem;font-size:var(--t-sm);color:var(--ink-3);font-weight:500}
.nolink{margin-top:.5rem;font-size:var(--t-sm);color:var(--ink-3);font-style:italic}
.shot{flex:0 0 auto;border-radius:9px;overflow:hidden;background:var(--well)}
.shot img{display:block;width:10rem;height:6.25rem;object-fit:cover}
.shot.contain img{object-fit:contain;padding:.4rem}
.shot.icon{border-radius:12px}
.shot.icon img{width:3.5rem;height:3.5rem;object-fit:contain;padding:.5rem}
/* patent — the one inverted row */
.patent{margin-top:.7rem;background:var(--block);color:var(--bink)}
.patent summary{grid-template-columns:auto minmax(0,1fr) auto auto;gap:0 1.15rem;padding:.62rem var(--pad)}
.patent summary:hover{background:var(--block-2)}
.patent[open]{background:var(--block)}
.patent summary:focus-visible{outline-color:var(--bink)}
.p-kicker{font-weight:700;font-size:var(--t-sm)}
.p-title{font-weight:600;letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.patent[open] .p-title{white-space:normal;overflow:visible;text-overflow:clip}
.p-ids{font-family:var(--mono);font-size:var(--t-sm);color:var(--bink-2);white-space:nowrap;font-variant-numeric:tabular-nums}
.patent .tgl{color:var(--bink-2)}
.pmore{padding:.1rem var(--pad) 1.05rem}
.p-role{font-size:var(--t-sm);font-weight:600;color:var(--bink-2)}
.p-blurb{margin-top:.35rem;font-size:var(--t-sm);color:var(--bink);line-height:1.55;max-width:70ch}
.p-high{margin:.65rem 0 0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:.3rem 1.7rem}
.p-high li{position:relative;padding-left:.95rem;font-size:var(--t-sm);color:var(--bink-2);line-height:1.45}
.p-high li::before{content:"·";position:absolute;left:0;font-weight:700}
/* optional dense sections (empty today) */
.opt{margin-top:1.5rem}
.lbl{margin:0 0 .4rem;font-size:var(--t-md);font-weight:700;letter-spacing:-.01em}
.optline{font-size:var(--t-sm);color:var(--ink-2);max-width:70ch}
.optline+.optline{margin-top:.35rem}
.lrow{display:grid;grid-template-columns:var(--c1) var(--c2) minmax(0,1fr);gap:0 var(--gapx);padding:.38rem 0;font-size:var(--t-sm)}
.l-title{font-weight:600;color:var(--ink)}
.l-when{color:var(--ink-3);white-space:nowrap;font-variant-numeric:tabular-nums}
.l-desc{color:var(--ink-2)}
/* colophon */
footer{margin-top:auto;padding-top:1.3rem;display:flex;justify-content:space-between;align-items:baseline;
gap:.35rem 1.4rem;flex-wrap:wrap;font-family:var(--mono);font-size:var(--t-sm);color:var(--ink-3);font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (max-width:64rem){
.id{grid-template-columns:1fr}
.reach{align-items:flex-start;text-align:left;padding-top:.8rem}
.cols{display:none}
.row summary{grid-template-columns:minmax(0,1fr) auto;row-gap:.15rem;padding:.6rem var(--pad)}
.c-title{white-space:normal;overflow:visible;text-overflow:clip}
.c-status{grid-column:2;justify-self:end}
.c-desc{grid-column:1/-1;white-space:normal;overflow:visible;display:block;-webkit-line-clamp:none}
.c-links{grid-column:1/-1;justify-self:start;margin-top:.1rem}
.more{flex-direction:column;gap:.9rem;padding:.1rem var(--pad) 1rem}
.patent summary{grid-template-columns:auto minmax(0,1fr) auto}
.patent .tgl{grid-row:1;grid-column:3}
.p-title{white-space:normal;overflow:visible;text-overflow:clip}
.p-ids{grid-row:2;grid-column:1/-1;white-space:normal;margin-top:.1rem}
.p-high{grid-template-columns:1fr}
.lrow{grid-template-columns:1fr;gap:.05rem 0;padding:.5rem 0}
}
</style>
</head>
<body>
<a class="skip" href="#work">Skip to work</a>
<div class="page">

<header class="id">
  <div class="who">
    <h1>${esc(p.name)}${p.latinName ? `<span class="latin">${esc(p.latinName)}</span>` : ""}</h1>
    ${p.role ? `<p class="role">${esc(p.role)}</p>` : ""}
    ${p.tagline ? `<p class="tag">${esc(p.tagline)}</p>` : ""}
    ${p.subtagline ? `<p class="sub">${esc(p.subtagline)}</p>` : ""}
  </div>
  ${reachHTML}
</header>

<main id="work">
  ${statsHTML}
  ${aboutHTML}
  ${
    items.length || patentHTML
      ? `<section class="index" aria-labelledby="workh">
  <h2 class="vh" id="workh">Selected work: ${items.length} shipped${patent ? ", one patent" : ""}</h2>
  ${
    items.length
      ? `<div class="cols" aria-hidden="true"><span>Work · ${items.length} shipped</span><span>Status</span><span>Summary</span><span class="hint">click for detail</span></div>`
      : ""
  }
  ${rowsHTML}
  ${patentHTML}
</section>`
      : ""
  }
  ${expHTML}
  ${pressHTML}
  ${eduHTML}
  ${skillsHTML}
</main>

<footer>
  <p>© ${year} ${esc(p.name)}${p.latinName ? ` · ${esc(p.latinName)}` : ""}</p>
  <p>${items.length} works${patent ? " · 1 patent" : ""} · one screen · system fonts · zero external requests</p>
</footer>

</div>
<script>
(function () {
  // Row links live inside <summary>; open them without toggling the row.
  var links = document.querySelectorAll("summary a");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function (e) {
      // Modified clicks (new tab / new window) keep their native semantics.
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      window.open(this.href, "_blank", "noopener");
    });
  }
})();
</script>
</body>
</html>`;
}
