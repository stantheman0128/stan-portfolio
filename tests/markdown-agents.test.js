import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderMarkdown } from "../src/render/markdown.js";
import { frontDoorModuleSource } from "../tools/front-door-bake.mjs";
import { onRequest } from "../functions/index.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url), "utf8"));

// Self-built "Markdown for Agents": Accept: text/markdown on "/" answers with a
// markdown rendition baked from the same content.json as the HTML front door.
describe("renderMarkdown", () => {
  const md = renderMarkdown(content);

  it("carries the identity, work items, and patent from content.json", () => {
    expect(md).toContain("# Stan Shih");
    expect(md).toContain("施博瀚");
    expect(md).toContain(content.items[0].title);
    expect(md).toContain(content.patent.ids[0]);
  });

  it("contains no HTML tags and no raw mailto (scraper food stays clean)", () => {
    expect(md).not.toMatch(/<[a-z][\s\S]*?>/i);
    expect(md).not.toContain("mailto:");
  });

  it("skips sections whose content is empty", () => {
    const bare = renderMarkdown({ profile: { name: "X" } });
    expect(bare).not.toContain("## About");
    expect(bare).not.toContain("## Selected work");
  });
});

describe("front-door bake with markdown payload", () => {
  it("emits both HTML and MARKDOWN exports", () => {
    const src = frontDoorModuleSource("<html></html>", "# hi");
    expect(src).toContain("export const HTML =");
    expect(src).toContain('export const MARKDOWN = "# hi"');
  });
});

describe("front-door content negotiation", () => {
  const req = (accept) =>
    onRequest({ request: new Request("https://stan-shih.com/", { headers: accept ? { accept } : {} }) });

  it("serves markdown when the agent asks for it", async () => {
    const res = req("text/markdown");
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("vary")).toBe("accept");
    expect(Number(res.headers.get("x-markdown-tokens"))).toBeGreaterThan(0);
    expect(await res.text()).toContain("# Stan Shih");
  });

  it("keeps HTML as the default for browsers and bare calls", () => {
    expect(req("text/html,*/*").headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(onRequest().headers.get("content-type")).toBe("text/html; charset=utf-8");
  });
});
