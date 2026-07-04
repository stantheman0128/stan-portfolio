// Shared interactive touches, inlined by themes at render time.
// (The collision-avoidance cursor experiment was removed by owner decision on
// 2026-07-04 — see git history if it's ever wanted again.)

// "Status Monitor · Stan" — under-construction stub for the Live Action idea.
// Used by the Minimal theme only; Featherweight stays architecture-pure.
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
