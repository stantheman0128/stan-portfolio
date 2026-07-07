// Quest v2.2 — the separate badge is GONE (owner: one thing, not two).
// Progress lives inside the developing polaroid (fx/cta.js); this module keeps
// the source of truth, row check marks, the SR live region, and routes all
// human-facing messages through a `quest:note` event that the CTA renders.
// Deploy-stamp reset (meta[name=build]) stays while the owner is testing.

export const questCSS = `
.count-btn{all:unset;cursor:pointer;border-bottom:1px dashed #b7b2a8;font-variant-numeric:tabular-nums}
.count-btn:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
.q-pulse{outline:2px solid #c2522d !important;outline-offset:4px;border-radius:4px;transition:outline-color .3s}
[data-quest].q-got .title::after{content:" \\2713";color:#c2522d;font-size:.78em;vertical-align:.08em}
`;

export const questBadgeHTML =
  `<span id="quest-sr" aria-live="polite" style="position:absolute;left:-9999px"></span>`;

export const questJS = `
(function () {
  var KEY = "quest-v2", DWELL = 1500;
  var buildMeta = document.querySelector('meta[name="build"]');
  var BUILD = buildMeta ? buildMeta.getAttribute("content") : "dev";

  var state = null;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!state || state.v !== 2 || state.build !== BUILD) {
    state = { v: 2, build: BUILD, watched: [], eggs: {}, rated: {}, ctaUnlocked: false,
              spriteDismissed: false, visits: 0, lastVisit: 0, voter: "" };
  }
  state.rated = state.rated || {};
  if (!state.voter) {
    state.voter = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  state.visits = (state.visits || 0) + 1;
  state.lastVisit = Date.now();

  var srEl = document.getElementById("quest-sr");
  var rows = [].slice.call(document.querySelectorAll("[data-quest]"));
  var patent = document.getElementById("patent");
  var TOTAL = rows.length + (patent ? 1 : 0);
  var lastMilestone = 0;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function pct() { return Math.min(100, Math.round(state.watched.length / TOTAL * 100)); }
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail || snapshot() })); }
  function note(msg) { emit("quest:note", { msg: msg }); }
  function snapshot() {
    return { watched: state.watched.slice(), total: TOTAL, pct: pct(),
             rated: state.rated, voter: state.voter, ctaUnlocked: state.ctaUnlocked,
             eggs: Object.keys(state.eggs).length, spriteDismissed: state.spriteDismissed,
             visits: state.visits };
  }

  function render() {
    var p = pct();
    var m = Math.floor(p / 25) * 25;
    if (srEl && m > lastMilestone) { lastMilestone = m; srEl.textContent = "Exploration " + m + " percent."; }
    save();
    emit("quest:update");
  }

  function watched(id, el, label) {
    if (state.watched.indexOf(id) !== -1) return;
    state.watched.push(id);
    if (el) el.classList.add("q-got");
    var n = state.watched.length;
    render();
    if (label) note("Logged: " + label + " \\u2014 " + pct() + "%");
    emit("quest:item-watched", { id: id, n: n, total: TOTAL });
    if (n >= TOTAL) {
      emit("quest:items-complete");
      emit("quest:complete");
      if (srEl) srEl.textContent = "One hundred percent. The photo is catchable now.";
    }
  }

  rows.forEach(function (sec) {
    var id = sec.getAttribute("data-quest");
    var btn = sec.querySelector(".row");
    if (!btn) return;
    if (state.watched.indexOf(id) !== -1) sec.classList.add("q-got");
    var timer = 0;
    btn.addEventListener("click", function () {
      setTimeout(function () {
        clearTimeout(timer);
        if (btn.getAttribute("aria-expanded") === "true") {
          timer = setTimeout(function () {
            if (btn.getAttribute("aria-expanded") === "true") {
              watched(id, sec, sec.querySelector(".title") && sec.querySelector(".title").textContent);
            }
          }, DWELL);
        }
      }, 50);
    });
  });

  if (patent && "IntersectionObserver" in window) {
    var pTimer = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        clearTimeout(pTimer);
        if (en.isIntersecting) {
          pTimer = setTimeout(function () { watched("patent", patent, "the patent"); io.disconnect(); }, DWELL);
        }
      });
    }, { threshold: 0.45 });
    io.observe(patent);
  } else if (patent) {
    patent.addEventListener("click", function () { watched("patent", patent, "the patent"); }, { once: true });
  }

  function egg(name, msg) {
    if (state.eggs[name]) return;
    state.eggs[name] = 1;
    render();
    if (msg) note(msg);
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

  window.QUEST = {
    get: snapshot,
    markUnlocked: function () {
      if (state.ctaUnlocked) return;
      state.ctaUnlocked = true;
      render();
      if (srEl) srEl.textContent = "Reward unlocked.";
    },
    setRated: function (id, r) {
      state.rated[id] = r;
      save();
      emit("quest:update");
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
  if (pct() === 0) {
    setTimeout(function () {
      note("Open any project and stay a moment \\u2014 that's how exploring counts.");
    }, 2500);
  }
})();
`;
