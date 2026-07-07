// Shared renderer — powers BOTH the public site and the Studio live preview.
// Each theme exports `render(content) -> full HTML document string`.
import { render as featherweight } from "./themes/featherweight.js";
import { render as minimal } from "./themes/minimal.js";

const THEMES = { featherweight, minimal };

export const THEMES_META = [
  { key: "featherweight", label: "Featherweight" },
  { key: "minimal", label: "Minimal" },
];

export function renderSite(content, theme = "featherweight") {
  const fn = THEMES[theme] || featherweight;
  try {
    return fn(content);
  } catch (err) {
    return `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:24px;color:#b00">Render error in theme "${theme}":<pre>${String(err && err.stack || err)}</pre></body>`;
  }
}
