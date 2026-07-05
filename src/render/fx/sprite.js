// The guide sprite v6 — licensed LottieFiles hedgehog (cand1, Lottie Simple
// License), baked at build time into a 24-frame WebP strip by
// tools/bake-sprite.mjs. Still ZERO animation runtime: the idle loop is a
// steps() background-position cycle, and every behavior mode is re-expressed
// as a container-level transform (v5's hand-built SVG puppet lives in git
// history). Behavior engine unchanged: bother-loop that boops the mouse,
// score-aware rating quips, chase commentary, and a speed-reader callout.
// Layer contract: #sprite = position (JS) > .skin = flip > .pose = mode
// animations > .sheet = frame cycle; .hh-shadow is a sibling CSS ellipse.

export const spriteCSS = `
#sprite{position:fixed;left:0;top:0;z-index:70;width:92px;pointer-events:none;will-change:transform;transition:transform 1.15s cubic-bezier(.33,.75,.35,1)}
#sprite.s-scurrying{transition-duration:.72s;transition-timing-function:cubic-bezier(.45,.05,.55,.95)}
#sprite .skin{width:92px;height:104px;transition:transform .35s}
#sprite.s-face-left .skin{transform:scaleX(-1)}
#sprite .pose{width:100%;height:100%;transition:transform .45s cubic-bezier(.165,.84,.44,1)}
#sprite .sheet{width:100%;height:100%;background:url(/assets/sprite-hedgehog.webp) 0 0/2400% 100% no-repeat}
#sprite .hh-shadow{position:absolute;left:15%;bottom:-3px;width:70%;height:8px;border-radius:50%;background:#17151a;opacity:.22;filter:blur(1px);transition:transform .3s,opacity .3s}
#sprite.s-sleep{opacity:.6}
#sprite.s-sleep .pose{transform:rotate(10deg) translateY(3px)}
#sprite.s-sleep .sheet{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){#sprite{transition:none}}
@media (prefers-reduced-motion:no-preference){
  #sprite .sheet{animation:hh-cycle 1.92s steps(24,jump-none) infinite}
  @keyframes hh-cycle{from{background-position-x:0%}to{background-position-x:100%}}
  #sprite.s-look .pose{transform:rotate(-6deg) scale(1.06)}
  #sprite.s-sniffa .pose{animation:hh-sniffa 1.6s ease-in-out 1}
  @keyframes hh-sniffa{0%,100%{transform:rotate(0)}30%{transform:rotate(7deg) translate(2px,3px)}65%{transform:rotate(-5deg) translate(-1px,-1px)}}
  #sprite.s-scratch .pose{animation:hh-scr 1.2s ease-in-out 1}
  @keyframes hh-scr{0%,100%{transform:rotate(0)}20%,40%,60%,80%{transform:rotate(6deg) translateX(2px)}30%,50%,70%{transform:rotate(-3deg)}}
  #sprite.s-yay .pose{animation:hh-hop .34s ease-out 2}
  #sprite.s-yay .hh-shadow{animation:hh-shadowhop .34s ease-out 2}
  @keyframes hh-hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes hh-shadowhop{0%,100%{transform:scaleX(1);opacity:.22}50%{transform:scaleX(.72);opacity:.1}}
  #sprite.s-poke .pose{animation:hh-poke .5s ease-in-out 2}
  @keyframes hh-poke{0%,100%{transform:translateX(0)}45%{transform:translateX(9px) rotate(3deg)}}
  #sprite.s-scurrying .pose{animation:hh-jog .32s ease-in-out infinite}
  @keyframes hh-jog{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-2.5px) rotate(2deg)}}
  #sprite.s-scurrying .sheet{animation-duration:.8s}
  #sprite.s-roll .pose{animation:hh-spin .7s linear infinite}
  @keyframes hh-spin{to{transform:rotate(360deg)}}
  #sprite.s-roll .hh-shadow{opacity:.12}
}
@media (prefers-reduced-motion:reduce){
  #sprite.s-look .pose{transform:rotate(-6deg)}
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
@media (max-width:640px){#sprite{width:68px}#sprite .skin{width:68px;height:77px}}
`;

export const spriteHTML = `
<div id="sprite" class="s-idle" aria-hidden="true">
  <div class="hh-shadow"></div>
  <div class="skin"><div class="pose"><div class="sheet"></div></div></div>
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
  function home() { return { x: vw() - W - 16, y: vh() - 128 }; }

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
    ny = Math.max(6, Math.min(vh() - 116, ny));
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
    say("That's everything \\u2014 the photo up top just stopped running. Go catch it.", null, { force: true, hold: 7000 });
    setTimeout(function () { setMode("idle"); }, 2600);
  });
  document.addEventListener("cta:opened", function () {
    setMode("yay");
    say("Caught it! Code word's yours \\u2014 now watch it develop.", null, { force: true, hold: 8000 });
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
