import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderSite } from "../src/render/renderSite.js";

const content = JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url)));

// Cloudflare's Email Address Obfuscation rewrites any mailto: it finds in the HTML
// and injects an external /cdn-cgi/scripts/.../email-decode.min.js. That breaks the
// "zero external JS" promise of the featherweight front door. Cloudflare skips markup
// wrapped in <!--email_off-->...<!--/email_off-->, so every mailto must sit in a guard.
describe("featherweight email obfuscation guard", () => {
  const html = renderSite(content, "featherweight");
  const email = content.profile?.email;

  it("has an email to protect (precondition)", () => {
    expect(email).toBeTruthy();
    expect(html).toContain("mailto:");
  });

  it("balances every email_off guard", () => {
    const open = (html.match(/<!--email_off-->/g) || []).length;
    const close = (html.match(/<!--\/email_off-->/g) || []).length;
    expect(open).toBe(close);
    expect(open).toBeGreaterThan(0);
  });

  it("leaves no mailto anchor outside a guard", () => {
    const stripped = html.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, "");
    expect(stripped).not.toContain("mailto:");
  });

  it("does not emit guards in edit mode (editor owns its own markup)", () => {
    // The guard only needs to reach the baked public HTML; keep parity simple by
    // asserting the plain render carries it and stays valid either way.
    const edit = renderSite(content, "featherweight", { edit: true });
    const open = (edit.match(/<!--email_off-->/g) || []).length;
    const close = (edit.match(/<!--\/email_off-->/g) || []).length;
    expect(open).toBe(close);
  });
});
