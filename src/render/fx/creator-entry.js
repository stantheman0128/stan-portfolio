// Owner-only edit entry, device-unlock model (no whoami, no per-visit request).
// (1) If the URL carries ?unlock=<secret>, verify it once via /api/unlock and, on
//     success, remember this device in localStorage (keep ?unlock= in the URL).
// (2) If this device is unlocked, show a small "Edit" button that loads the editor
//     in place (/editor.js) — no page navigation. Visibility is not a security
//     boundary; publishing is IP-gated server-side.
export const creatorEntryJS = `
(function () {
  var KEY = "can-edit";
  var SESSION_KEY = "edit-key";
  var BTN =
    "position:fixed;left:14px;z-index:99990;background:#17151a;color:#fffdfa;" +
    "border:0;cursor:pointer;font:13px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;" +
    "padding:9px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(20,20,30,.28);";
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
    rum.style.cssText = BTN + "bottom:58px";
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
      "position:fixed;inset:14px 14px 110px 14px;z-index:99989;overflow:auto;" +
      "background:#fffdfa;color:#17151a;border:1px solid rgba(20,20,30,.12);" +
      "border-radius:12px;padding:18px 20px;box-shadow:0 18px 48px rgba(20,20,30,.18);" +
      "font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
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
        "<header style=\\"display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:16px\\">" +
        "<strong style=\\"font-size:20px;letter-spacing:-.02em\\">\\u771f實使用者效能（近 " + d.days + " 天）</strong>" +
        "<button type=\\"button\\" id=\\"cst-rum-close\\" style=\\"cursor:pointer;border:0;background:transparent;font:inherit;font-size:22px;line-height:1;padding:4px\\">\\u2715</button></header>" +
        metricBlock("\\u6574體表現", "\\u6240有送出 RUM 的造訪", d.overall, ["visits", "ttfb_p50", "ttfb_p95", "load_p95"]) +
        metricBlock("\\u6838\\u5fc3 Web \\u6307\\u6a19", "\\u50c5含已記錄 LCP \\u7684較新 beacon", d.vitals, ["visits", "lcp_p50", "lcp_p75", "cls_p75", "bytes_p50", "bytes_p75"]) +
        countryBlock(d.byCountry);
      document.getElementById("cst-rum-close").addEventListener("click", function () {
        panel.remove();
      });
    }).catch(function () {
      panel.innerHTML = "<p>RUM request failed.</p>";
    });
  }
  var METRIC = {
    visits: { label: "\\u9020\\u8a2a\\u6b21\\u6578", hint: "\\u6709\\u6210\\u529f\\u9001\\u51fa RUM \\u4fe1\\u6a19\\u7684\\u9801\\u9762\\u8f09\\u5165\\u6b21\\u6578" },
    ttfb_p50: { label: "\\u670d\\u52d9\\u5668\\u56de\\u61c9\\u6642\\u9593\\uff08\\u5178\\u578b\\uff09", hint: "TTFB \\u7b2c 50 \\u767e\\u5206\\u4f4d\\uff1a\\u4e00\\u534a\\u8a2a\\u5ba2\\u6bd4\\u9019\\u500b\\u5feb", unit: "ms" },
    ttfb_p95: { label: "\\u670d\\u52d9\\u5668\\u56de\\u61c9\\u6642\\u9593\\uff08\\u6700\\u6162 5%\\uff09", hint: "TTFB \\u7b2c 95 \\u767e\\u5206\\u4f4d\\uff1a\\u6700\\u6162\\u7684 5% \\u9020\\u8a2a", unit: "ms" },
    fcp_p95: { label: "\\u9996\\u6b21\\u7e6a\\u5716\\u6642\\u9593\\uff08\\u6700\\u6162 5%\\uff09", hint: "FCP \\u7b2c 95 \\u767e\\u5206\\u4f4d", unit: "ms" },
    load_p95: { label: "\\u5b8c\\u6574\\u8f09\\u5165\\u6642\\u9593\\uff08\\u6700\\u6162 5%\\uff09", hint: "\\u7b2c 95 \\u767e\\u5206\\u4f4d\\u7684 load \\u4e8b\\u4ef6", unit: "ms" },
    lcp_p50: { label: "\\u6700\\u5927\\u5167\\u5bb9\\u7e6a\\u5236 LCP\\uff08\\u5178\\u578b\\uff09", hint: "\\u4e3b\\u5167\\u5bb9\\u51fa\\u73fe\\u6642\\u9593\\uff1b\\u5efa\\u8b70 &lt; 2500 ms", unit: "ms" },
    lcp_p75: { label: "\\u6700\\u5927\\u5167\\u5bb9\\u7e6a\\u5236 LCP\\uff08\\u50c5 75%\\uff09", hint: "75% \\u9020\\u8a2a\\u5728\\u9019\\u500b\\u6642\\u9593\\u5167\\u770b\\u5230\\u4e3b\\u5167\\u5bb9", unit: "ms" },
    cls_p75: { label: "\\u7248\\u9762\\u4f4d\\u79fb CLS\\uff08\\u50c5 75%\\uff09", hint: "\\u8d8a\\u63a5\\u8fd1 0 \\u8d8a\\u597d\\uff1b\\u5efa\\u8b70 &lt; 0.1", unit: "score" },
    bytes_p50: { label: "\\u50b3\\u8f38\\u91cf\\uff08\\u5178\\u578b\\uff09", hint: "HTML + \\u8cc7\\u6e90\\u7684\\u9996\\u8a2a\\u50b3\\u8f38\\u91cf", unit: "bytes" },
    bytes_p75: { label: "\\u50b3\\u8f38\\u91cf\\uff08\\u50c5 75%\\uff09", hint: "75% \\u9020\\u8a2a\\u7684\\u50b3\\u8f38\\u91cf", unit: "bytes" },
    country: { label: "\\u570b\\u5bb6 / \\u5730\\u5340", hint: "Cloudflare \\u4f9d\\u9020\\u8a2a IP \\u5224\\u65b7" }
  };
  function metricCard(key, raw) {
    var m = METRIC[key] || { label: key, hint: "" };
    return "<article style=\\"padding:14px 16px;border:1px solid rgba(20,20,30,.1);border-radius:10px;background:#fff\\">" +
      "<div style=\\"font-size:15px;font-weight:600;line-height:1.35;margin-bottom:6px\\">" + m.label + "</div>" +
      "<div style=\\"font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.2;margin-bottom:6px\\">" +
      esc(fmtVal(key, raw)) + (m.unit === "ms" ? "<span style=\\"font-size:15px;font-weight:500;color:#5e5e66;margin-left:4px\\">ms</span>" : "") +
      "</div>" +
      (m.hint ? "<div style=\\"font-size:13px;color:#5e5e66;line-height:1.45\\">" + m.hint + "</div>" : "") +
      "</article>";
  }
  function metricBlock(title, subtitle, rows, keys) {
    if (!rows || !rows.length) {
      return "<section style=\\"margin-top:20px\\"><h3 style=\\"margin:0 0 4px;font-size:18px;font-weight:700\\">" + esc(title) +
        "</h3><p style=\\"margin:0 0 10px;color:#5e5e66;font-size:14px\\">" + esc(subtitle) + "</p><p style=\\"color:#5e5e66\\">\\uff08\\u7121\\u8cc7\\u6599\\uff09</p></section>";
    }
    var row = rows[0];
    var cards = keys.filter(function (k) { return row[k] != null && row[k] !== ""; })
      .map(function (k) { return metricCard(k, row[k]); }).join("");
    return "<section style=\\"margin-top:20px\\"><h3 style=\\"margin:0 0 4px;font-size:18px;font-weight:700\\">" + esc(title) +
      "</h3><p style=\\"margin:0 0 12px;color:#5e5e66;font-size:14px\\">" + esc(subtitle) + "</p>" +
      "<div style=\\"display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:12px\\">" + cards + "</div></section>";
  }
  function countryBlock(rows) {
    if (!rows || !rows.length) {
      return "<section style=\\"margin-top:20px\\"><h3 style=\\"margin:0 0 12px;font-size:18px;font-weight:700\\">\\u6309\\u570b\\u5bb6</h3><p style=\\"color:#5e5e66\\">\\uff08\\u7121\\u8cc7\\u6599\\uff09</p></section>";
    }
    var body = rows.map(function (row) {
      var keys = ["visits", "ttfb_p50", "ttfb_p95", "fcp_p95", "load_p95"];
      var cards = keys.filter(function (k) { return row[k] != null; })
        .map(function (k) { return metricCard(k, row[k]); }).join("");
      var country = row.country != null ? String(row.country) : "?";
      return "<div style=\\"margin-bottom:16px;padding:14px 16px;border:1px solid rgba(20,20,30,.1);border-radius:10px;background:#fafafa\\">" +
        "<div style=\\"font-size:17px;font-weight:700;margin-bottom:10px\\">" + esc(country) + "</div>" +
        "<div style=\\"display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:10px\\">" + cards + "</div></div>";
    }).join("");
    return "<section style=\\"margin-top:20px\\"><h3 style=\\"margin:0 0 12px;font-size:18px;font-weight:700\\">\\u6309\\u570b\\u5bb6</h3>" + body + "</section>";
  }
  function fmtVal(k, v) {
    if (v == null || v === "") return "\\u2014";
    if (k.indexOf("bytes") >= 0) {
      var n = Number(v);
      if (!isFinite(n) || n <= 0) return "\\u2014";
      if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
      return Math.round(n / 1024) + " KB";
    }
    if (k === "cls_p75") return Number(v).toFixed(3);
    return String(v);
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function ensureDevUrl() {
    try {
      if (localStorage.getItem(KEY) !== "1") return;
      var k = sessionStorage.getItem(SESSION_KEY);
      if (!k) return;
      var p = new URLSearchParams(location.search);
      if (p.get("unlock") === k) return;
      p.set("unlock", k);
      history.replaceState(null, "", location.pathname + "?" + p.toString() + location.hash);
    } catch (e) {}
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
            showButtons();
            ensureDevUrl();
          } else {
            p.delete("unlock");
            var q = p.toString();
            history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
          }
        }).catch(function () {});
    }
    if (localStorage.getItem(KEY) === "1") {
      showButtons();
      ensureDevUrl();
    }
  } catch (e) {}
})();
`;
