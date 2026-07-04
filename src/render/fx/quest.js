// Exploration quest — Minimal theme only. A small badge tracks what the
// visitor has SEEN (each work row, the patent) and FOUND (easter eggs), nudges
// them when secrets remain, and stamps a Course-Checker-style graduation when
// everything is explored. State persists per visitor in localStorage.
//
// Progress units: 7 works + 1 patent + 2 eggs = 10.
//   Egg "homesick": leave the tab (title changes to miss you) and come back.
//   Egg "odometer": click the works counter; it re-counts like a mechanical meter.

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
`;

export const questBadgeHTML =
  `<aside id="quest" aria-label="Exploration progress">` +
  `<div class="q-top"><span class="q-count">Explored 0/10</span><span aria-hidden="true">🎓</span></div>` +
  `<div class="q-bar" aria-hidden="true"><div class="q-fill"></div></div>` +
  `<p class="q-hint"></p>` +
  `</aside>`;

export const questJS = `
(function () {
  var KEY = "quest-v1";
  var state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; }
  state.seen = state.seen || {};
  state.eggs = state.eggs || {};

  var badge = document.getElementById("quest");
  if (!badge) return;
  var countEl = badge.querySelector(".q-count");
  var fillEl = badge.querySelector(".q-fill");
  var hintEl = badge.querySelector(".q-hint");

  var works = [].slice.call(document.querySelectorAll("[data-quest]"));
  var EGGS = ["homesick", "odometer"];
  var TOTAL = works.length + 1 + EGGS.length; // works + patent + eggs
  var hintTimer = 0;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function score() {
    var n = Object.keys(state.seen).length + Object.keys(state.eggs).length;
    return Math.min(n, TOTAL);
  }
  function update(message) {
    var n = score();
    countEl.textContent = "Explored " + n + "/" + TOTAL;
    fillEl.style.transform = "scaleX(" + n / TOTAL + ")";
    if (n >= TOTAL) {
      badge.classList.add("q-done", "q-hinting");
      countEl.textContent = "Explored " + n + "/" + TOTAL;
      hintEl.textContent = "\\u2713 Graduation requirements met.";
    } else if (message) {
      badge.classList.add("q-hinting");
      hintEl.textContent = message;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { badge.classList.remove("q-hinting"); }, 5200);
    }
    scheduleWhisper();
    save();
  }
  var whisperTimer = 0;
  function scheduleWhisper() {
    clearTimeout(whisperTimer);
    if (score() >= TOTAL) return;
    whisperTimer = setTimeout(function () {
      var left = EGGS.filter(function (e) { return !state.eggs[e]; }).length;
      if (left > 0) update(left + (left === 1 ? " secret remains" : " secrets remain") + " unfound.");
    }, 18000);
  }

  // SEEN: work rows + patent, via IntersectionObserver.
  var patent = document.getElementById("patent");
  var watch = works.concat(patent ? [patent] : []);
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.getAttribute("data-quest") || "patent";
        if (!state.seen[id]) { state.seen[id] = 1; update(); }
        io.unobserve(en.target);
      });
    }, { threshold: 0.55 });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(function (el) { state.seen[el.getAttribute("data-quest") || "patent"] = 1; });
  }

  // EGG 1 — homesick tab: leave, the title misses you; come back, it counts.
  var realTitle = document.title;
  var favicon = document.querySelector('link[rel="icon"]');
  var realFav = favicon && favicon.getAttribute("href");
  var missFav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext x='16' y='24' font-size='24' text-anchor='middle'%3E%F0%9F%91%80%3C/text%3E%3C/svg%3E";
  var wasAway = false;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      wasAway = true;
      document.title = "\\uD83D\\uDC40 the works miss you";
      if (favicon) favicon.setAttribute("href", missFav);
    } else {
      document.title = realTitle;
      if (favicon && realFav) favicon.setAttribute("href", realFav);
      if (wasAway && !state.eggs.homesick) {
        state.eggs.homesick = 1;
        update("Secret found \\u2014 welcome back.");
      }
    }
  });

  // EGG 2 — odometer: click the works counter, it re-counts.
  var counter = document.querySelector(".count-btn");
  if (counter) {
    var total = parseInt(counter.getAttribute("data-n"), 10) || 0;
    var rolling = false;
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
      if (!state.eggs.odometer) {
        state.eggs.odometer = 1;
        update("Secret found \\u2014 all " + total + " accounted for.");
      }
    });
  }

  update();
})();
`;
