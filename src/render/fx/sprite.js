// The guide sprite v3 — a hedgehog (owner decision; the bird retired).
// Layered SVG rig, "2.5D" liveliness without any 3D dependency:
//   • travels by TUCKING INTO A BALL and rolling, unrolls on arrival
//   • pokes the thing it suggests (nose-first nudge)
//   • sometimes freezes, then suddenly turns its head to look AT you
//   • breathes, blinks, sniffs on idle; flips to face travel direction
// Tab moods (title + favicon swap, eager-vs-homesick) carried over.
// Decorative: aria-hidden; quest info lives in the badge / SR live region.

export const spriteCSS = `
#sprite{position:fixed;left:0;top:0;z-index:70;width:92px;pointer-events:none;will-change:transform;transition:transform 1.15s cubic-bezier(.33,.75,.35,1)}
#sprite svg{display:block;overflow:visible;transition:transform .35s}
#sprite.s-face-left svg{transform:scaleX(-1)}
@media (prefers-reduced-motion:reduce){#sprite{transition:none}}
#sprite .hh,#sprite .ball{transition:opacity .25s}
#sprite .ball{opacity:0}
#sprite.s-roll .hh{opacity:0}
#sprite.s-roll .ball{opacity:1}
#sprite .hh-face{transform-origin:78px 62px;transition:transform .45s cubic-bezier(.165,.84,.44,1)}
#sprite .hh-pupil{transition:transform .3s}
#sprite .hh-lid{transform-origin:88px 57px;transform:scaleY(0)}
#sprite.s-sleep{opacity:.55}
#sprite.s-sleep .hh-face{transform:rotate(14deg) translateY(3px)}
@media (prefers-reduced-motion:no-preference){
  #sprite.s-idle .hh{animation:hh-breathe 3.6s ease-in-out infinite;transform-origin:52px 78px}
  @keyframes hh-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.035)}}
  #sprite .hh-lid{animation:hh-blink 5.4s infinite}
  @keyframes hh-blink{0%,94%,100%{transform:scaleY(0)}96%,98%{transform:scaleY(1)}}
  #sprite.s-idle .hh-nose{animation:hh-sniff 7.5s infinite}
  @keyframes hh-sniff{0%,90%,100%{transform:translate(0,0)}92%,96%{transform:translate(1.3px,-.8px)}94%,98%{transform:translate(-.6px,.5px)}}
  #sprite.s-look .hh-face{transform:rotate(-11deg) scale(1.06)}
  #sprite.s-look .hh-pupil{transform:translate(-1.6px,.8px) scale(1.35)}
  #sprite.s-yay .hh{animation:hh-hop .34s ease-out 2}
  @keyframes hh-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  #sprite.s-poke .hh{animation:hh-poke .5s ease-in-out 2}
  @keyframes hh-poke{0%,100%{transform:translateX(0)}45%{transform:translateX(9px) rotate(2deg)}}
  #sprite.s-roll .ball{animation:hh-spin .55s linear infinite;transform-origin:52px 62px}
  @keyframes hh-spin{to{transform:rotate(360deg)}}
}
@media (prefers-reduced-motion:reduce){
  #sprite.s-look .hh-face{transform:rotate(-11deg)}
}
#bubble{position:fixed;left:0;top:0;z-index:71;max-width:15.5rem;background:#fffdfa;border:1px solid #d8d0c4;border-radius:11px 11px 11px 3px;padding:.65rem .8rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;color:#3a3833;box-shadow:0 8px 28px rgba(41,31,23,.12);display:none}
#bubble.on{display:block}
#bubble .b-x{position:absolute;top:4px;right:7px;all:unset;cursor:pointer;color:#b7b2a8;font-size:12px;padding:2px 4px}
#bubble .b-x:hover{color:#c2522d}
#bubble .b-chips{margin-top:.5rem;display:flex;gap:6px;flex-wrap:wrap}
#bubble .b-chips button{all:unset;cursor:pointer;border:1px solid #17151a;border-radius:999px;padding:.22rem .7rem;font-size:11.5px}
#bubble .b-chips button:hover,#bubble .b-chips button:focus-visible{background:#17151a;color:#fffdfa}
#bubble .b-chips button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
@media print{#sprite,#bubble{display:none !important}}
@media (max-width:640px){#sprite{width:68px}}
`;

export const spriteHTML = `
<div id="sprite" class="s-idle" aria-hidden="true">
  <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
    <g class="hh">
      <g class="hh-quills">
        <path d="M20 74 Q14 46 34 34 Q52 22 74 32 Q88 38 90 52 L88 74 Z" fill="#8f351f"/>
        <polygon points="22,52 12,40 28,42" fill="#8f351f"/>
        <polygon points="30,40 24,26 40,32" fill="#8f351f"/>
        <polygon points="44,32 42,16 56,26" fill="#8f351f"/>
        <polygon points="60,28 64,13 72,27" fill="#8f351f"/>
        <polygon points="74,32 84,20 84,36" fill="#8f351f"/>
        <polygon points="16,62 5,56 16,50" fill="#8f351f"/>
      </g>
      <path d="M88 74 L88 52 Q92 44 104 52 Q112 58 106 68 Q100 76 88 74 Z" fill="#efe7da" stroke="#d8d0c4" stroke-width="1"/>
      <g class="hh-face">
        <circle class="hh-nose" cx="107" cy="60" r="3.4" fill="#17151a"/>
        <g>
          <circle cx="88" cy="57" r="4.6" fill="#fffdfa" stroke="#d8d0c4" stroke-width=".8"/>
          <circle class="hh-pupil" cx="89.4" cy="57.4" r="2.2" fill="#17151a"/>
          <rect class="hh-lid" x="83" y="52" width="10.5" height="10" rx="5" fill="#efe7da"/>
        </g>
        <path d="M84 48 Q86 43 90 46 Q88 49 84 48 Z" fill="#d8b9a4"/>
      </g>
      <path d="M28 74 Q52 82 86 74 L84 78 Q52 86 30 78 Z" fill="#efe7da"/>
      <line x1="40" y1="78" x2="39" y2="88" stroke="#17151a" stroke-width="1.6"/>
      <line x1="70" y1="78" x2="72" y2="88" stroke="#17151a" stroke-width="1.6"/>
    </g>
    <g class="ball">
      <circle cx="52" cy="62" r="30" fill="#8f351f"/>
      <polygon points="52,30 46,18 60,22" fill="#8f351f"/>
      <polygon points="76,42 88,34 84,48" fill="#8f351f"/>
      <polygon points="80,70 93,72 84,82" fill="#8f351f"/>
      <polygon points="52,94 48,105 62,100" fill="#8f351f"/>
      <polygon points="28,82 16,88 22,74" fill="#8f351f"/>
      <polygon points="24,46 12,40 22,32" fill="#8f351f"/>
      <circle cx="52" cy="62" r="14" fill="#a2492f"/>
    </g>
  </svg>
</div>
<div id="bubble" role="presentation">
  <button class="b-x" type="button" aria-label="Stop guiding me">&times;</button>
  <span class="b-text"></span>
  <div class="b-chips"></div>
</div>
`;

export const spriteJS = `
(function () {
  var sprite = document.getElementById("sprite");
  var bubble = document.getElementById("bubble");
  if (!sprite || !bubble || !window.QUEST) return;
  var bText = bubble.querySelector(".b-text");
  var bChips = bubble.querySelector(".b-chips");
  var bX = bubble.querySelector(".b-x");

  var q = window.QUEST.get();
  var dismissed = q.spriteDismissed;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lastBubble = 0, suggests = 0, lastScroll = 0, bubbleTimer = 0;
  var mode = "idle", flying = false, x = 0, y = 0, faceLeft = false;
  addEventListener("scroll", function () { lastScroll = Date.now(); }, { passive: true });

  var W = 92;
  function vw() { return document.documentElement.clientWidth; }
  function vh() { return document.documentElement.clientHeight; }
  function home() { return { x: vw() - W - 16, y: vh() - 104 }; }

  function setMode(m) {
    mode = m;
    sprite.className = "s-" + m + (faceLeft ? " s-face-left" : "");
  }
  function face(left) {
    faceLeft = left;
    sprite.classList.toggle("s-face-left", left);
  }
  function place(nx, ny, instant) {
    nx = Math.max(6, Math.min(vw() - W - 6, nx));
    ny = Math.max(6, Math.min(vh() - 100, ny));
    if (Math.abs(nx - x) > 4) face(nx < x);
    x = nx; y = ny;
    if (instant || reduce) sprite.style.transition = "none";
    sprite.style.transform = "translate(" + x + "px," + y + "px)";
    if (instant || reduce) requestAnimationFrame(function () { sprite.style.transition = ""; });
    if (bubble.classList.contains("on")) placeBubble();
  }
  // Roll there as a ball; unroll on arrival.
  function rollTo(nx, ny, then) {
    if (reduce) { place(nx, ny); if (then) then(); return; }
    flying = true;
    setMode("roll");
    place(nx, ny);
    setTimeout(function () {
      flying = false;
      setMode("idle");
      if (bubble.classList.contains("on")) placeBubble();
      if (then) then();
    }, 1200);
  }
  var h0 = home();
  place(h0.x, h0.y, true);
  addEventListener("resize", function () { if (!flying) { var h = home(); place(h.x, h.y, true); } });

  // Free roam — occasional relocations.
  function anchors() {
    var w = vw(), h = vh();
    return [
      home(),
      { x: w - W - 20, y: 84 },
      { x: 24, y: 76 },
      { x: 24, y: h * 0.45 },
      { x: w * 0.5 - W / 2, y: 60 },
      { x: w - W - 24, y: h * 0.45 }
    ];
  }
  (function roamLoop() {
    setTimeout(function () {
      if (!dismissed && mode === "idle" && !flying && !document.hidden &&
          !bubble.classList.contains("on") && !reduce &&
          Date.now() - lastScroll > 3000) {
        var a = anchors()[Math.floor(Math.random() * 6)];
        if (Math.abs(a.x - x) + Math.abs(a.y - y) > 60) rollTo(a.x, a.y);
      }
      roamLoop();
    }, 18000 + Math.random() * 14000);
  })();

  // Idle micro-life: freeze… then suddenly turn and look at you. Or a tiny hop.
  (function lifeLoop() {
    setTimeout(function () {
      if (!dismissed && mode === "idle" && !flying && !document.hidden) {
        if (Math.random() < 0.62) {
          setMode("look");
          setTimeout(function () { if (mode === "look") setMode("idle"); }, 1400);
        } else if (!reduce) {
          setMode("yay");
          setTimeout(function () { if (mode === "yay") setMode("idle"); }, 800);
        }
      }
      lifeLoop();
    }, 8000 + Math.random() * 8000);
  })();

  function placeBubble() {
    var r = sprite.getBoundingClientRect();
    var bw = Math.min(268, vw() - 16);
    var left = Math.max(8, Math.min(vw() - bw - 8, r.left - bw + 40));
    bubble.style.left = left + "px";
    bubble.style.top = "auto";
    bubble.style.bottom = Math.max(8, vh() - r.top + 8) + "px";
  }
  function say(text, chips, opts) {
    opts = opts || {};
    if (dismissed) return;
    var now = Date.now();
    if (!opts.force && now - lastBubble < 20000) return;
    if (!opts.force && now - lastScroll < 1200) return;
    lastBubble = now;
    bText.textContent = text;
    bChips.replaceChildren();
    (chips || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c.label;
      b.addEventListener("click", function () { hide(); c.go(); });
      bChips.appendChild(b);
    });
    placeBubble();
    bubble.classList.add("on");
    clearTimeout(bubbleTimer);
    if (!chips || !chips.length) bubbleTimer = setTimeout(hide, opts.hold || 5200);
  }
  function hide() { bubble.classList.remove("on"); }
  bX.addEventListener("click", function () {
    dismissed = true;
    window.QUEST.dismissSprite(true);
    hide();
    setMode("sleep");
    var h = home();
    rollTo(h.x, h.y, function () { setMode("sleep"); });
  });

  // Suggest: roll over, POKE the row, then speak.
  var SUGGEST_LINES = [
    "This one's my favourite. Peek inside?",
    "Want to look at this one next?",
    "Psst \\u2014 this one has a good story.",
    "One more? This one's quick."
  ];
  function nextTarget() {
    q = window.QUEST.get();
    var rows = [].slice.call(document.querySelectorAll("[data-quest]"));
    for (var i = 0; i < rows.length; i++) {
      var id = rows[i].getAttribute("data-quest");
      if (q.watched.indexOf(id) === -1) return rows[i];
    }
    if (q.watched.indexOf("patent") === -1) return document.getElementById("patent");
    return null;
  }
  function suggest(force) {
    if (dismissed || suggests >= 3) return;
    var t = nextTarget();
    if (!t) return;
    suggests++;
    var r = t.getBoundingClientRect();
    var name = t.querySelector(".title") ? t.querySelector(".title").textContent : "the patent";
    var destX = Math.min(vw() - W - 10, r.right + 4);
    var destY = Math.max(10, r.top + r.height / 2 - 52);
    if (r.top < 0 || r.bottom > vh()) { destX = x; destY = y; }
    rollTo(destX, destY, function () {
      face(true); // face the content
      setMode("poke");
      window.QUEST.pulse(t);
      setTimeout(function () {
        setMode("idle");
        say(SUGGEST_LINES[suggests % SUGGEST_LINES.length] + " (" + name + ")", null, { force: !!force });
      }, 1000);
    });
  }

  // Quest reactions.
  document.addEventListener("quest:item-watched", function (e) {
    setMode("yay");
    say("Nice. That's " + e.detail.n + " of " + e.detail.total + ".", null, { force: true });
    setTimeout(function () { setMode("idle"); suggest(); }, 2200);
  });
  document.addEventListener("quest:complete", function () {
    setMode("yay");
    say("That's everything \\u2014 the button up top just gave up. Go catch it.", null, { force: true, hold: 7000 });
    setTimeout(function () { setMode("idle"); }, 2600);
  });
  document.addEventListener("cta:opened", function () {
    setMode("yay");
    say("Caught it! Enjoy the code word \\u2014 you're one of very few.", null, { force: true, hold: 8000 });
    setTimeout(function () { setMode("sleep"); }, 6000);
  });
  document.addEventListener("rate:sent", function (e) {
    setMode("yay");
    say("Logged \\u2014 " + e.detail.r + "/10. Everyone will see that one.", null, { force: true });
    setTimeout(function () { setMode("idle"); }, 2200);
  });

  // Tab moods: title + favicon while away; eager vs homesick on return.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='http']");
    if (a && a.host !== location.host) {
      try { sessionStorage.setItem("ob", String(Date.now())); } catch (err) {}
    }
  }, true);
  var realTitle = document.title;
  var fav = document.querySelector('link[rel="icon"]');
  var realFav = fav && fav.getAttribute("href");
  var missFav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext x='16' y='24' font-size='24' text-anchor='middle'%3E%F0%9F%91%80%3C/text%3E%3C/svg%3E";
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      document.title = "\\uD83D\\uDC40 the works miss you";
      if (fav) fav.setAttribute("href", missFav);
    } else {
      document.title = realTitle;
      if (fav && realFav) fav.setAttribute("href", realFav);
      var ob = 0;
      try { ob = parseInt(sessionStorage.getItem("ob") || "0", 10); } catch (err) {}
      var recent = ob && Date.now() - ob < 1800000;
      try { sessionStorage.removeItem("ob"); } catch (err) {}
      if (recent) {
        setMode("yay");
        say("You went to look at my work! So? So??", null, { force: true });
        setTimeout(function () { setMode("idle"); }, 2600);
      } else if (!dismissed) {
        setMode("look");
        say("You're back. I kept your spot warm.");
        setTimeout(function () { setMode("idle"); }, 2200);
      }
    }
  });

  // Welcome / return.
  if (dismissed) {
    setMode("sleep");
  } else if (q.visits <= 1 && q.pct === 0) {
    setTimeout(function () {
      say("Oh, hi. Didn't hear you come in. Want the tour, or shall I just hang back?", [
        { label: "Show me around", go: function () { suggest(true); } },
        { label: "I'll explore", go: function () { suggests = 3; setMode("sleep"); setTimeout(function () { setMode("idle"); }, 8000); } }
      ], { force: true });
    }, 900);
  } else if (q.ctaUnlocked) {
    setMode("sleep");
  } else {
    setTimeout(function () { suggest(); }, 12000);
  }
})();
`;
