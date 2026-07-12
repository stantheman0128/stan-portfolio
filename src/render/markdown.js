// Markdown edition of the front door for AI agents (self-built "Markdown for
// Agents"): when a request carries Accept: text/markdown the "/" Function
// serves this instead of HTML. Rendered from the same content.json as the
// themes, so it can never drift from the visible site. Empty sections are
// skipped — the owner-published content often leaves whole arrays blank.
import { realLinks } from "./util.js";
import { seoDescription, zhFooterLine } from "./seo.js";

export function renderMarkdown(content) {
  const c = content || {};
  const p = c.profile || {};
  const h = c.headings || {};
  const out = [];

  out.push(`# ${p.name || "Stan Shih"}${p.latinName ? ` (${p.latinName})` : ""}`);
  out.push("");
  if (p.role) out.push(`**${p.role}**`);
  if (p.tagline) out.push(`> ${p.tagline}`);
  out.push("");
  out.push(seoDescription(p));
  if (p.location) out.push(`Based in ${p.location}.`);
  out.push("");

  const aboutParas = ((c.about && c.about.paragraphs) || []).filter(Boolean);
  if (aboutParas.length) {
    out.push(`## ${h.about || "About"}`, "", ...aboutParas.map((t) => t + "\n"));
  }

  const items = (c.items || []).filter((it) => it && it.title);
  if (items.length) {
    out.push(`## ${h.work || "Selected work"}`, "");
    for (const it of items) {
      const meta = [it.status, it.year].filter(Boolean).join(" · ");
      out.push(`### ${it.title}${meta ? ` (${meta})` : ""}`);
      if (it.description) out.push(it.description);
      const links = realLinks(it.links)
        .map((l) => `[${l.label || l.href}](${l.href})`)
        .join(" · ");
      if (links) out.push(links);
      out.push("");
    }
  }

  const pat = c.patent;
  if (pat && pat.title) {
    out.push(`## ${h.patent || "Patent"}`, "");
    out.push(`**${pat.title}**${pat.ids && pat.ids.length ? ` — ${pat.ids.join(" / ")}` : ""}`);
    if (pat.blurb) out.push(pat.blurb);
    out.push("");
  }

  // Contact: profile links only. Email stays out on purpose — the whole site
  // obfuscates mailto: against scrapers and this document is scraper food.
  const contacts = [
    p.githubUrl ? `- GitHub: ${p.githubUrl}` : "",
    p.linkedinUrl ? `- LinkedIn: ${p.linkedinUrl}` : "",
    p.instagramUrl ? `- Instagram: ${p.instagramUrl}` : "",
    p.dcardUrl ? `- Dcard: ${p.dcardUrl}` : "",
    p.threadsUrl ? `- Threads: ${p.threadsUrl}` : "",
  ].filter(Boolean);
  if (contacts.length) out.push(`## ${h.contact || "Contact"}`, "", ...contacts, "");

  out.push("---", "", `${zhFooterLine()} — https://stan-shih.com/`, "");
  return out.join("\n");
}
