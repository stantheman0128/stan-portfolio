// Owner-only edit entry, device-unlock model (no whoami, no per-visit request).
// (1) If the URL carries ?unlock=<secret>, verify it once via /api/unlock and, on
//     success, remember this device in localStorage (then scrub the param).
// (2) If this device is unlocked, show a small "Edit" button that loads the editor
//     in place (/editor.js) — no page navigation. Visibility is not a security
//     boundary; publishing is IP-gated server-side.
export const creatorEntryJS = `
(function () {
  var KEY = "can-edit";
  var SESSION_KEY = "edit-key";
  var BTN =
    "position:fixed;left:14px;z-index:99990;background:#17151a;color:#fffdfa;" +
    "border:0;cursor:pointer;font:12px ui-monospace,SFMono-Regular,Consolas,monospace;" +
    "padding:7px 12px;border-radius:999px;box-shadow:0 6px 20px rgba(20,20,30,.28)";
  function showButtons() {
    if (document.getElementById("cst-edit-btn")) return;
    var edit = document.createElement("button");
    edit.id = "cst-edit-btn";
    edit.type = "button";
    edit.textContent = "\\u270e Edit";
    edit.style.cssText = BTN + "bottom:14px";
    edit.addEventListener("click", function () {
      edit.disabled = true; edit.textContent = "\\u2026";
      var s = document.createElement("script");
      s.src = "/editor.js";
      document.body.appendChild(s);
    });
    var rum = document.createElement("button");
    rum.id = "cst-rum-btn";
    rum.type = "button";
    rum.textContent = "\\u2261 RUM";
    rum.style.cssText = BTN + "bottom:52px";
    rum.addEventListener("click", openRumPanel);
    document.body.appendChild(edit);
    document.body.appendChild(rum);
  }
  function openRumPanel() {
    var existing = document.getElementById("cst-rum-panel");
    if (existing) { existing.remove(); return; }
    var panel = document.createElement("aside");
    panel.id = "cst-rum-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "RUM stats");
    panel.style.cssText =
      "position:fixed;inset:14px 14px 96px 14px;z-index:99989;overflow:auto;" +
      "background:#fffdfa;color:#17151a;border:1px solid rgba(20,20,30,.12);" +
      "border-radius:12px;padding:14px 16px;box-shadow:0 18px 48px rgba(20,20,30,.18);" +
      "font:12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace";
    panel.innerHTML = "<p>Loading RUM\\u2026</p>";
    document.body.appendChild(panel);
    var key = "";
    try { key = sessionStorage.getItem(SESSION_KEY) || ""; } catch (e) {}
    fetch("/api/rum-stats?days=7", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ k: key })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) {
        panel.innerHTML = "<p>RUM unavailable: " + esc(d && d.error ? d.error : "unknown") + "</p>";
        return;
      }
      panel.innerHTML =
        "<header style=\\"display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:10px\\">" +
        "<strong>Real-user metrics (last " + d.days + "d)</strong>" +
        "<button type=\\"button\\" id=\\"cst-rum-close\\" style=\\"cursor:pointer;border:0;background:transparent;font:inherit\\">\\u2715</button></header>" +
        section("Overall (ms)", d.overall) +
        section("Vitals — LCP/CLS/bytes (post-upgrade rows)", d.vitals) +
        section("By country (ms)", d.byCountry);
      document.getElementById("cst-rum-close").addEventListener("click", function () {
        panel.remove();
      });
    }).catch(function () {
      panel.innerHTML = "<p>RUM request failed.</p>";
    });
  }
  function section(title, rows) {
    if (!rows || !rows.length) return "<h3 style=\\"margin:12px 0 6px;font-size:12px\\">" + esc(title) + "</h3><p>(no rows)</p>";
    var keys = Object.keys(rows[0]);
    var head = keys.map(function (k) { return "<th style=\\"text-align:left;padding:4px 8px 4px 0\\">" + esc(k) + "</th>"; }).join("");
    var body = rows.map(function (row) {
      return "<tr>" + keys.map(function (k) {
        return "<td style=\\"padding:4px 8px 4px 0\\">" + esc(row[k]) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return "<h3 style=\\"margin:12px 0 6px;font-size:12px\\">" + esc(title) + "</h3>" +
      "<table style=\\"border-collapse:collapse;width:100%\\"><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  try {
    var p = new URLSearchParams(location.search);
    var k = p.get("unlock");
    if (k) {
      fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ k: k }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok) {
            try {
              localStorage.setItem(KEY, "1");
              sessionStorage.setItem(SESSION_KEY, k);
            } catch (e) {}
          }
          p.delete("unlock");
          var q = p.toString();
          history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
          if (d && d.ok) showButtons();
        }).catch(function () {});
    }
    if (localStorage.getItem(KEY) === "1") showButtons();
  } catch (e) {}
})();
`;
