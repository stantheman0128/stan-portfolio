// Shared render helpers used by every theme.
export const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Tiny markdown for the `detail` field: blank-line paragraphs, **bold**, *italic*,
// [text](https://url), and single line breaks.
export function md(src) {
  if (!src) return "";
  return String(src)
    .split(/\n\s*\n/)
    .map((para) => {
      let h = esc(para.trim());
      h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return `<p>${h.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

// Only confirmed links — hide "#TODO-" placeholders, matching the live-site convention.
export const realLinks = (links) => (links || []).filter((l) => l && l.href && !String(l.href).startsWith("#TODO"));

// Round a millisecond duration into a display string like "~42 ms"; non-finite
// or non-positive input reads "~0 ms". Featherweight's inline timer mirrors this.
export function formatSpeed(ms) {
  const n = Number.isFinite(ms) && ms > 0 ? Math.round(ms) : 0;
  return "~" + n + " ms";
}

// Read a value by a dot path like "items.3.title"; missing branch -> undefined.
export function getPath(obj, path) {
  return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Write `val` into `obj` at a dot path, in place. Missing steps are created:
// an array when the next key is numeric, an object otherwise. Returns obj.
export function setPath(obj, path, val) {
  const keys = String(path).split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null || typeof o[k] !== "object") {
      o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    o = o[k];
  }
  o[keys[keys.length - 1]] = val;
  return obj;
}

// Edit-mode only: emit a data-bind (and optional data-edit "kind") attribute for a
// content path. Leading space lets it drop straight into a tag. One source of truth
// so every theme annotates fields identically.
export function bindAttr(path, edit, kind) {
  if (!edit) return "";
  return ` data-bind="${esc(path)}"` + (kind ? ` data-edit="${esc(kind)}"` : "");
}
