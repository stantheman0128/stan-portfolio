// Owner-only edit entry. On the live Minimal page, ask /api/whoami; if this is the
// creator's IP, drop a small fixed link to /edit (the WYSIWYG editor). Self-gating:
// non-creators get nothing. Injected as an inline <script> string, like the other fx.
export const creatorEntryJS = `
(function () {
  fetch("/api/whoami").then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.creator) return;
    var a = document.createElement("a");
    a.href = "/edit";
    a.textContent = "\\u270e Edit this site";
    a.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:9999;" +
      "background:#17151a;color:#fffdfa;font:12px ui-monospace,SFMono-Regular,Consolas,monospace;" +
      "padding:7px 12px;border-radius:999px;text-decoration:none;box-shadow:0 6px 20px rgba(20,20,30,.28)";
    document.body.appendChild(a);
  }).catch(function () {});
})();
`;
