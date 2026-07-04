// The "Read more" progress button — the Explore % and the reward button are
// now ONE object (owner direction): the button displays live progress as a
// fill, dodges the pointer while locked (slower as % rises), and becomes
// plainly clickable at 100%. Rating no longer gates the unlock (per-project
// ratings are their own thing, see fx/rate.js). Reward: the EXPLORER-100
// priority-reply code word.

export const ctaCSS = `
#cta-top{margin:30px 0 6px}
#cta-zone{position:relative;min-height:64px;display:flex;align-items:center}
#cta{position:relative;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;letter-spacing:.03em;padding:.72rem 1.35rem;border:1.5px solid #17151a;border-radius:999px;background:#fffdfa;color:#17151a;cursor:pointer;transition:transform .2s cubic-bezier(.165,.84,.44,1),box-shadow .2s,border-color .2s;will-change:transform}
#cta .cta-fill{position:absolute;inset:0;background:rgba(194,82,45,.14);transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.165,.84,.44,1);pointer-events:none}
#cta .cta-label,#cta .cta-pct{position:relative}
#cta .cta-pct{margin-left:.6rem;color:#c2522d;font-variant-numeric:tabular-nums}
#cta:focus-visible{outline:2px solid #c2522d;outline-offset:3px}
#cta.cta-free{border-color:#c2522d;color:#c2522d;box-shadow:0 0 0 4px rgba(194,82,45,.14),0 8px 30px rgba(194,82,45,.18)}
#cta.cta-free .cta-fill{background:rgba(194,82,45,.1)}
@media (prefers-reduced-motion:reduce){#cta{transition:none !important;transform:none !important}#cta .cta-fill{transition:none}}
#cta-note{margin-top:10px;font-size:12.5px;color:#8b877f;min-height:1.4em}
#lab{margin-top:44px}
#reward{display:none;margin:10px auto 0;max-width:30rem;border:1.5px solid #426c53;border-radius:12px;padding:1.3rem 1.4rem;background:#fbfdf9}
#reward.on{display:block}
#reward h3{margin:0 0 8px;font-size:17px;color:#2c4a38}
#reward p{margin:.4rem 0;font-size:14px;color:#3a3833;line-height:1.65}
#reward code{font-family:ui-monospace,monospace;font-size:15px;font-weight:700;letter-spacing:.06em;background:#e9f1ea;border-radius:6px;padding:.15rem .5rem;color:#2c4a38}
`;

export const ctaTopHTML = `
<div id="cta-top" aria-label="The reward game">
  <div id="cta-zone">
    <button id="cta" type="button" aria-describedby="cta-note">
      <span class="cta-fill" aria-hidden="true"></span>
      <span class="cta-label">Read more</span>
      <span class="cta-pct">0%</span>
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
  var tx = 0, ty = 0, hops = 0;

  function p() { return Math.min(1, q.pct / 100); }
  function unlocked() { return q.pct >= 100; }

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
    cta.style.transform = "translate(" + tx + "px," + ty + "px)";
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
      cta.style.transitionDuration = (60 + 340 * p()) + "ms";
      clampMove(tx + (dx / d) * step, ty + (dy / d) * step);
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
      note.textContent = "Keyboard user, huh. Respect \\u2014 no chasing for you. Finish exploring and I'm all yours. (" + q.pct + "%)";
    } else if (matchMedia("(hover: none)").matches && !reduce) {
      var n = Math.ceil(3 * (1 - p()));
      if (hops < n) {
        hops++;
        cta.style.transitionDuration = "180ms";
        clampMove((Math.random() * 2 - 1) * 120, Math.random() * 80);
        note.textContent = "Nope. Explore more first \\u2014 " + q.pct + "%.";
      }
    } else {
      note.textContent = "Explore everything first \\u2014 you're at " + q.pct + "%.";
    }
  });

  function sync() {
    q = window.QUEST.get();
    paint();
    if (q.ctaUnlocked) { reward.classList.add("on"); cta.disabled = true; }
    else if (unlocked()) {
      cta.style.transitionDuration = "300ms";
      clampMove(0, 0);
      note.textContent = "It stopped moving. Go on.";
    }
  }
  document.addEventListener("quest:update", sync);
  document.addEventListener("quest:complete", sync);
  sync();
  if (!unlocked() && !q.ctaUnlocked) {
    note.textContent = "This button is a coward. Explore the projects to slow it down.";
  }
})();
`;
