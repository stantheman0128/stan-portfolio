// Per-project ratings v3 (owner round 4):
// Comments now live INLINE under each project — the global "What visitors
// say" wall is gone. Each strip lazily fills its own wall (avg + up to 4
// latest comments for THAT project) from one shared aggregate fetch.
// Votes stay keyed server-side by the anonymous per-visitor token, so
// re-rating REPLACES the old vote instead of stuffing the box.

export const rateCSS = `
.rate{margin-top:14px;padding-top:12px;border-top:1px dashed #e3dccf;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.rate .rate-q{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8b877f}
.rate .rate-dots{margin-top:8px;display:flex;gap:4px;flex-wrap:wrap}
.rate .rate-dots button{all:unset;cursor:pointer;width:26px;height:26px;border:1px solid #d8d0c4;border-radius:50%;font-size:11.5px;text-align:center;line-height:26px;color:#716a62}
.rate .rate-dots button.on{background:#c2522d;border-color:#c2522d;color:#fffdfa}
.rate .rate-dots button:hover,.rate .rate-dots button:focus-visible{border-color:#c2522d;color:#c2522d}
.rate .rate-dots button.on:hover{color:#fffdfa}
.rate .rate-dots button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
.rate .rate-row2{margin-top:8px;display:flex;gap:8px;align-items:center}
.rate input[type="text"]{flex:1;border:1px solid #d8d0c4;border-radius:7px;padding:.42rem .6rem;font:inherit;font-size:12.5px;background:#fffdfa;min-width:0}
.rate .rate-go{all:unset;cursor:pointer;border:1px solid #17151a;background:#17151a;color:#fffdfa;border-radius:999px;padding:.4rem .9rem;font-size:12px}
.rate .rate-go:disabled{opacity:.35;cursor:default}
.rate .rate-go:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
.rate .rate-done{display:none;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:12.5px;color:#3a3833}
.rate.done .rate-done{display:flex}
.rate.done .rate-dots,.rate.done .rate-row2,.rate.done .rate-q{display:none}
.rate .rate-you{color:#426c53;font-weight:600}
.rate .rate-avg{color:#716a62}
.rate .rate-wall{margin-top:12px;display:none;flex-direction:column;gap:8px}
.rate .rate-wall.on{display:flex}
.rate .rw-head{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b7b2a8}
.rate .rw-c{border:1px solid #e9e2d5;border-radius:9px;padding:.5rem .7rem;font-size:12.5px;color:#3a3833;background:#fffdfa}
.rate .rw-c .rw-meta{font-family:ui-monospace,monospace;font-size:10.5px;color:#b7b2a8;margin-top:.25rem}
`;

export function rateStripHTML(id) {
  let dots = "";
  for (let i = 1; i <= 10; i++) dots += `<button type="button" data-v="${i}" aria-label="${i} of 10">${i}</button>`;
  return (
    `<div class="rate" data-rate="${id}">` +
    `<span class="rate-q">Rate this project · 1–10</span>` +
    `<div class="rate-dots" role="radiogroup" aria-label="Rate 1 to 10">${dots}</div>` +
    `<div class="rate-row2">` +
    `<input type="text" maxlength="140" placeholder="Say something (optional)" aria-label="Comment">` +
    `<button class="rate-go" type="button" disabled>Send</button>` +
    `</div>` +
    `<div class="rate-done">` +
    `<span class="rate-you"></span><span class="rate-avg"></span>` +
    `</div>` +
    `<div class="rate-wall" aria-label="What visitors said"></div>` +
    `</div>`
  );
}

export const rateJS = `
(function () {
  if (!window.QUEST) return;
  function initRatings() {
  var startTs = Date.now();
  var voter = window.QUEST.get().voter || "anonymous00";

  // One shared aggregate fetch (60s server cache); refreshed after a vote.
  var aggP = null;
  function agg(fresh) {
    if (fresh) aggP = null;
    aggP = aggP || fetch("/api/rating").then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).catch(function () { return { projects: {} }; });
    return aggP;
  }

  var boxes = [].slice.call(document.querySelectorAll(".rate"));

  // Each project's comments render right under its own strip — no global wall.
  function fillWall(box, data) {
    var wall = box.querySelector(".rate-wall");
    if (!wall) return;
    var s = data.projects && data.projects[box.getAttribute("data-rate")];
    var comments = (s && s.comments) || [];
    wall.replaceChildren();
    if (!s || !s.n || !comments.length) { wall.classList.remove("on"); return; }
    var head = document.createElement("div");
    head.className = "rw-head";
    head.textContent = "Visitors \\u00b7 " + s.avg.toFixed(1) + "/10 (" + s.n + (s.n === 1 ? " vote)" : " votes)");
    wall.appendChild(head);
    comments.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "rw-c";
      var txt = document.createElement("div");
      txt.textContent = "\\u201C" + c.c + "\\u201D";
      var meta = document.createElement("div");
      meta.className = "rw-meta";
      meta.textContent = c.r + "/10";
      el.appendChild(txt); el.appendChild(meta);
      wall.appendChild(el);
    });
    wall.classList.add("on");
  }
  var wallsLoaded = false;
  function loadWalls(fresh) {
    wallsLoaded = true;
    agg(fresh).then(function (data) {
      boxes.forEach(function (box) { fillWall(box, data); });
    });
  }
  // Lazy: first expanded panel or a quiet moment, whichever comes first.
  document.addEventListener("click", function (e) {
    if (!wallsLoaded && e.target.closest && e.target.closest(".row")) loadWalls();
  });
  setTimeout(function () { if (!wallsLoaded) loadWalls(); }, 4500);

  boxes.forEach(function (box) {
    var id = box.getAttribute("data-rate");
    var dots = [].slice.call(box.querySelectorAll(".rate-dots button"));
    var input = box.querySelector("input");
    var go = box.querySelector(".rate-go");
    var youEl = box.querySelector(".rate-you");
    var avgEl = box.querySelector(".rate-avg");
    var chosen = 0;

    function paintDots(v) {
      dots.forEach(function (o) { o.classList.toggle("on", parseInt(o.getAttribute("data-v"), 10) <= v); });
    }
    function showResult(r) {
      box.classList.add("done");
      youEl.textContent = "You: " + r + "/10";
      avgEl.textContent = "";
      agg().then(function (data) {
        var s = data.projects && data.projects[id];
        if (s && s.n) {
          avgEl.textContent = "current average " + s.avg.toFixed(1) + "/10 (" + s.n + (s.n === 1 ? " vote)" : " votes)");
        }
      });
    }
    var prior = window.QUEST.get().rated[id];
    if (prior) showResult(prior);

    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        chosen = parseInt(d.getAttribute("data-v"), 10);
        paintDots(chosen);
        go.disabled = false;
      });
    });
    go.addEventListener("click", function () {
      if (!chosen) return;
      try {
        fetch("/api/rating", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: id, r: chosen, v: voter,
            c: (input.value || "").slice(0, 140),
            ms: Date.now() - startTs, hp: "" }),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
      window.QUEST.setRated(id, chosen);
      setTimeout(function () { loadWalls(true); }, 1500); // refresh avg + walls
      showResult(chosen);
      document.dispatchEvent(new CustomEvent("rate:sent", { detail: { id: id, r: chosen } }));
    });
  });
  }
  // The owner doesn't rate their own work: unlocked devices drop the strips.
  // No server call — reads the same can-edit flag the editor uses.
  try {
    if (localStorage.getItem("can-edit") === "1") {
      [].slice.call(document.querySelectorAll(".rate")).forEach(function (el) { el.remove(); });
    } else { initRatings(); }
  } catch (e) { initRatings(); }
})();
`;
