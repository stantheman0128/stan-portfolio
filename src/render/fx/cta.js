// Rubber-band CTA + rating + reward (spec: 2026-07-05-sprite-quest-design.md).
// The button dodges the pointer at a speed inversely proportional to quest
// progress: step = 90·(1−p) px, transition 60+340·p ms, settleChance = p².
// Keyboard users can always focus/activate (witty acknowledgment pre-100%).
// Touch: hops N = ceil(3·(1−p)) taps before yielding. Reduced motion: never
// moves at all. Unlock condition: all items watched AND rating submitted.
// Reward (owner decision "C"): a priority-reply code word — no PII.

export const ctaCSS = `
#lab{margin-top:56px;border-top:1px solid rgba(23,22,26,.12);padding-top:34px}
#lab .lab-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b7b2a8;margin-bottom:18px}
#cta-zone{position:relative;min-height:120px;display:flex;align-items:center;justify-content:center}
#cta{position:relative;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;letter-spacing:.03em;padding:.72rem 1.35rem;border:1.5px solid #17151a;border-radius:999px;background:#fffdfa;color:#17151a;cursor:pointer;transition:transform .2s cubic-bezier(.165,.84,.44,1),box-shadow .2s,border-color .2s;will-change:transform}
#cta:focus-visible{outline:2px solid #c2522d;outline-offset:3px}
#cta.cta-free{border-color:#c2522d;color:#c2522d;box-shadow:0 0 0 4px rgba(194,82,45,.14),0 8px 30px rgba(194,82,45,.18)}
@media (prefers-reduced-motion:reduce){#cta{transition:none !important;transform:none !important}}
#cta-note{margin-top:14px;text-align:center;font-size:12.5px;color:#8b877f;min-height:1.4em}
#rating{display:none;margin:26px auto 0;max-width:26rem;text-align:center}
#rating.on{display:block}
#rating .r-q{font-size:15px;color:#3a3833;margin:0 0 12px}
#rating .r-stars{display:flex;justify-content:center;gap:6px}
#rating .r-stars button{all:unset;cursor:pointer;font-size:26px;line-height:1;color:#d8d0c4;padding:4px;border-radius:6px}
#rating .r-stars button.on,#rating .r-stars button:hover,#rating .r-stars button:focus-visible{color:#c2522d}
#rating .r-stars button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
#rating textarea{margin-top:12px;width:100%;box-sizing:border-box;border:1px solid #d8d0c4;border-radius:8px;padding:.6rem .7rem;font:inherit;font-size:13.5px;background:#fffdfa;resize:vertical;min-height:56px}
#rating .r-send{margin-top:10px;font-family:ui-monospace,monospace;font-size:13px;border:1.5px solid #17151a;border-radius:999px;background:#17151a;color:#fffdfa;padding:.5rem 1.2rem;cursor:pointer}
#rating .r-send:disabled{opacity:.4;cursor:default}
#rating .r-priv{margin-top:8px;font-size:11px;color:#b7b2a8}
#rating .hp-field{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
#reward{display:none;margin:30px auto 0;max-width:30rem;border:1.5px solid #426c53;border-radius:12px;padding:1.3rem 1.4rem;background:#fbfdf9}
#reward.on{display:block}
#reward h3{margin:0 0 8px;font-size:17px;color:#2c4a38}
#reward p{margin:.4rem 0;font-size:14px;color:#3a3833;line-height:1.65}
#reward code{font-family:ui-monospace,monospace;font-size:15px;font-weight:700;letter-spacing:.06em;background:#e9f1ea;border-radius:6px;padding:.15rem .5rem;color:#2c4a38}
`;

export const ctaHTML = `
<section id="lab" aria-label="The reward">
  <div class="lab-eyebrow">One more thing</div>
  <div id="cta-zone">
    <button id="cta" type="button" aria-describedby="cta-note">catch me</button>
  </div>
  <p id="cta-note"></p>
  <div id="rating" aria-label="Rate this site">
    <p class="r-q">You've seen everything. Was this cool?</p>
    <div class="r-stars" role="radiogroup" aria-label="Rating from 1 to 5">
      <button type="button" data-star="1" aria-label="1 of 5">★</button>
      <button type="button" data-star="2" aria-label="2 of 5">★</button>
      <button type="button" data-star="3" aria-label="3 of 5">★</button>
      <button type="button" data-star="4" aria-label="4 of 5">★</button>
      <button type="button" data-star="5" aria-label="5 of 5">★</button>
    </div>
    <textarea maxlength="280" placeholder="Anything to add? (optional)" aria-label="Comment"></textarea>
    <input class="hp-field" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div><button class="r-send" type="button" disabled>Send it</button></div>
    <p class="r-priv">Anonymous feedback — we don't record who you are.</p>
  </div>
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
  var zone = document.getElementById("cta-zone");
  var rating = document.getElementById("rating");
  var reward = document.getElementById("reward");
  if (!cta || !window.QUEST) return;

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var startTs = Date.now();
  var q = window.QUEST.get();
  var tx = 0, ty = 0, hops = 0;

  function p() { return Math.min(1, q.pct / 100); }
  function unlocked() { return q.pct >= 100 && q.ratingDone; }

  function label() {
    if (q.ctaUnlocked || unlocked()) { cta.textContent = "\\u2192 open the reward"; cta.classList.add("cta-free"); return; }
    var v = p();
    cta.textContent = v < 0.25 ? "catch me" : v < 0.5 ? "getting warmer" : v < 0.75 ? "almost had it" : "okay, one more";
    cta.setAttribute("aria-label", "Reward locked \\u2014 keep exploring (" + q.pct + "%)");
  }

  function clampMove(nx, ny) {
    var zr = zone.getBoundingClientRect(), br = cta.getBoundingClientRect();
    var maxX = Math.max(40, (window.innerWidth - br.width) / 2 - 24);
    var maxY = 90;
    tx = Math.max(-maxX, Math.min(maxX, nx));
    ty = Math.max(-maxY, Math.min(maxY, ny));
    cta.style.transform = "translate(" + tx + "px," + ty + "px)";
  }

  // Pointer dodge (mouse only; never under reduced motion).
  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", function (e) {
      if (unlocked() || q.ctaUnlocked) return;
      var br = cta.getBoundingClientRect();
      var cx = br.left + br.width / 2, cy = br.top + br.height / 2;
      var dx = cx - e.clientX, dy = cy - e.clientY;
      var d = Math.hypot(dx, dy);
      if (d > 120 || d === 0) return;
      if (Math.random() < p() * p()) return; // it "trips" — near-catch moment
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
      cta.classList.add("cta-free");
      cta.textContent = "\\u2713 unlocked";
      cta.disabled = true;
      reward.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      document.dispatchEvent(new CustomEvent("cta:opened"));
      return;
    }
    // Not unlocked yet:
    if (e.detail === 0) {
      // keyboard activation
      note.textContent = "Keyboard user, huh. Respect \\u2014 no chasing for you. Finish exploring and I'm all yours. (" + q.pct + "%)";
    } else if (matchMedia("(hover: none)").matches && !reduce) {
      var n = Math.ceil(3 * (1 - p()));
      if (hops < n) {
        hops++;
        cta.style.transitionDuration = "180ms";
        clampMove((Math.random() * 2 - 1) * 120, (Math.random() * 2 - 1) * 70);
        note.textContent = "Nope. Explore more first \\u2014 " + q.pct + "%.";
      }
    } else {
      note.textContent = "Explore everything first \\u2014 you're at " + q.pct + "%.";
    }
  });

  // Rating.
  var stars = [].slice.call(rating.querySelectorAll("[data-star]"));
  var send = rating.querySelector(".r-send");
  var comment = rating.querySelector("textarea");
  var hp = rating.querySelector(".hp-field");
  var chosen = 0;
  stars.forEach(function (s) {
    s.addEventListener("click", function () {
      chosen = parseInt(s.getAttribute("data-star"), 10);
      stars.forEach(function (x, i) { x.classList.toggle("on", i < chosen); });
      send.disabled = false;
    });
  });
  send.addEventListener("click", function () {
    if (!chosen) return;
    send.disabled = true;
    send.textContent = "Sent \\u2713";
    try {
      fetch("/api/rating", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ r: chosen, c: (comment.value || "").slice(0, 280),
          t: "minimal", p: location.pathname, ms: Date.now() - startTs, hp: hp.value || "" }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
    rating.classList.add("sent");
    window.QUEST.markRating(); // unlocks regardless of network outcome
  });

  function sync() {
    q = window.QUEST.get();
    label();
    if (q.pct >= 100 && !q.ratingDone && !q.ctaUnlocked) rating.classList.add("on");
    if (q.ratingDone) { rating.classList.remove("on"); }
    if (q.ctaUnlocked) { reward.classList.add("on"); cta.textContent = "\\u2713 unlocked"; cta.disabled = true; }
    if (unlocked() && !q.ctaUnlocked) {
      cta.style.transitionDuration = "300ms";
      clampMove(0, 0);
      note.textContent = "It stopped moving. Go on.";
    }
  }
  document.addEventListener("quest:update", sync);
  document.addEventListener("quest:complete", sync);
  sync();
})();
`;
