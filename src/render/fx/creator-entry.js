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
  // Read the unlock key, localStorage first then sessionStorage. localStorage makes
  // the key survive a browser restart so this device can keep publishing without
  // re-entering ?unlock= (the owner's explicit "bind this machine" requirement).
  // Security trade-off: a persisted secret is readable by any XSS on this origin. We
  // accept it — the site ships zero third-party script, and the key only authorizes
  // editing the owner's own site content, not anything else.
  function readEditKey() {
    try { var lk = localStorage.getItem(SESSION_KEY); if (lk) return lk; } catch (e) {}
    try { return sessionStorage.getItem(SESSION_KEY) || ""; } catch (e) {}
    return "";
  }
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
  var RUM_DAYS = 7;
  var RUM_RANGES = [7, 14, 30];
  function openRumPanel() {
    var existing = document.getElementById("cst-rum-panel");
    if (existing) { existing.remove(); return; }
    var panel = document.createElement("aside");
    panel.id = "cst-rum-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "RUM stats");
    panel.setAttribute("data-ff-chrome", "");
    panel.style.cssText =
      "position:fixed;inset:14px 14px 110px 14px;z-index:99989;overflow:auto;" +
      "background:#fffdfa;color:#17151a;border:1px solid rgba(20,20,30,.12);" +
      "border-radius:12px;padding:18px 20px;box-shadow:0 18px 48px rgba(20,20,30,.18);" +
      "font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
    document.body.appendChild(panel);
    loadRum(panel, RUM_DAYS);
  }
  function loadRum(panel, days) {
    RUM_DAYS = days;
    panel.innerHTML = "<p style=\\"color:#5e5e66\\">\\u6b63在載入 RUM\\u2026（近 " + days + " 天）</p>";
    var key = readEditKey();
    fetch("/api/rum-stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ k: key, days: days })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) {
        panel.innerHTML = "<p>RUM unavailable: " + esc(d && d.error ? d.error : "unknown") + "</p>";
        return;
      }
      renderRum(panel, d);
    }).catch(function () {
      panel.innerHTML = "<p>RUM request failed.</p>";
    });
  }
  function rangeBar(cur) {
    var btns = RUM_RANGES.map(function (n) {
      var on = n === cur;
      var css = "cursor:pointer;font:inherit;font-size:13px;padding:6px 14px;border-radius:999px;" +
        (on
          ? "background:#17151a;color:#fffdfa;border:1px solid #17151a;font-weight:600"
          : "background:#fff;color:#17151a;border:1px solid rgba(20,20,30,.18)");
      return "<button type=\\"button\\" class=\\"cst-rum-range\\" data-days=\\"" + n +
        "\\" aria-pressed=\\"" + (on ? "true" : "false") + "\\" style=\\"" + css + "\\">\\u8fd1 " + n + " 天</button>";
    }).join("");
    return "<div style=\\"display:flex;gap:8px;margin-bottom:16px\\">" + btns + "</div>";
  }
  // Static teaching diagram: the four page-load moments in order, so the owner can
  // see TTFB / FCP / LCP / Load are four timestamps of one load, not rival metrics.
  var TIMELINE = [
    { k: "TTFB", d: "伺服器送回第一個位元組" },
    { k: "FCP", d: "畫面出現第一個東西" },
    { k: "LCP", d: "主要內容出現" },
    { k: "Load", d: "全部載完" }
  ];
  function timelineLegend() {
    var cols = TIMELINE.map(function (node, i) {
      var left = i === 0 ? "transparent" : "rgba(20,20,30,.2)";
      var right = i === TIMELINE.length - 1 ? "transparent" : "rgba(20,20,30,.2)";
      return "<div style=\\"flex:1;text-align:center\\">" +
        "<div style=\\"font:12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:700;color:#17151a\\">" + node.k + "</div>" +
        "<div style=\\"display:flex;align-items:center;margin:7px 0\\">" +
          "<span style=\\"flex:1;height:1px;background:" + left + "\\"></span>" +
          "<span style=\\"width:9px;height:9px;border-radius:999px;background:#17151a;flex:0 0 auto\\"></span>" +
          "<span style=\\"flex:1;height:1px;background:" + right + "\\"></span>" +
        "</div>" +
        "<div style=\\"font-size:11px;color:#5e5e66;line-height:1.35;padding:0 4px\\">" + node.d + "</div>" +
        "</div>";
    }).join("");
    return "<section style=\\"margin:0 0 18px;padding:14px 16px 16px;border:1px solid rgba(20,20,30,.1);border-radius:10px;background:#fafafa\\">" +
      "<div style=\\"font-size:13px;color:#5e5e66;margin-bottom:6px\\">一次載入的四個時刻（由早到晚）</div>" +
      "<div style=\\"display:flex;align-items:flex-start\\">" + cols + "</div></section>";
  }
  function renderRum(panel, d) {
    panel.innerHTML =
      "<header style=\\"display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:6px\\">" +
      "<strong style=\\"font-size:20px;letter-spacing:-.02em\\">\\u771f實使用者效能（近 " + d.days + " 天）</strong>" +
      "<button type=\\"button\\" id=\\"cst-rum-close\\" style=\\"cursor:pointer;border:0;background:transparent;font:inherit;font-size:22px;line-height:1;padding:4px\\">\\u2715</button></header>" +
      "<p style=\\"margin:0 0 14px;color:#5e5e66;font-size:13px;line-height:1.5\\">\\u9019些是真實訪客瀏覽器回報的速度。每張卡片的橫條越短越綠代表越快，超過\\u300c良好門檻\\u300d會轉成橘紅。</p>" +
      rangeBar(d.days) +
      timelineLegend() +
      metricBlock("\\u6574體表現", "\\u6240有送出 RUM 的造訪", d.overall, ["visits", "ttfb_p50", "ttfb_p95", "load_p95"]) +
      metricBlock("\\u6838\\u5fc3 Web \\u6307\\u6a19", "\\u50c5含已記錄 LCP \\u7684較新 beacon", d.vitals, ["visits", "lcp_p50", "lcp_p75", "cls_p75", "bytes_p50", "bytes_p75"]) +
      recentBlock(d.recent) +
      countryBlock(d.byCountry);
    document.getElementById("cst-rum-close").addEventListener("click", function () {
      panel.remove();
    });
    var ranges = panel.querySelectorAll(".cst-rum-range");
    for (var i = 0; i < ranges.length; i++) {
      ranges[i].addEventListener("click", function () {
        loadRum(panel, Number(this.getAttribute("data-days")) || 7);
      });
    }
  }
  var METRIC = {
    visits: { label: "造訪次數", hint: "有成功送出 RUM 信標的頁面載入次數" },
    ttfb_p50: { label: "伺服器回應時間（TTFB，典型）", hint: "伺服器多快開始回應；一半訪客比這快，低於 0.8 秒算好", unit: "ms" },
    ttfb_p95: { label: "伺服器回應時間（TTFB，最慢 5%）", hint: "最慢那 5% 的造訪等多久才收到回應；低於 0.8 秒算好", unit: "ms" },
    fcp_p95: { label: "首次繪製（FCP，最慢 5%）", hint: "畫面第一次出現東西的時間；低於 1.8 秒算好", unit: "ms" },
    load_p95: { label: "完整載入（Load，最慢 5%）", hint: "整個頁面載入完成；低於 3 秒算好", unit: "ms" },
    lcp_p50: { label: "主內容出現（LCP，典型）", hint: "主內容出現的時間；低於 2.5 秒算好", unit: "ms" },
    lcp_p75: { label: "主內容出現（LCP，僅 75%）", hint: "75% 造訪在這時間內看到主內容；低於 2.5 秒算好", unit: "ms" },
    cls_p75: { label: "版面位移（CLS，僅 75%）", hint: "版面有沒有亂跳；越接近 0 越好，低於 0.1 算好", unit: "score" },
    bytes_p50: { label: "傳輸量（Bytes，典型）", hint: "HTML 加上資源的首訪傳輸量", unit: "bytes" },
    bytes_p75: { label: "傳輸量（Bytes，僅 75%）", hint: "75% 造訪的傳輸量", unit: "bytes" },
    country: { label: "國家 / 地區", hint: "Cloudflare 依造訪 IP 判斷" }
  };
  var BAR_MAX = {
    ttfb_p50: 800, ttfb_p95: 800, fcp_p95: 1800,
    load_p95: 3000, lcp_p50: 2500, lcp_p75: 2500, cls_p75: 0.1
  };
  // Hand-drawn horizontal bar: the "good" threshold is full width, so a shorter,
  // greener bar means faster. Over the threshold the fill caps at 100% and turns
  // amber then red. Lets the owner read good/bad at a glance without knowing the numbers.
  function metricBar(key, raw) {
    var max = BAR_MAX[key];
    if (max == null) return "";
    var n = Number(raw);
    if (!isFinite(n) || n < 0) return "";
    var ratio = n / max;
    var w = Math.max(3, Math.min(ratio, 1) * 100);
    var color = ratio <= 0.75 ? "#2f9e44" : (ratio <= 1 ? "#f08c00" : "#e03131");
    return "<div style=\\"margin-top:8px;height:6px;border-radius:999px;background:rgba(20,20,30,.08);overflow:hidden\\">" +
      "<div style=\\"height:100%;width:" + Math.round(w) + "%;background:" + color + ";border-radius:999px\\"></div></div>";
  }
  function metricCard(key, raw) {
    var m = METRIC[key] || { label: key, hint: "" };
    return "<article style=\\"padding:14px 16px;border:1px solid rgba(20,20,30,.1);border-radius:10px;background:#fff\\">" +
      "<div style=\\"font-size:15px;font-weight:600;line-height:1.35;margin-bottom:6px\\">" + m.label + "</div>" +
      "<div style=\\"font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.2;margin-bottom:6px\\">" +
      esc(fmtVal(key, raw)) + (m.unit === "ms" ? "<span style=\\"font-size:15px;font-weight:500;color:#5e5e66;margin-left:4px\\">ms</span>" : "") +
      "</div>" +
      metricBar(key, raw) +
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
  function recentCell(v) {
    if (v == null || v === "" || Number(v) <= 0) return "\\u2014";
    return esc(String(v)) + " ms";
  }
  function recentBlock(rows) {
    var title = "最近造訪（逐筆）";
    if (!rows || !rows.length) {
      return "<section style=\\"margin-top:20px\\"><h3 style=\\"margin:0 0 12px;font-size:18px;font-weight:700\\">" + title +
        "</h3><p style=\\"color:#5e5e66\\">（無資料）</p></section>";
    }
    function th(v) { return "<th style=\\"padding:7px 10px;text-align:left;white-space:nowrap;font-weight:600\\">" + v + "</th>"; }
    function td(v) { return "<td style=\\"padding:6px 10px;white-space:nowrap;border-top:1px solid rgba(20,20,30,.06)\\">" + v + "</td>"; }
    var head = "<tr>" + th("時間（你的時區）") + th("國家") + th("路徑") + th("TTFB") + th("完整載入") + th("LCP") + "</tr>";
    var body = rows.map(function (r, i) {
      var t = r.timestamp
        ? new Date(normTs(r.timestamp)).toLocaleString([], { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "\\u2014";
      var bg = i % 2 ? "#faf9f7" : "#ffffff";
      var country = r.country != null && r.country !== "" ? String(r.country) : "\\u2014";
      var path = r.path != null && r.path !== "" ? String(r.path) : "\\u2014";
      return "<tr style=\\"background:" + bg + "\\">" +
        td(esc(t)) + td(esc(country)) + td(esc(path)) +
        td(recentCell(r.ttfb)) + td(recentCell(r.load)) + td(recentCell(r.lcp)) + "</tr>";
    }).join("");
    return "<section style=\\"margin-top:20px\\">" +
      "<h3 style=\\"margin:0 0 4px;font-size:18px;font-weight:700\\">" + title + "</h3>" +
      "<p style=\\"margin:0 0 12px;color:#5e5e66;font-size:14px\\">每一列是一次真實造訪，時間顯示為你當地時區</p>" +
      "<div style=\\"max-height:340px;overflow:auto;border:1px solid rgba(20,20,30,.1);border-radius:10px\\">" +
      "<table style=\\"width:100%;border-collapse:collapse;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace\\">" +
      "<thead style=\\"position:sticky;top:0;background:#17151a;color:#fffdfa\\">" + head + "</thead>" +
      "<tbody>" + body + "</tbody></table></div></section>";
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
  // Analytics Engine returns UTC timestamps as "2026-07-12 14:03:22" with no zone
  // marker. A browser parses that space form as LOCAL time, so times land 8h off in
  // Taiwan. Force UTC (space->T, append Z) so toLocaleString renders the viewer's zone.
  function normTs(ts) {
    if (ts == null) return "";
    var s = String(ts);
    if (s.indexOf("T") < 0) s = s.replace(" ", "T");
    if (s.indexOf("Z") < 0) s = s + "Z";
    return s;
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function ensureDevUrl() {
    try {
      if (localStorage.getItem(KEY) !== "1") return;
      var k = readEditKey();
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
              localStorage.setItem(SESSION_KEY, k);
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

// Testable mirror of normTs() inside the runtime string above. Analytics Engine hands
// back UTC timestamps like "2026-07-12 14:03:22" with no zone marker; a browser reads
// the space form as local time and lands 8h off in Taiwan. Space->T and a trailing Z
// force UTC so toLocaleString renders the viewer's own zone. Idempotent when T/Z present.
export function normalizeRumTimestamp(ts) {
  if (ts == null) return "";
  let s = String(ts);
  if (s.indexOf("T") < 0) s = s.replace(" ", "T");
  if (s.indexOf("Z") < 0) s = s + "Z";
  return s;
}
