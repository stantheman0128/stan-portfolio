// Quest v2 — Progress is the source of truth (spec: 2026-07-05-sprite-quest-design.md).
// "Watched" now means ENGAGEMENT: a work row expanded and held open ≥2.5s
// (a bounce-open doesn't count); the patent counts after 2.5s continuously in
// view. Scrolling past counts nothing. Free-roam scores identically to guided.
//
// Ownership: this module owns localStorage (quest-v2) and exposes a tiny
// internal seam `window.QUEST` plus document CustomEvents for the CTA and
// sprite scripts (same-document, inline):
//   quest:update          — any state change   (detail: snapshot)
//   quest:item-watched    — one item just counted (detail: {id, n, total})
//   quest:items-complete  — all 8 items watched
//   quest:complete        — items + rating done (CTA may unlock)

export const questCSS = `
#quest{position:fixed;left:14px;bottom:14px;z-index:60;background:#fffdfa;border:1px solid #d8d0c4;border-radius:9px;padding:.55rem .8rem .6rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.04em;color:#716a62;box-shadow:0 6px 24px rgba(41,31,23,.08);max-width:15rem}
#quest .q-top{display:flex;align-items:baseline;gap:.5rem}
#quest .q-count{color:#17151a;font-weight:600}
#quest .q-bar{margin-top:.42rem;height:3px;border-radius:2px;background:#eee7db;overflow:hidden}
#quest .q-fill{height:100%;width:100%;transform:scaleX(0);transform-origin:left;background:#c2522d;border-radius:2px;transition:transform .5s cubic-bezier(.165,.84,.44,1)}
#quest .q-hint{margin:.45rem 0 0;line-height:1.5;color:#8b877f;display:none}
#quest.q-hinting .q-hint{display:block}
#quest.q-done{border-color:#426c53;color:#426c53}
#quest.q-done .q-count{color:#426c53}
#quest.q-done .q-fill{background:#426c53}
@media (prefers-reduced-motion:reduce){#quest .q-fill{transition:none}}
@media print{#quest{display:none}}
.count-btn{all:unset;cursor:pointer;border-bottom:1px dashed #b7b2a8;font-variant-numeric:tabular-nums}
.count-btn:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
.q-pulse{outline:2px solid #c2522d !important;outline-offset:4px;border-radius:4px;transition:outline-color .3s}
`;

export const questBadgeHTML =
  `<aside id="quest" aria-label="Exploration progress">` +
  `<div class="q-top"><span class="q-count">Explored 0%</span><span aria-hidden="true">🎓</span></div>` +
  `<div class="q-bar" aria-hidden="true"><div class="q-fill"></div></div>` +
  `<p class="q-hint"></p>` +
  `</aside>` +
  `<span id="quest-sr" aria-live="polite" style="position:absolute;left:-9999px"></span>`;

export const questJS = `
(function () {
  var KEY = "quest-v2", DWELL = 2500;
  var state = null;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!state || state.v !== 2) {
    var eggs = {};
    try { var v1 = JSON.parse(localStorage.getItem("quest-v1")); if (v1 && v1.eggs) eggs = v1.eggs; } catch (e) {}
    state = { v: 2, watched: [], eggs: eggs, ratingDone: false, ctaUnlocked: false,
              spriteDismissed: false, visits: 0, lastVisit: 0 };
  }
  state.visits = (state.visits || 0) + 1;
  state.lastVisit = Date.now();

  var badge = document.getElementById("quest");
  var countEl = badge && badge.querySelector(".q-count");
  var fillEl = badge && badge.querySelector(".q-fill");
  var hintEl = badge && badge.querySelector(".q-hint");
  var srEl = document.getElementById("quest-sr");

  var rows = [].slice.call(document.querySelectorAll("[data-quest]"));
  var patent = document.getElementById("patent");
  var TOTAL = rows.length + (patent ? 1 : 0);
  var lastMilestone = 0;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function pct() { return Math.min(100, Math.round(state.watched.length / TOTAL * 100)); }
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail || snapshot() })); }
  function snapshot() {
    return { watched: state.watched.slice(), total: TOTAL, pct: pct(),
             ratingDone: state.ratingDone, ctaUnlocked: state.ctaUnlocked,
             eggs: Object.keys(state.eggs).length, spriteDismissed: state.spriteDismissed,
             visits: state.visits };
  }

  var hintTimer = 0;
  function hint(msg, sticky) {
    if (!badge) return;
    badge.classList.add("q-hinting");
    hintEl.textContent = msg;
    clearTimeout(hintTimer);
    if (!sticky) hintTimer = setTimeout(function () { badge.classList.remove("q-hinting"); }, 5200);
  }

  function render(message) {
    if (!badge) return;
    var p = pct();
    if (state.ctaUnlocked) {
      badge.classList.add("q-done");
      countEl.textContent = "\\u2713 Fully explored";
      hint("Graduation requirements met.", true);
    } else if (p >= 100 && !state.ratingDone) {
      countEl.textContent = "Explored 100%";
      hint("One thing left \\u2014 the rating below.", true);
    } else {
      countEl.textContent = "Explored " + p + "%";
      if (message) hint(message);
    }
    fillEl.style.transform = "scaleX(" + p / 100 + ")";
    var m = Math.floor(p / 25) * 25;
    if (srEl && m > lastMilestone) { lastMilestone = m; srEl.textContent = "Exploration " + m + " percent."; }
    save();
  }

  function watched(id, label) {
    if (state.watched.indexOf(id) !== -1) return;
    state.watched.push(id);
    var n = state.watched.length;
    render(label ? "Logged: " + label : undefined);
    emit("quest:item-watched", { id: id, n: n, total: TOTAL });
    emit("quest:update");
    if (n >= TOTAL) {
      emit("quest:items-complete");
      if (srEl) srEl.textContent = "All items explored. One step remains.";
    }
  }

  // Work rows: expand + dwell.
  rows.forEach(function (sec) {
    var id = sec.getAttribute("data-quest");
    var btn = sec.querySelector(".row");
    if (!btn) return;
    var timer = 0;
    function check() {
      clearTimeout(timer);
      if (btn.getAttribute("aria-expanded") === "true") {
        timer = setTimeout(function () {
          if (btn.getAttribute("aria-expanded") === "true") {
            watched(id, sec.querySelector(".title") && sec.querySelector(".title").textContent);
          }
        }, DWELL);
      }
    }
    btn.addEventListener("click", function () { setTimeout(check, 50); });
  });

  // Patent: 2.5s continuously in view.
  if (patent && "IntersectionObserver" in window) {
    var pTimer = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        clearTimeout(pTimer);
        if (en.isIntersecting) {
          pTimer = setTimeout(function () { watched("patent", "the patent"); io.disconnect(); }, DWELL);
        }
      });
    }, { threshold: 0.45 });
    io.observe(patent);
  } else if (patent) {
    // No IO support: count it on first click inside.
    patent.addEventListener("click", function () { watched("patent", "the patent"); }, { once: true });
  }

  // Egg: odometer counter (kept from v1; eggs are flavor, not part of %).
  function egg(name, msg) {
    if (state.eggs[name]) return;
    state.eggs[name] = 1;
    render(msg);
    emit("quest:update");
  }
  var counter = document.querySelector(".count-btn");
  if (counter) {
    var total = parseInt(counter.getAttribute("data-n"), 10) || 0, rolling = false;
    counter.addEventListener("click", function () {
      if (rolling) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        counter.textContent = total + " works";
      } else {
        rolling = true;
        var n = 0;
        var tick = setInterval(function () {
          n++;
          counter.textContent = n + " work" + (n === 1 ? "" : "s");
          if (n >= total) { clearInterval(tick); rolling = false; }
        }, 110);
      }
      egg("odometer", "Secret found \\u2014 all " + total + " accounted for.");
    });
  }

  // Rating + CTA transitions are driven by the other modules through this seam.
  window.QUEST = {
    get: snapshot,
    markRating: function () {
      if (state.ratingDone) return;
      state.ratingDone = true;
      render();
      emit("quest:update");
      if (pct() >= 100) emit("quest:complete");
    },
    markUnlocked: function () {
      if (state.ctaUnlocked) return;
      state.ctaUnlocked = true;
      render();
      emit("quest:update");
      if (srEl) srEl.textContent = "Reward unlocked.";
    },
    egg: egg,
    dismissSprite: function (v) { state.spriteDismissed = !!v; save(); },
    pulse: function (el) {
      if (!el) return;
      el.classList.add("q-pulse");
      setTimeout(function () { el.classList.remove("q-pulse"); }, 1600);
    }
  };

  render();
  emit("quest:update");
  if (pct() >= 100 && state.ratingDone && !state.ctaUnlocked) emit("quest:complete");
})();
`;
