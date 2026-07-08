// Owner-only edit entry, device-unlock model (no whoami, no per-visit request).
// (1) If the URL carries ?unlock=<secret>, verify it once via /api/unlock and, on
//     success, remember this device in localStorage (then scrub the param).
// (2) If this device is unlocked, show a small "Edit" button that loads the editor
//     in place (/editor.js) — no page navigation. Visibility is not a security
//     boundary; publishing is IP-gated server-side.
export const creatorEntryJS = `
(function () {
  var KEY = "can-edit";
  function showButton() {
    if (document.getElementById("cst-edit-btn")) return;
    var b = document.createElement("button");
    b.id = "cst-edit-btn";
    b.type = "button";
    b.textContent = "\\u270e Edit";
    b.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:99990;" +
      "background:#17151a;color:#fffdfa;border:0;cursor:pointer;" +
      "font:12px ui-monospace,SFMono-Regular,Consolas,monospace;" +
      "padding:7px 12px;border-radius:999px;box-shadow:0 6px 20px rgba(20,20,30,.28)";
    b.addEventListener("click", function () {
      b.disabled = true; b.textContent = "\\u2026";
      var s = document.createElement("script");
      s.src = "/editor.js";
      document.body.appendChild(s);
    });
    document.body.appendChild(b);
  }
  try {
    var p = new URLSearchParams(location.search);
    var k = p.get("unlock");
    if (k) {
      fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ k: k }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok) { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
          p.delete("unlock");
          var q = p.toString();
          history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
          if (d && d.ok) showButton();
        }).catch(function () {});
    }
    if (localStorage.getItem(KEY) === "1") showButton();
  } catch (e) {}
})();
`;
