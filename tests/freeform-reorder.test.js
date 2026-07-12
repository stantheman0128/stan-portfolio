import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { moveInArray, newItemTemplate, dropTargetIndex } from "../src/studio/freeform.js";

describe("moveInArray", () => {
  it("moves an element forward to a later final index", () => {
    expect(moveInArray(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });
  it("moves an element backward to an earlier final index", () => {
    expect(moveInArray(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
  it("adjacent swap up (↑ button: from i to i-1)", () => {
    expect(moveInArray(["a", "b", "c"], 1, 0)).toEqual(["b", "a", "c"]);
  });
  it("adjacent swap down (↓ button: from i to i+1)", () => {
    expect(moveInArray(["a", "b", "c"], 1, 2)).toEqual(["a", "c", "b"]);
  });
  it("is a no-op when from === to", () => {
    expect(moveInArray(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
  it("returns a copy on out-of-range indices without throwing", () => {
    expect(moveInArray(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(moveInArray(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
  it("does not mutate the input array", () => {
    const src = ["a", "b", "c"];
    moveInArray(src, 0, 2);
    expect(src).toEqual(["a", "b", "c"]);
  });
});

// dropTargetIndex (exported from freeform.js) converts a "before/after row i"
// insertion slot into the final index for moveInArray. Test the real function.
describe("order panel drop conversion", () => {
  const items = ["a", "b", "c", "d"];
  it("drag item 0 to before item 2 lands it just before c", () => {
    const to = dropTargetIndex(0, 2, false, items.length);
    expect(moveInArray(items, 0, to)).toEqual(["b", "a", "c", "d"]);
  });
  it("drag item 0 to after the last item appends it to the end", () => {
    const to = dropTargetIndex(0, 3, true, items.length);
    expect(moveInArray(items, 0, to)).toEqual(["b", "c", "d", "a"]);
  });
  it("drag item 3 to before item 1 lands it just before b", () => {
    const to = dropTargetIndex(3, 1, false, items.length);
    expect(moveInArray(items, 3, to)).toEqual(["a", "d", "b", "c"]);
  });
  it("dropping a row onto its own slot is a no-op index", () => {
    expect(dropTargetIndex(2, 2, false, 4)).toBe(2);
    expect(dropTargetIndex(2, 2, true, 4)).toBe(2);
  });
  it("clamps into range when the slot resolves past the ends", () => {
    expect(dropTargetIndex(0, 3, true, 4)).toBe(3);
    expect(dropTargetIndex(3, 0, false, 4)).toBe(0);
  });
});

describe("newItemTemplate", () => {
  it("builds a blank project with every field the renderer reads", () => {
    const t = newItemTemplate(0);
    expect(t).toMatchObject({
      title: "New project", status: "", year: "", description: "",
      detail: "", image: "", imageMode: "", links: [],
    });
    expect(t.links).toEqual([]);
  });
  it("derives a base36 id from the timestamp so ids are unique per click", () => {
    expect(newItemTemplate(0).id).toBe("new-0");
    const a = newItemTemplate(1000), b = newItemTemplate(1001);
    expect(a.id).not.toBe(b.id);
    expect(a.id.startsWith("new-")).toBe(true);
  });
});

// Deleting item i from the panel is a plain splice; lock in the resulting order.
describe("panel delete", () => {
  it("removes the targeted item and keeps the rest in order", () => {
    const items = ["a", "b", "c", "d"];
    const next = items.slice(); next.splice(1, 1);
    expect(next).toEqual(["a", "c", "d"]);
  });
});

describe("freeform order panel wiring", () => {
  const src = readFileSync(new URL("../src/studio/freeform.js", import.meta.url), "utf8");
  it("exposes an Order toggle button in the toolbar", () => {
    expect(src).toContain('mkBtn("↕ Order"');
  });
  it("keeps the panel open across render() via a module flag", () => {
    expect(src).toContain("if (orderPanelOpen) buildOrderPanel();");
  });
  it("tags the panel as chrome so it is excluded from editing and hover", () => {
    expect(src).toMatch(/panel\.setAttribute\("data-ff-chrome", ""\)/);
  });
  it("re-renders with a commit after a reorder", () => {
    expect(src).toMatch(/commitNow\(\);\s*render\("Reordered items"\)/);
  });
  it("debounces hover retargeting between cards", () => {
    expect(src).toContain("RETARGET_MS");
    expect(src).toContain("pendingTarget = cand");
  });
  it("sets drag data + effect on dragstart (Firefox/Chromium won't drag without it)", () => {
    expect(src).toContain('setData("text/plain"');
    expect(src).toContain('effectAllowed = "move"');
  });
  it("delegates dragover/drop to the panel so the whole area accepts the drop", () => {
    expect(src).toMatch(/panel\.addEventListener\("dragover"/);
    expect(src).toMatch(/panel\.addEventListener\("drop"/);
    expect(src).toContain('dropEffect = "move"');
  });
  it("gives each row a drag handle", () => {
    expect(src).toContain('handle.className = "handle"');
  });
  it("has a + Add project button that pushes a template and re-renders", () => {
    expect(src).toContain("+ Add project");
    expect(src).toContain("newItemTemplate(Date.now())");
    expect(src).toMatch(/render\("Added project"\)/);
  });
  it("has a per-row delete that splices, commits and re-renders", () => {
    expect(src).toMatch(/render\("Deleted item"\)/);
    expect(src).toContain('del.className = "del"');
  });
  it("flashes the landing row and respects reduced motion", () => {
    expect(src).toContain("flashIndex");
    expect(src).toContain("prefers-reduced-motion: no-preference");
    expect(src).toContain("@keyframes ffFlash");
  });
});

// Site-owner feedback fixes: Exit reload, publish deploy-watch, empty-field hint,
// and the generalised link add/del delegation. Asserted at source level (they touch
// location, timers and the DOM, none unit-testable without a browser).
describe("freeform owner-feedback fixes", () => {
  const src = readFileSync(new URL("../src/studio/freeform.js", import.meta.url), "utf8");

  it("Exit reloads instead of assigning an identical URL (the no-op bug)", () => {
    expect(src).toMatch(/mkBtn\("Exit"[\s\S]*?location\.reload\(\)/);
    // the old rebuilt-URL assignment must be gone
    expect(src).not.toContain('location.href = u + location.hash');
  });

  it("Publish starts a deploy watch instead of a static alert", () => {
    expect(src).toContain("startDeployWatch(baseline)");
    expect(src).not.toContain("Cloudflare rebuilds and deploys in about a minute");
  });

  it("deploy watch polls content.json cache-busted for a newer _build", () => {
    expect(src).toContain('fetch("/data/content.json", { cache: "no-store" })');
    expect(src).toContain("+live._build > baselineBuild");
    expect(src).toContain('setStatus("Deploying…")');
  });

  it("deploy watch reloads after clearing the draft, and times out gracefully", () => {
    expect(src).toMatch(/removeItem\(CONTENT_KEY\);[\s\S]*?location\.reload\(\)/);
    expect(src).toContain('setStatus("Deployed? reload manually")');
  });

  it("an edit during the watch cancels the auto-reload and keeps the edits", () => {
    expect(src).toContain("if (deployWatchActive) cancelDeployWatch()");
    expect(src).toContain('setStatus("New edits kept — reload skipped")');
  });

  it("empty-field hint is short and stays on one line", () => {
    expect(src).toContain('content: "(empty)"');
    expect(src).toContain("white-space: nowrap");
    expect(src).not.toContain("(empty — hidden from visitors)");
  });

  it("link add/del read data-links-path (with data-item fallback) via getPath/setPath", () => {
    expect(src).toContain('hook.closest(".ff-links")');
    expect(src).toContain('box.getAttribute("data-links-path")');
    expect(src).toContain('"items." + ci + ".links"');
    expect(src).toContain('del.getAttribute("data-li")');
    expect(src).toContain('arr.push({ label: "New link", href: "https://" })');
    expect(src).toContain("arr.splice(li, 1)");
  });
});
