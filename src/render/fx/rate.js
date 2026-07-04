// Per-project ratings v2 (owner round 3):
// After you rate, the strip collapses INTO the result — "You: 8/10 · current
// average 8.4/10 (12 votes)" — with a Change button to re-rate. Votes are
// keyed server-side by an anonymous per-visitor token, so re-rating REPLACES
// your old vote instead of stuffing the box. The bottom wall now shows only
// what people SAID (comments); averages live inline where you rated.

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
.rate .rate-edit{all:unset;cursor:pointer;font-size:11.5px;color:#8b877f;border-bottom:1px dashed #b7b2a8}
.rate .rate-edit:hover,.rate .rate-edit:focus-visible{color:#c2522d;border-color:#c2522d}
.rate .rate-edit:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
#voices{margin-top:56px;border-top:1px solid rgba(23,22,26,.12);padding-top:34px}
#voices .lab-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b7b2a8;margin-bottom:18px}
#voices .v-empty{font-size:13px;color:#8b877f}
#voices .v-comments{display:flex;flex-direction:column;gap:10px}
#voices .v-c{border:1px solid #e9e2d5;border-radius:9px;padding:.6rem .8rem;font-size:13px;color:#3a3833;background:#fffdfa}
#voices .v-c .v-meta{font-family:ui-monospace,monospace;font-size:10.5px;color:#b7b2a8;margin-top:.3rem}
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
    `<button class="rate-edit" type="button">Change</button>` +
    `</div>` +
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
  var voter = window.QUEST.get().voter || "anonymous00";

  // One shared aggregate fetch (60s server cache); refreshed after a vote.
  var aggP = null;
  function agg(fresh) {
    if (fresh) aggP = null;
    aggP = aggP || fetch("/api/rating").then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).catch(function () { return { projects: {}, latest: [] }; });
    return aggP;
  }

  [].slice.call(document.querySelectorAll(".rate")).forEach(function (box) {
    var id = box.getAttribute("data-rate");
    var dots = [].slice.call(box.querySelectorAll(".rate-dots button"));
    var input = box.querySelector("input");
    var go = box.querySelector(".rate-go");
    var youEl = box.querySelector(".rate-you");
    var avgEl = box.querySelector(".rate-avg");
    var editBtn = box.querySelector(".rate-edit");
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
    function openEditor(pre) {
      box.classList.remove("done");
      chosen = pre || 0;
      paintDots(chosen);
      go.disabled = !chosen;
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
    editBtn.addEventListener("click", function () {
      openEditor(window.QUEST.get().rated[id] || 0);
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
      setTimeout(function () { agg(true); }, 1200); // refresh shared cache lazily
      showResult(chosen);
      document.dispatchEvent(new CustomEvent("rate:sent", { detail: { id: id, r: chosen } }));
    });
  });

  // The wall: comments only (averages live inline where you rated).
  var body = document.getElementById("voices-body");
  if (!body) return;
  function titleFor(id) {
    var sec = document.querySelector('[data-quest="' + id + '"]');
    var t = sec && sec.querySelector(".title");
    return t ? t.textContent : id;
  }
  function load() {
    agg().then(function (data) {
      body.replaceChildren();
      var comments = (data.latest || []).filter(function (c) { return c.c; });
      if (!comments.length) {
        var p0 = document.createElement("p");
        p0.className = "v-empty";
        p0.textContent = "Nothing here yet \\u2014 rate a project above and say something.";
        body.appendChild(p0);
        return;
      }
      var wrap = document.createElement("div");
      wrap.className = "v-comments";
      comments.forEach(function (c) {
        var el = document.createElement("div");
        el.className = "v-c";
        var txt = document.createElement("div"); txt.textContent = "\\u201C" + c.c + "\\u201D";
        var meta = document.createElement("div"); meta.className = "v-meta";
        meta.textContent = titleFor(c.id) + " \\u00b7 " + c.r + "/10";
        el.appendChild(txt); el.appendChild(meta);
        wrap.appendChild(el);
      });
      body.appendChild(wrap);
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
