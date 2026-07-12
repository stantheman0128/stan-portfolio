// The photo IS the progress bar, the ONE progress object on the page.
// A small polaroid sits below the hero from the first paint: an emulsion of
// shards covers the image while locked, and those shards un-cover as the
// visitor explores, driven by how many works they've watched. The face keeps
// its own two shards on until the very end. It dodges the cursor with a damped
// rAF glide (paper sliding on a desk, no spring overshoot), leans into its
// direction of travel, and lifts while moving. At 100% it stops and gets
// caught with a click, and that catch opens the face shards. The photo is a
// public asset now (a friendly easter egg, not a secret), so there is no token
// gate. The code-word panel at the bottom stays. Events kept for the sprite:
// cta:chase, cta:opened, photo:developed.

export const ctaCSS = `
#cta-top{margin:30px 0 6px}
#cta-zone{position:relative;min-height:200px;display:flex;align-items:flex-start}
#photo{margin:0;display:inline-block;background:#fffdfa;border:1px solid #d8d0c4;border-radius:4px;padding:8px 8px 6px;box-shadow:0 10px 30px rgba(41,31,23,.14);transform:rotate(-2deg);will-change:transform;cursor:pointer}
#photo.ph-lift{box-shadow:0 22px 54px rgba(41,31,23,.22)}
#photo.ph-free{border-color:#c2522d;box-shadow:0 0 0 4px rgba(194,82,45,.14),0 10px 34px rgba(194,82,45,.2)}
#photo-btn{all:unset;display:block;cursor:pointer}
#photo-btn:focus-visible{outline:2px solid #c2522d;outline-offset:4px}
#photo-img{width:200px;height:auto;display:block;border-radius:2px;background:#efe7da}
#photo-cap{margin:6px 0 0;max-width:200px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6f6b62;font-variant-numeric:tabular-nums}
#photo.ph-free #photo-cap{color:#c2522d}
@media (prefers-reduced-motion:reduce){#photo{transform:rotate(-2deg) !important}#photo-img{transition:none}}
@media (max-width:640px){#photo-img{width:150px}#photo-cap{max-width:150px}#cta-zone{min-height:180px}}
#cta-note{margin-top:10px;font-size:12.5px;color:#8b877f;min-height:1.4em;transition:opacity .25s}
#cta-note.flash{color:#c2522d}
`;

export const ctaTopHTML = `
<div id="cta-top" aria-label="Exploration progress and reward">
  <div id="cta-zone">
    <figure id="photo">
      <button id="photo-btn" type="button" aria-describedby="cta-note">
        <canvas id="photo-img" width="300" height="360" role="img" aria-label="A photo of Stan, developing as you explore"></canvas>
      </button>
      <figcaption id="photo-cap">developing &middot; 0%</figcaption>
    </figure>
  </div>
  <p id="cta-note"></p>
</div>
`;


export const ctaJS = `
(function () {
  var photo = document.getElementById("photo");
  var btn = document.getElementById("photo-btn");
  var img = document.getElementById("photo-img");
  var cap = document.getElementById("photo-cap");
  var note = document.getElementById("cta-note");
  if (!photo || !window.QUEST) return;

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var q = window.QUEST.get();
  var hops = 0, lastJuke = 0, lastChase = 0;
  // Measured against the real reward-photo.jpg (night riverside shot): the head
  // sits center-right, hair top ~29% down, chin ~56%, cheeks ~41%-65% across.
  var FACE_BOX = { x: 0.41, y: 0.29, w: 0.24, h: 0.27 };
  var shatter = window.Shatter ? window.Shatter.createShatterReveal(img, "/assets/reward-photo.jpg", { steps: Math.max(1, q.total), reduce: reduce, faceBox: FACE_BOX }) : null;

  function p() { return Math.min(1, q.pct / 100); }
  function unlocked() { return q.pct >= 100; }

  // The one message line. Quest events land here.
  var noteTimer = 0, defaultNote = "Camera-shy. It develops \\u2014 and calms down \\u2014 as you explore the works.";
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
    if (q.ctaUnlocked) {
      return developed
        ? "Code word delivered. And that's the real me, fully developed."
        : "Code word delivered. The photo's ready when you are \\u2014 tap it.";
    }
    if (unlocked()) return "It stopped running. Go catch it.";
    return defaultNote;
  }
  document.addEventListener("quest:note", function (e) { setNote(e.detail.msg); });

  // Coverage IS the progress bar: shards un-cover as watched climbs; the face
  // shards stay shut until the catch fires revealFace().
  var developing = false, developed = false;
  function paint() {
    if (shatter && !developed) shatter.setStep(q.watched.length);
    if (q.ctaUnlocked) {
      photo.classList.add("ph-free");
      if (!developing && !developed) cap.textContent = "caught \\u00b7 tap to develop";
      btn.setAttribute("aria-label", developed ? "The full photo of Stan" : "Tap to develop the full photo");
    } else if (unlocked()) {
      photo.classList.add("ph-free");
      cap.textContent = "100% \\u00b7 catch it";
      btn.setAttribute("aria-label", "Catch the photo to develop it");
    } else {
      cap.textContent = "developing \\u00b7 " + q.pct + "%";
      btn.setAttribute("aria-label", "A photo developing as you explore \\u2014 " + q.pct + "% \\u2014 it dodges until you finish");
    }
  }

  // Catch at 100% opens the two face shards via revealFace(); the photo is a
  // public asset, so there's no token to fetch.
  function develop() {
    if (developed) return;
    if (shatter) shatter.revealFace();
    developed = true;
    cap.textContent = "the full Stan \\u00b7 you earned this";
    note.textContent = statusNote();
    document.dispatchEvent(new CustomEvent("photo:developed"));
  }

  // Evasion v2: a damped glide instead of spring steps. pointermove nudges a
  // goal point; a rAF loop eases the polaroid toward it and leans it into the
  // direction of travel. Reads as paper sliding on a desk, not a startled UI.
  var tx = 0, ty = 0, gx = 0, gy = 0, lean = 0, raf = 0;
  function glide() {
    raf = 0;
    var dx = gx - tx, dy = gy - ty;
    tx += dx * 0.16;
    ty += dy * 0.16;
    var targetLean = Math.max(-6, Math.min(6, dx * 0.05));
    lean += (targetLean - lean) * 0.2;
    photo.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) rotate(" + (-2 + lean).toFixed(2) + "deg)";
    if (Math.hypot(dx, dy) > 0.5 || Math.abs(lean - targetLean) > 0.1) {
      raf = requestAnimationFrame(glide);
    } else {
      tx = gx; ty = gy; lean = 0;
      photo.style.transform = "translate(" + tx + "px," + ty + "px) rotate(-2deg)";
      photo.classList.remove("ph-lift");
    }
  }
  function driftTo(nx, ny) {
    var br = photo.getBoundingClientRect();
    var baseLeft = br.left - tx;
    var maxRight = document.documentElement.clientWidth - baseLeft - br.width - 12;
    var maxLeft = baseLeft - 12;
    gx = Math.max(-maxLeft, Math.min(maxRight, nx));
    gy = Math.max(-40, Math.min(110, ny));
    photo.classList.add("ph-lift");
    if (!raf) raf = requestAnimationFrame(glide);
  }

  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", function (e) {
      if (unlocked() || q.ctaUnlocked) return;
      var br = photo.getBoundingClientRect();
      var cx = br.left + br.width / 2, cy = br.top + br.height / 2;
      var dx = cx - e.clientX, dy = cy - e.clientY;
      var d = Math.hypot(dx, dy);
      if (d > 130 || d === 0) return;
      var now = Date.now();
      if (now - lastChase > 20000) {
        lastChase = now;
        document.dispatchEvent(new CustomEvent("cta:chase", { detail: { pct: q.pct } }));
      }
      if (Math.random() < p() * p()) return; // trips — near-catch
      var step = 90 * (1 - p());
      if (step < 2) return;
      var ux = dx / d, uy = dy / d;
      // One flee in ~4 becomes a sideways arc instead of a straight slide.
      if (now - lastJuke > 900 && Math.random() < 0.25) {
        lastJuke = now;
        var side = Math.random() < 0.5 ? 1 : -1;
        driftTo(gx + (ux * 0.4 - uy * side) * step, gy + (uy * 0.4 + ux * side) * step * 0.7);
        return;
      }
      driftTo(gx + ux * step, gy + uy * step * 0.7);
    }, { passive: true });
  }

  btn.addEventListener("click", function (e) {
    if (q.ctaUnlocked || unlocked()) {
      var firstCatch = !q.ctaUnlocked;
      window.QUEST.markUnlocked();
      q = window.QUEST.get();
      paint();
      note.textContent = statusNote();
      if (firstCatch) document.dispatchEvent(new CustomEvent("cta:opened"));
      develop();
      return;
    }
    if (e.detail === 0) {
      setNote("Keyboard user, huh. Respect \\u2014 no chasing for you. Finish exploring and it holds still. (" + q.pct + "%)");
    } else if (matchMedia("(hover: none)").matches && !reduce) {
      var n = Math.ceil(3 * (1 - p()));
      if (hops < n) {
        hops++;
        driftTo((Math.random() * 2 - 1) * 120, Math.random() * 90);
        setNote("Nope. Explore more first \\u2014 " + q.pct + "%.");
      }
    } else {
      setNote("Explore everything first \\u2014 you're at " + q.pct + "%.");
    }
  });

  function settleHome() {
    gx = 0; gy = 0;
    photo.classList.add("ph-lift");
    if (!reduce && !raf) raf = requestAnimationFrame(glide);
    if (reduce) { tx = ty = 0; photo.classList.remove("ph-lift"); }
  }
  function sync() {
    q = window.QUEST.get();
    paint();
    if (q.ctaUnlocked) {
      settleHome();
    } else if (unlocked()) {
      settleHome();
      note.textContent = statusNote();
    }
  }
  document.addEventListener("quest:update", sync);
  document.addEventListener("quest:complete", sync);
  sync();
  note.textContent = statusNote();
})();
`;
