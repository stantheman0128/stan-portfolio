import { describe, it, expect } from "vitest";
import { seoHead, seoDescription, zhFooterLine } from "../src/render/seo.js";

const profile = {
  name: "Stan Shih",
  role: "AI Product builder",
  githubUrl: "https://github.com/stantheman0128",
  linkedinUrl: "https://www.linkedin.com/in/po-han-stan-shih-39b713277/",
  email: "stan@stan-shih.com",
};

describe("seoHead", () => {
  const html = seoHead(profile, { path: "/" });

  it("points og:image at the baked PNG with matching width/height/alt", () => {
    expect(html).toMatch(/og:image" content="https:\/\/stan-shih\.com\/assets\/og-image\.png"/);
    expect(html).toContain('og:image:width" content="1200"');
    expect(html).toContain('og:image:height" content="630"');
    expect(html).toContain('og:image:alt" content="Stan Shih — AI Product builder"');
  });

  it("uses summary_large_image now that a real preview image exists", () => {
    expect(html).toContain('twitter:card" content="summary_large_image"');
  });

  it("sets canonical to the given path", () => {
    expect(html).toContain('rel="canonical" href="https://stan-shih.com/"');
  });

  it("keeps email out of the JSON-LD (mailto obfuscation guard)", () => {
    expect(html).not.toContain("mailto:");
  });

  it("emits Person + WebSite JSON-LD referencing the same og:image", () => {
    const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
    const graph = JSON.parse(ld.replace(/\\u003c/g, "<"))["@graph"];
    const person = graph.find((n) => n["@type"] === "Person");
    const site = graph.find((n) => n["@type"] === "WebSite");
    expect(person.image).toBe("https://stan-shih.com/assets/og-image.png");
    expect(person.sameAs).toContain(profile.githubUrl);
    expect(site.about["@id"]).toBe(person["@id"]);
  });
});

describe("seoDescription fallback", () => {
  it("uses the owner-edited subtagline when present", () => {
    expect(seoDescription({ ...profile, subtagline: "hand-written line" })).toBe("hand-written line");
  });

  it("composes an EN+ZH fallback when subtagline is blank", () => {
    const d = seoDescription({ ...profile, subtagline: "", tagline: "I build stuff." });
    expect(d).toContain("Stan Shih");
    expect(d).toContain("施博瀚");
  });
});

describe("zhFooterLine", () => {
  it("contains the real Chinese name so 「施博瀚」queries match visible text", () => {
    expect(zhFooterLine()).toContain("施博瀚");
  });
});
