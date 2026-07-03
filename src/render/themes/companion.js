// Companion theme — a living element. One hand-drawn robot (pure inline SVG)
// watches the visitor: its eye follows the cursor, it peeks at whatever work
// row you hover or Tab to, and it celebrates whenever Contact is in view —
// hover, keyboard, touch, or plain scroll-and-read all reach the payoff
// (IntersectionObserver base mood; explicit hover/focus targets sit on top).
// Keyboard focus drives the gaze exactly like hover; on touch the gaze
// follows scroll (nearest row to the viewport middle) and the robot docks
// bottom-right — easing in, not snapping — once the header scrolls away.
// Reduced motion: the robot goes still but still repositions its gaze
// discretely. On wide screens the sticky rail under the robot carries the
// site nav (sections + GitHub/LinkedIn/Email), so the column earns its keep.
// Everything else stays kafagoz-quiet: title-as-link straight to the live
// thing, one gray line, a native <details> expander. Palette: cobalt on cool
// paper (OKLCH); the only warm note in the whole page is the robot's
// celebration.
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

  // Generic section shell — every section is a gaze target for the robot.
  const sect = (id, label, inner, look = "peek", extra = "") =>
    inner
      ? `<section id="${id}" data-look="${look}" aria-labelledby="${id}-h">` +
        `<h2 class="hd" id="${id}-h">${label}${extra}</h2>${inner}</section>`
      : "";

  // WORK ROWS ---------------------------------------------------------------
  // Title links straight OUT to the live thing when one exists (first
  // non-GitHub link), otherwise GitHub. Detail/tags/image/all links live in
  // an unobtrusive native expander so the list stays a five-second read.
  const rowHTML = (it) => {
    const links = realLinks(it.links);
    const primary =
      links.find((l) => !/github\.com/i.test(String(l.href))) || links[0] || null;
    const meta = [it.status, it.year].filter(Boolean).map(esc).join(" · ");

    const title = primary
      ? `<a class="t" href="${esc(primary.href)}" target="_blank" rel="noopener">` +
        `${esc(it.title)}<span class="arr" aria-hidden="true">&#8599;</span></a>`
      : `<span class="t plain">${esc(it.title)}</span>`;

    // Preview inside the expander: real image (respecting imageMode) or a
    // designed typographic tile — never a broken <img>.
    let shot;
    if (it.image) {
      const cls =
        it.imageMode === "icon" ? "shot icon" : it.imageMode === "contain" ? "shot contain" : "shot";
      shot =
        `<span class="${cls}"><img src="${esc(it.image)}" alt="${esc(it.title)} preview" ` +
        `loading="lazy" decoding="async"></span>`;
    } else {
      const words = String(it.title || "").split(/\s+/).filter(Boolean);
      const glyph =
        words.length >= 2
          ? (words[0][0] + words[1][0]).toUpperCase()
          : (words[0] || "•").slice(0, 2).toUpperCase();
      shot = `<span class="shot tile" aria-hidden="true">${esc(glyph)}</span>`;
    }

    const tags = (it.tags || []).map(esc).join(" · ");
    const lnk = links.length
      ? `<p class="lnk">` +
        links
          .map(
            (l) =>
              `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}` +
              `<span class="arr" aria-hidden="true">&#8599;</span></a>`
          )
          .join("") +
        `</p>`
      : `<p class="nolink">No public link yet</p>`;

    const hasBody = it.detail || tags || links.length || it.image;
    const more = hasBody
      ? `<details class="more"><summary>More</summary><div class="body">${shot}` +
        `<div class="info">${md(it.detail)}` +
        (tags ? `<p class="tags">${tags}</p>` : "") +
        lnk +
        `</div></div></details>`
      : "";

    return (
      `<li class="row" data-look="peek">` +
      `<div class="line">${title}${meta ? `<span class="meta">${meta}</span>` : ""}</div>` +
      (it.description ? `<p class="d">${esc(it.description)}</p>` : "") +
      more +
      `</li>`
    );
  };

  const workHTML = items.length
    ? sect(
        "work",
        "Work",
        `<ul class="list" role="list">${items.map(rowHTML).join("")}</ul>`,
        "peek",
        `<span class="n"> · ${items.length} shipped</span>`
      )
    : "";

  // PATENT ------------------------------------------------------------------
  let patentHTML = "";
  if (patent && patent.title) {
    const stamp = [
      (patent.ids || []).map(esc).join(" · "),
      [patent.year, patent.role].filter(Boolean).map(esc).join(" · "),
    ]
      .filter(Boolean)
      .join(" · ");
    const hl = (patent.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("");
    patentHTML = sect(
      "patent",
      "Patent",
      `<div class="pat"><p class="pt">${esc(patent.title)}</p>` +
        (stamp ? `<p class="stamp">${stamp}</p>` : "") +
        (patent.blurb ? `<p class="d">${esc(patent.blurb)}</p>` : "") +
        (hl ? `<ul class="hl">${hl}</ul>` : "") +
        `</div>`
    );
  }

  // CONDITIONAL SECTIONS (all empty today — render nothing) ------------------
  const glanceHTML = stats.length
    ? `<section aria-label="At a glance" data-look="peek"><p class="glance">` +
      stats
        .map((s) => `<span><b>${esc(s.value)}</b> ${esc(s.label)}</span>`)
        .join(`<span class="sep" aria-hidden="true">·</span>`) +
      `</p></section>`
    : "";

  let aboutHTML = "";
  if ((about.paragraphs && about.paragraphs.length) || (about.principles && about.principles.length)) {
    const paras = (about.paragraphs || []).map((t) => `<p class="d para">${esc(t)}</p>`).join("");
    const prin = (about.principles || [])
      .map((pr) => `<div><dt>${esc(pr.title)}</dt><dd>${esc(pr.body)}</dd></div>`)
      .join("");
    aboutHTML = sect("about", "About", paras + (prin ? `<dl class="prin">${prin}</dl>` : ""));
  }

  const entry = (title, role, when, points, note) => {
    const pts = (points || []).filter(Boolean);
    return (
      `<li class="entry"><p class="line"><strong>${esc(title)}</strong>` +
      (role ? `<span class="meta">${esc(role)}</span>` : "") +
      (when ? `<span class="meta">· ${esc(when)}</span>` : "") +
      `</p>` +
      (pts.length ? `<ul class="hl">${pts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "") +
      (note ? `<p class="d">${esc(note)}</p>` : "") +
      `</li>`
    );
  };
  const experienceHTML = experience.length
    ? sect("experience", "Experience",
        `<ul class="list plainlist" role="list">${experience.map((e) => entry(e.org, e.role, e.period, e.points)).join("")}</ul>`)
    : "";
  const pressHTML = press.length
    ? sect("press", "Community &amp; Press",
        `<ul class="list plainlist" role="list">${press.map((e) => entry(e.org, e.role, e.period, e.points)).join("")}</ul>`)
    : "";
  const educationHTML = education.length
    ? sect("education", "Education",
        `<ul class="list plainlist" role="list">${education.map((e) => entry(e.school, e.program, e.period, null, e.note)).join("")}</ul>`)
    : "";
  const skillsHTML = skills.length
    ? sect("skills", "Skills",
        skills
          .map(
            (g) =>
              `<p class="skl"><strong>${esc(g.group)}</strong> ` +
              (g.items || []).filter(Boolean).map(esc).join(" · ") +
              `</p>`
          )
          .join(""))
    : "";

  // CONTACT — the robot celebrates here. ------------------------------------
  const soc = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub<span class="arr" aria-hidden="true">&#8599;</span></a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn<span class="arr" aria-hidden="true">&#8599;</span></a>` : "",
  ].filter(Boolean).join("");
  const availBits = [p.available, p.location].filter(Boolean).map(esc).join(" · ");
  const contactHTML = sect(
    "contact",
    "Contact",
    (p.email ? `<p class="say"><a href="${emailHref}">${esc(p.email)}</a></p>` : "") +
      (soc ? `<p class="soc">${soc}</p>` : "") +
      (availBits ? `<p class="avail">${availBits}</p>` : ""),
    "yay"
  );

  // HERO meta row ------------------------------------------------------------
  const hmeta = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
    p.email ? `<a href="${emailHref}">Email</a>` : "",
  ].filter(Boolean).join(`<span class="sep" aria-hidden="true">·</span>`);

  // RAIL NAV — on wide screens the sticky rail under the robot carries the
  // section links + the hmeta contact links (the hero hmeta hides there via
  // CSS, so nothing is duplicated). Below 60rem the rail nav is display:none
  // and the hero hmeta does the job. Nav links are gaze targets too.
  const railSect = [
    workHTML ? `<a href="#work" data-look="peek">Work</a>` : "",
    patentHTML ? `<a href="#patent" data-look="peek">Patent</a>` : "",
    contactHTML ? `<a href="#contact" data-look="yay">Contact</a>` : "",
  ].filter(Boolean).join("");
  const railSoc = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
    p.email ? `<a href="${emailHref}">Email</a>` : "",
  ].filter(Boolean).join("");
  const railNav =
    railSect || railSoc
      ? `<nav class="railnav" aria-label="Site">${railSect}` +
        (railSect && railSoc ? `<span class="rns" aria-hidden="true"></span>` : "") +
        `${railSoc}</nav>`
      : "";

  const title = [p.name, p.role].filter(Boolean).map(esc).join(" — ");
  const desc = esc(p.subtagline || p.tagline || "");

  // The companion. One robot head: antenna + LED, one big lens-eye (pupil is
  // JS-steered), eyelid for blinks, mouth, blush + happy-arc for celebration.
  // Wrapped in a real link (#contact) so it is keyboard-operable and useful
  // even without JS; the SVG itself is decorative.
  const companionSVG = `<svg id="cmp" viewBox="0 0 120 106" aria-hidden="true" focusable="false">
<g id="tilt">
  <line class="ant" x1="60" y1="31" x2="60" y2="15"/>
  <circle class="ping" cx="60" cy="12" r="5"/>
  <circle class="led" cx="60" cy="12" r="4.5"/>
  <rect class="ear" x="12" y="57" width="9" height="18" rx="4.5"/>
  <rect class="ear" x="99" y="57" width="9" height="18" rx="4.5"/>
  <rect class="head" x="21" y="32" width="78" height="66" rx="19"/>
  <circle class="eye" cx="60" cy="60" r="20"/>
  <g id="pupil"><circle class="pb" cx="60" cy="60" r="8.5"/><circle class="ph" cx="63" cy="56.5" r="2.7"/></g>
  <circle class="lid" cx="60" cy="60" r="18.8"/>
  <path class="joy" d="M45 62 Q60 76 75 62"/>
  <circle class="blush" cx="38" cy="78" r="4.5"/>
  <circle class="blush" cx="82" cy="78" r="4.5"/>
  <path class="mouth m1" d="M51 84 Q60 89 69 84"/>
  <path class="mouth m2" d="M50 83 Q60 95 70 83 Z"/>
</g>
</svg>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="color-scheme" content="light">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%232158cf'/%3E%3Ccircle cx='16' cy='16' r='8.5' fill='white'/%3E%3Ccircle cx='18' cy='15' r='3.6' fill='%23202634'/%3E%3C/svg%3E">
<style>
/* Cobalt on cool paper. Hex first as fallback, OKLCH overrides where supported. */
:root{
--bg:#f9fafc;--paper:#ffffff;--ink:#1f2531;--ink2:#454e5e;--ink3:#59616f;
--line:#e2e6ee;--tint:#edf1f8;--chip:#dbe7fa;--accent:#2158cf;--warm:#e9a53a;
--bg:oklch(98.4% .005 240);--paper:oklch(100% 0 0);--ink:oklch(25% .025 255);
--ink2:oklch(42% .025 252);--ink3:oklch(49% .02 250);--line:oklch(92% .012 245);
--tint:oklch(95.6% .012 245);--chip:oklch(91% .04 245);--accent:oklch(50% .19 259);
--warm:oklch(76% .14 75);
--eo:cubic-bezier(.19,1,.22,1);
--s0:1.0625rem;--s1:1.3rem;--s-1:.9rem;--s-2:.8125rem;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);padding:0 1.25rem;
font:var(--s0)/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
font-feature-settings:"kern" 1,"liga" 1;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto}
h1,h2,h3{margin:0;text-wrap:balance}
p,ul,dl{margin:0}
a{color:var(--accent);text-decoration:underline;text-decoration-thickness:1px;
text-underline-offset:.2em;text-decoration-color:color-mix(in oklab,var(--accent) 34%,transparent);
transition:text-decoration-color .15s var(--eo)}
a:hover{text-decoration-color:var(--accent)}
:focus-visible{outline:2.5px solid var(--accent);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:-999px;top:0;background:var(--ink);color:#fff;padding:.5rem .9rem;border-radius:6px;text-decoration:none;z-index:50}
.skip:focus{left:.75rem;top:.75rem}
.wrap{max-width:62rem;margin:0 auto;padding:clamp(2rem,6vw,4rem) 0 2.5rem}

/* Companion rail */
.rail{margin-bottom:1.1rem}
.companion{display:inline-block;width:6.5rem;text-decoration:none;border-radius:16px}
#cmp{display:block;width:100%;height:auto;overflow:visible}
.railnav{display:none}
@media (min-width:60rem){
  .wrap{display:grid;grid-template-columns:10.5rem minmax(0,1fr);column-gap:3.4rem;align-items:start}
  .rail{position:sticky;top:2.4rem;margin-bottom:0}
  .companion{width:8.75rem}
  .railnav{display:flex;flex-direction:column;align-items:flex-start;gap:.5rem;
    margin:1.5rem 0 0 .4rem;font-size:var(--s-2)}
  .railnav a{color:var(--ink2);text-decoration:none}
  .railnav a:hover{color:var(--accent);text-decoration:underline;
    text-decoration-thickness:1px;text-underline-offset:.2em}
  .rns{width:1.3rem;border-top:1px solid var(--line);margin:.3rem 0}
  .hero .hmeta{display:none} /* the rail carries these links on desktop */
}
@media (max-width:59.99rem){
  .rail{min-height:6.1rem}
  .companion.docked{position:fixed;right:.85rem;bottom:.9rem;z-index:40;width:6rem;
    padding:.55rem .55rem .4rem;background:var(--paper);border:1px solid var(--line);
    border-radius:999px;box-shadow:0 12px 32px rgba(30,41,66,.18);
    animation:dockin .3s var(--eo) both}
  footer{padding-bottom:6.5rem}
}
/* position:fixed can't transition, so the dock gets a short entrance instead
   of an instant jump. The global reduced-motion rule kills it. */
@keyframes dockin{from{opacity:0;transform:translate3d(0,12px,0) scale(.9)}to{opacity:1;transform:none}}

/* Robot anatomy */
#cmp .ant{stroke:var(--ink);stroke-width:3.2;stroke-linecap:round}
#cmp .led{fill:var(--ink3)}
#cmp .ping{fill:none;stroke:var(--warm);stroke-width:2.5;opacity:0}
#cmp .head{fill:var(--chip);stroke:var(--ink);stroke-width:3.2}
#cmp .ear{fill:var(--accent)}
#cmp .eye{fill:var(--paper);stroke:var(--ink);stroke-width:3.2}
#cmp .pb{fill:var(--ink);transform-box:view-box;transform-origin:60px 60px;transition:transform .2s var(--eo)}
#cmp .ph{fill:var(--paper)}
#cmp .lid{fill:var(--chip);transform-box:view-box;transform-origin:60px 41.2px;transform:scaleY(.08);transition:transform .09s ease-out}
#cmp .joy{fill:none;stroke:var(--ink);stroke-width:5;stroke-linecap:round;opacity:0}
#cmp .blush{fill:var(--warm);opacity:0}
#cmp .mouth{fill:none;stroke:var(--ink);stroke-width:3.4;stroke-linecap:round}
#cmp .m2{fill:var(--ink);stroke-width:2.5;opacity:0}
#cmp .led,#cmp .joy,#cmp .blush,#cmp .mouth,#cmp #pupil{transition:opacity .16s var(--eo),fill .16s var(--eo)}
#cmp.peek .lid{transform:scaleY(.03)}
#cmp.peek .pb{transform:scale(1.16)}
#cmp.peek .led{fill:var(--accent)}
#cmp.blink .lid{transform:scaleY(1)}
/* yay outranks blink (source order, equal specificity): no chip-colored lid
   disc flashing behind the joy arc mid-celebration. JS also skips the blink
   loop while yay is on — this rule is the belt to that suspender. */
#cmp.yay .lid{transform:scaleY(.03)}
#cmp.yay .led{fill:var(--warm)}
#cmp.yay #pupil{opacity:0}
#cmp.yay .joy{opacity:1}
#cmp.yay .blush{opacity:.5}
#cmp.yay .m1{opacity:0}
#cmp.yay .m2{opacity:1}
#cmp.yay .ping{animation:ping .7s var(--eo) both}
@keyframes ping{0%{opacity:.9;r:5px}100%{opacity:0;r:15px}}

/* Hero */
.hero h1{font-size:clamp(2.1rem,4.8vw,3.1rem);font-weight:700;letter-spacing:-.03em;line-height:1.05}
.role{margin-top:.5rem;font-size:var(--s-1);color:var(--ink3);letter-spacing:.01em}
.tag{margin-top:1rem;font-size:clamp(1.15rem,2.2vw,1.4rem);font-weight:600;letter-spacing:-.015em;line-height:1.35;max-width:34ch}
.sub{margin-top:.55rem;color:var(--ink2);font-size:.95rem;max-width:56ch}
.hmeta{margin-top:1rem;font-size:var(--s-1)}
.sep{color:var(--ink3);opacity:.55;padding:0 .55rem}

/* Sections */
main section{margin-top:clamp(2.6rem,6vw,3.6rem)}
.hd{font-size:.9rem;font-weight:700;color:var(--ink);letter-spacing:.01em}
.hd .n{font-weight:400;color:var(--ink3)}
.glance{margin-top:.8rem;color:var(--ink2);font-size:var(--s-1)}
.glance b{color:var(--ink);font-variant-numeric:tabular-nums}

/* Work list — direct rows, no chrome */
.list{list-style:none;margin:.6rem 0 0;padding:0}
.row{padding:.9rem;margin:0 -.9rem;border-radius:12px;transition:background .18s var(--eo)}
@media (hover:hover){.row:hover{background:var(--tint)}}
.row:focus-within{background:var(--tint)}
.row.aim{background:var(--tint)}
.line{display:flex;align-items:baseline;gap:.2rem .7rem;flex-wrap:wrap}
.t{font-size:var(--s1);font-weight:600;letter-spacing:-.015em}
.t.plain{color:var(--ink)}
.arr{font-size:.72em;margin-left:.26em;display:inline-block}
.meta{font-size:var(--s-2);color:var(--ink3);white-space:nowrap}
.d{margin-top:.2rem;color:var(--ink2);max-width:68ch}
.para{margin-top:.7rem}

/* Inline expander */
.more{margin-top:.35rem}
.more summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;
font-size:var(--s-2);color:var(--ink3);padding:.1rem .25rem;margin-left:-.25rem;border-radius:6px;
-webkit-user-select:none;user-select:none}
.more summary::-webkit-details-marker{display:none}
.more summary::after{content:"+";color:var(--accent);font-weight:600;display:inline-block;transition:transform .18s var(--eo)}
.more[open] summary::after{transform:rotate(45deg)}
.more summary:hover{color:var(--ink)}
.more .body{margin:.7rem 0 .3rem;display:flex;gap:1.1rem;flex-wrap:wrap;align-items:flex-start}
.shot{flex:0 0 auto;width:min(230px,100%);border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--paper)}
.shot img{display:block;width:100%;height:auto}
.shot.icon{width:74px;padding:12px}
.shot.contain{padding:10px}
.shot.tile{width:74px;height:74px;border:0;background:var(--accent);color:#fff;display:flex;
align-items:center;justify-content:center;font-weight:700;font-size:1.35rem;letter-spacing:-.02em}
.info{flex:1 1 17rem;min-width:0}
.info p{color:var(--ink2);font-size:.95rem;max-width:66ch;overflow-wrap:anywhere}
.info p + p{margin-top:.45rem}
.info .tags{color:var(--ink3);font-size:var(--s-2)}
.info .lnk{display:flex;gap:1rem;flex-wrap:wrap;font-size:var(--s-1)}
.nolink{color:var(--ink3);font-style:italic;font-size:var(--s-2)}

/* Patent */
.pat{margin-top:.8rem}
.pt{font-size:var(--s1);font-weight:600;letter-spacing:-.015em;text-wrap:balance}
.stamp{margin-top:.2rem;font-size:var(--s-2);color:var(--ink3);font-variant-numeric:tabular-nums}
.pat .d{margin-top:.45rem}
.hl{list-style:none;margin:.8rem 0 0;padding:0}
.hl li{position:relative;padding-left:1.05rem;margin-top:.4rem;max-width:68ch}
.hl li::before{content:"";position:absolute;left:0;top:.58em;width:.36rem;height:.36rem;border-radius:50%;background:var(--accent)}

/* About / entries / skills (conditional) */
.prin{margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem}
.prin dt{font-weight:600}
.prin dd{margin:.15rem 0 0;color:var(--ink2);font-size:var(--s-1)}
.entry{padding:.7rem 0}
.entry .line{display:flex;align-items:baseline;gap:.2rem .6rem;flex-wrap:wrap}
.skl{margin-top:.6rem;color:var(--ink2);font-size:var(--s-1)}
.skl strong{color:var(--ink)}

/* Contact */
.say{margin-top:.9rem;font-size:clamp(1.4rem,3vw,1.9rem);font-weight:600;letter-spacing:-.02em;line-height:1.2;overflow-wrap:anywhere}
.soc{margin-top:.7rem;font-size:var(--s-1);display:flex;gap:1.1rem;flex-wrap:wrap}
.avail{margin-top:.9rem;font-size:var(--s-2);color:var(--ink3);display:flex;align-items:center;gap:.5rem}
.avail::before{content:"";width:.5rem;height:.5rem;border-radius:50%;background:var(--accent);
box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 15%,transparent);flex:0 0 auto}

footer{margin-top:clamp(2.8rem,7vw,4rem);padding-top:1.1rem;border-top:1px solid var(--line);
font-size:var(--s-2);color:var(--ink3);display:flex;flex-wrap:wrap;gap:.4rem 1rem}
footer .grow{flex:1}

@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*::before,*::after{transition:none !important;animation:none !important}
}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to work</a>
<div class="wrap">

  <div class="rail">
    <a class="companion" id="buddy" href="#contact" aria-label="Say hi — jump to contact" data-look="yay">${companionSVG}</a>
    ${railNav}
  </div>

  <div class="col">
    <header class="hero" id="top">
      <h1>${esc(p.name)}</h1>
      ${p.role ? `<p class="role">${esc(p.role)}</p>` : ""}
      ${p.tagline ? `<p class="tag">${esc(p.tagline)}</p>` : ""}
      ${p.subtagline ? `<p class="sub">${esc(p.subtagline)}</p>` : ""}
      ${hmeta ? `<p class="hmeta">${hmeta}</p>` : ""}
    </header>

    <main id="main">
      ${glanceHTML}
      ${workHTML}
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
      <span>Companion · one living robot · system fonts · zero external requests</span>
    </footer>
  </div>

</div>
<script>
(function () {
  var svg = document.getElementById('cmp');
  if (!svg || !svg.getBoundingClientRect) return;
  var tiltG = document.getElementById('tilt');
  var pupil = document.getElementById('pupil');
  var buddy = document.getElementById('buddy');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;

  // Eye center in screen coords, cached; invalidated on scroll/resize/dock.
  var C = null;
  function center() {
    if (C) return C;
    var r = svg.getBoundingClientRect();
    return (C = { x: r.left + r.width * 0.5, y: r.top + r.height * (60 / 106) });
  }
  addEventListener('scroll', function () { C = null; }, { passive: true });
  addEventListener('resize', function () { C = null; });

  var tx = 0, ty = 0, ta = 0, cx = 0, cy = 0, ca = 0, raf = 0;
  function paint() {
    pupil.setAttribute('transform', 'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ')');
    tiltG.setAttribute('transform', 'rotate(' + ca.toFixed(2) + ' 60 64)');
  }
  function step() {
    cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16; ca += (ta - ca) * 0.12;
    paint();
    if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(ta - ca) > 0.06) {
      raf = requestAnimationFrame(step);
    } else { cx = tx; cy = ty; ca = ta; paint(); raf = 0; }
  }
  function aim(x, y) {
    var c = center(), dx = x - c.x, dy = y - c.y;
    var d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 90);
    tx = (dx / d) * 7 * k; ty = (dy / d) * 5.2 * k;
    ta = Math.max(-7, Math.min(7, dx / 55));
    if (reduce) { cx = tx; cy = ty; ca = 0; paint(); }       // discrete, no animation
    else if (!raf) raf = requestAnimationFrame(step);
  }
  function lookAt(el) {
    var r = el.getBoundingClientRect();
    aim(r.left + Math.min(r.width, 360) * 0.45, r.top + r.height / 2);
  }
  // Mood plumbing: pin is whatever an explicit target (hover / focus /
  // touch-scroll nearest row) asks for; celebrating is the ambient base
  // once Contact is in view. Explicit targets win, the celebration fills the
  // gaps — so a scroll-and-read mouse user still gets the payoff.
  var pin = null, celebrating = false;
  function mood(m) {
    svg.classList.toggle('peek', m === 'peek');
    svg.classList.toggle('yay', m === 'yay');
  }
  function apply() { mood(pin || (celebrating ? 'yay' : '')); }

  // Mouse: the eye follows the cursor everywhere.
  if (!touch && !reduce) {
    addEventListener('mousemove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
  }

  var spots = [].slice.call(document.querySelectorAll('[data-look]'));
  spots.forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      pin = el.getAttribute('data-look'); apply();
      if (reduce) lookAt(el);                                 // discrete gaze reposition
    });
    // On leave, fall back to the [data-look] ancestor still under the cursor
    // (via relatedTarget) instead of clearing outright — scanning row to row
    // inside a peeking section no longer churns the LED/lid between rows.
    el.addEventListener('mouseleave', function (e) {
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-look]') : null;
      pin = to ? to.getAttribute('data-look') : null; apply();
    });
  });

  // Keyboard: focus drives the gaze exactly like hover.
  addEventListener('focusin', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-look]') : null;
    pin = t ? t.getAttribute('data-look') : null; apply();
    if (e.target && e.target.getBoundingClientRect) lookAt(e.target);
  });

  // Idle blink (skipped under reduced motion, and while celebrating — mid-yay
  // the lid disc would flash behind the joy arc).
  if (!reduce) (function blink() {
    setTimeout(function () {
      if (!svg.classList.contains('yay')) {
        svg.classList.add('blink');
        setTimeout(function () { svg.classList.remove('blink'); }, 150);
      }
      blink();
    }, 2600 + Math.random() * 3200);
  })();

  // Touch: no hover — the robot looks at whichever target sits nearest the
  // viewport middle while you scroll (that row gets a soft highlight), and it
  // celebrates when the contact section arrives.
  if (touch) {
    var last = null, tick = 0;
    var targets = spots.filter(function (el) { return el !== buddy; });
    var onScroll = function () {
      tick = 0;
      var mid = innerHeight / 2, best = null, bd = 1e9;
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bd) { bd = d; best = el; }
      });
      if (best !== last) {
        if (last) last.classList.remove('aim');
        if (best) { best.classList.add('aim'); lookAt(best); }
        pin = best ? best.getAttribute('data-look') : null; apply();
        last = best;
      } else if (best && !reduce) lookAt(best);
    };
    addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(onScroll); }, { passive: true });
    onScroll();
  }

  // Celebration is not hover-gated: once Contact is decently in view (its top
  // above the bottom 30% of the viewport) the robot goes yay for everyone —
  // scroll-and-read mouse users included — and stays until Contact leaves.
  var contact = document.getElementById('contact');
  if (contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      celebrating = en[0].isIntersecting;
      apply();
    }, { rootMargin: '0px 0px -30% 0px' }).observe(contact);
  }

  // Clicking the robot starts the party during the ride down (on desktop the
  // sticky rail keeps it under the cursor anyway; this covers touch taps and
  // programmatic activation). Arrival is sustained by the observer above.
  buddy.addEventListener('click', function () {
    pin = 'yay'; apply();
    setTimeout(function () { if (pin === 'yay') { pin = null; apply(); } }, 1400);
  });

  // Small screens: once the header scrolls away the buddy docks bottom-right
  // as a floating chip (CSS only applies the dock below 60rem).
  var top = document.getElementById('top');
  if (top && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      buddy.classList.toggle('docked', !en[0].isIntersecting);
      C = null;
    }, { rootMargin: '-40px 0px 0px 0px' }).observe(top);
  }
})();
</script>
</body>
</html>`;
}
