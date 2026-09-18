import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { editorialPages, publishedStudies, sitemapXml } from "../src/render/editorial.js";
import { renderSite } from "../src/render/renderSite.js";
import { seoTitle } from "../src/render/seo.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url), "utf8"));
const graph = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];

describe("searchable identity and case-study pages", () => {
  const pages = editorialPages(content);

  it("keeps identity on the homepage and excludes the external redirect from search pages", () => {
    for (const [path, lang] of [["/zh/about", "zh-Hant"]]) {
      const html = pages.find(p => p.path === path).html;
      expect(html).toContain(`<html lang="${lang}">`);
      expect(html).toContain(`rel="canonical" href="https://stan-shih.com${path}"`);
      expect(html).not.toContain('hreflang="en"');
      expect(pages.some(p => p.path === "/about")).toBe(false);
      const nodes = graph(html);
      const profile = nodes.find(n => n["@type"] === "ProfilePage");
      const person = nodes.find(n => n["@type"] === "Person");
      expect(profile.mainEntity["@id"]).toBe(person["@id"]);
      expect(person["@id"]).toBe("https://stan-shih.com/#person");
      expect(person.alternateName).toEqual(expect.arrayContaining(["施博瀚", "Po-Han Shih", "stantheman0128"]));
      expect(person.url).toBe("https://stan-shih.com/");
      expect(person.image).toBe("https://stan-shih.com/assets/reward-photo.jpg");
      expect(html).not.toContain("Q140533907");
    }
  });

  it("bakes full, attributed article content with a distinct canonical URL", () => {
    for (const s of content.caseStudies) {
      const html = pages.find(p => p.path === `/work/${s.slug}`).html;
      expect(html).toContain('<a rel="author" href="/">');
      expect(html).toContain('id="main"');
      expect(html).not.toContain('fetch(');
      for (const section of s.sections) expect(html).toContain(section.title);
      const article = graph(html).find(n => n["@type"] === "Article");
      expect(article.author["@id"]).toBe("https://stan-shih.com/#person");
      expect(article.mainEntityOfPage["@id"]).toBe(`https://stan-shih.com/work/${s.slug}#webpage`);
      // Per-article descriptions must never redefine the author as that product.
      expect(graph(html).find(n => n["@type"] === "Person").description).toBe(content.profile.subtagline);
    }
  });

  it("excludes removed projects instead of resurrecting their case studies", () => {
    const removed = { ...content, items: content.items.filter(i => i.id !== "line-notify-plus") };
    expect(publishedStudies(removed).some(s => s.itemId === "line-notify-plus")).toBe(false);
    expect(editorialPages(removed).some(p => p.path === "/work/notify-plus")).toBe(false);
  });

  it("connects software, its maintainer and the visible repository without claiming upstream authorship", () => {
    for (const slug of ["antnest-chatbot", "claudepulse", "notify-plus"]) {
      const html = pages.find(p => p.path === `/work/${slug}`).html;
      const nodes = graph(html);
      const software = nodes.find(n => n["@type"] === "SoftwareSourceCode");
      const article = nodes.find(n => n["@type"] === "Article");
      const page = nodes.find(n => n["@type"] === "WebPage");
      expect(article.about["@id"]).toBe(software["@id"]);
      expect(page.about).toEqual(article.about);
      expect(software.subjectOf["@id"]).toBe(article["@id"]);
      expect(software.maintainer["@id"]).toBe("https://stan-shih.com/#person");
      expect(html).toContain(`href="${software.codeRepository}"`);
      expect(software).not.toHaveProperty("author");
      expect(software).not.toHaveProperty("creator");
    }
    const paper = graph(pages.find(p => p.path === "/work/paper-stan").html);
    expect(paper.some(n => n["@type"] === "SoftwareSourceCode")).toBe(false);
    const altered = structuredClone(content);
    altered.caseStudies.find(s => s.slug === "notify-plus").sources = [];
    const withoutSource = graph(editorialPages(altered).find(p => p.path === "/work/notify-plus").html);
    expect(withoutSource.some(n => n["@type"] === "SoftwareSourceCode")).toBe(false);
    altered.caseStudies.find(s => s.slug === "claudepulse").sources = [{
      label: "Upstream inspiration", href: "https://github.com/tzangms/claudepulse",
    }];
    const upstream = graph(editorialPages(altered).find(p => p.path === "/work/claudepulse").html);
    expect(upstream.some(n => n["@type"] === "SoftwareSourceCode")).toBe(false);
  });

  it("rejects path traversal and duplicate slugs before writing build files", () => {
    const altered = structuredClone(content);
    altered.caseStudies[0].slug = "../about";
    expect(() => editorialPages(altered)).toThrow(/slugs/);
    altered.caseStudies[0].slug = altered.caseStudies[1].slug;
    expect(() => editorialPages(altered)).toThrow(/slugs/);
  });

  it("escapes CMS-authored text in HTML and JSON-LD", () => {
    const altered = structuredClone(content);
    altered.profile.name = '</script><img src=x onerror="alert(1)">';
    const html = editorialPages(altered)[0].html;
    expect(html).not.toContain('<img src=x');
    expect(graph(html).find(n => n["@type"] === "Person").name).toBe(altered.profile.name);
  });

  it("lists each canonical page once and excludes duplicate host aliases", () => {
    const paths = ["/", "/interactive", ...pages.map(p => p.path), "/"];
    const xml = sitemapXml(paths);
    expect([...xml.matchAll(/<loc>/g)]).toHaveLength(new Set(paths).size);
    for (const p of pages) expect(xml).toContain(`<loc>https://stan-shih.com${p.path}</loc>`);
    expect(xml).not.toMatch(/pages\.dev|portfolio\.stan-shih\.com|<lastmod>/);
  });

  it("shows both names in the homepage title and h1, with discoverable page links", () => {
    expect(seoTitle(content.profile)).toContain("施博瀚");
    for (const theme of ["featherweight", "minimal"]) {
      const html = renderSite(content, theme);
      const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1];
      expect(h1).toContain("Stan Shih");
      expect(h1).toContain("施博瀚");
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/zh/about"');
      expect(html).toContain('href="/work"');
    }
  });
});
