// Shared interactive touches, inlined by themes at render time.
//
// Collision-avoidance cursor: the site runs the owner's patent as UX. Every
// link/target gets an invisible detection zone; when the cursor CLOSES IN fast
// (time-to-collision < 0.35s, like a real V2V warning), an amber brake-light
// ring appears before you "hit" it. Slow browsing never triggers it — the
// warning fires on approach speed, not proximity, which is the patent's point.
// The patent section carries the reveal line that explains the joke.

export const collisionCSS = `
.cav-warn{box-shadow:0 0 0 3px oklch(0.83 0.155 80 / .5),0 0 16px 2px oklch(0.83 0.155 80 / .22);border-radius:6px;transition:box-shadow .16s cubic-bezier(.165,.84,.44,1)}
.cav-warn:hover{box-shadow:0 0 0 2px oklch(0.68 0.14 155 / .55),0 0 10px 1px oklch(0.68 0.14 155 / .18)}
.cav-note{margin-top:1rem;font-size:.85em;line-height:1.55;opacity:.78;border-top:1px dashed color-mix(in srgb,currentColor 25%,transparent);padding-top:.8rem;max-width:58ch}
@media (prefers-reduced-motion: reduce){.cav-warn{transition:none}}
@media (hover: none){.cav-note{display:none}}
`;

// No <script> wrapper — themes wrap it themselves.
export const collisionJS = `
(function () {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var targets = [].slice.call(document.querySelectorAll("a[href], [data-cav]"));
  if (!targets.length) return;

  var rects = null;
  function measure() {
    rects = targets.map(function (el) {
      var b = el.getBoundingClientRect();
      return { el: el, x: b.left, y: b.top, w: b.width, h: b.height };
    });
  }
  addEventListener("scroll", function () { rects = null; }, { passive: true });
  addEventListener("resize", function () { rects = null; });

  // TTC gate: warn only when a "collision" is imminent — fast approach,
  // aligned trajectory, close range. Rare on purpose.
  var TTC = 0.35, MIN_V = 380, MAX_D = 260, HOLD = 300;
  var px = 0, py = 0, pt = 0, vx = 0, vy = 0, raf = 0;
  var warned = new Map(), sweeping = 0;

  document.addEventListener("mousemove", function (e) {
    var t = e.timeStamp || performance.now();
    if (pt) {
      var dt = (t - pt) / 1000;
      if (dt > 0.004 && dt < 0.2) { vx = (e.clientX - px) / dt; vy = (e.clientY - py) / dt; }
    }
    px = e.clientX; py = e.clientY; pt = t;
    if (!raf) raf = requestAnimationFrame(scan);
  }, { passive: true });

  function scan() {
    raf = 0;
    if (!rects) measure();
    var v = Math.hypot(vx, vy), now = performance.now();
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var nx = Math.max(r.x, Math.min(px, r.x + r.w));
      var ny = Math.max(r.y, Math.min(py, r.y + r.h));
      var dx = nx - px, dy = ny - py, d = Math.hypot(dx, dy);
      if (d === 0) { unwarn(r.el); continue; } // arrived — :hover styling takes over
      var toward = v > MIN_V && d < MAX_D && (dx * vx + dy * vy) / (d * v) > 0.6;
      if (toward && d / v < TTC) {
        if (!warned.has(r.el)) r.el.classList.add("cav-warn");
        warned.set(r.el, now);
        sweep();
      }
    }
  }
  function unwarn(el) {
    if (warned.has(el)) { el.classList.remove("cav-warn"); warned.delete(el); }
  }
  function sweep() {
    if (sweeping) return;
    sweeping = setTimeout(function () {
      sweeping = 0;
      var now = performance.now();
      warned.forEach(function (t, el) { if (now - t > HOLD) unwarn(el); });
      if (warned.size) sweep();
    }, HOLD);
  }
})();
`;

// The payoff line, shown inside the patent block (hidden on touch — no cursor,
// no collision, no joke).
export const patentNoteHTML =
  `<p class="cav-note">The amber glow you may have noticed just before a click is a ` +
  `collision-avoidance warning &mdash; approach speed and distance, the same idea I ` +
  `patented at 16 and that GM Cruise later cited. This site runs it.</p>`;

// "Status Monitor · Stan" — under-construction stub for the Live Action idea.
// Themes wrap it in their own section/heading grammar.
export const liveStubCSS = `
.live-panel{border:1px dashed color-mix(in srgb,currentColor 30%,transparent);border-radius:10px;padding:1.1rem 1.2rem 1.25rem;max-width:44rem}
.live-head{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;font-size:.95em;margin:0}
.live-dot{width:.6rem;height:.6rem;border-radius:50%;background:oklch(0.75 0.13 80);flex:0 0 auto}
@media (prefers-reduced-motion: no-preference){.live-dot{animation:livepulse 2.2s cubic-bezier(.165,.84,.44,1) infinite}
@keyframes livepulse{0%,100%{box-shadow:0 0 0 0 oklch(0.75 0.13 80 / .45)}50%{box-shadow:0 0 0 6px oklch(0.75 0.13 80 / 0)}}}
.live-tag{font-size:.72em;letter-spacing:.08em;text-transform:uppercase;border:1px solid color-mix(in srgb,currentColor 30%,transparent);border-radius:99px;padding:.1rem .55rem;opacity:.7}
.live-line{margin:.65rem 0 0;font-size:.9em;line-height:1.6;opacity:.75;max-width:58ch}
.live-skel{margin-top:.9rem;display:flex;flex-direction:column;gap:.45rem}
.live-skel span{display:block;height:.55rem;border-radius:4px;background:color-mix(in srgb,currentColor 12%,transparent)}
@media (prefers-reduced-motion: no-preference){.live-skel span{background:linear-gradient(90deg,color-mix(in srgb,currentColor 10%,transparent) 25%,color-mix(in srgb,currentColor 20%,transparent) 50%,color-mix(in srgb,currentColor 10%,transparent) 75%);background-size:200% 100%;animation:liveskel 1.8s linear infinite}
@keyframes liveskel{from{background-position:200% 0}to{background-position:-200% 0}}}
`;

export const liveStubHTML =
  `<div class="live-panel" role="status">` +
  `<p class="live-head"><span class="live-dot" aria-hidden="true"></span>` +
  `<strong>Status Monitor &middot; Stan</strong>` +
  `<span class="live-tag">under construction</span></p>` +
  `<p class="live-line">Coming soon: what I'm doing right now &mdash; coding, on the move, ` +
  `shipping &mdash; plus live numbers from the things I run. I built status monitors for ` +
  `Claude and ChatGPT; this one watches me.</p>` +
  `<div class="live-skel" aria-hidden="true"><span style="width:62%"></span>` +
  `<span style="width:41%"></span><span style="width:54%"></span></div>` +
  `</div>`;
