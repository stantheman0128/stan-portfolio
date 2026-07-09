# Paper Stan — full script, timing, and triggers

Every line the corner guide can say, when it fires, its timing, and the puppet
action that plays with it. Source: `src/render/fx/sprite.js` (interactive /
minimal edition only). Voice is first person; copy avoids em dashes and emoji.

## A. First arrival (new visitor)
Condition: `visits <= 1` and exploration `0%`. Delay: 900ms after load.
Bubble stays until a chip is clicked. No special action.

- "Hey, I'm Stan. The paper version. Want the tour, or should I get out of your way?"
  - Chip **Show me around** -> runs the tour (section B)
  - Chip **I'll explore** -> settles, sleeps ~8s, then back to idle

Returning visitor (not first time): no greeting; a project nudge (section D)
fires 12s in. If dismissed or the reward is already unlocked: he just sleeps.

## B. Guided tour (after "Show me around")
Scripted, one stop at a time. Each stop scrolls the section into view, he
travels next to it (~0.5s + glide), plays an action, and speaks (line held
3.6s, ~4.2s between stops). Missing sections are skipped.

- Stop 1, about (action: playful): "Start with the short version of me. I build things end to end: web, mobile, the odd patent."
- Stop 2, works (action: beckon, faces the list): "This is the actual work. Open anything that looks interesting, I'll wait."
- Stop 3, patent (action: happy, head up): "And this one I'm quietly proud of. A real granted patent, my name on it."
- End: "That's the tour. Poke around; I'll chime in if I've got something useful."

## C. Section reactions (docent, ambient)
When a section takes over the viewport (idle only, 4.5s cooldown between
reactions). He always plays the action; ~50% of the time he also says the line.

- hero -> action greeting (no line)
- about -> action shy -> "That's me. Roughly."
- works -> action beckon (faces list) -> "Pick one. They've all got a story."
- patent -> action happy (head up) -> "Still can't quite believe this one's official."
- contact / footer -> action bothBigWave -> "You made it to the bottom. Respectable."

## D. Project nudges (guide to unopened work)
Points at the next unopened project. Fires 12s in for returning visitors, and
again after each project opened. Max 4 per session. He travels to the item,
pokes and pulses it, then (1s later) speaks. Lines rotate; "(name)" is the
project title:

- "This one's my favorite. Peek inside? (name)"
- "Haven't opened this one yet. It's quick, promise. (name)"
- "You scrolled right past this. It noticed. (name)"
- "Want the story behind this one? (name)"
- "One more? Worth the click. (name)"

## E. Quest milestones
- Opened a project (dwelled ~1.5s) -> action happy -> "Nice. That's {n} of {total}." then a nudge 2.2s later
- Explored everything -> action happy (held 7s) -> "That's everything. The photo up top just stopped shuffling, so go catch it."
- Caught the reward photo -> action happy (held 8s) -> "Caught it. Give it a second to develop."
- Reward photo developed -> action happy (held 7s) -> "There I am, in actual pixels. Thanks for exploring the whole thing." then sleeps

## F. Rating responses (when a visitor rates a project)
- 1-3 -> action look -> "A {r}? I made that one at 3am, so, fair. Logged."
- 4-6 -> action happy -> "{r} out of 10. Noted, I can take it."
- 7-8 -> action happy -> "{r}. I'll take that, thank you."
- 9-10 -> action happy -> "{r}?! Okay, now I like you. Logged with pride."

## G. Cursor boop (desktop only)
Every 26-52s, 50% chance, when idle and the mouse is present (fine pointer,
motion allowed). He walks to the cursor, then:

- Cursor stayed -> action beckon -> one of:
  - "Boop."
  - "Whatcha doing up here?"
  - "This cursor looked unattended. It's mine now."
  - "Found you."
  - "Don't mind me. Actually, do mind me."
- Cursor fled before he arrived -> action look -> one of:
  - "...it was right here a second ago."
  - "Rude. I walked all the way over."
  - "Fine. Didn't want that cursor anyway."

## H. Direct interaction
- **Hover** (idle, 1.5s cooldown): grows ~10% (CSS) and glances at you (action curious). Pressing shrinks him slightly.
- **Tap / click** (not while dragging): one reaction drawn at random from a wide
  weighted pool, so taps rarely repeat:
  - annoyed (shakeHead): "...must you?" / "That tickles. Stop. ...okay, again." / "I'm working here." / "Boop received. Rude."
  - wave at you (waveRight/waveLeft toward your side), sometimes: "Hi. Yes. Hello." / "You rang?" / "Over here."
  - beckon (beckonBoth/beckonLeft): "Come closer, I'll show you." / "Psst. Over here." / "Lean in."
  - wiggle (bothWave / playful), silent
  - nod, sometimes: "Mm-hm?"
  - startle (leanBack): "Whoa. Hi."
  - spin (headRoll / twist), silent
  - nose (nosePulse), sometimes: "That's my nose. Yes."
  - flip (frontFlip / backFlip); backFlip: "Show-off, I know."
  - weird: "...don't tell anyone I can do that."
  - explode: the paper doll shakes apart and reassembles: "...whoops. Hold on."
  - flee (bolts to the farthest corner): "Okay okay, personal space." / "Hey, I'm delicate paper." / "Nope. Catch me first." / "Alright, I'm relocating."
  - **3 quick taps** in a row -> he always flees.
- **Drag**: pick him up and move him anywhere. No line.
- **Wheel over him**: resize him between 0.62x and 2x. No line. (Persists for the session.)

## I. Speed-reader
Scrolling very fast (>2800px in ~0.8s) while under 100% explored, 45s cooldown:
- "Speed-reading, huh? The check marks can tell."

## J. Chase commentary
When the reward photo is being chased (40s cooldown, ~60% chance) -> action look:
- one of "It does that to everyone." / "Chasing never works. Exploring does." / "It can smell unfinished business." followed by " ({pct}%, by the way.)"

## K. Leaving and coming back
- Tab hidden -> browser tab title becomes "(eyes) still here" and the favicon becomes watching eyes.
- Return after clicking an external link (within 30 min) -> action happy -> "You went to look at my stuff. And?"
- Return otherwise -> action look -> "You're back. Kept your spot warm."

## L. Dismiss (the x on the bubble)
- "Got it, I'll hush. Tap me if you change your mind." Then he walks home and sleeps, and stays quiet for the rest of the session (remembered).

## Notes
- Idle motion (silent): between the scripted moments he draws from a wide pose
  pool so a resting Paper Stan keeps changing: head tilts, paper turns, head
  rolls, torso twist, hands-in, nods, a nose pulse, glances toward the page, and
  once in a while the full explode-and-reassemble. Nearly the whole kit is used.
- Bubbles rate-limit themselves (20s minimum between non-forced lines; they also
  wait out active scrolling), so he never chatters.
- `prefers-reduced-motion`: no roaming, boops, or flips-as-loop; gentle in-place
  gestures only. Mobile: smaller, calmer, no cursor games.
- All copy lives in the arrays at the top of each section in `sprite.js`; edit
  there to change wording.
