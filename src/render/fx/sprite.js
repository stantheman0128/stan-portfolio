// The guide sprite — an origami bird, folded from the site's own paper.
// v2: the bird FLIES. It roams the whole viewport between rest anchors,
// flies over to whatever it suggests, flips to face its direction of travel,
// and flaps while airborne. The speech bubble follows wherever it lands.
// Tab moods: title AND favicon change while you're away; eager vs homesick
// on return (outbound-click session flag). Decorative: aria-hidden.

export const spriteCSS = `
#sprite{position:fixed;left:0;top:0;z-index:70;width:88px;pointer-events:none;will-change:transform;transition:transform 1.15s cubic-bezier(.33,.75,.35,1)}
#sprite svg{display:block;overflow:visible;transition:transform .35s}
#sprite.s-face-left svg{transform:scaleX(-1)}
#sprite .s-body{transition:transform .5s cubic-bezier(.165,.84,.44,1)}
@media (prefers-reduced-motion:no-preference){
  #sprite.s-idle .s-body{animation:s-bob 3.4s ease-in-out infinite}
  @keyframes s-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  #sprite.s-yay .s-wing{animation:s-flap .32s ease-out 3}
  #sprite.s-flying .s-wing{animation:s-flap .26s ease-in-out infinite}
  @keyframes s-flap{0%,100%{transform:rotate(0)}50%{transform:rotate(-26deg)}}
  #sprite.s-peek .s-body{transform:rotate(-9deg)}
}
@media (prefers-reduced-motion:reduce){#sprite{transition:none}}
#sprite.s-sleep{opacity:.55}
#sprite.s-sleep .s-head{transform:rotate(18deg) translateY(3px)}
#sprite .s-head{transform-origin:70px 70px;transition:transform .4s}
#sprite .s-wing{transform-origin:50px 62px}
#bubble{position:fixed;left:0;top:0;z-index:71;max-width:15.5rem;background:#fffdfa;border:1px solid #d8d0c4;border-radius:11px 11px 11px 3px;padding:.65rem .8rem;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;color:#3a3833;box-shadow:0 8px 28px rgba(41,31,23,.12);display:none}
#bubble.on{display:block}
#bubble .b-x{position:absolute;top:4px;right:7px;all:unset;cursor:pointer;color:#b7b2a8;font-size:12px;padding:2px 4px}
#bubble .b-x:hover{color:#c2522d}
#bubble .b-chips{margin-top:.5rem;display:flex;gap:6px;flex-wrap:wrap}
#bubble .b-chips button{all:unset;cursor:pointer;border:1px solid #17151a;border-radius:999px;padding:.22rem .7rem;font-size:11.5px}
#bubble .b-chips button:hover,#bubble .b-chips button:focus-visible{background:#17151a;color:#fffdfa}
#bubble .b-chips button:focus-visible{outline:2px solid #c2522d;outline-offset:2px}
@media print{#sprite,#bubble{display:none !important}}
@media (max-width:640px){#sprite{width:64px}}
`;

export const spriteHTML = `
<div id="sprite" class="s-idle" aria-hidden="true">
  <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
    <g class="s-body">
      <polygon points="30,70 10,55 30,45" fill="#efe7da" stroke="#d8d0c4" stroke-width="1"/>
      <polygon points="30,70 70,70 55,40" fill="#c2522d"/>
      <polygon class="s-wing" points="40,62 62,62 48,38" fill="#8f351f"/>
      <g class="s-head">
        <polygon points="70,70 88,58 74,48" fill="#efe7da" stroke="#d8d0c4" stroke-width="1"/>
        <polygon points="88,58 97,61 88,65" fill="#17151a"/>
        <circle class="s-eye" cx="79" cy="58" r="2.1" fill="#17151a"/>
      </g>
      <line x1="46" y1="70" x2="44" y2="80" stroke="#17151a" stroke-width="1.4"/>
      <line x1="58" y1="70" x2="60" y2="80" stroke="#17151a" stroke-width="1.4"/>
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
  var mode = "idle", flying = false, x = 0, y = 0;
  addEventListener("scroll", function () { lastScroll = Date.now(); }, { passive: true });

  // ---- flight engine (viewport coordinates, transform-driven) ----
  var W = 88;
  function vw() { return document.documentElement.clientWidth; }
  function vh() { return document.documentElement.clientHeight; }
  function home() { return { x: vw() - W - 16, y: vh() - 100 }; }
  function place(nx, ny, instant) {
    nx = Math.max(6, Math.min(vw() - W - 6, nx));
    ny = Math.max(6, Math.min(vh() - 96, ny));
    sprite.classList.toggle("s-face-left", nx < x);
    x = nx; y = ny;
    if (instant || reduce) sprite.style.transition = "none";
    sprite.style.transform = "translate(" + x + "px," + y + "px)";
    if (instant || reduce) requestAnimationFrame(function () { sprite.style.transition = ""; });
    if (bubble.classList.contains("on")) placeBubble();
  }
  function flyTo(nx, ny, then) {
    if (reduce) { place(nx, ny); if (then) then(); return; }
    flying = true;
    sprite.classList.add("s-flying");
    place(nx, ny);
    setTimeout(function () {
      flying = false;
      sprite.classList.remove("s-flying");
      if (bubble.classList.contains("on")) placeBubble();
      if (then) then();
    }, 1200);
  }
  var h0 = home();
  place(h0.x, h0.y, true);
  addEventListener("resize", function () { if (!flying) { var h = home(); place(h.x, h.y, true); } });

  // Free roam: hop to a random rest anchor every 18-32s when nothing else is
  // happening. Never while the visitor scrolls, never with a bubble open,
  // never under reduced motion, never dismissed/asleep/hidden.
  function anchors() {
    var w = vw(), h = vh();
    return [
      home(),
      { x: w - W - 20, y: 80 },
      { x: 24, y: 72 },
      { x: 24, y: h * 0.45 },
      { x: w * 0.5 - W / 2, y: 56 },
      { x: w - W - 24, y: h * 0.45 }
    ];
  }
  (function roamLoop() {
    setTimeout(function () {
      if (!dismissed && mode === "idle" && !flying && !document.hidden &&
          !bubble.classList.contains("on") && !reduce &&
          Date.now() - lastScroll > 3000) {
        var a = anchors()[Math.floor(Math.random() * 6)];
        if (Math.abs(a.x - x) + Math.abs(a.y - y) > 60) flyTo(a.x, a.y);
      }
      roamLoop();
    }, 18000 + Math.random() * 14000);
  })();

  function mood(m) {
    mode = m;
    sprite.className = "s-" + m + (sprite.classList.contains("s-face-left") ? " s-face-left" : "");
  }
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
    mood("sleep");
    var h = home();
    flyTo(h.x, h.y);
  });

  // ---- suggest: fly to the nearest unwatched item and point at it ----
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
    var destX = Math.min(vw() - W - 10, r.right + 6);
    var destY = Math.max(10, r.top + r.height / 2 - 50);
    if (r.top < 0 || r.bottom > vh()) { destX = x; destY = y; } // off-screen: stay, still pulse
    flyTo(destX, destY, function () {
      mood("peek");
      window.QUEST.pulse(t);
      say(SUGGEST_LINES[suggests % SUGGEST_LINES.length] + " (" + name + ")", null, { force: !!force });
      setTimeout(function () { mood("idle"); }, 2600);
    });
  }

  // ---- quest reactions ----
  document.addEventListener("quest:item-watched", function (e) {
    mood("yay");
    say("Nice. That's " + e.detail.n + " of " + e.detail.total + ".", null, { force: true });
    setTimeout(function () { mood("idle"); suggest(); }, 2200);
  });
  document.addEventListener("quest:items-complete", function () {
    q = window.QUEST.get();
    mood("yay");
    say(q.ratingDone
      ? "That's everything \\u2014 and you already rated. The button gave up. Go."
      : "You've seen everything. Rate it below and the button surrenders.", null, { force: true, hold: 7000 });
    setTimeout(function () { mood("idle"); }, 2600);
  });
  document.addEventListener("quest:complete", function () {
    mood("yay");
    say("The button stopped running. Go press it \\u2014 you earned this.", null, { force: true, hold: 7000 });
  });
  document.addEventListener("cta:opened", function () {
    mood("yay");
    say("Caught it! Enjoy the code word \\u2014 you're one of very few.", null, { force: true, hold: 8000 });
    setTimeout(function () { mood("sleep"); }, 6000);
  });

  // ---- tab moods: title + favicon change while away ----
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
        mood("yay");
        say("You went to look at my work! So? So??", null, { force: true });
        setTimeout(function () { mood("idle"); }, 2600);
      } else if (!dismissed) {
        mood("peek");
        say("You're back. I kept your spot warm.");
        setTimeout(function () { mood("idle"); }, 2200);
      }
    }
  });

  // ---- welcome / return ----
  if (dismissed) {
    mood("sleep");
  } else if (q.visits <= 1 && q.pct === 0) {
    setTimeout(function () {
      say("Oh, hi. Didn't hear you come in. Want the tour, or shall I just hang back?", [
        { label: "Show me around", go: function () { suggest(true); } },
        { label: "I'll explore", go: function () { suggests = 3; mood("sleep"); setTimeout(function () { mood("idle"); }, 8000); } }
      ], { force: true });
    }, 900);
  } else if (q.ctaUnlocked) {
    mood("sleep");
  } else {
    setTimeout(function () { suggest(); }, 12000);
  }
})();
`;
