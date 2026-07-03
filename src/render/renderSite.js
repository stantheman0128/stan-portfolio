// Shared renderer — powers BOTH the public site and the Studio live preview.
// Each theme exports `render(content) -> full HTML document string`.
import { render as featherweight } from "./themes/featherweight.js";
import { render as minimal } from "./themes/minimal.js";
import { render as showroom } from "./themes/showroom.js";
import { render as drenched } from "./themes/drenched.js";
import { render as compact } from "./themes/compact.js";

const THEMES = { featherweight, minimal, showroom, drenched, compact };

export const THEMES_META = [
  { key: "featherweight", label: "Featherweight" },
  { key: "minimal", label: "Minimal" },
  { key: "showroom", label: "Showroom" },
  { key: "drenched", label: "Drenched" },
  { key: "compact", label: "Compact" },
];

export function renderSite(content, theme = "featherweight") {
  const fn = THEMES[theme] || featherweight;
  try {
    return fn(content);
  } catch (err) {
    return `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:24px;color:#b00">Render error in theme "${theme}":<pre>${String(err && err.stack || err)}</pre></body>`;
  }
}
