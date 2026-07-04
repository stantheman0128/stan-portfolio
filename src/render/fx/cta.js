// The "Read more" progress button — now the ONE progress object on the page
// (the old bottom-left badge is gone). It shows live %, renders every quest
// message on its note line, and dodges with personality: spring easing,
// a lean-into-the-dash tilt, squash-and-stretch, and an occasional sideways
// juke instead of a straight flee. Catchable at 100%.

export const ctaCSS = `
#cta-top{margin:30px 0 6px}
#cta-zone{position:relative;min-height:64px;display:flex;align-items:center}
#cta{position:relative;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;letter-spacing:.03em;padding:.72rem 1.35rem;border:1.5px solid #17151a;border-radius:999px;background:#fffdfa;color:#17151a;cursor:pointer;will-change:transform;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s,border-color .2s}
#cta .cta-fill{position:absolute;inset:0;background:rgba(194,82,45,.14);transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.165,.84,.44,1);pointer-events:none}
#cta .cta-inner{position:relative;display:inline-flex;align-items:baseline;gap:.6rem;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}
#cta .cta-pct{color:#c2522d;font-variant-numeric:tabular-nums}
#cta.cta-dash .cta-inner{transform:scaleX(1.07) skewX(-4deg)}
#cta:focus-visible{outline:2px solid #c2522d;outline-offset:3px}
#cta.cta-free{border-color:#c2522d;color:#c2522d;box-shadow:0 0 0 4px rgba(194,82,45,.14),0 8px 30px rgba(194,82,45,.18)}
@media (prefers-reduced-motion:reduce){#cta{transition:none !important;transform:none !important}#cta .cta-fill{transition:none}#cta .cta-inner{transition:none;transform:none !important}}
#cta-note{margin-top:10px;font-size:12.5px;color:#8b877f;min-height:1.4em;transition:opacity .25s}
#cta-note.flash{color:#c2522d}
#lab{margin-top:44px}
#reward{display:none;margin:10px auto 0;max-width:30rem;border:1.5px solid #426c53;border-radius:12px;padding:1.3rem 1.4rem;background:#fbfdf9}
#reward.on{display:block}
#reward h3{margin:0 0 8px;font-size:17px;color:#2c4a38}
#reward p{margin:.4rem 0;font-size:14px;color:#3a3833;line-height:1.65}
#reward code{font-family:ui-monospace,monospace;font-size:15px;font-weight:700;letter-spacing:.06em;background:#e9f1ea;border-radius:6px;padding:.15rem .5rem;color:#2c4a38}
`;

export const ctaTopHTML = `
<div id="cta-top" aria-label="Exploration progress and reward">
  <div id="cta-zone">
    <button id="cta" type="button" aria-describedby="cta-note">
      <span class="cta-fill" aria-hidden="true"></span>
      <span class="cta-inner"><span class="cta-label">Read more</span><span class="cta-pct">0%</span></span>
    </button>
  </div>
  <p id="cta-note"></p>
</div>
`;

export const ctaLabHTML = `
<section id="lab" aria-label="Reward">
  <div id="reward" role="region" aria-label="Reward unlocked">
    <h3>You actually explored everything.</h3>
    <p>That earns you a priority channel. Mention the code word</p>
    <p><code>EXPLORER-100</code></p>
    <p>in an email and I will reply within 24 hours. Promise.</p>
    <p><a href="mailto:stan@stan-shih.com?subject=EXPLORER-100">Use it now &rarr;</a></p>
  </div>
</section>
`;

export const ctaJS = `
(function () {
  var cta = document.getElementById("cta");
  var note = document.getElementById("cta-note");
  var reward = document.getElementById("reward");
  if (!cta || !window.QUEST) return;
  var fill = cta.querySelector(".cta-fill");
  var labelEl = cta.querySelector(".cta-label");
  var pctEl = cta.querySelector(".cta-pct");

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var q = window.QUEST.get();
  var tx = 0, ty = 0, hops = 0, dashTimer = 0, lastJuke = 0;

  function p() { return Math.min(1, q.pct / 100); }
  function unlocked() { return q.pct >= 100; }

  // The one message line. Quest events land here (badge is gone).
  var noteTimer = 0, defaultNote = "This button is a coward. Explore the projects to slow it down.";
  function setNote(msg, sticky) {
    note.textContent = msg;
    note.classList.add("flash");
    clearTimeout(noteTimer);
    if (!sticky) noteTimer = setTimeout(function () {
      note.classList.remove("flash");
      note.textContent = statusNote();
    }, 4200);
  }
  function statusNote() {
    if (q.ctaUnlocked) return "Code word delivered. Spend it well.";
    if (unlocked()) return "It stopped moving. Go on.";
    return defaultNote;
  }
  document.addEventListener("quest:note", function (e) { setNote(e.detail.msg); });

  function paint() {
    fill.style.transform = "scaleX(" + p() + ")";
    pctEl.textContent = q.pct + "%";
    if (q.ctaUnlocked) {
      labelEl.textContent = "\\u2713 unlocked";
      pctEl.textContent = "";
      cta.classList.add("cta-free");
    } else if (unlocked()) {
      labelEl.textContent = "Read more \\u2014 it's yours";
      cta.classList.add("cta-free");
      cta.setAttribute("aria-label", "Open the reward");
    } else {
      labelEl.textContent = "Read more";
      cta.setAttribute("aria-label", "Read more \\u2014 locked until fully explored (" + q.pct + "%)");
    }
  }

  function clampMove(nx, ny) {
    var br = cta.getBoundingClientRect();
    var baseLeft = br.left - tx, baseTop = br.top - ty;
    var maxRight = document.documentElement.clientWidth - baseLeft - br.width - 12;
    var maxLeft = baseLeft - 12;
    tx = Math.max(-maxLeft, Math.min(maxRight, nx));
    ty = Math.max(-34, Math.min(96, ny));
    var tilt = Math.max(-7, Math.min(7, (nx - tx) * 0.02 + (Math.random() * 6 - 3)));
    cta.style.transform = "translate(" + tx + "px," + ty + "px) rotate(" + tilt + "deg)";
    cta.classList.add("cta-dash");
    clearTimeout(dashTimer);
    dashTimer = setTimeout(function () {
      cta.classList.remove("cta-dash");
      cta.style.transform = "translate(" + tx + "px," + ty + "px)";
    }, 220);
  }

  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", function (e) {
      if (unlocked() || q.ctaUnlocked) return;
      var br = cta.getBoundingClientRect();
      var cx = br.left + br.width / 2, cy = br.top + br.height / 2;
      var dx = cx - e.clientX, dy = cy - e.clientY;
      var d = Math.hypot(dx, dy);
      if (d > 120 || d === 0) return;
      if (Math.random() < p() * p()) return; // trips — near-catch
      var step = 90 * (1 - p());
      if (step < 2) return;
      var ux = dx / d, uy = dy / d;
      // One flee in ~4 is a sideways JUKE instead of a straight run.
      var now = Date.now();
      if (now - lastJuke > 900 && Math.random() < 0.25) {
        lastJuke = now;
        var side = Math.random() < 0.5 ? 1 : -1;
        var jx = -uy * side, jy = ux * side;
        cta.style.transitionDuration = (50 + 200 * p()) + "ms";
        clampMove(tx + jx * step * 1.2, ty + jy * step * 0.8);
        return;
      }
      cta.style.transitionDuration = (60 + 340 * p()) + "ms";
      clampMove(tx + ux * step, ty + uy * step);
    }, { passive: true });
  }

  cta.addEventListener("click", function (e) {
    if (q.ctaUnlocked || unlocked()) {
      window.QUEST.markUnlocked();
      reward.classList.add("on");
      paint();
      cta.disabled = true;
      reward.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      document.dispatchEvent(new CustomEvent("cta:opened"));
      return;
    }
    if (e.detail === 0) {
      setNote("Keyboard user, huh. Respect \\u2014 no chasing for you. Finish exploring and I'm all yours. (" + q.pct + "%)");
    } else if (matchMedia("(hover: none)").matches && !reduce) {
      var n = Math.ceil(3 * (1 - p()));
      if (hops < n) {
        hops++;
        cta.style.transitionDuration = "180ms";
        clampMove((Math.random() * 2 - 1) * 120, Math.random() * 80);
        setNote("Nope. Explore more first \\u2014 " + q.pct + "%.");
      }
    } else {
      setNote("Explore everything first \\u2014 you're at " + q.pct + "%.");
    }
  });

  function sync() {
    q = window.QUEST.get();
    paint();
    if (q.ctaUnlocked) { reward.classList.add("on"); cta.disabled = true; }
    else if (unlocked()) {
      cta.style.transitionDuration = "300ms";
      cta.classList.remove("cta-dash");
      tx = 0; ty = 0;
      cta.style.transform = "translate(0px,0px)";
      note.textContent = statusNote();
    }
  }
  document.addEventListener("quest:update", sync);
  document.addEventListener("quest:complete", sync);
  sync();
  note.textContent = statusNote();
})();
`;
