// Shared SEO / GEO head fragment for every rendered page.
// Single source of truth for canonical URLs, meta description fallbacks,
// Open Graph / Twitter cards, and the Person + WebSite JSON-LD that AI
// search engines read. Used by both themes and kept static-friendly so the
// tags exist in baked HTML, not only after hydration.

export const ORIGIN = "https://stan-shih.com";
// Baked from public/og-image.svg via tools/bake-og-image.mjs — most link-preview
// crawlers (Facebook, LINE, iMessage, Slack) don't render SVG for social cards.
const OG_IMAGE = ORIGIN + "/assets/og-image.png";
const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;
// Chinese legal name plus romanizations/handles people actually search for.
const ALT_NAMES = ["施博瀚", "Po-Han Shih", "Stan10"];
// Only link live owner profiles. The former Wikidata item returned 404 when
// checked on 2026-09-14; an unavailable item is not an identity reference.
const SITE_NAME = "Stan Shih 施博瀚 — Personal Website";
const SITE_ALT_NAMES = ["施博瀚個人網站", "Stan Shih Portfolio", "Stan 個人網站"];
// Public ownership token supplied by Google Search Console on 2026-09-14.
const GOOGLE_SITE_VERIFICATION = "HOLEWUFHYgv-p5aK1rwKl4Eog6kgFdy2-b8b4SK7efo";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Meta description with a working fallback chain: the owner-editable
// subtagline wins; when it is blank (as it is today) we compose one that
// carries both the English pitch and the Chinese search anchors.
export function seoDescription(p) {
  if (p.subtagline) return p.subtagline;
  const pitch = [p.name, p.role].filter(Boolean).join(" — ");
  return (
    `${pitch}. ${p.tagline || ""} ` +
    "施博瀚的個人網站與作品集 · Personal website & portfolio."
  ).replace(/\s+/g, " ").trim();
}

// One visible line of Chinese so queries like 「施博瀚」「個人網站」 match
// real on-page text, not just metadata. Themes drop it into their footer.
export function zhFooterLine() {
  return "施博瀚（Stan Shih）· 個人網站 · Personal website";
}

export function displayName(p) {
  return [p.name || "Stan Shih", p.chineseName].filter(Boolean).join(" · ");
}

export function seoTitle(p) {
  return [displayName(p), (p.role || "").split(" · ")[0]].filter(Boolean).join(" — ");
}

export function publicUrl(href) {
  if (typeof href !== "string" || !href.trim()) return "";
  try {
    const url = new URL(href, ORIGIN);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function jsonLd(p, { path, title, desc, lang, pageType, article, breadcrumbs }) {
  const canonical = ORIGIN + path;
  const person = {
    "@type": "Person",
    "@id": ORIGIN + "/#person",
    name: p.name || "Stan Shih",
    alternateName: [...new Set([...ALT_NAMES, p.chineseName, p.latinName, "stantheman0128"].filter(Boolean))],
    url: ORIGIN + "/about",
    image: p.imageUrl ? publicUrl(p.imageUrl) : OG_IMAGE,
    jobTitle: p.role || undefined,
    description: seoDescription(p),
    knowsAbout: p.focus?.length ? p.focus : undefined,
    // No email here on purpose: the themes obfuscate mailto: against
    // scrapers (enforced by featherweight-email-off.test.js).
    address: { "@type": "PostalAddress", addressLocality: "Taipei", addressCountry: "TW" },
    sameAs: [p.githubUrl, p.linkedinUrl, p.instagramUrl, p.dcardUrl, p.threadsUrl].filter(Boolean).map(publicUrl).filter(Boolean),
  };
  const site = {
    "@type": "WebSite",
    "@id": ORIGIN + "/#website",
    url: ORIGIN + "/",
    name: SITE_NAME,
    alternateName: SITE_ALT_NAMES,
    inLanguage: ["en", "zh-Hant"],
    about: { "@id": ORIGIN + "/#person" },
    publisher: { "@id": ORIGIN + "/#person" },
  };
  const page = {
    "@type": pageType,
    "@id": canonical + "#webpage",
    url: canonical,
    name: title,
    description: desc,
    inLanguage: lang,
    isPartOf: { "@id": ORIGIN + "/#website" },
    about: { "@id": ORIGIN + "/#person" },
    ...(pageType === "ProfilePage" ? { mainEntity: { "@id": ORIGIN + "/#person" } } : {}),
  };
  const nodes = [person, site, page];
  if (article) {
    page.mainEntity = { "@id": canonical + "#article" };
    nodes.push({
      "@type": "Article", "@id": canonical + "#article", headline: title,
      description: desc, inLanguage: lang, dateModified: article.modified,
      author: { "@id": ORIGIN + "/#person" },
      publisher: { "@id": ORIGIN + "/#person" },
      mainEntityOfPage: { "@id": page["@id"] },
      ...(article.image ? { image: publicUrl(article.image) } : {}),
      citation: (article.sources || []).map(s => publicUrl(s.href)).filter(Boolean),
    });
  }
  if (breadcrumbs?.length) {
    page.breadcrumb = { "@id": canonical + "#breadcrumb" };
    nodes.push({
      "@type": "BreadcrumbList", "@id": canonical + "#breadcrumb",
      itemListElement: breadcrumbs.map((crumb, i) => ({
        "@type": "ListItem", position: i + 1, name: crumb.name, item: ORIGIN + crumb.path,
      })),
    });
  }
  const graph = { "@context": "https://schema.org", "@graph": nodes };
  // < guard keeps "</script>" impossible inside the JSON payload.
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

// Full head fragment. `path` is the canonical path for the page being
// rendered ("/" for the front door AND its /fast/ duplicate on purpose:
// the duplicate must point search engines back at the real page).
export function seoHead(p, { path = "/", title, desc, lang = "en", pageType = "WebPage", alternates = [], article, breadcrumbs } = {}) {
  const canonical = ORIGIN + path;
  const t = title || seoTitle(p);
  const d = desc || seoDescription(p);
  return [
    `<link rel="canonical" href="${canonical}">`,
    ...(path === "/" ? [`<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">`] : []),
    ...alternates.map(a => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(ORIGIN + a.path)}">`),
    `<meta name="robots" content="index,follow,max-image-preview:large">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(t)}">`,
    `<meta property="og:description" content="${esc(d)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    `<meta property="og:image:width" content="${OG_IMAGE_W}">`,
    `<meta property="og:image:height" content="${OG_IMAGE_H}">`,
    `<meta property="og:image:alt" content="${esc(t)}">`,
    `<meta property="og:locale" content="${lang === "zh-Hant" ? "zh_TW" : "en_US"}">`,
    `<meta property="og:locale:alternate" content="${lang === "zh-Hant" ? "en_US" : "zh_TW"}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(t)}">`,
    `<meta name="twitter:description" content="${esc(d)}">`,
    `<meta name="twitter:image" content="${OG_IMAGE}">`,
    `<script type="application/ld+json">${jsonLd(p, { path, title: t, desc: d, lang, pageType, article, breadcrumbs })}</script>`,
  ].join("\n");
}
