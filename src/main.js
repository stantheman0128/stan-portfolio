import content from "virtual:portfolio-content";

const { site, projects } = content;
const links = {
  email: `mailto:${site.email}`,
  github: site.github,
  linkedin: site.linkedin,
  resume: site.resume
};
const projectsBySlug = new Map(projects.map((project) => [project.slug, project]));

function html(strings, ...values) {
  return strings.reduce((acc, string, index) => acc + string + (values[index] ?? ""), "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTags(tags) {
  return html`<ul class="tag-list">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>`;
}

function renderLinks(items) {
  const usable = items.filter((item) => !item.href.startsWith("#TODO-"));
  if (!usable.length) return "";
  return html`<div class="link-row">${usable
    .map((item) => {
      const external = item.href.startsWith("http");
      return `<a href="${escapeHtml(item.href)}"${external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(
        item.label
      )}</a>`;
    })
    .join("")}</div>`;
}

function renderMedia(project) {
  if (!project.image) {
    return html`<div class="project-media placeholder" aria-label="${escapeHtml(project.title)} placeholder image">
      <div class="placeholder-title">${escapeHtml(project.title)}</div>
    </div>`;
  }

  const mode = project.imageMode ? ` ${project.imageMode}` : "";
  return html`<figure class="project-media${mode}">
    <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.alt)}" loading="lazy" />
  </figure>`;
}

function renderProjectCard(project) {
  return html`<article class="project-card${project.hero ? " hero-card" : ""}">
    ${renderMedia(project)}
    <div class="project-body">
      <div class="project-top">
        <h3>${escapeHtml(project.title)}</h3>
        <span class="project-status">${escapeHtml(project.status)}</span>
      </div>
      <p>${escapeHtml(project.description)}</p>
      <div class="project-path">${escapeHtml(project.path)}</div>
      ${renderTags(project.tags)}
      ${renderLinks(project.links)}
    </div>
  </article>`;
}

function renderProjectGrid(items = projects) {
  return html`<div class="project-grid">${items.map(renderProjectCard).join("")}</div>`;
}

function renderHero() {
  return html`<section class="section hero">
    <div>
      <h1 class="headline">${escapeHtml(site.hero.headline)}</h1>
      <p class="subhead">${escapeHtml(site.hero.subhead)}</p>
      <div class="button-row">
        <a class="button primary" href="/projects" data-route>Projects</a>
        <a class="button" href="/colonist" data-route>Colonist</a>
        <a class="button" href="${links.email}">Email</a>
        <a class="button" href="${links.github}" target="_blank" rel="noopener">GitHub</a>
        <a class="button" href="${links.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    </div>
    <aside class="hero-note" aria-label="Colonist application note">
      <p><strong>${escapeHtml(site.colonistCallout.headline)}</strong></p>
      <small>${escapeHtml(site.colonistCallout.note)}</small>
    </aside>
  </section>`;
}

function renderAbout() {
  return html`<section class="section split" aria-labelledby="about">
    <div class="prose">
      <p class="section-kicker">About</p>
      <h2 class="section-title" id="about">${escapeHtml(site.about.heading)}</h2>
      ${site.about.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      <div class="language-row">
        ${site.about.languages
          .map(({ label, value }) => `<span><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</span>`)
          .join("")}
      </div>
    </div>
    <div class="highlight-grid">
      ${site.highlights.map((item) => html`<div class="highlight-item"><p>${escapeHtml(item)}</p></div>`).join("")}
    </div>
  </section>`;
}

function renderHome() {
  return html`${renderHero()}
    <section class="section section-tight" aria-labelledby="featured-projects">
      <div class="section-head">
        <div>
          <p class="section-kicker">${escapeHtml(site.home.projectsKicker)}</p>
          <h2 class="section-title" id="featured-projects">${escapeHtml(site.home.projectsTitle)}</h2>
        </div>
        <p class="lead">${escapeHtml(site.home.projectsLead)}</p>
      </div>
      ${renderProjectGrid(projects.slice(0, 6))}
    </section>
    <section class="section">
      <div class="callout">
        <strong>${escapeHtml(site.home.calloutHeadline)}</strong>
        <p class="side">${escapeHtml(site.home.calloutBody)}</p>
      </div>
    </section>
    ${renderAbout()}`;
}

function renderProjectsPage() {
  return html`<section class="section">
    <p class="section-kicker">${escapeHtml(site.projectsPage.kicker)}</p>
    <h1 class="page-title">${escapeHtml(site.projectsPage.title)}</h1>
    <p class="lead">${escapeHtml(site.projectsPage.lead)}</p>
    <div class="route-tabs">
      <a href="/" data-route>Home</a>
      <a href="/colonist" data-route>Colonist application focus</a>
    </div>
  </section>
  <section class="section section-tight">
    ${renderProjectGrid(projects)}
  </section>`;
}

function renderColonistPage() {
  const colonist = projectsBySlug.get(site.colonistProject);
  const related = site.colonistRelated.map((slug) => projectsBySlug.get(slug));
  const repo = colonist.links.find(({ href }) => href.includes("github.com"))?.href;
  const page = site.colonistPage;

  return html`<section class="section hero">
    <div>
      <h1 class="page-title">${escapeHtml(page.heroTitle)}</h1>
      <p class="subhead">${escapeHtml(site.colonistCallout.headline)}</p>
      <div class="button-row">
        ${repo ? `<a class="button primary" href="${escapeHtml(repo)}" target="_blank" rel="noopener">View repo</a>` : ""}
        <a class="button" href="/projects" data-route>Related projects</a>
        <a class="button" href="${links.email}">Email</a>
      </div>
    </div>
    <aside class="hero-note">
      <p><strong>${escapeHtml(page.disclaimerTitle)}</strong></p>
      <small>${escapeHtml(page.disclaimerBody)}</small>
    </aside>
  </section>

  <section class="section split">
    <div class="prose">
      <p class="section-kicker">${escapeHtml(page.why.kicker)}</p>
      <h2 class="colonist-title">${escapeHtml(page.why.title)}</h2>
      ${page.why.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </div>
    <ul class="mini-list" aria-label="Colonist fit">
      ${page.fit
        .map(({ title, body }) => `<li><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></li>`)
        .join("")}
    </ul>
  </section>

  <section class="section" aria-labelledby="proof">
    <div class="section-head">
      <div>
        <p class="section-kicker">${escapeHtml(page.proof.kicker)}</p>
        <h2 class="section-title" id="proof">${escapeHtml(page.proof.title)}</h2>
      </div>
      <p class="lead">${escapeHtml(page.proof.lead)}</p>
    </div>
    ${renderProjectGrid([colonist])}
    <div class="proof-grid">
      ${page.proof.items
        .map(
          ({ title, body }) =>
            `<div class="proof-item"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" aria-labelledby="strengths">
    <div class="section-head">
      <div>
        <p class="section-kicker">${escapeHtml(page.strengths.kicker)}</p>
        <h2 class="section-title" id="strengths">${escapeHtml(page.strengths.title)}</h2>
      </div>
      <p class="lead">${escapeHtml(page.strengths.lead)}</p>
    </div>
    <div class="strength-grid">
      ${site.strengths
        .map(
          ({ title, body }) =>
            html`<div class="strength-item"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>`
        )
        .join("")}
    </div>
  </section>

  <section class="section" aria-labelledby="colonist-related">
    <div class="section-head">
      <div>
        <p class="section-kicker">${escapeHtml(page.related.kicker)}</p>
        <h2 class="section-title" id="colonist-related">${escapeHtml(page.related.title)}</h2>
      </div>
      <p class="lead">${escapeHtml(page.related.lead)}</p>
    </div>
    ${renderProjectGrid(related)}
  </section>`;
}

const routes = {
  "/": {
    title: "Stan Shih | Product Developer Portfolio",
    description: "Stan Shih builds end-to-end products across web, mobile, desktop, and browser extensions.",
    render: renderHome
  },
  "/projects": {
    title: "Projects | Stan Shih",
    description: "Selected projects by Stan Shih across web, mobile, desktop, browser extensions, and AI tooling.",
    render: renderProjectsPage
  },
  "/colonist": {
    title: "For Colonist | Stan Shih",
    description: "Stan Shih built an unofficial Colonist.io Stats Tracker before applying to Colonist.",
    render: renderColonistPage
  }
};

function normalizePath(pathname) {
  if (pathname.endsWith("/") && pathname.length > 1) return pathname.slice(0, -1);
  return routes[pathname] ? pathname : "/";
}

function setMeta(route) {
  document.title = route.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", route.description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", route.title);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", route.description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", `https://portfolio.stan-shih.com${normalizePath(location.pathname)}`);
}

function updateActiveNav(path) {
  document.querySelectorAll(".nav a[data-route]").forEach((link) => {
    const current = normalizePath(new URL(link.href).pathname) === path;
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function render() {
  const path = normalizePath(location.pathname);
  const route = routes[path];
  const main = document.querySelector("#main");
  setMeta(route);
  updateActiveNav(path);
  main.innerHTML = route.render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.querySelectorAll("[data-site-link]").forEach((link) => {
  const key = link.dataset.siteLink;
  link.href = links[key];
  if (key === "email" && link.textContent.includes("@")) link.textContent = site.email;
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-route]");
  if (!link) return;

  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();
  history.pushState({}, "", url.pathname);
  render();
});

window.addEventListener("popstate", render);
render();
