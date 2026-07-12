import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";
import { editLinksHTML } from "../src/render/util.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));

// Contract with the freeform editor (src/studio/freeform.js): its delegated click
// handler and contenteditable binding reach the links UI only through these hooks —
//   a container carrying  .ff-links[data-links-path="<content path to the array>"]
//   [data-bind="<path>.{li}.label|href"]   editable label / href nodes
//   .ff-link-del[data-li="{li}"]           delete array[li] of the container's path
//   .ff-link-add                           append a link to the container's path
// (items containers also keep data-item="{ci}" as a legacy fallback.)
// Renaming a class or reshaping these attributes breaks the editor silently.

const delLis = (html) =>
  [...html.matchAll(/<button[^>]*class="ff-link-del"[^>]*>/g)].map((m) => /data-li="([^"]*)"/.exec(m[0])?.[1]);
const addCount = (html) => [...html.matchAll(/<button[^>]*class="ff-link-add"[^>]*>/g)].length;

describe("editLinksHTML editor contract", () => {
  const html = editLinksHTML(
    [
      { label: "Repo", href: "https://example.dev/repo" },
      { label: "Demo", href: "https://example.dev/demo" },
    ],
    3
  );

  it("binds each link's label and href by content path (numeric base = items)", () => {
    expect(html).toContain('data-bind="items.3.links.0.label"');
    expect(html).toContain('data-bind="items.3.links.0.href"');
    expect(html).toContain('data-bind="items.3.links.1.label"');
    expect(html).toContain('data-bind="items.3.links.1.href"');
  });

  it("accepts a full content path base (any {label, href} array)", () => {
    const contactsHtml = editLinksHTML([{ label: "GitHub", href: "https://x" }], "profile.contacts");
    expect(contactsHtml).toContain('data-bind="profile.contacts.0.label"');
    expect(contactsHtml).toContain('data-bind="profile.contacts.0.href"');
  });

  it("emits one delete button per link, data-li = {li}", () => {
    expect(delLis(html)).toEqual(["0", "1"]);
  });

  it("emits exactly one trailing add button", () => {
    expect(addCount(html)).toBe(1);
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

    it("wraps item links in a container with the array path", () => {
      expect(edit).toContain('data-links-path="items.0.links"');
    });

    it("exposes the contacts array through the same link controls", () => {
      expect(edit).toContain('data-links-path="profile.contacts"');
      expect(edit).toContain('data-bind="profile.contacts.0.label"');
    });

    it("emits well-formed data-li on the del buttons", () => {
      const dels = delLis(edit);
      expect(dels.length).toBeGreaterThan(0);
      dels.forEach((v) => expect(v).toMatch(/^\d+$/));
      expect(addCount(edit)).toBeGreaterThan(0);
    });

    it("emits none of the editor link chrome when not editing", () => {
      expect(plain).not.toContain("ff-link-del");
      expect(plain).not.toContain("ff-link-add");
    });
  });
}
