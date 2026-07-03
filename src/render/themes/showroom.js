// Showroom theme: imagery-led gallery wall. The product shots ARE the design —
// exhibits hang at intentional sizes on a quiet cool-gray wall, captions read
// second, dossiers (detail/tags/links) open via native <details>. Zero JS.
import { esc, md, realLinks } from "../util.js";

const kindOf = (it) =>
  it.image
    ? it.imageMode === "icon"
      ? "icon"
      : it.imageMode === "contain"
        ? "contain"
        : "cover"
    : "type";

const dotClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("live") || s.includes("production")) return "d-up";
  if (s.includes("progress") || s.includes("beta")) return "d-mid";
  return "d-tool";
};

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

  // Art direction: spans assigned by what each image actually is. First
  // non-icon piece becomes the oversized grand opener; icons become small
  // artifact cases (alternating open case / tinted shelf niche so twins never
  // read as duplicates); the tall cover shot hangs as a framed print; contains
  // alternate wide/mid mats; a null image gets the typographic tile. Below
  // 64rem the icon cases collapse into full-width shelf rows so the grid
  // never opens with a half-empty band.
  let grandTaken = false;
  let iconIdx = 0;
  let containIdx = 0;

  const exhibit = (it, i) => {
    const kind = kindOf(it);
    let cls;
    if (kind === "icon") {
      cls = "ex-case " + (iconIdx % 2 === 0 ? "s4" : "s3 ex-shelf");
      iconIdx++;
    } else if (!grandTaken) {
      grandTaken = true;
      cls = "ex-grand s8";
    } else if (kind === "cover") {
      cls = "ex-tall s5";
    } else if (kind === "type") {
      cls = "ex-type s5";
    } else {
      cls = containIdx % 2 === 0 ? "ex-wide s7" : "ex-mid s5";
      containIdx++;
    }

    let art;
    if (kind === "type") {
      const words = String(it.title || "").split(/\s+/).filter(Boolean);
      const glyph =
        words.length >= 2
          ? (words[0][0] + words[1][0]).toUpperCase()
          : (words[0] || "·").slice(0, 2).toUpperCase();
      art = `<figure class="art t-art" aria-hidden="true"><span class="glyph">${esc(glyph)}</span></figure>`;
    } else {
      const alt = `${it.title} ${kind === "icon" ? "app icon" : "product visual"}`;
      // Icons are tiny PNGs: always eager so below-the-fold cases never paint
      // as empty mats (or capture blank in full-page shots). Only heavy shots
      // past the fourth exhibit defer.
      const eager = kind === "icon" || i < 4;
      art =
        `<figure class="art"><img src="${esc(it.image)}" alt="${esc(alt)}"` +
        `${eager ? "" : ' loading="lazy"'} decoding="async"></figure>`;
    }

    const statusTxt = [it.status, it.year].filter(Boolean).map(esc).join(" · ");
    const tags = (it.tags || []).filter(Boolean);
    const links = realLinks(it.links);

    const doss =
      (it.detail ? `<div class="body">${md(it.detail)}</div>` : "") +
      (tags.length
        ? `<p class="chips">${tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</p>`
        : "") +
      (links.length
        ? `<p class="lnk">${links
            .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
            .join("")}</p>`
        : `<p class="nolink">No public link yet</p>`);

    const cap =
      `<div class="cap">` +
      `<h3>${esc(it.title)}</h3>` +
      (statusTxt
        ? `<p class="st"><span class="dot ${dotClass(it.status)}" aria-hidden="true"></span>${statusTxt}</p>`
        : "") +
      `<details>` +
      `<summary><span class="one">${esc(it.description || "Details")}</span><span class="aff" aria-hidden="true"></span></summary>` +
      `<div class="doss">${doss}</div>` +
      `</details>` +
      `</div>`;

    return `<article class="ex k-${kind} ${cls}">${art}${cap}</article>`;
  };

  const exhibitsHTML = items.map(exhibit).join("\n");

  // Patent: the crown piece — one more exhibit, hung on a dark plate with the
  // granted IDs typeset as the artwork.
  let crownHTML = "";
  if (patent) {
    const ids = (patent.ids || [])
      .map((id) => `<span class="pid">${esc(id)}</span>`)
      .join("");
    const sub = [patent.year, patent.role].filter(Boolean).map(esc).join(" · ");
    const highlights = (patent.highlights || [])
      .map((h) => `<li>${esc(h)}</li>`)
      .join("");
    crownHTML =
      `<article class="ex crown">` +
      `<figure class="art plate">` +
      `<span class="p-label">Granted patent</span>` +
      (ids ? `<span class="pids">${ids}</span>` : "") +
      (sub ? `<span class="p-sub">${sub}</span>` : "") +
      `</figure>` +
      `<div class="cap">` +
      `<h3>${esc(patent.title)}</h3>` +
      (sub ? `<p class="st"><span class="dot d-up" aria-hidden="true"></span>Patent · ${esc(patent.year || "")}</p>` : "") +
      `<details>` +
      `<summary><span class="one">${esc(patent.blurb || "Details")}</span><span class="aff" aria-hidden="true"></span></summary>` +
      `<div class="doss">${highlights ? `<ul class="hl">${highlights}</ul>` : ""}</div>` +
      `</details>` +
      `</div>` +
      `</article>`;
  }

  // Currently-empty sections, supported in case they return.
  const statline = stats.length
    ? `<p class="statline">${stats.map((s) => `<b>${esc(s.value)}</b> ${esc(s.label)}`).join('<span class="sep">·</span>')}</p>`
    : "";

  let aboutHTML = "";
  if ((about.paragraphs && about.paragraphs.length) || (about.principles && about.principles.length)) {
    aboutHTML =
      `<section class="annex" aria-label="About"><h2>About</h2>` +
      (about.paragraphs || []).map((t) => `<p>${esc(t)}</p>`).join("") +
      ((about.principles || []).length
        ? `<dl class="pr">${(about.principles || [])
            .map((x) => `<div><dt>${esc(x.title)}</dt><dd>${esc(x.body)}</dd></div>`)
            .join("")}</dl>`
        : "") +
      `</section>`;
  }

  const listBlock = (label, rows) =>
    rows.length
      ? `<section class="annex" aria-label="${esc(label)}"><h2>${esc(label)}</h2><ul class="roll">` +
        rows
          .map((r) => {
            const head = [r.org || r.school, r.role || r.program].filter(Boolean).map(esc).join(" — ");
            const when = r.period ? ` <span class="when">${esc(r.period)}</span>` : "";
            const pts = (r.points || []).filter(Boolean).map(esc).join(" · ");
            const note = r.note ? ` ${esc(r.note)}` : "";
            return `<li><b>${head}</b>${when}${pts ? `<span class="pts">${pts}</span>` : ""}${note}</li>`;
          })
          .join("") +
        `</ul></section>`
      : "";

  const skillsHTML = skills.length
    ? `<section class="annex" aria-label="Skills"><h2>Skills</h2>` +
      skills
        .map(
          (g) =>
            `<p class="chips">${(g.items || [])
              .filter(Boolean)
              .map((s) => `<span class="chip">${esc(s)}</span>`)
              .join("")}</p>`
        )
        .join("") +
      `</section>`
    : "";

  const footMeta = [
    p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener">GitHub</a>` : "",
    p.linkedinUrl ? `<a href="${esc(p.linkedinUrl)}" target="_blank" rel="noopener">LinkedIn</a>` : "",
    p.location ? esc(p.location) : "",
    p.available ? `<span class="avail"><span class="dot d-up" aria-hidden="true"></span>${esc(p.available)}</span>` : "",
  ]
    .filter(Boolean)
    .join('<span class="sep">·</span>');

  const wallLabel = `Selected work · ${items.length} shipped${patent ? " · 1 patent" : ""}`;
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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232b2e3a'/%3E%3Crect x='7' y='9' width='18' height='14' rx='2' fill='%23f2f2f5'/%3E%3Ccircle cx='13' cy='14' r='2.2' fill='%234653c6'/%3E%3Cpath d='M9 21l5-5 3 3 4-4 4 4v2a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z' fill='%234653c6'/%3E%3C/svg%3E">
<style>
:root{
--wall:oklch(0.955 0.004 260);
--mat:oklch(0.995 0.002 260);
--mat-deep:oklch(0.978 0.003 260);
--niche:oklch(0.93 0.007 262);
--line:oklch(0.885 0.005 260);
--ink:oklch(0.235 0.015 262);
--ink-2:oklch(0.45 0.015 262);
--accent:oklch(0.42 0.15 268);
--focus:oklch(0.5 0.19 264);
--plate:oklch(0.25 0.02 270);
--plate-ink:oklch(0.92 0.008 260);
--plate-soft:oklch(0.74 0.02 262);
--brass:oklch(0.84 0.08 85);
--up:oklch(0.55 0.14 150);
--mid:oklch(0.62 0.125 70);/* 3.28:1 on the wall */
--tool:oklch(0.62 0.02 262);
--ease:cubic-bezier(0.22,1,0.36,1);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--wall);color:var(--ink);
font:1rem/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
font-feature-settings:"kern" 1,"liga" 1;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
h1,h2,h3,p,figure,ul,dl,dd{margin:0}
a{color:var(--accent);text-decoration:underline;text-underline-offset:.16em;text-decoration-thickness:1px;text-decoration-color:oklch(0.42 0.15 268 / 0.4)}
a:hover{text-decoration-color:currentColor}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px;border-radius:3px}
.skip{position:absolute;left:-999px;top:0}
.skip:focus{left:.75rem;top:.75rem;z-index:9;background:var(--ink);color:var(--mat);padding:.5rem .9rem;border-radius:4px;text-decoration:none}
.room{max-width:82rem;margin:0 auto;padding:0 clamp(1.15rem,4vw,3rem)}

.foyer{padding:clamp(1.7rem,4.5vh,3rem) 0 clamp(1.9rem,4.5vh,3rem);display:grid;grid-template-columns:1fr;gap:1rem 0}
.foyer h1{font-size:clamp(2rem,1.3rem+2.2vw,2.9rem);font-weight:700;letter-spacing:-.035em;line-height:1.02;text-wrap:balance}
.foyer .role{margin-top:.45rem;color:var(--ink-2);font-size:.9375rem;letter-spacing:-.005em}
.thesis .tag{font-size:clamp(1.1rem,.95rem+.75vw,1.4rem);font-weight:600;letter-spacing:-.018em;line-height:1.3;text-wrap:balance;max-width:30ch}
.thesis .sub{margin-top:.5rem;color:var(--ink-2);font-size:.875rem;max-width:56ch}
.statline{margin-top:.7rem;font-size:.875rem;color:var(--ink-2)}
.statline b{font-weight:650;color:var(--ink)}
.sep{padding:0 .5rem;color:var(--line)}

.wall-label{font-size:.875rem;font-weight:500;color:var(--ink-2);margin-bottom:clamp(1.2rem,3vh,1.8rem)}
.wall{display:grid;grid-template-columns:1fr;row-gap:2.75rem;align-items:start}
.ex{grid-column:1/-1}

.art{position:relative;background:var(--mat);border:1px solid var(--line);border-radius:6px;overflow:hidden;
box-shadow:0 1px 2px oklch(0.2 0.01 262 / 0.06),0 10px 24px -18px oklch(0.2 0.01 262 / 0.28);
transition:transform .45s var(--ease),box-shadow .45s var(--ease)}
.ex:hover .art{transform:translateY(-4px);box-shadow:0 2px 4px oklch(0.2 0.01 262 / 0.07),0 18px 34px -18px oklch(0.2 0.01 262 / 0.34)}

/* Contain artwork sits on a slightly deeper mat inside an inset mat-window
   hairline, so light-dominant pieces (a white logo) stay framed instead of
   melting into the mat. */
.k-contain .art{display:grid;place-items:center;padding:clamp(1.4rem,4vw,2.75rem);background:var(--mat-deep)}
.k-contain .art::after{content:"";position:absolute;inset:.55rem;border:1px solid oklch(0.885 0.005 260 / 0.8);border-radius:3px;pointer-events:none}
.k-contain img{max-width:100%;max-height:100%;width:auto;height:auto}
.ex-grand .art{min-height:clamp(15rem,62vw,20rem)}
.ex-grand img{max-height:min(48vh,28rem)}
.ex-wide .art{aspect-ratio:16/8}
.ex-mid .art{aspect-ratio:5/4}
.k-cover .art{aspect-ratio:4/5}
.k-cover img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}
.k-icon .art{aspect-ratio:1/1;display:grid;place-items:center}
.k-icon img{width:clamp(3.25rem,34%,5.5rem)}
.k-type .art{aspect-ratio:4/3;display:grid;place-items:center}
.k-type .glyph{font-size:clamp(3rem,8vw,4.5rem);font-weight:700;letter-spacing:-.04em;color:var(--ink)}

.plate{background:var(--plate);border-color:var(--plate);color:var(--plate-ink);
display:flex;flex-direction:column;align-items:center;text-align:center;gap:.9rem;
padding:clamp(2.25rem,6vw,3.75rem) 1.25rem}
.p-label{font-size:.8125rem;color:var(--plate-soft)}
.pids{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem 2.25rem}
.pid{font-size:clamp(1.3rem,3.2vw,2.15rem);font-weight:700;letter-spacing:-.01em;color:var(--brass);font-feature-settings:"tnum" 1;font-variant-numeric:tabular-nums}
.p-sub{font-size:.875rem;color:var(--plate-soft)}

.cap{margin-top:.85rem;max-width:56ch}
.cap h3{font-size:1.0625rem;font-weight:650;letter-spacing:-.014em;line-height:1.25;text-wrap:balance}
.ex-grand .cap h3{font-size:1.35rem}
.st{margin-top:.15rem;font-size:.8125rem;color:var(--ink-2)}
.dot{display:inline-block;width:.45rem;height:.45rem;border-radius:50%;margin-right:.38rem;vertical-align:.05em}
.d-up{background:var(--up)}.d-mid{background:var(--mid)}.d-tool{background:var(--tool)}
.cap details{margin-top:.35rem}
.cap summary{list-style:none;cursor:pointer;display:flex;align-items:baseline;gap:.6rem;
color:var(--ink-2);font-size:.9375rem;line-height:1.5;max-width:52ch}
.cap summary::-webkit-details-marker{display:none}
.cap summary:hover{color:var(--ink)}
.ex-grand .cap summary{font-size:1rem}
.aff{flex:0 0 auto;width:.75rem;height:.75rem;position:relative;align-self:center;margin-left:auto}
.aff::before,.aff::after{content:"";position:absolute;background:currentColor;transition:transform .3s var(--ease)}
.aff::before{left:0;right:0;top:calc(50% - .5px);height:1px}
.aff::after{top:0;bottom:0;left:calc(50% - .5px);width:1px}
.cap details[open] .aff::after{transform:scaleY(0)}
.doss{padding:.65rem 0 .15rem;font-size:.9375rem;color:var(--ink-2);max-width:62ch}
.cap details[open] .doss{animation:rise .4s var(--ease)}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.doss .body p{margin:0 0 .5rem}
.doss .body a{color:var(--accent)}
.chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:.35rem 0 0}
.chip{font-size:.8125rem;color:var(--ink-2);background:var(--mat);border:1px solid var(--line);border-radius:99px;padding:.14rem .6rem}
.lnk{margin-top:.6rem;display:flex;flex-wrap:wrap;gap:1.1rem}
.lnk a{font-weight:600;font-size:.9375rem}
.lnk a::after{content:" \\2197";font-weight:400}
.nolink{margin-top:.6rem;font-size:.8125rem;color:var(--ink-2)}
.hl{margin:0;padding:0;list-style:none}
.hl li{position:relative;padding-left:1.1rem;margin-top:.4rem;color:var(--ink)}
.hl li::before{content:"";position:absolute;left:0;top:.6em;width:.42rem;height:.42rem;border:1px solid var(--ink-2);border-radius:50%}

.annex{margin-top:clamp(4rem,10vh,6.5rem);max-width:46rem}
.annex h2{font-size:1.05rem;font-weight:650;letter-spacing:-.01em;margin-bottom:.9rem}
.annex p{color:var(--ink-2);max-width:65ch;margin-bottom:.8rem}
.annex .pr{display:grid;gap:.7rem;margin-top:1rem}
.annex dt{font-weight:650}
.annex dd{color:var(--ink-2);font-size:.9375rem}
.roll{margin:0;padding:0;list-style:none}
.roll li{padding:.6rem 0;border-top:1px solid var(--line);font-size:.9375rem;color:var(--ink-2)}
.roll b{font-weight:650;color:var(--ink)}
.roll .when{font-size:.8125rem;white-space:nowrap;margin-left:.5rem}
.roll .pts{display:block;margin-top:.15rem}

footer{margin-top:clamp(4.5rem,12vh,7rem);border-top:1px solid var(--line);padding:2.25rem 0 2.75rem}
.reach a{font-size:clamp(1.15rem,2.6vw,1.5rem);font-weight:650;letter-spacing:-.015em;overflow-wrap:anywhere}
.f-meta{margin-top:.7rem;font-size:.875rem;color:var(--ink-2)}
.f-meta a{color:var(--accent)}
.avail .dot{margin-right:.34rem}
.colophon{margin-top:1.5rem;font-size:.8125rem;color:var(--ink-2)}

@media (max-width:63.99rem){
.ex-case{display:grid;grid-template-columns:4.5rem minmax(0,1fr);column-gap:1rem;align-items:start}
.ex-case .cap{margin-top:0}
.ex-case img{width:2.9rem}
}
@media (min-width:48rem){
.wall{grid-template-columns:repeat(8,minmax(0,1fr));column-gap:clamp(1.25rem,2.4vw,2rem);row-gap:3.5rem}
.s3,.s4,.s5{grid-column:span 4}
.s7,.s8{grid-column:span 8}
/* Tablet band: icon cases stay compact shelf rows at full width, so the
   wall never opens with a half-empty band beside a lone small case. */
.ex-case{grid-column:1/-1}
.crown{grid-column:1/-1}
.ex-grand .art{min-height:clamp(18rem,52vh,30rem)}
}
@media (min-width:64rem){
.foyer{grid-template-columns:minmax(0,5fr) minmax(0,7fr);column-gap:clamp(2.5rem,6vw,5rem);align-items:end}
.thesis{justify-self:end;text-align:left}
.wall{grid-template-columns:repeat(12,minmax(0,1fr));row-gap:clamp(3.5rem,7vh,5rem)}
.s3{grid-column:span 3}
.s4{grid-column:span 4}
.s5{grid-column:span 5}
.s7{grid-column:span 7}
.s8{grid-column:span 8}
.crown{grid-column:3/span 8}
.ex-grand .art{min-height:clamp(22rem,58vh,34rem)}
/* Deeper wide mat so the row it shares with the tall print stays balanced. */
.ex-wide .art{aspect-ratio:16/10}
/* Salon hang: pieces hang at uneven tops, on purpose. */
.wall>.ex-case{margin-top:3.25rem}
.wall>article:nth-child(even).ex-case{margin-top:1.25rem}
.wall>.ex-tall{margin-top:2.25rem}
.wall>.ex-wide{margin-top:2.75rem}
.wall>.ex-mid{margin-top:1.5rem}
/* Shelf niche: every other icon case becomes a tinted recess with the icon
   resting on a hairline shelf — twin icon exhibits read as two treatments. */
.ex-shelf .art{background:var(--niche);border-color:oklch(0.86 0.008 262);align-items:end;padding-bottom:24%}
.ex-shelf .art::after{content:"";position:absolute;left:16%;right:16%;bottom:24%;height:1px;background:oklch(0.72 0.012 262)}
.ex-shelf img{filter:drop-shadow(0 5px 7px oklch(0.3 0.01 262 / 0.22))}
}
@media (prefers-reduced-motion:reduce){
*,*::before,*::after{transition:none!important;animation:none!important}
.ex:hover .art{transform:none}
}
</style>
</head>
<body>
<a class="skip" href="#work">Skip to the work</a>
<div class="room">

<header class="foyer">
  <div class="ident">
    <h1>${esc(p.name)}</h1>
    ${p.role ? `<p class="role">${esc(p.role)}</p>` : ""}
  </div>
  <div class="thesis">
    ${p.tagline ? `<p class="tag">${esc(p.tagline)}</p>` : ""}
    ${p.subtagline ? `<p class="sub">${esc(p.subtagline)}</p>` : ""}
    ${statline}
  </div>
</header>

<main>
${
  items.length || patent
    ? `<section id="work" aria-labelledby="work-label" tabindex="-1">
  <h2 class="wall-label" id="work-label">${wallLabel}</h2>
  <div class="wall">
${exhibitsHTML}
${crownHTML}
  </div>
</section>`
    : ""
}
${aboutHTML}
${listBlock("Experience", experience)}
${listBlock("Community & Press", press)}
${listBlock("Education", education)}
${skillsHTML}
</main>

<footer aria-label="Contact">
  ${p.email ? `<p class="reach"><a href="${emailHref}">${esc(p.email)}</a></p>` : ""}
  ${footMeta ? `<p class="f-meta">${footMeta}</p>` : ""}
  <p class="colophon">© ${year} ${esc(p.name)}${p.latinName ? " · " + esc(p.latinName) : ""} · Showroom: system fonts, zero external requests</p>
</footer>

</div>
</body>
</html>`;
}
