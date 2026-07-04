// Per-project ratings (1-10) + the public "What visitors say" wall.
// Each expanded work row carries a rate strip; one rating per project per
// visitor (stored in quest state, so the deploy-stamp reset clears it too).
// POST is fire-and-forget (losing a rating never blocks anyone). The wall
// lazy-loads GET /api/rating when scrolled into view; comments render via
// textContent only (no HTML from strangers, ever).

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
.rate .rate-done{font-size:12.5px;color:#426c53}
#voices{margin-top:56px;border-top:1px solid rgba(23,22,26,.12);padding-top:34px}
#voices .lab-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b7b2a8;margin-bottom:18px}
#voices .v-empty{font-size:13px;color:#8b877f}
#voices .v-proj{display:flex;align-items:baseline;gap:10px;padding:.4rem 0;font-size:13.5px}
#voices .v-proj .v-name{min-width:14rem;color:#17151a}
#voices .v-proj .v-bar{flex:1;height:5px;border-radius:3px;background:#eee7db;overflow:hidden;align-self:center}
#voices .v-proj .v-bar span{display:block;height:100%;background:#c2522d;border-radius:3px}
#voices .v-proj .v-score{font-family:ui-monospace,monospace;font-size:12px;color:#716a62;white-space:nowrap}
#voices .v-comments{margin-top:22px;display:flex;flex-direction:column;gap:10px}
#voices .v-c{border:1px solid #e9e2d5;border-radius:9px;padding:.6rem .8rem;font-size:13px;color:#3a3833;background:#fffdfa}
#voices .v-c .v-meta{font-family:ui-monospace,monospace;font-size:10.5px;color:#b7b2a8;margin-top:.3rem}
@media (max-width:640px){#voices .v-proj{flex-wrap:wrap}#voices .v-proj .v-name{min-width:100%}}
`;

// Injected into every expanded row panel; data-rate = the item id.
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
    `<span class="rate-done" hidden></span>` +
    `</div>`
  );
}

export const voicesHTML = `
<section id="voices" aria-label="What visitors say">
  <div class="lab-eyebrow">What visitors say</div>
  <div id="voices-body"><p class="v-empty">Loading…</p></div>
</section>
`;

export const rateJS = `
(function () {
  if (!window.QUEST) return;
  var startTs = Date.now();

  // --- per-row widgets ---
  [].slice.call(document.querySelectorAll(".rate")).forEach(function (box) {
    var id = box.getAttribute("data-rate");
    var dots = [].slice.call(box.querySelectorAll(".rate-dots button"));
    var input = box.querySelector("input");
    var go = box.querySelector(".rate-go");
    var done = box.querySelector(".rate-done");
    var chosen = 0;

    function lock(r) {
      box.querySelector(".rate-dots").hidden = true;
      box.querySelector(".rate-row2").hidden = true;
      done.hidden = false;
      done.textContent = "Thanks \\u2014 you gave it " + r + "/10.";
    }
    var prior = window.QUEST.get().rated[id];
    if (prior) { lock(prior); return; }

    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        chosen = parseInt(d.getAttribute("data-v"), 10);
        dots.forEach(function (o) { o.classList.toggle("on", parseInt(o.getAttribute("data-v"), 10) <= chosen); });
        go.disabled = false;
      });
    });
    go.addEventListener("click", function () {
      if (!chosen) return;
      try {
        fetch("/api/rating", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: id, r: chosen, c: (input.value || "").slice(0, 140),
            t: "minimal", p: location.pathname, ms: Date.now() - startTs, hp: "" }),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
      window.QUEST.setRated(id, chosen);
      lock(chosen);
      document.dispatchEvent(new CustomEvent("rate:sent", { detail: { id: id, r: chosen } }));
    });
  });

  // --- the wall ---
  var body = document.getElementById("voices-body");
  if (!body) return;
  function titleFor(id) {
    var sec = document.querySelector('[data-quest="' + id + '"]');
    var t = sec && sec.querySelector(".title");
    return t ? t.textContent : id;
  }
  function load() {
    fetch("/api/rating").then(function (res) {
      if (!res.ok) throw 0;
      return res.json();
    }).then(function (data) {
      body.replaceChildren();
      var ids = Object.keys(data.projects || {});
      if (!ids.length) {
        var p0 = document.createElement("p");
        p0.className = "v-empty";
        p0.textContent = "No ratings yet \\u2014 be the first. Open any project above.";
        body.appendChild(p0);
        return;
      }
      ids.sort(function (a, b) { return data.projects[b].avg - data.projects[a].avg; });
      ids.forEach(function (id) {
        var s = data.projects[id];
        var row = document.createElement("div");
        row.className = "v-proj";
        var name = document.createElement("span"); name.className = "v-name"; name.textContent = titleFor(id);
        var bar = document.createElement("span"); bar.className = "v-bar";
        var fill = document.createElement("span"); fill.style.width = (s.avg * 10) + "%"; bar.appendChild(fill);
        var sc = document.createElement("span"); sc.className = "v-score";
        sc.textContent = s.avg.toFixed(1) + "/10 \\u00b7 " + s.n + (s.n === 1 ? " vote" : " votes");
        row.appendChild(name); row.appendChild(bar); row.appendChild(sc);
        body.appendChild(row);
      });
      if ((data.latest || []).length) {
        var wrap = document.createElement("div");
        wrap.className = "v-comments";
        data.latest.forEach(function (c) {
          if (!c.c) return;
          var el = document.createElement("div");
          el.className = "v-c";
          var txt = document.createElement("div"); txt.textContent = "\\u201C" + c.c + "\\u201D";
          var meta = document.createElement("div"); meta.className = "v-meta";
          meta.textContent = titleFor(c.id) + " \\u00b7 " + c.r + "/10";
          el.appendChild(txt); el.appendChild(meta);
          wrap.appendChild(el);
        });
        if (wrap.children.length) body.appendChild(wrap);
      }
    }).catch(function () {
      body.replaceChildren();
      var p = document.createElement("p");
      p.className = "v-empty";
      p.textContent = "Reviews live on the deployed site \\u2014 be the first to rate a project above.";
      body.appendChild(p);
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); load(); }
    }, { rootMargin: "200px" });
    io.observe(document.getElementById("voices"));
  } else { load(); }
})();
`;
