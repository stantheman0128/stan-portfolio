// Drenched theme: the page IS one deep garnet field. Near-white ink of the same
// hue, monumental type, text-led rows; icons sit as small framed plates,
// screenshots as wider contained plates (never cover — tall shots crop blank).
// One brass counterpoint, spent entirely on the patent's full-bleed band; the
// patent title (not the generic section labels) carries the biggest words
// after the name, and desktop lets the hero + patent band breathe at 62rem.
// Palette (verified AA+): field oklch(.30 .09 22) #521518 · deep oklch(.245 .082 22)
// #3f090d · ink oklch(.965 .01 25) #faf1f0 (12.7:1 on field) · brass oklch(.84 .128 85)
// #f1c460 (10.1:1 on the deep band). Secondary text = alpha of the ink, never gray.
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

  const heroMeta = [
    p.email ? `<a href="${emailHref}">${esc(p.email)}</a>` : "",
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" rel="noopener">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="dot" aria-hidden="true">·</span>');

  // Stats are empty today; if they return, keep them a quiet inline line —
  // never the big-number/small-label metric block.
  const statsHTML = stats.length
    ? `<p class="stats">` +
      stats.map((s) => `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>`).join('<span class="dot" aria-hidden="true">·</span>') +
      `</p>`
    : "";

  // WORK — text-led rows on the field; the image is a small framed plate.
  const workHTML = items
    .map((it) => {
      const stamp = [it.status, it.year].filter(Boolean).map(esc).join(" · ");
      const tags = (it.tags || []).map(esc).join(" · ");
      const links = realLinks(it.links);

      let plate;
      if (it.image) {
        // Icons get the small padded box. Everything else (contain OR the ""
        // default) renders contained in a wider plate — cover would center-crop
        // tall screenshots (e.g. a 1080x2412 phone shot) into a blank square.
        const mode = it.imageMode === "icon" ? "icon" : "shot";
        plate =
          `<span class="plate ${mode}"><img src="${esc(it.image)}" alt="${esc(it.title)} thumbnail" ` +
          `loading="lazy" decoding="async"></span>`;
      } else {
        // Typographic plate: initials carved from the title, never "undefined".
        const words = String(it.title || "").split(/\s+/).filter(Boolean);
        const glyph =
          words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : (words[0] || "•").slice(0, 2).toUpperCase();
        plate = `<span class="plate text" aria-hidden="true">${esc(glyph)}</span>`;
      }

      const foot =
        `<div class="foot">` +
        (tags ? `<span class="tags">${tags}</span>` : "") +
        (links.length
          ? `<span class="links">` +
            links
              .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
              .join("") +
            `</span>`
          : `<span class="nolink">No public link yet</span>`) +
        `</div>`;

      return (
        `<article class="item">` +
        `<div class="txt">` +
        `<div class="head"><h3>${esc(it.title)}</h3>` +
        (stamp ? `<span class="stamp">${stamp}</span>` : "") +
        `</div>` +
        (it.description ? `<p class="blurb">${esc(it.description)}</p>` : "") +
        (it.detail ? `<div class="detail">${md(it.detail)}</div>` : "") +
        foot +
        `</div>` +
        plate +
        `</article>`
      );
    })
    .join("");

  // PATENT — the full-bleed moment; the only place the brass accent appears.
  let patentHTML = "";
  if (patent) {
    const ids = (patent.ids || []).map(esc).join(" · ");
    const meta = [patent.year, patent.role].filter(Boolean).map(esc).join(" · ");
    const highlights = (patent.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("");
    patentHTML =
      `<section id="patent" class="patent"><div class="in">` +
      `<h2>Patent</h2>` +
      `<div class="cols"><div class="main">` +
      `<h3>${esc(patent.title)}</h3>` +
      (ids || meta
        ? `<p class="ids">` +
          (ids ? `<span class="gold">${ids}</span>` : "") +
          (ids && meta ? `<span class="dot" aria-hidden="true">·</span>` : "") +
          (meta ? `<span class="meta">${meta}</span>` : "") +
          `</p>`
        : "") +
      `</div><div class="side">` +
      (patent.blurb ? `<p class="blurb">${esc(patent.blurb)}</p>` : "") +
      (highlights ? `<ul class="hl">${highlights}</ul>` : "") +
      `</div></div>` +
      `</div></section>`;
  }

  // ABOUT (empty today — renders nothing).
  let aboutHTML = "";
  if ((about.paragraphs && about.paragraphs.length) || (about.principles && about.principles.length)) {
    const paras = (about.paragraphs || []).map((t) => `<p class="lead">${esc(t)}</p>`).join("");
    const principles = (about.principles || [])
      .map((pr) => `<div><dt>${esc(pr.title)}</dt><dd>${esc(pr.body)}</dd></div>`)
      .join("");
    aboutHTML =
      `<section id="about"><div class="in"><h2>About</h2>` +
      paras +
      (principles ? `<dl class="principles">${principles}</dl>` : "") +
      `</div></section>`;
  }

  // Shared entry renderer for experience / press / education (all empty today).
  const entry = ({ title, role, metric, when, points, note }) => {
    const roleHTML = role ? ` <span class="role">— ${esc(role)}</span>` : "";
    const metricHTML = metric ? ` <span class="metric">${esc(metric)}</span>` : "";
    const whenHTML = when ? `<span class="when">${esc(when)}</span>` : "";
    const list = (points || []).filter(Boolean);
    const listHTML = list.length ? `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const noteHTML = note ? `<p class="note">${esc(note)}</p>` : "";
    return (
      `<article class="entry"><div class="top"><h3>${esc(title)}${roleHTML}${metricHTML}</h3>${whenHTML}</div>` +
      listHTML +
      noteHTML +
      `</article>`
    );
  };
  const entriesSection = (id, label, list, map) =>
    list.length
      ? `<section id="${id}"><div class="in"><h2>${label}</h2><div class="entries">` +
        list.map(map).join("") +
        `</div></div></section>`
      : "";

  const experienceHTML = entriesSection("experience", "Experience", experience, (e) =>
    entry({ title: e.org, role: e.role, when: e.period, points: e.points })
  );
  const pressHTML = entriesSection("community", "Community &amp; Press", press, (e) =>
    entry({ title: e.org, role: e.role, metric: e.metric, when: e.period, points: e.points })
  );
  const educationHTML = entriesSection("education", "Education", education, (e) =>
    entry({ title: e.school, role: e.program, when: e.period, note: e.note })
  );

  const skillsHTML = skills.length
    ? `<section id="skills"><div class="in"><h2>Skills</h2>` +
      skills
        .map((g) => {
          const chips = (g.items || []).filter(Boolean).map((s) => `<span>${esc(s)}</span>`).join("");
          return `<div class="skillgroup"><h3>${esc(g.group)}</h3><div class="chips">${chips}</div></div>`;
        })
        .join("") +
      `</div></section>`
    : "";

  const contactLinks = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" rel="noopener">LinkedIn</a>` : "",
    p.email ? `<a href="${emailHref}">Email</a>` : "",
  ]
    .filter(Boolean)
    .join('<span class="dot" aria-hidden="true">·</span>');

  const contactHTML =
    `<section id="contact" class="contact"><div class="in"><h2>Contact</h2>` +
    `<p class="big">Building something? ` +
    (p.email ? `<a href="${emailHref}">${esc(p.email)}</a>` : `Let's talk.`) +
    `</p>` +
    (contactLinks ? `<p class="clinks">${contactLinks}</p>` : "") +
    (p.available ? `<p class="avail">${esc(p.available)}</p>` : "") +
    `</div></section>`;

  const title = [p.name, p.role].filter(Boolean).map(esc).join(" — ");
  const desc = esc(p.subtagline || about.short || "");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add("js")</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#521518">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23521518'/%3E%3Ctext x='16' y='22' font-family='-apple-system,Segoe UI,Roboto,sans-serif' font-size='18' font-weight='700' fill='%23faf1f0' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E">
<style>
:root{
  --field:#521518;--field:oklch(.3 .09 22);
  --deep:#3f090d;--deep:oklch(.245 .082 22);
  --ink:#faf1f0;--ink:oklch(.965 .01 25);
  --ink-2:rgba(250,241,240,.8);--ink-2:oklch(.965 .01 25/.8);
  --ink-3:rgba(250,241,240,.66);--ink-3:oklch(.965 .01 25/.66);
  --line:rgba(250,241,240,.18);--line:oklch(.965 .01 25/.18);
  --line-2:rgba(250,241,240,.34);--line-2:oklch(.965 .01 25/.34);
  --gold:#f1c460;--gold:oklch(.84 .128 85);
  --s-1:.92rem;--s0:1.0625rem;
  --s1:clamp(1.25rem,1.08rem + .8vw,1.5rem);
  --s2:clamp(1.65rem,1.3rem + 1.9vw,2.35rem);
  --s3:clamp(2.1rem,1.5rem + 3.2vw,3.3rem);
  --s4:clamp(2.7rem,1.4rem + 7.2vw,6rem);
  --gap:clamp(3rem,8vw,5.5rem);
}
*{box-sizing:border-box}
html{font-size:100%;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--field);color:var(--ink);
  font:var(--s0)/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI",Roboto,Helvetica,Arial,system-ui,sans-serif;
  font-feature-settings:"kern" 1,"liga" 1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
::selection{background:var(--ink);color:var(--field)}
.in{max-width:46rem;margin-inline:auto;padding-inline:clamp(1.25rem,5vw,2.5rem)}
h1,h2,h3{margin:0;line-height:1.05;text-wrap:balance}
p{margin:0}
img{max-width:100%;height:auto}
a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--line-2);text-decoration-thickness:1px;text-underline-offset:.22em}
a:hover{text-decoration-color:var(--ink)}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px;border-radius:2px}
.skip{position:absolute;left:-999px;top:0}
.skip:focus{left:.6rem;top:.6rem;z-index:9;background:var(--ink);color:var(--field);padding:.5rem .85rem;border-radius:3px;text-decoration:none}
.dot{padding:0 .55em;color:var(--ink-3);text-decoration:none}

/* HERO — the type carries it. */
.hero{padding-top:clamp(4rem,11vw,7.5rem)}
.hero h1{font-size:var(--s4);font-weight:800;letter-spacing:-.035em;line-height:.98}
.hero .latin{margin-top:.9rem;font-size:var(--s-1);color:var(--ink-3);letter-spacing:.04em}
.hero .tagline{margin-top:clamp(1.4rem,4vw,2.2rem);font-size:var(--s2);font-weight:750;letter-spacing:-.028em;line-height:1.12;max-width:22ch}
.hero .sub{margin-top:1.1rem;color:var(--ink-2);max-width:58ch}
.hero .meta{margin-top:clamp(1.4rem,4vw,2rem);font-size:var(--s-1);color:var(--ink-3)}
.stats{margin-top:1.2rem;font-size:var(--s-1);color:var(--ink-2)}
.stats b{font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}

section{margin-top:var(--gap)}
/* Generic labels sit one tier below the content they introduce — the biggest
   words on the page stay the meaningful ones (the name, the patent title). */
h2{font-size:var(--s2);font-weight:800;letter-spacing:-.028em}
.secnote{margin-top:.4rem;font-size:var(--s-1);color:var(--ink-3)}

/* WORK — text-led rows, hairline-separated; plates small and framed. */
.work{margin-top:clamp(1.4rem,4vw,2rem);border-top:1px solid var(--line)}
.item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem clamp(1rem,3.5vw,1.8rem);
  padding-block:clamp(1.6rem,4.5vw,2.4rem);border-bottom:1px solid var(--line);align-items:start}
.item .txt{min-width:0}
.item .head{display:flex;align-items:baseline;gap:.35rem .75rem;flex-wrap:wrap}
.item h3{font-size:var(--s1);font-weight:750;letter-spacing:-.018em;line-height:1.15}
.item .stamp{font-size:var(--s-1);color:var(--ink-3);white-space:nowrap;font-variant-numeric:tabular-nums}
.item .blurb{margin-top:.45rem;color:var(--ink-2);max-width:62ch}
.item .detail{margin-top:.45rem;font-size:var(--s-1);color:var(--ink-3);max-width:62ch;overflow-wrap:anywhere}
.item .detail p{margin:0}
.item .detail p+p{margin-top:.45rem}
.item .detail a{color:var(--ink-2)}
.item .foot{margin-top:.7rem;font-size:var(--s-1);display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem 1rem}
.item .tags{color:var(--ink-3);letter-spacing:.01em}
.item .links{display:flex;flex-wrap:wrap;gap:1rem}
.item .links a{font-weight:600}
.item .nolink{color:var(--ink-3);font-style:italic}
.plate{flex:none;overflow:hidden;border-radius:2px;border:1px solid var(--line-2);
  background:var(--ink);display:flex;align-items:center;justify-content:center}
.plate.icon,.plate.text{width:clamp(4.25rem,11vw,5.5rem);aspect-ratio:1}
.plate.icon img{width:100%;height:100%;object-fit:contain;padding:12%;box-sizing:border-box;display:block}
.plate.shot{width:clamp(5.5rem,16vw,8rem);min-height:3.5rem}
.plate.shot img{width:100%;height:auto;max-height:13rem;object-fit:contain;display:block}
.plate.text{background:var(--deep);color:var(--ink);border-color:var(--line-2);
  font-size:var(--s1);font-weight:800;letter-spacing:-.02em}

/* PATENT — the full-bleed band; the brass counterpoint lives here and only here. */
.patent{background:var(--deep);border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  padding-block:clamp(2.6rem,7vw,4.5rem)}
.patent .cols{margin-top:clamp(1.2rem,3.5vw,1.8rem)}
.patent h3{font-size:var(--s3);font-weight:800;letter-spacing:-.03em;line-height:1.05;max-width:18ch}
.patent .ids{margin-top:.9rem;font-size:var(--s-1);font-variant-numeric:tabular-nums;letter-spacing:.02em}
.patent .gold{color:var(--gold);font-weight:650}
.patent .meta{color:var(--ink-3)}
.patent .blurb{margin-top:1rem;color:var(--ink-2);max-width:62ch}
.patent .hl{margin:1.3rem 0 0;padding:0;list-style:none}
.patent .hl li{position:relative;padding-left:1.25rem;margin-top:.55rem;max-width:62ch}
.patent .hl li::before{content:"";position:absolute;left:0;top:.66em;width:.42rem;height:.42rem;background:var(--gold)}

/* Conditional sections (empty today) stay quiet if they return. */
.lead{margin-top:1rem;color:var(--ink-2);max-width:62ch}
.principles{margin:1.4rem 0 0;border-top:1px solid var(--line)}
.principles div{padding:.9rem 0;border-bottom:1px solid var(--line)}
.principles dt{font-weight:700}
.principles dd{margin:.2rem 0 0;font-size:var(--s-1);color:var(--ink-2)}
.entries{margin-top:1.2rem;border-top:1px solid var(--line)}
.entry{padding-block:1.3rem;border-bottom:1px solid var(--line)}
.entry .top{display:flex;align-items:baseline;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
.entry h3{font-size:var(--s0);font-weight:700}
.entry .role{color:var(--ink-2);font-size:var(--s-1);font-weight:400}
.entry .metric{font-size:var(--s-1);color:var(--ink-3);font-weight:400}
.entry .when{color:var(--ink-3);font-size:var(--s-1);white-space:nowrap;font-variant-numeric:tabular-nums}
.entry ul{margin:.5rem 0 0;padding-left:1.1rem}
.entry li{margin-top:.3rem;color:var(--ink-2);font-size:var(--s-1);max-width:62ch}
.entry .note{margin-top:.3rem;color:var(--ink-2);font-size:var(--s-1);max-width:62ch}
.skillgroup{margin-top:1.3rem}
.skillgroup h3{font-size:var(--s0);font-weight:700}
.chips{margin-top:.55rem;display:flex;flex-wrap:wrap;gap:.45rem}
.chips span{font-size:var(--s-1);color:var(--ink-2);border:1px solid var(--line);border-radius:99px;padding:.14rem .65rem}

/* CONTACT + FOOTER */
.contact .big{margin-top:clamp(1.2rem,3.5vw,1.8rem);font-size:var(--s2);font-weight:750;letter-spacing:-.026em;line-height:1.15;max-width:22ch;overflow-wrap:anywhere}
.contact .clinks{margin-top:1.1rem;color:var(--ink-2)}
.contact .avail{margin-top:.9rem;font-size:var(--s-1);color:var(--ink-3);display:flex;align-items:center;gap:.55rem}
.contact .avail::before{content:"";width:.5rem;height:.5rem;border-radius:50%;border:1px solid var(--ink-2);flex:none}
footer{margin-top:var(--gap);border-top:1px solid var(--line);padding-block:1.4rem 2.2rem;
  font-size:var(--s-1);color:var(--ink-3)}
footer .in{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;align-items:baseline}
footer .grow{flex:1}

/* ONE page-load type reveal. Content is fully visible without JS or with
   reduced motion; the animation only ever enhances. */
@media (prefers-reduced-motion:no-preference){
  html.js .rv{animation:rise .9s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*95ms)}
  @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

@media (max-width:30rem){
  .entry .top{flex-direction:column;gap:.1rem}
}

/* DESKTOP — the hero and the patent band exploit the full measure; the work
   column stays at reading width, so the page is not the mobile layout enlarged. */
@media (min-width:64rem){
  .hero .in,.patent .in{max-width:62rem}
  .hero h1{font-size:7rem}
  .patent .cols{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(2.5rem,5vw,4rem)}
  .patent .side .blurb{margin-top:.35rem}
}
</style>
</head>
<body>
<a class="skip" href="#work">Skip to work</a>

<header class="hero">
  <div class="in">
    <h1 class="rv" style="--i:0">${esc(p.name)}</h1>
    ${[p.latinName, p.location, p.role].filter(Boolean).length ? `<p class="latin rv" style="--i:1">${[p.latinName, p.location, p.role].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
    ${p.tagline ? `<p class="tagline rv" style="--i:2">${esc(p.tagline)}</p>` : ""}
    ${p.subtagline ? `<p class="sub rv" style="--i:3">${esc(p.subtagline)}</p>` : ""}
    ${statsHTML}
    ${heroMeta ? `<p class="meta rv" style="--i:4">${heroMeta}</p>` : ""}
  </div>
</header>

<main>

  ${items.length ? `<section id="work"><div class="in"><h2>Work</h2><p class="secnote">${items.length} project${items.length === 1 ? "" : "s"}</p><div class="work">${workHTML}</div></div></section>` : ""}

  ${patentHTML}

  ${aboutHTML}

  ${experienceHTML}

  ${pressHTML}

  ${educationHTML}

  ${skillsHTML}

  ${contactHTML}

</main>

<footer>
  <div class="in">
    <span>© ${year} ${esc(p.name)}${p.latinName ? " · " + esc(p.latinName) : ""}</span>
    <span class="grow"></span>
    ${p.location ? `<span>${esc(p.location)}</span>` : ""}
  </div>
</footer>

</body>
</html>`;
}
