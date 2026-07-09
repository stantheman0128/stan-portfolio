import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";
import { editLinksHTML } from "../src/render/util.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));

// Contract with the freeform editor (src/studio/freeform.js): its delegated click
// handler and contenteditable binding reach the links UI only through these hooks —
//   [data-bind="items.{ci}.links.{li}.label|href"]  editable label / href nodes
//   .ff-link-del[data-link="{ci}.{li}"]             delete links[li] of items[ci]
//   .ff-link-add[data-item="{ci}"]                  append a link to items[ci]
// Renaming a class or reshaping data-link / data-item breaks the editor silently.

const delLinks = (html) =>
  [...html.matchAll(/<button[^>]*class="ff-link-del"[^>]*>/g)].map((m) => /data-link="([^"]*)"/.exec(m[0])?.[1]);
const addItems = (html) =>
  [...html.matchAll(/<button[^>]*class="ff-link-add"[^>]*>/g)].map((m) => /data-item="([^"]*)"/.exec(m[0])?.[1]);

describe("editLinksHTML editor contract", () => {
  const html = editLinksHTML(
    [
      { label: "Repo", href: "https://example.dev/repo" },
      { label: "Demo", href: "https://example.dev/demo" },
    ],
    3
  );

  it("binds each link's label and href by content path", () => {
    expect(html).toContain('data-bind="items.3.links.0.label"');
    expect(html).toContain('data-bind="items.3.links.0.href"');
    expect(html).toContain('data-bind="items.3.links.1.label"');
    expect(html).toContain('data-bind="items.3.links.1.href"');
  });

  it("emits one delete button per link, data-link = {ci}.{li}", () => {
    expect(delLinks(html)).toEqual(["3.0", "3.1"]);
  });

  it("emits one trailing add button, data-item = {ci}", () => {
    expect(addItems(html)).toEqual(["3"]);
  });
});

for (const theme of ["featherweight", "minimal"]) {
  describe(`${theme} edit-mode links carry the editor hooks`, () => {
    const edit = renderSite(content, theme, { edit: true });
    const plain = renderSite(content, theme);

    it("binds item 0's first link by true content path", () => {
      // Edit mode must receive RAW links (no realLinks filtering) so indices
      // match content.json; otherwise the editor writes to the wrong link.
      expect(edit).toContain('data-bind="items.0.links.0.label"');
      expect(edit).toContain('data-bind="items.0.links.0.href"');
    });

    it("emits well-formed data-link / data-item on the del and add buttons", () => {
      const dels = delLinks(edit);
      const adds = addItems(edit);
      expect(dels.length).toBeGreaterThan(0);
      expect(adds.length).toBeGreaterThan(0);
      dels.forEach((v) => expect(v).toMatch(/^\d+\.\d+$/));
      adds.forEach((v) => expect(v).toMatch(/^\d+$/));
      expect(dels).toContain("0.0");
      expect(adds).toContain("0");
    });

    it("emits none of the editor link chrome when not editing", () => {
      expect(plain).not.toContain("ff-link-del");
      expect(plain).not.toContain("ff-link-add");
    });
  });
}
