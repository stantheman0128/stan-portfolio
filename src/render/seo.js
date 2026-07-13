// Shared SEO / GEO head fragment for every rendered page.
// Single source of truth for canonical URLs, meta description fallbacks,
// Open Graph / Twitter cards, and the Person + WebSite JSON-LD that AI
// search engines read. Used by both themes and kept static-friendly so the
// tags exist in baked HTML, not only after hydration.

const ORIGIN = "https://stan-shih.com";
// Baked from public/og-image.svg via tools/bake-og-image.mjs — most link-preview
// crawlers (Facebook, LINE, iMessage, Slack) don't render SVG for social cards.
const OG_IMAGE = ORIGIN + "/assets/og-image.png";
const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;
// Chinese legal name plus romanizations/handles people actually search for.
const ALT_NAMES = ["施博瀚", "Po-Han Shih", "Stan10"];
const SITE_NAME = "Stan Shih — Personal Website";
const SITE_ALT_NAMES = ["施博瀚個人網站", "Stan Shih Portfolio", "Stan 個人網站"];

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

function jsonLd(p, desc) {
  const person = {
    "@type": "Person",
    "@id": ORIGIN + "/#person",
    name: p.name || "Stan Shih",
    alternateName: ALT_NAMES,
    url: ORIGIN + "/",
    image: OG_IMAGE,
    jobTitle: p.role || undefined,
    description: desc,
    // No email here on purpose: the themes obfuscate mailto: against
    // scrapers (enforced by featherweight-email-off.test.js).
    address: { "@type": "PostalAddress", addressLocality: "Taipei", addressCountry: "TW" },
    // alumniOf (not affiliation): schools attended, past or present -
    // corroborated by Kang Chiao's own admission announcements, which
    // independently confirm this identity across a third-party domain.
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "National Taiwan Normal University" },
      { "@type": "EducationalOrganization", name: "Kang Chiao International School" },
    ],
    sameAs: [p.githubUrl, p.linkedinUrl, p.instagramUrl, p.dcardUrl, p.threadsUrl].filter(Boolean),
  };
  const site = {
    "@type": "WebSite",
    "@id": ORIGIN + "/#website",
    url: ORIGIN + "/",
    name: SITE_NAME,
    alternateName: SITE_ALT_NAMES,
    inLanguage: ["en", "zh-Hant"],
    about: { "@id": ORIGIN + "/#person" },
  };
  const graph = { "@context": "https://schema.org", "@graph": [person, site] };
  // < guard keeps "</script>" impossible inside the JSON payload.
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

// Full head fragment. `path` is the canonical path for the page being
// rendered ("/" for the front door AND its /fast/ duplicate on purpose:
// the duplicate must point search engines back at the real page).
export function seoHead(p, { path = "/", title, desc } = {}) {
  const canonical = ORIGIN + path;
  const t = title || [p.name, p.role].filter(Boolean).join(" — ");
  const d = desc || seoDescription(p);
  return [
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(t)}">`,
    `<meta property="og:description" content="${esc(d)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    `<meta property="og:image:width" content="${OG_IMAGE_W}">`,
    `<meta property="og:image:height" content="${OG_IMAGE_H}">`,
    `<meta property="og:image:alt" content="${esc(t)}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta property="og:locale:alternate" content="zh_TW">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(t)}">`,
    `<meta name="twitter:description" content="${esc(d)}">`,
    `<meta name="twitter:image" content="${OG_IMAGE}">`,
    `<script type="application/ld+json">${jsonLd(p, d)}</script>`,
  ].join("\n");
}
