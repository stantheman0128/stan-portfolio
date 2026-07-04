// The guide sprite v5 — hedgehog, third pass on owner feedback.
// Hand-drawn 立繪 feel with ZERO runtime cost (asset research verdict: no
// free layered asset beats upgrading our own SVG): a feTurbulence+
// feDisplacementMap filter gives every line a pencil wobble, ink contours
// and hatching read as pen strokes, and a front PAW joins the layered
// puppet so it can physically poke things — including your cursor.
// New behaviors: a bother-loop that walks over and boops the mouse,
// score-aware rating quips, chase commentary, and a speed-reader callout.

export const spriteCSS = `
#sprite{position:fixed;left:0;top:0;z-index:70;width:92px;pointer-events:none;will-change:transform;transition:transform 1.15s cubic-bezier(.33,.75,.35,1)}
#sprite.s-scurrying{transition-duration:.72s;transition-timing-function:cubic-bezier(.45,.05,.55,.95)}
#sprite svg{display:block;overflow:visible;transition:transform .35s}
#sprite.s-face-left svg{transform:scaleX(-1)}
@media (prefers-reduced-motion:reduce){#sprite{transition:none}}
#sprite .hh,#sprite .ball{transition:opacity .22s}
#sprite .ball{opacity:0}
#sprite.s-roll .hh{opacity:0}
#sprite.s-roll .ball{opacity:1}
#sprite .hh-face{transform-origin:78px 62px;transition:transform .45s cubic-bezier(.165,.84,.44,1)}
#sprite .hh-eye{transition:transform .3s}
#sprite .hh-lid{transform-origin:88px 58px;transform:scaleY(0)}
#sprite .hh-shadow{transform-origin:56px 90px;transition:transform .3s,opacity .3s}
#sprite.s-sleep{opacity:.6}
#sprite.s-sleep .hh-face{transform:rotate(14deg) translateY(3px)}
@media (prefers-reduced-motion:no-preference){
  #sprite.s-idle .hh-body{animation:hh-breathe 3.6s ease-in-out infinite;transform-origin:52px 78px}
  @keyframes hh-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.03)}}
  #sprite .hh-lid{animation:hh-blink 5.4s infinite}
  @keyframes hh-blink{0%,94%,100%{transform:scaleY(0)}96%,98%{transform:scaleY(1)}}
  #sprite.s-idle .hh-nose{animation:hh-sniff 7.5s infinite}
  @keyframes hh-sniff{0%,90%,100%{transform:translate(0,0)}92%,96%{transform:translate(1.3px,-.8px)}94%,98%{transform:translate(-.6px,.5px)}}
  #sprite.s-look .hh-face{transform:rotate(-12deg) translate(-2px,-1px) scale(1.05)}
  #sprite.s-look .hh-eye{transform:scale(1.3)}
  #sprite.s-sniffa .hh-face{animation:hh-sniffa 1.6s ease-in-out 1}
  @keyframes hh-sniffa{0%,100%{transform:rotate(0)}30%{transform:rotate(9deg) translate(2px,3px)}65%{transform:rotate(-6deg) translate(-1px,-1px)}}
  #sprite.s-scratch .hh-legB{animation:hh-scr 1.2s ease-in-out 1;transform-origin:70px 78px}
  #sprite.s-scratch .hh-body{animation:hh-scrb 1.2s ease-in-out 1;transform-origin:52px 78px}
  @keyframes hh-scr{0%,100%{transform:rotate(0)}20%,40%,60%,80%{transform:rotate(38deg)}30%,50%,70%{transform:rotate(10deg)}}
  @keyframes hh-scrb{0%,100%{transform:rotate(0)}25%,75%{transform:rotate(-3deg)}}
  #sprite.s-yay .hh{animation:hh-hop .34s ease-out 2}
  #sprite.s-yay .hh-shadow{animation:hh-shadowhop .34s ease-out 2}
  @keyframes hh-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes hh-shadowhop{0%,100%{transform:scaleX(1);opacity:.22}50%{transform:scaleX(.72);opacity:.1}}
  #sprite.s-poke .hh{animation:hh-poke .5s ease-in-out 2}
  @keyframes hh-poke{0%,100%{transform:translateX(0)}45%{transform:translateX(9px) rotate(2deg)}}
  #sprite.s-poke .hh-paw{animation:hh-jab .5s ease-in-out 2;transform-origin:84px 73px}
  @keyframes hh-jab{0%,100%{transform:rotate(0)}45%{transform:rotate(-52deg)}}
  #sprite.s-scurrying .hh-legA{animation:hh-run .16s linear infinite;transform-origin:40px 78px}
  #sprite.s-scurrying .hh-legB{animation:hh-run .16s linear infinite reverse;transform-origin:70px 78px}
  @keyframes hh-run{0%,100%{transform:rotate(16deg)}50%{transform:rotate(-16deg)}}
  #sprite.s-scurrying .hh{animation:hh-jog .32s ease-in-out infinite}
  @keyframes hh-jog{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}
  #sprite.s-roll .ball{animation:hh-spin .55s linear infinite;transform-origin:52px 62px}
  @keyframes hh-spin{to{transform:rotate(360deg)}}
}
@media (prefers-reduced-motion:reduce){
  #sprite.s-look .hh-face{transform:rotate(-12deg)}
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
    <defs>
      <radialGradient id="hgQuill" cx="42%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#b0563a"/>
        <stop offset="55%" stop-color="#8f351f"/>
        <stop offset="100%" stop-color="#6b2515"/>
      </radialGradient>
      <linearGradient id="hgFace" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8f2e7"/>
        <stop offset="100%" stop-color="#e0d3bd"/>
      </linearGradient>
      <linearGradient id="hgBelly" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f4ecdd"/>
        <stop offset="100%" stop-color="#d9cbb2"/>
      </linearGradient>
      <radialGradient id="hgBall" cx="38%" cy="32%" r="85%">
        <stop offset="0%" stop-color="#b0563a"/>
        <stop offset="60%" stop-color="#8f351f"/>
        <stop offset="100%" stop-color="#5f2012"/>
      </radialGradient>
      <filter id="hhRough" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/>
      </filter>
    </defs>
    <ellipse class="hh-shadow" cx="56" cy="90" rx="34" ry="5" fill="#17151a" opacity=".22"/>
    <g class="hh">
      <g class="hh-body">
        <g class="hh-quills" filter="url(#hhRough)">
          <path d="M22 76 Q14 48 34 34 Q52 22 74 32 Q88 38 90 54 L88 76 Z" fill="#5f2012"/>
          <path d="M20 74 Q14 46 34 32 Q52 20 74 30 Q88 36 90 52 L88 74 Z" fill="url(#hgQuill)" stroke="#4a2415" stroke-width="1"/>
          <polygon points="22,52 10,40 27,41" fill="url(#hgQuill)"/>
          <polygon points="30,40 23,25 40,31" fill="url(#hgQuill)"/>
          <polygon points="44,31 41,14 56,25" fill="url(#hgQuill)"/>
          <polygon points="60,27 64,11 73,26" fill="url(#hgQuill)"/>
          <polygon points="74,31 85,19 85,35" fill="url(#hgQuill)"/>
          <polygon points="16,62 4,56 15,49" fill="url(#hgQuill)"/>
          <path d="M30 34 L26 27 M46 27 L44 19 M62 24 L64 16 M76 30 L82 23" stroke="#c98a6b" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".7"/>
          <path d="M30 62 l7 -4 M40 67 l7 -4 M52 70 l7 -4 M64 70 l7 -4 M26 52 l6 -4" stroke="#4a2415" stroke-width=".8" stroke-linecap="round" fill="none" opacity=".45"/>
        </g>
        <path d="M88 76 L88 52 Q92 44 104 52 Q112 58 106 68 Q100 77 88 76 Z" fill="url(#hgFace)" stroke="#b09a7c" stroke-width="1"/>
        <g class="hh-face">
          <circle class="hh-nose" cx="107" cy="60" r="3.6" fill="#241d1a"/>
          <circle cx="105.8" cy="58.8" r="1" fill="#5a504a"/>
          <g class="hh-eye">
            <circle cx="89" cy="58" r="3" fill="#17151a"/>
            <circle cx="88" cy="57" r="1" fill="#fffdfa"/>
          </g>
          <rect class="hh-lid" x="85" y="54" width="8" height="8" rx="4" fill="url(#hgFace)"/>
          <path d="M84 48 Q86 43 90 46 Q88 49 84 48 Z" fill="#d8b9a4"/>
          <path d="M96 66 Q99 67.5 102 66.5" stroke="#b59a7e" stroke-width=".9" fill="none" stroke-linecap="round"/>
        </g>
        <path d="M28 76 Q52 84 86 76 L84 80 Q52 88 30 80 Z" fill="url(#hgBelly)"/>
        <path class="hh-paw" d="M84 73 Q90 76 93 81" stroke="#241d1a" stroke-width="1.9" fill="none" stroke-linecap="round"/>
      </g>
      <line class="hh-legA" x1="40" y1="78" x2="39" y2="89" stroke="#241d1a" stroke-width="1.8" stroke-linecap="round"/>
      <line class="hh-legB" x1="70" y1="78" x2="72" y2="89" stroke="#241d1a" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <g class="ball" filter="url(#hhRough)">
      <circle cx="52" cy="64" r="29" fill="url(#hgBall)"/>
      <polygon points="52,32 46,19 60,24" fill="url(#hgBall)"/>
      <polygon points="76,44 88,36 84,50" fill="url(#hgBall)"/>
      <polygon points="80,72 93,74 84,84" fill="url(#hgBall)"/>
      <polygon points="52,96 48,107 62,102" fill="url(#hgBall)"/>
      <polygon points="28,84 16,90 22,76" fill="url(#hgBall)"/>
      <polygon points="24,48 12,42 22,34" fill="url(#hgBall)"/>
      <circle cx="45" cy="56" r="10" fill="#b0563a" opacity=".5"/>
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
  var mode = "idle", moving = false, x = 0, y = 0, faceLeft = false;
  var mouse = null;
  addEventListener("pointermove", function (e) {
    mouse = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, { passive: true });

  // Scroll tracking doubles as a speed-reader detector: >2800px inside ~0.8s
  // while the quest is unfinished earns one (rationed) callout.
  var fastWin = [], lastSpeedQuip = 0;
  addEventListener("scroll", function () {
    var nowS = Date.now();
    lastScroll = nowS;
    fastWin.push({ t: nowS, y: scrollY });
    while (fastWin.length && nowS - fastWin[0].t > 800) fastWin.shift();
    if (Math.abs(scrollY - fastWin[0].y) > 2800 && nowS - lastSpeedQuip > 45000 && !dismissed) {
      var qq = window.QUEST.get();
      if (qq.pct < 100) {
        lastSpeedQuip = nowS;
        setTimeout(function () {
          say("Speed-reading, huh. The check marks can tell.", null, { force: true });
        }, 700);
      }
    }
  }, { passive: true });

  var W = 92;
  function vw() { return document.documentElement.clientWidth; }
  function vh() { return document.documentElement.clientHeight; }
  function home() { return { x: vw() - W - 16, y: vh() - 104 }; }

  function setMode(m) {
    mode = m;
    sprite.className = "s-" + m + (faceLeft ? " s-face-left" : "");
  }
  function addFlag(cls, on) { sprite.classList.toggle(cls, on); }
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
  // Short trips: scurry on little legs. Long trips: ball-roll.
  function travel(nx, ny, then) {
    if (reduce) { place(nx, ny); if (then) then(); return; }
    var dist = Math.hypot(nx - x, ny - y);
    moving = true;
    var scurry = dist < 230;
    if (scurry) { setMode("idle"); addFlag("s-scurrying", true); }
    else setMode("roll");
    place(nx, ny);
    setTimeout(function () {
      moving = false;
      addFlag("s-scurrying", false);
      setMode("idle");
      if (bubble.classList.contains("on")) placeBubble();
      if (then) then();
    }, scurry ? 780 : 1200);
  }
  var h0 = home();
  place(h0.x, h0.y, true);
  addEventListener("resize", function () { if (!moving) { var h = home(); place(h.x, h.y, true); } });

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
      if (!dismissed && mode === "idle" && !moving && !document.hidden &&
          !bubble.classList.contains("on") && !reduce &&
          Date.now() - lastScroll > 3000) {
        var a = anchors()[Math.floor(Math.random() * 6)];
        if (Math.abs(a.x - x) + Math.abs(a.y - y) > 60) travel(a.x, a.y);
      }
      roamLoop();
    }, 15000 + Math.random() * 12000);
  })();

  // Idle life, richer and more frequent: sudden look-at-you, sniff around,
  // scratch an ear, or a tiny hop.
  (function lifeLoop() {
    setTimeout(function () {
      if (!dismissed && mode === "idle" && !moving && !document.hidden) {
        var roll = Math.random();
        if (roll < 0.4) {
          setMode("look");
          setTimeout(function () { if (mode === "look") setMode("idle"); }, 1500);
        } else if (roll < 0.65) {
          setMode("sniffa");
          setTimeout(function () { if (mode === "sniffa") setMode("idle"); }, 1700);
        } else if (roll < 0.85 && !reduce) {
          setMode("scratch");
          setTimeout(function () { if (mode === "scratch") setMode("idle"); }, 1300);
        } else if (!reduce) {
          setMode("yay");
          setTimeout(function () { if (mode === "yay") setMode("idle"); }, 800);
        }
      }
      lifeLoop();
    }, 6000 + Math.random() * 7000);
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
    var h = home();
    travel(h.x, h.y, function () { setMode("sleep"); });
  });

  var SUGGEST_LINES = [
    "This one's my favourite. Peek inside?",
    "Want to look at this one next?",
    "Psst \\u2014 this one has a good story.",
    "One more? This one's quick.",
    "You scrolled right past this one. It noticed.",
    "I don't make the rules \\u2014 but this one's worth a click."
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
    if (dismissed || suggests >= 4) return;
    var t = nextTarget();
    if (!t) return;
    suggests++;
    var r = t.getBoundingClientRect();
    var name = t.querySelector(".title") ? t.querySelector(".title").textContent : "the patent";
    var destX = Math.min(vw() - W - 10, r.right + 4);
    var destY = Math.max(10, r.top + r.height / 2 - 52);
    if (r.top < 0 || r.bottom > vh()) { destX = x; destY = y; }
    travel(destX, destY, function () {
      face(true);
      setMode("poke");
      window.QUEST.pulse(t);
      setTimeout(function () {
        setMode("idle");
        say(SUGGEST_LINES[suggests % SUGGEST_LINES.length] + " (" + name + ")", null, { force: !!force });
      }, 1000);
    });
  }

  // Bother-loop: every so often the hedgehog walks over and BOOPS the cursor.
  // If the cursor flees before it arrives, it takes that personally.
  var BOTHER_LINES = [
    "Boop.",
    "Whatcha doing up here?",
    "This cursor looked unattended. It's mine now.",
    "Found you.",
    "Don't mind me. Actually \\u2014 do mind me."
  ];
  var MISS_LINES = [
    "\\u2026it was right here a second ago.",
    "Rude. I came all this way.",
    "Fine. Didn't want that cursor anyway."
  ];
  (function botherLoop() {
    setTimeout(function () {
      if (!dismissed && mode === "idle" && !moving && !document.hidden &&
          !bubble.classList.contains("on") && !reduce && mouse &&
          matchMedia("(hover: hover) and (pointer: fine)").matches &&
          Math.random() < 0.5) {
        var target = { x: mouse.x, y: mouse.y };
        travel(Math.max(6, target.x - 100), Math.max(6, target.y - 34), function () {
          var fled = mouse && Math.hypot(mouse.x - target.x, mouse.y - target.y) > 180;
          if (fled) {
            setMode("look");
            say(MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)], null, { force: true });
            setTimeout(function () { if (mode === "look") setMode("idle"); }, 1800);
          } else {
            face(false);
            setMode("poke");
            say(BOTHER_LINES[Math.floor(Math.random() * BOTHER_LINES.length)], null, { force: true });
            setTimeout(function () { if (mode === "poke") setMode("idle"); }, 1200);
          }
          setTimeout(function () {
            if (mode === "idle" && !moving && !bubble.classList.contains("on") && Math.random() < 0.5) {
              var h = home();
              travel(h.x, h.y);
            }
          }, 4600);
        });
      }
      botherLoop();
    }, 26000 + Math.random() * 26000);
  })();

  // Chase commentary: the CTA emits (throttled) when it's being hunted.
  var CHASE_LINES = [
    "It does that to everyone.",
    "Chasing never works. Exploring does.",
    "It can smell unfinished business."
  ];
  var lastChaseQuip = 0;
  document.addEventListener("cta:chase", function (e) {
    var now = Date.now();
    if (dismissed || now - lastChaseQuip < 40000 || Math.random() < 0.4) return;
    lastChaseQuip = now;
    setMode("look");
    say(CHASE_LINES[Math.floor(Math.random() * CHASE_LINES.length)] + " (" + e.detail.pct + "%, by the way.)", null, { force: true });
    setTimeout(function () { if (mode === "look") setMode("idle"); }, 2200);
  });

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
    say("Caught it! Code word's yours \\u2014 and click that photo. Trust me.", null, { force: true, hold: 8000 });
    setTimeout(function () { setMode("idle"); }, 2600);
  });
  document.addEventListener("photo:developed", function () {
    setMode("yay");
    say("There he is. Worth every click, right?", null, { force: true, hold: 7000 });
    setTimeout(function () { setMode("sleep"); }, 6000);
  });
  // Rating quips scale with the score — a 2/10 is taken PERSONALLY.
  document.addEventListener("rate:sent", function (e) {
    var r = e.detail.r, line;
    if (r <= 3) line = "A " + r + "/10?! I LIVE here, you know. \\u2026Logged anyway.";
    else if (r <= 6) line = r + "/10 \\u2014 noted. Harsh, but noted.";
    else if (r <= 8) line = "Logged \\u2014 " + r + "/10. Everyone will see that one.";
    else line = r + "/10 \\u2014 excellent taste. I helped with that one, you know.";
    setMode(r <= 3 ? "look" : "yay");
    say(line, null, { force: true });
    setTimeout(function () { setMode("idle"); }, 2400);
  });

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

  if (dismissed) {
    setMode("sleep");
  } else if (q.visits <= 1 && q.pct === 0) {
    setTimeout(function () {
      say("Oh, hi. Didn't hear you come in. Want the tour, or shall I just hang back?", [
        { label: "Show me around", go: function () { suggest(true); } },
        { label: "I'll explore", go: function () { suggests = 4; setMode("sleep"); setTimeout(function () { setMode("idle"); }, 8000); } }
      ], { force: true });
    }, 900);
  } else if (q.ctaUnlocked) {
    setMode("sleep");
  } else {
    setTimeout(function () { suggest(); }, 12000);
  }
})();
`;
