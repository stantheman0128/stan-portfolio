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
