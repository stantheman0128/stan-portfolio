# Moana Paper Puppet Kit

This folder is the website-ready version of the approved faithful cut. It keeps the original hand-drawn look and animates the head, body, left arm, and right arm as separate paper pieces.

## Files

- `assets/head.png`, `body.png`, `left-arm.png`, `right-arm.png`: final separated puppet pieces.
- `assets/face-frown.png`: frowning face overlay generated from the original smile strokes.
- `assets/left-arm-in.png`, `right-arm-in.png`: legacy mirrored inward arm pieces. V3 keeps `handsIn` on the original shoulder pivots instead.
- `assets/nose.png`: isolated nose piece for the local pulse effect.
- `assets/original.png`: original reference image.
- `assets/preview.png`: current assembled preview.
- `moana-puppet.css`: widget styles, perspective, paper shadow, body segment clipping.
- `moana-puppet.js`: framework-neutral animation controller.
- `motions.json`: action and orientation catalog for humans and agents.
- `demo.html`: interactive preview page.

## Basic HTML Usage

```html
<link rel="stylesheet" href="/moana-puppet-kit/moana-puppet.css" />
<script src="/moana-puppet-kit/moana-puppet.js"></script>

<div id="site-puppet"></div>

<script>
  const puppet = MoanaPuppet.mount("#site-puppet", {
    assetBase: "/moana-puppet-kit/assets/",
    size: 240,
    orientation: "front",
    action: "idle"
  });

  puppet.setAction("greeting");
  puppet.setOrientation("lookRight");
  puppet.playOnce("frontFlip");
</script>
```

## Custom Element Usage

```html
<link rel="stylesheet" href="/moana-puppet-kit/moana-puppet.css" />
<script src="/moana-puppet-kit/moana-puppet.js"></script>

<moana-puppet
  asset-base="/moana-puppet-kit/assets/"
  size="220"
  orientation="tiltRight"
  action="playful">
</moana-puppet>
```

## Fixed Website Corner

```html
<moana-puppet
  fixed-corner
  asset-base="/moana-puppet-kit/assets/"
  size="180"
  orientation="front"
  action="idle">
</moana-puppet>
```

```css
moana-puppet[fixed-corner] {
  --moana-fixed-right: 24px;
  --moana-fixed-bottom: 18px;
  --moana-z-index: 30;
}
```

## Public API

```js
const puppet = MoanaPuppet.mount("#site-puppet", options);

puppet.setAction("playful");
puppet.setOrientation("paperRight");
puppet.setLayout("exploded");
puppet.setSize(260);
puppet.playOnce("frontFlip");
puppet.playOnce("backFlip");
puppet.pause();
puppet.start();
puppet.destroy();
```

## Recommended Website Defaults

- Default corner mascot: `orientation: "front"`, `action: "idle"`.
- Homepage welcome: `orientation: "heroUp"`, `action: "greeting"`.
- About section: `orientation: "tiltRight"`, `action: "playful"`.
- Loading or thinking state: `orientation: "lookRight"`, `action: "thinking"`.
- Success state: `orientation: "heroUp"`, `action: "happy"`.
- Easter egg click: `puppet.playOnce("frontFlip")` or `puppet.playOnce("backFlip")`.

## Orientation Catalog

- `front`: 正面，最接近原圖。
- `lookLeft`: 看左邊，適合指向左側內容。
- `lookRight`: 看右邊，適合指向右側內容。
- `tiltLeft`: 左歪頭，柔和、可愛。
- `tiltRight`: 右歪頭，適合俏皮或好奇。
- `paperLeft`: 整張紙片往左轉。
- `paperRight`: 整張紙片往右轉。
- `shyDown`: 明顯低頭，主要靠頭往下沉與輕微壓扁，不做後仰旋轉。
- `heroUp`: 明顯抬頭，主要靠頭往上抬，不用放大來假裝抬頭。

## Action Catalog

- `idle` 待機: 常駐狀態，小幅呼吸與手部擺動。
- `greeting` 打招呼: 使用角色本人的右手揮手。角色面對訪客時，這是畫面左側那隻手。
- `waveRight` 右手大揮手: 角色本人的右手從肩膀抬高後大幅揮動。
- `waveLeft` 左手大揮手: 角色本人的左手從肩膀抬高後大幅揮動。
- `bothWave` 雙手搖手: 兩手交錯晃動，比較活潑。
- `bothBigWave` 雙手大揮手: 兩隻手都抬高大幅揮動。
- `beckon` 右手招手: 角色本人的右手招手，角色面對訪客時是畫面左側那隻手。
- `beckonLeft` 左手招手: 角色本人的左手招手。
- `beckonBoth` 雙手招手: 左右手一起往內招。
- `nod` 點頭: 有明顯往前點與回彈，適合確認、成功、同意。
- `leanBack` 往後仰: 保留原本較像後仰的效果，和低頭、抬頭分開。
- `shakeHead` 搖頭: 錯誤、否定、無效操作。
- `headRoll` 轉頭: 頭部左右轉動和微旋。
- `twist` 扭身: 身體和頭反向小幅轉動。
- `playful` 俏皮: 頭左右晃、身體輕扭、雙手小晃。
- `thinking` 思考: 一隻手托住下巴，頭偏一邊慢慢思考。
- `happy` 開心: 身體微彈、雙手跟著上揚。
- `shy` 害羞: 肩膀維持原位，只旋轉原本手臂，讓手掌端靠近嘴巴。
- `curious` 好奇: 頭左右看，左右手交替指向兩邊。
- `sad` 哭臉: 用原笑臉筆畫翻轉成皺眉嘴型，搭配頭和手下垂。
- `handsIn` 手往內收: 使用原手臂繞肩旋轉，肩膀接點固定，不再用鏡射手臂覆蓋。
- `nosePulse` 鼻子放大: 單獨 isolate 鼻子做輕微放大縮小。
- `weird` 怪奇狀態: 頭跳離身體，左右手交替向外分離，手收回時頭再彈一下。
- `bow` 鞠躬: 保留在 API，但目前不是推薦展示動作。
- `paperBendIn` 紙片內凹: 保留在 API，但目前不是推薦展示動作。
- `paperBendOut` 紙片外凸: 保留在 API，但目前不是推薦展示動作。
- `frontFlip` 前空翻: 展示型大動作，建議用 `playOnce`。
- `backFlip` 後空翻: 前空翻的反向版本，建議用 `playOnce`。

## About The 2.5D Effects

The puppet is still made from flat PNG paper pieces. The best 2.5D results currently come from CSS perspective, `rotateX`, `rotateY`, per-piece transform origins, drop shadows, and full-character flips. This keeps the hand-drawn source faithful and lightweight for a website.

`frontFlip` and `backFlip` are the recommended showcase motions. `bow`, `paperBendIn`, and `paperBendOut` remain available for compatibility, but they are not shown in the demo because the current segmented-shirt bend is not natural enough.

## Mirror Rule For Hands

Action names use the character's own left and right hands. Because the character faces the visitor, the character's right hand appears on the viewer's left side. `greeting` and `waveRight` therefore animate the viewer-left arm piece.

## V2 Asset Effects

These are now included as extra PNG layers rather than pure CSS motion:

- `sad`: flips the original smile strokes into a frown and covers the old smile with a small skin patch.
- `handsIn`: keeps the original arm pieces and rotates them inward from the shoulder pivots.
- `nosePulse`: scales the isolated nose layer.

The frown and isolated feature layers are deliberately small overlays. They preserve the original head artwork and can be disabled at any time by switching back to another action.

## Claude Handoff Prompt

Use this prompt with Claude when integrating into a website:

```text
I have a framework-neutral paper puppet kit in /moana-puppet-kit.
Please integrate it into my personal website without altering the PNG artwork.

Use:
- /moana-puppet-kit/moana-puppet.css
- /moana-puppet-kit/moana-puppet.js
- /moana-puppet-kit/assets/
- /moana-puppet-kit/motions.json for action meanings

Default behavior:
- Put the puppet as a small fixed-corner mascot on desktop.
- Use action "idle" by default.
- On homepage intro, briefly use "greeting".
- On hover or click, use "playful", "bothBigWave", "beckon", "beckonLeft", or "beckonBoth" depending on direction.
- Use playOnce("frontFlip") or playOnce("backFlip") as easter eggs.
- Use "thinking" for a one-hand-under-chin state.
- Use "weird" only as a hidden playful/error-page loop.
- Do not use the removed ear enlargement effect.
- Avoid showcasing "bow", "paperBendIn", or "paperBendOut"; they remain only for compatibility.
- Respect prefers-reduced-motion.

Do not regenerate or recolor the character. Only use the supplied split PNG pieces.
```
