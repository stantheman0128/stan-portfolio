(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const STAGE = { width: 860, height: 1120 };

  const PIECES = {
    head: {
      file: "head.png",
      className: "moana-puppet__head",
      width: 619,
      height: 611,
      origin: "46% 97%",
      assembled: { x: 128, y: 20, r: 0 },
      exploded: { x: 128, y: -18, r: 0 },
    },
    body: {
      file: "body.png",
      className: "moana-puppet__body",
      width: 425,
      height: 461,
      origin: "50% 14%",
      assembled: { x: 200, y: 583, r: 0 },
      exploded: { x: 200, y: 668, r: 0 },
    },
    leftArm: {
      file: "left-arm.png",
      className: "moana-puppet__left-arm",
      width: 259,
      height: 434,
      origin: "92% 9%",
      assembled: { x: 0, y: 618, r: 0 },
      exploded: { x: -88, y: 700, r: -18 },
    },
    rightArm: {
      file: "right-arm.png",
      className: "moana-puppet__right-arm",
      width: 256,
      height: 437,
      origin: "11% 10%",
      assembled: { x: 561, y: 620, r: 0 },
      exploded: { x: 714, y: 704, r: 18 },
    },
  };

  const EFFECT_LAYERS = {
    frown: { file: "face-frown.png", x: 0, y: 0, width: 619, height: 611 },
    nose: { file: "nose.png", x: 258, y: 409, width: 28, height: 50 },
  };

  const ALT_ARMS = {
    leftArmIn: {
      file: "left-arm-in.png",
      width: 259,
      height: 434,
      origin: "70% 13%",
      assembled: { x: 82, y: 610, r: 22 },
      exploded: { x: 4, y: 704, r: -10 },
    },
    rightArmIn: {
      file: "right-arm-in.png",
      width: 256,
      height: 437,
      origin: "30% 13%",
      assembled: { x: 520, y: 610, r: -22 },
      exploded: { x: 600, y: 704, r: 10 },
    },
  };

  const BODY_SEGMENTS = [
    { id: "top", y: 0, height: 170, imageY: 0, origin: "50% 100%" },
    { id: "middle", y: 146, height: 180, imageY: -146, origin: "50% 50%" },
    { id: "bottom", y: 300, height: 181, imageY: -300, origin: "50% 0%" },
  ];

  const ORIENTATIONS = {
    front: {
      label: "正面",
      meaning: "最接近原圖的正面站姿。",
      global: {},
      pieces: {},
    },
    lookLeft: {
      label: "看左邊",
      meaning: "頭與身體略往左轉，適合指向左側內容。",
      global: { ry: -4 },
      pieces: {
        head: { x: -4, ry: -24, sx: 0.97 },
        body: { ry: -6 },
        leftArm: { r: 2 },
        rightArm: { r: -2 },
      },
    },
    lookRight: {
      label: "看右邊",
      meaning: "頭與身體略往右轉，適合指向右側內容。",
      global: { ry: 4 },
      pieces: {
        head: { x: 4, ry: 24, sx: 0.97 },
        body: { ry: 6 },
        leftArm: { r: 2 },
        rightArm: { r: -2 },
      },
    },
    tiltLeft: {
      label: "左歪頭",
      meaning: "頭往左歪，感覺比較柔和。",
      global: {},
      pieces: {
        head: { r: -9, x: -4, y: 2 },
        body: { r: -1 },
      },
    },
    tiltRight: {
      label: "右歪頭",
      meaning: "頭往右歪，適合搭配俏皮或好奇動作。",
      global: {},
      pieces: {
        head: { r: 9, x: 4, y: 2 },
        body: { r: 1 },
      },
    },
    paperLeft: {
      label: "紙片左轉",
      meaning: "整個角色像紙片一樣朝左側旋轉。",
      global: { ry: -18, r: -1, sx: 0.98 },
      pieces: {
        head: { ry: -8 },
        body: { ry: -6 },
      },
    },
    paperRight: {
      label: "紙片右轉",
      meaning: "整個角色像紙片一樣朝右側旋轉。",
      global: { ry: 18, r: 1, sx: 0.98 },
      pieces: {
        head: { ry: 8 },
        body: { ry: 6 },
      },
    },
    shyDown: {
      label: "低頭",
      meaning: "頭明確往下沉，主要靠位置與壓扁感呈現，不做後仰旋轉。",
      global: { y: 12 },
      pieces: {
        head: { y: 36, r: 1, sy: 0.93 },
        body: { y: 4, sy: 0.99 },
        leftArm: { r: 7 },
        rightArm: { r: -7 },
      },
    },
    heroUp: {
      label: "抬頭",
      meaning: "頭明確往上抬起，避免看起來像單純放大。",
      global: { y: -4 },
      pieces: {
        head: { y: -34, r: -1, sy: 0.985 },
        body: { y: -2 },
      },
    },
  };

  const ACTIONS = {
    idle: {
      label: "待機",
      meaning: "很小幅度呼吸和手部擺動，讓網站角落的小人物不會死板。",
      websiteUse: "預設常駐狀態。",
      duration: 3.6,
      playback: "loop",
    },
    greeting: {
      label: "打招呼",
      meaning: "使用角色本人的右手打招呼。角色面對訪客時，這會出現在畫面左側，符合面對面鏡像邏輯。",
      websiteUse: "首頁載入、滑到自我介紹區塊、訪客回到頁面時。",
      duration: 1.8,
      playback: "loop",
    },
    waveRight: {
      label: "右手大揮手",
      meaning: "角色本人的右手從肩膀抬高後大幅揮動，幅度比打招呼更大。",
      websiteUse: "強烈問候、重要 CTA、使用者點擊小人物後。",
      duration: 1.5,
      playback: "loop",
    },
    waveLeft: {
      label: "左手大揮手",
      meaning: "角色本人的左手從肩膀抬高後大幅揮動。角色面對訪客時，這會出現在畫面右側。",
      websiteUse: "小人物位於畫面左側、需要往右邊招呼時。",
      duration: 1.5,
      playback: "loop",
    },
    bothWave: {
      label: "雙手搖手",
      meaning: "左右手交錯晃動，情緒比單手揮手更活潑。",
      websiteUse: "頁面彩蛋、歡迎區塊、成功訊息。",
      duration: 1.7,
      playback: "loop",
    },
    bothBigWave: {
      label: "雙手大揮手",
      meaning: "兩隻手都從肩膀抬高後大幅揮動，比雙手搖手更像正式大招呼。",
      websiteUse: "首頁強烈歡迎、完成任務後的慶祝、使用者點擊小人物。",
      duration: 1.55,
      playback: "loop",
    },
    beckon: {
      label: "右手招手",
      meaning: "角色本人的右手往內招，帶有上下變動，像邀請使用者點擊或往下看。",
      websiteUse: "引導互動、提示使用者看下一段內容。",
      duration: 1.35,
      playback: "loop",
    },
    beckonLeft: {
      label: "左手招手",
      meaning: "角色本人的左手往內招，適合小人物站在畫面左側時引導視線。",
      websiteUse: "引導使用者看右側內容、作品卡片或下一段說明。",
      duration: 1.35,
      playback: "loop",
    },
    beckonBoth: {
      label: "雙手招手",
      meaning: "左右手一起往內招，像把使用者叫近一點看內容。",
      websiteUse: "CTA、互動提示、空白狀態引導。",
      duration: 1.45,
      playback: "loop",
    },
    nod: {
      label: "點頭",
      meaning: "頭上下點，表示理解或確認。",
      websiteUse: "表單送出成功、設定完成、回覆使用者操作。",
      duration: 1.4,
      playback: "loop",
    },
    leanBack: {
      label: "往後仰",
      meaning: "保留原本較像頭往後仰的 2.5D 反應，和低頭、抬頭分開使用。",
      websiteUse: "驚訝、收到通知、hover 彩蛋。",
      duration: 1.7,
      playback: "loop",
    },
    shakeHead: {
      label: "搖頭",
      meaning: "頭左右搖，表示不行、錯誤、否定。",
      websiteUse: "錯誤狀態、無效操作、404 小互動。",
      duration: 1.2,
      playback: "loop",
    },
    headRoll: {
      label: "轉頭",
      meaning: "頭部左右轉動和微旋，讓紙片人更有 3D 感。",
      websiteUse: "等待、讀取、展示小人物質感。",
      duration: 2.2,
      playback: "loop",
    },
    twist: {
      label: "扭身",
      meaning: "身體和頭反向小幅轉動，像紙片人在扭腰。",
      websiteUse: "段落切換、hover、輕量展示。",
      duration: 2.2,
      playback: "loop",
    },
    playful: {
      label: "俏皮",
      meaning: "頭左右晃、身體輕扭、雙手小晃，語氣偏可愛活潑。",
      websiteUse: "首頁自我介紹、關於我、作品集空白狀態。",
      duration: 2.4,
      playback: "loop",
    },
    thinking: {
      label: "思考",
      meaning: "一隻手托住下巴，頭偏一邊慢慢思考。",
      websiteUse: "文章旁、搜尋中、AI 回答生成中。",
      duration: 2.8,
      playback: "loop",
    },
    happy: {
      label: "開心",
      meaning: "身體微彈、雙手跟著上揚，情緒正向。",
      websiteUse: "成功頁、感謝訊息、完成下載或訂閱。",
      duration: 1.6,
      playback: "loop",
    },
    shy: {
      label: "害羞",
      meaning: "低頭並把角色右手抬到臉旁，模擬摸臉或遮臉的害羞感。",
      websiteUse: "個人介紹、趣味彩蛋、較溫柔的段落。",
      duration: 2.6,
      playback: "loop",
    },
    curious: {
      label: "好奇",
      meaning: "頭左右看，左右手交替指向兩邊，像東看看西指指。",
      websiteUse: "使用者滑到新 section、等待互動時。",
      duration: 2.4,
      playback: "loop",
    },
    sad: {
      label: "哭臉",
      meaning: "用原本笑臉筆畫垂直翻轉成皺眉嘴型，頭和手會稍微下垂。",
      websiteUse: "錯誤、失敗、404、沒有資料時。",
      duration: 2.4,
      playback: "loop",
    },
    handsIn: {
      label: "手往內收",
      meaning: "雙手以肩膀接點為固定點往內旋轉，避免手臂與肩膀接縫漂移。",
      websiteUse: "思考、等待、比較靜態的站姿變化。",
      duration: 2.6,
      playback: "loop",
    },
    nosePulse: {
      label: "鼻子放大",
      meaning: "把鼻子單獨 isolate 出來做輕微放大縮小。",
      websiteUse: "小彩蛋、hover、滑鼠靠近時的局部反應。",
      duration: 1.6,
      playback: "loop",
    },
    weird: {
      label: "怪奇狀態",
      meaning: "頭先跳離身體再落回，左右手交替向外分離，手收回時頭再彈一下。",
      websiteUse: "隱藏彩蛋、錯誤頁、玩味互動。",
      duration: 2.25,
      playback: "loop",
    },
    bow: {
      label: "鞠躬",
      meaning: "頭和身體用透視前傾，像真的向前鞠躬，而不是單純紙片內凹。",
      websiteUse: "頁尾、感謝、送出完成後。",
      duration: 1.8,
      playback: "loop",
    },
    paperBendIn: {
      label: "紙片內凹",
      meaning: "身體分段後向內彎，模擬硬紙片或壓克力片被頭尾兩端往內捏。",
      websiteUse: "展示 2.5D 紙片效果，不建議長時間常駐。",
      duration: 2.1,
      playback: "loop",
    },
    paperBendOut: {
      label: "紙片外凸",
      meaning: "身體分段後向外凸，模擬硬紙片或壓克力片被頭尾兩端往外拱。",
      websiteUse: "展示 2.5D 紙片效果，不建議長時間常駐。",
      duration: 2.1,
      playback: "loop",
    },
    frontFlip: {
      label: "前空翻",
      meaning: "整個紙片人往前翻一圈，是展示型大動作。",
      websiteUse: "點擊彩蛋、完成某個任務後播放一次。",
      duration: 1.65,
      playback: "once",
    },
    backFlip: {
      label: "後空翻",
      meaning: "整個紙片人往後翻一圈，作為前空翻的反向彩蛋。",
      websiteUse: "隱藏彩蛋、作品集互動、第二次點擊小人物。",
      duration: 1.65,
      playback: "once",
    },
  };

  const DEFAULTS = {
    assetBase: "./assets/",
    size: 260,
    action: "idle",
    orientation: "front",
    layout: "assembled",
    shadow: "paper",
    autoStart: true,
  };

  function resolveTarget(target) {
    if (typeof target === "string") {
      const found = document.querySelector(target);
      if (!found) throw new Error(`MoanaPuppet target not found: ${target}`);
      return found;
    }
    if (!target || !target.nodeType) {
      throw new Error("MoanaPuppet target must be an element or selector.");
    }
    return target;
  }

  function normalizeAssetBase(value) {
    const base = value || DEFAULTS.assetBase;
    return base.endsWith("/") ? base : `${base}/`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeInOut(t) {
    const n = clamp(t, 0, 1);
    return n * n * (3 - 2 * n);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function phase(elapsed, duration) {
    return (elapsed / duration) * TAU;
  }

  function wave(elapsed, duration, offset) {
    return Math.sin(phase(elapsed, duration) + (offset || 0));
  }

  function pulseInRange(value, start, end) {
    if (value <= start || value >= end) return 0;
    return Math.sin(((value - start) / (end - start)) * Math.PI);
  }

  function blankOffset() {
    return {
      x: 0,
      y: 0,
      z: 0,
      r: 0,
      rx: 0,
      ry: 0,
      sx: 1,
      sy: 1,
      opacity: 1,
    };
  }

  function addOffset(target, source, amount) {
    const scale = amount == null ? 1 : amount;
    if (!source) return target;
    target.x += (source.x || 0) * scale;
    target.y += (source.y || 0) * scale;
    target.z += (source.z || 0) * scale;
    target.r += (source.r || 0) * scale;
    target.rx += (source.rx || 0) * scale;
    target.ry += (source.ry || 0) * scale;
    target.sx *= 1 + ((source.sx == null ? 1 : source.sx) - 1) * scale;
    target.sy *= 1 + ((source.sy == null ? 1 : source.sy) - 1) * scale;
    target.opacity *= source.opacity == null ? 1 : source.opacity;
    return target;
  }

  function transformString(offset) {
    return [
      `translate3d(${offset.x.toFixed(3)}px, ${offset.y.toFixed(3)}px, ${offset.z.toFixed(3)}px)`,
      `rotateY(${offset.ry.toFixed(3)}deg)`,
      `rotateX(${offset.rx.toFixed(3)}deg)`,
      `rotate(${offset.r.toFixed(3)}deg)`,
      `scale(${offset.sx.toFixed(4)}, ${offset.sy.toFixed(4)})`,
    ].join(" ");
  }

  function actionFrame(actionId, name, elapsed, motionScale) {
    const action = ACTIONS[actionId] || ACTIONS.idle;
    const duration = action.duration || 2;
    const s = motionScale;
    const v = wave(elapsed, duration);
    const v2 = wave(elapsed, duration * 0.72, Math.PI / 5);
    const frame = {
      piece: blankOffset(),
      global: blankOffset(),
      bodyBend: 0,
    };

    if (actionId === "idle") {
      frame.global.y += v * 2 * s;
      if (name === "head") {
        frame.piece.r += v * 1.4 * s;
        frame.piece.y += v2 * 1.8 * s;
      }
      if (name === "leftArm") frame.piece.r += v * 1.8 * s;
      if (name === "rightArm") frame.piece.r += v2 * 1.8 * s;
    }

    if (actionId === "greeting") {
      if (name === "leftArm") {
        frame.piece.r += (44 + Math.sin(elapsed * 7.2) * 22) * s;
        frame.piece.x += -8 * s;
        frame.piece.y += (-14 + Math.sin(elapsed * 7.2) * 4) * s;
        frame.piece.ry += Math.sin(elapsed * 7.2) * -8 * s;
      }
      if (name === "head") {
        frame.piece.r += Math.sin(elapsed * 2.2) * -2.5 * s;
        frame.piece.y += Math.sin(elapsed * 3.4) * 2.5 * s;
        frame.piece.ry += Math.sin(elapsed * 2.1) * 5 * s;
      }
      if (name === "body") frame.piece.y += Math.sin(elapsed * 3.2) * 2.5 * s;
    }

    if (actionId === "waveRight") {
      if (name === "leftArm") {
        frame.piece.r += (76 + Math.sin(elapsed * 7.6) * 34) * s;
        frame.piece.x += -16 * s;
        frame.piece.y += (-34 + Math.sin(elapsed * 7.6) * 6) * s;
        frame.piece.ry += Math.sin(elapsed * 7.6) * -12 * s;
        frame.piece.z += 22 * s;
      }
      if (name === "head") {
        frame.piece.r += Math.sin(elapsed * 2.4) * -3 * s;
        frame.piece.ry += Math.sin(elapsed * 2.2) * 8 * s;
      }
      if (name === "body") frame.piece.r += Math.sin(elapsed * 2.2) * -1.6 * s;
    }

    if (actionId === "waveLeft") {
      if (name === "rightArm") {
        frame.piece.r += (-76 + Math.sin(elapsed * 7.6 + Math.PI) * 34) * s;
        frame.piece.x += 16 * s;
        frame.piece.y += (-34 + Math.sin(elapsed * 7.6 + Math.PI) * 6) * s;
        frame.piece.ry += Math.sin(elapsed * 7.6) * 12 * s;
        frame.piece.z += 22 * s;
      }
      if (name === "head") frame.piece.r += Math.sin(elapsed * 2.4) * 3 * s;
    }

    if (actionId === "bothWave") {
      if (name === "rightArm") {
        frame.piece.r += (-22 + Math.sin(elapsed * 7.4) * 24) * s;
        frame.piece.ry += Math.sin(elapsed * 7.4) * 8 * s;
      }
      if (name === "leftArm") {
        frame.piece.r += (22 + Math.sin(elapsed * 7.4 + Math.PI) * 24) * s;
        frame.piece.ry += Math.sin(elapsed * 7.4 + Math.PI) * -8 * s;
      }
      if (name === "head") frame.piece.r += Math.sin(elapsed * 2.2) * 2 * s;
    }

    if (actionId === "bothBigWave") {
      if (name === "leftArm") {
        frame.piece.r += (116 + Math.sin(elapsed * 7.8) * 34) * s;
        frame.piece.x += 4 * s;
        frame.piece.y += (-78 + Math.sin(elapsed * 7.8) * 8) * s;
        frame.piece.z += 28 * s;
        frame.piece.ry += Math.sin(elapsed * 7.8) * -12 * s;
      }
      if (name === "rightArm") {
        frame.piece.r += (-116 + Math.sin(elapsed * 7.8 + Math.PI) * 34) * s;
        frame.piece.x += -4 * s;
        frame.piece.y += (-78 + Math.sin(elapsed * 7.8 + Math.PI) * 8) * s;
        frame.piece.z += 28 * s;
        frame.piece.ry += Math.sin(elapsed * 7.8 + Math.PI) * 12 * s;
      }
      if (name === "head") {
        frame.piece.y += Math.sin(elapsed * 4.1) * 3 * s;
        frame.piece.r += Math.sin(elapsed * 2.2) * 2.5 * s;
      }
      if (name === "body") frame.piece.y += Math.sin(elapsed * 4.1) * 2 * s;
    }

    if (actionId === "beckon") {
      if (name === "leftArm") {
        frame.piece.r += (58 + Math.sin(elapsed * 8.8) * 16) * s;
        frame.piece.x += -12 * s;
        frame.piece.y += (-26 + Math.sin(elapsed * 8.8) * 7) * s;
        frame.piece.ry += Math.sin(elapsed * 8.8) * -18 * s;
      }
      if (name === "head") frame.piece.ry += Math.sin(elapsed * 2.8) * -10 * s;
    }

    if (actionId === "beckonLeft") {
      if (name === "rightArm") {
        frame.piece.r += (-58 + Math.sin(elapsed * 8.8 + Math.PI) * 16) * s;
        frame.piece.x += 12 * s;
        frame.piece.y += (-26 + Math.sin(elapsed * 8.8 + Math.PI) * 7) * s;
        frame.piece.ry += Math.sin(elapsed * 8.8 + Math.PI) * 18 * s;
      }
      if (name === "head") frame.piece.ry += Math.sin(elapsed * 2.8) * 10 * s;
    }

    if (actionId === "beckonBoth") {
      if (name === "leftArm") {
        frame.piece.r += (54 + Math.sin(elapsed * 8.4) * 15) * s;
        frame.piece.x += -10 * s;
        frame.piece.y += (-24 + Math.sin(elapsed * 8.4) * 6) * s;
        frame.piece.ry += Math.sin(elapsed * 8.4) * -15 * s;
      }
      if (name === "rightArm") {
        frame.piece.r += (-54 + Math.sin(elapsed * 8.4 + Math.PI) * 15) * s;
        frame.piece.x += 10 * s;
        frame.piece.y += (-24 + Math.sin(elapsed * 8.4 + Math.PI) * 6) * s;
        frame.piece.ry += Math.sin(elapsed * 8.4 + Math.PI) * 15 * s;
      }
      if (name === "head") frame.piece.y += Math.sin(elapsed * 3.2) * 2 * s;
    }

    if (actionId === "nod") {
      const nodWave = Math.sin(elapsed * 6.4);
      const forward = Math.max(0, nodWave);
      const recoil = Math.max(0, -nodWave);
      if (name === "head") {
        frame.piece.rx += (-forward * 26 + recoil * 13) * s;
        frame.piece.y += (forward * 18 - recoil * 6) * s;
        frame.piece.z += (forward * 4 + recoil * 10) * s;
        frame.piece.sy *= 1 - forward * 0.045 * s;
        frame.piece.r += Math.sin(elapsed * 6.4 + 0.3) * 1.4 * s;
      }
      if (name === "body") {
        frame.piece.rx += (-forward * 6 + recoil * 3) * s;
        frame.piece.y += forward * 2 * s;
      }
    }

    if (actionId === "leanBack") {
      const lean = 0.55 + ((Math.sin(elapsed * 2.5 - Math.PI / 2) + 1) / 2) * 0.45;
      if (name === "head") {
        frame.piece.y += -12 * lean * s;
        frame.piece.z += 28 * lean * s;
        frame.piece.rx += 30 * lean * s;
        frame.piece.r += Math.sin(elapsed * 2.5) * 2 * s;
      }
      if (name === "body") {
        frame.piece.rx += 8 * lean * s;
        frame.piece.y += -2 * lean * s;
      }
      if (name === "leftArm") frame.piece.r += 7 * lean * s;
      if (name === "rightArm") frame.piece.r += -7 * lean * s;
    }

    if (actionId === "shakeHead") {
      if (name === "head") {
        frame.piece.ry += Math.sin(elapsed * 8.5) * 30 * s;
        frame.piece.sx += Math.abs(Math.sin(elapsed * 8.5)) * -0.045 * s;
      }
    }

    if (actionId === "headRoll") {
      if (name === "head") {
        frame.piece.r += Math.sin(elapsed * 2.3) * 15 * s;
        frame.piece.ry += Math.sin(elapsed * 1.4) * 10 * s;
        frame.piece.z += 18 * s;
      }
    }

    if (actionId === "twist") {
      if (name === "body") frame.piece.ry += Math.sin(elapsed * 2.2) * 22 * s;
      if (name === "head") {
        frame.piece.ry += Math.sin(elapsed * 2.2 + 0.8) * -20 * s;
        frame.piece.r += Math.sin(elapsed * 2.2) * 4 * s;
        frame.piece.z += 14 * s;
      }
      if (name === "leftArm") frame.piece.r += Math.sin(elapsed * 2.2) * 9 * s;
      if (name === "rightArm") frame.piece.r += Math.sin(elapsed * 2.2) * -9 * s;
    }

    if (actionId === "playful") {
      frame.global.y += Math.sin(elapsed * 3.6) * 3 * s;
      if (name === "head") {
        frame.piece.x += Math.sin(elapsed * 3.1) * 9 * s;
        frame.piece.r += Math.sin(elapsed * 3.1) * 13 * s;
        frame.piece.ry += Math.sin(elapsed * 3.1 + Math.PI / 7) * 18 * s;
        frame.piece.y += Math.sin(elapsed * 6.2) * 2 * s;
      }
      if (name === "body") {
        frame.piece.r += Math.sin(elapsed * 3.1 + Math.PI) * 2.5 * s;
        frame.piece.ry += Math.sin(elapsed * 2.2) * 7 * s;
      }
      if (name === "leftArm") frame.piece.r += (7 + Math.sin(elapsed * 4.3) * 7) * s;
      if (name === "rightArm") frame.piece.r += (-7 + Math.sin(elapsed * 4.3 + Math.PI) * 7) * s;
    }

    if (actionId === "thinking") {
      if (name === "head") {
        frame.piece.r += (6 + Math.sin(elapsed * 1.7) * 2.2) * s;
        frame.piece.y += (5 + Math.sin(elapsed * 1.4) * 2) * s;
        frame.piece.ry += (-10 + Math.sin(elapsed * 1.2) * 6) * s;
      }
      if (name === "body") frame.piece.ry += (-3 + Math.sin(elapsed * 1.2) * 3) * s;
      if (name === "leftArm") {
        frame.piece.r += (96 + Math.sin(elapsed * 1.5) * 2.5) * s;
        frame.piece.x += 152 * s;
        frame.piece.y += -66 * s;
        frame.piece.z += 36 * s;
        frame.piece.ry += -18 * s;
      }
      if (name === "rightArm") frame.piece.r += (-8 + Math.sin(elapsed * 1.5) * 2) * s;
    }

    if (actionId === "happy") {
      frame.global.y += Math.sin(elapsed * 7) * 7 * s;
      frame.global.sy *= 1 + Math.max(0, Math.sin(elapsed * 7)) * 0.025 * s;
      if (name === "head") frame.piece.y += Math.sin(elapsed * 7 + 0.4) * 4 * s;
      if (name === "leftArm") frame.piece.r += (12 + Math.sin(elapsed * 7.2) * 10) * s;
      if (name === "rightArm") frame.piece.r += (-12 + Math.sin(elapsed * 7.2 + Math.PI) * 10) * s;
    }

    if (actionId === "shy") {
      if (name === "head") {
        frame.piece.x += 8 * s;
        frame.piece.y += 20 * s;
        frame.piece.r += (-6 + Math.sin(elapsed * 1.8) * 2) * s;
        frame.piece.ry += Math.sin(elapsed * 1.6) * 5 * s;
        frame.piece.sy *= 0.965;
      }
      if (name === "body") {
        frame.piece.sy *= 0.985;
        frame.piece.y += 5 * s;
      }
      if (name === "leftArm") {
        frame.piece.r += (220 + Math.sin(elapsed * 2.6) * 4) * s;
        frame.piece.z += 42 * s;
        frame.piece.ry += -16 * s;
        frame.piece.sx *= 0.84;
        frame.piece.sy *= 0.84;
      }
      if (name === "rightArm") {
        frame.piece.r += (-10 + Math.sin(elapsed * 2.2) * -2) * s;
      }
    }

    if (actionId === "curious") {
      const look = Math.sin(elapsed * 2.1);
      const pointLeft = Math.max(0, -Math.sin(elapsed * 3.1));
      const pointRight = Math.max(0, Math.sin(elapsed * 3.1));
      if (name === "head") {
        frame.piece.ry += look * 34 * s;
        frame.piece.r += look * 6 * s;
        frame.piece.x += look * 8 * s;
        frame.piece.z += 18 * s;
      }
      if (name === "body") {
        frame.piece.rx += -6 * s;
        frame.piece.ry += look * 8 * s;
        frame.piece.y += Math.sin(elapsed * 2.1) * 2 * s;
      }
      if (name === "leftArm") {
        frame.piece.r += (18 + pointLeft * 46 - pointRight * 6) * s;
        frame.piece.y += -pointLeft * 20 * s;
        frame.piece.ry += -pointLeft * 12 * s;
      }
      if (name === "rightArm") {
        frame.piece.r += (-18 - pointRight * 46 + pointLeft * 6) * s;
        frame.piece.y += -pointRight * 20 * s;
        frame.piece.ry += pointRight * 12 * s;
      }
    }

    if (actionId === "sad") {
      frame.global.y += Math.sin(elapsed * 2) * 1.5 * s;
      if (name === "head") {
        frame.piece.y += 12 * s;
        frame.piece.rx += 13 * s;
        frame.piece.r += Math.sin(elapsed * 1.6) * 2 * s;
      }
      if (name === "body") {
        frame.piece.y += 4 * s;
        frame.piece.rx += 5 * s;
        frame.piece.sy *= 0.99;
      }
      if (name === "leftArm") frame.piece.r += (10 + Math.sin(elapsed * 1.8) * 2) * s;
      if (name === "rightArm") frame.piece.r += (-10 + Math.sin(elapsed * 1.8) * -2) * s;
    }

    if (actionId === "handsIn") {
      if (name === "head") {
        frame.piece.r += Math.sin(elapsed * 1.6) * 1.5 * s;
        frame.piece.ry += Math.sin(elapsed * 1.4) * 5 * s;
      }
      if (name === "body") {
        frame.piece.ry += Math.sin(elapsed * 1.4) * 4 * s;
        frame.piece.y += Math.sin(elapsed * 2) * 1.5 * s;
      }
      if (name === "leftArm") {
        frame.piece.r += (-24 + Math.sin(elapsed * 2.1) * 3) * s;
        frame.piece.ry += -8 * s;
        frame.piece.z += 12 * s;
      }
      if (name === "rightArm") {
        frame.piece.r += (24 + Math.sin(elapsed * 2.1 + Math.PI) * 3) * s;
        frame.piece.ry += 8 * s;
        frame.piece.z += 12 * s;
      }
    }

    if (actionId === "nosePulse") {
      if (name === "head") {
        frame.piece.ry += Math.sin(elapsed * 1.8) * 5 * s;
        frame.piece.r += Math.sin(elapsed * 1.4) * 1.2 * s;
      }
    }

    if (actionId === "weird") {
      const cycle = (elapsed % duration) / duration;
      const headLift = pulseInRange(cycle, 0, 0.42);
      const headHop = pulseInRange(cycle, 0.74, 0.97);
      const leftOut = pulseInRange(cycle, 0.12, 0.52);
      const rightOut = pulseInRange(cycle, 0.42, 0.82);
      const headTotal = Math.max(headLift, headHop * 0.85);
      if (name === "head") {
        frame.piece.y += -78 * headTotal * s;
        frame.piece.z += 48 * headTotal * s;
        frame.piece.r += Math.sin(elapsed * 7) * 3 * headTotal * s;
        frame.piece.ry += Math.sin(elapsed * 5.4) * 8 * headTotal * s;
      }
      if (name === "leftArm") {
        frame.piece.x += -62 * leftOut * s;
        frame.piece.y += 18 * leftOut * s;
        frame.piece.r += -24 * leftOut * s;
        frame.piece.ry += -18 * leftOut * s;
        frame.piece.z += 16 * leftOut * s;
      }
      if (name === "rightArm") {
        frame.piece.x += 62 * rightOut * s;
        frame.piece.y += 18 * rightOut * s;
        frame.piece.r += 24 * rightOut * s;
        frame.piece.ry += 18 * rightOut * s;
        frame.piece.z += 16 * rightOut * s;
      }
      if (name === "body") {
        frame.piece.y += Math.sin(elapsed * 5) * 2 * s;
        frame.piece.ry += (leftOut - rightOut) * 5 * s;
      }
    }

    if (actionId === "bow") {
      const down = (Math.sin(elapsed * 2.4 - Math.PI / 2) + 1) / 2;
      frame.global.y += down * 14 * s;
      frame.global.z += down * 30 * s;
      frame.global.rx += down * 16 * s;
      frame.global.sy *= 1 - down * 0.012 * s;
      if (name === "head") {
        frame.piece.rx += (10 + down * 24) * s;
        frame.piece.y += down * 26 * s;
        frame.piece.z += down * 24 * s;
      }
      if (name === "body") {
        frame.piece.rx += down * 20 * s;
        frame.piece.y += down * 12 * s;
        frame.piece.sy *= 1 - down * 0.012 * s;
      }
      if (name === "leftArm") frame.piece.r += down * 14 * s;
      if (name === "rightArm") frame.piece.r += down * -14 * s;
    }

    if (actionId === "paperBendIn" || actionId === "paperBendOut") {
      const sign = actionId === "paperBendIn" ? 1 : -1;
      const bend = sign * (0.68 + Math.sin(elapsed * 2.7) * 0.34) * s;
      frame.bodyBend += bend;
      if (name === "head") {
        frame.piece.y += Math.abs(bend) * 12;
        frame.piece.z += Math.abs(bend) * 18;
        frame.piece.rx += bend * 10;
      }
      if (name === "leftArm") frame.piece.ry += bend * -18;
      if (name === "rightArm") frame.piece.ry += bend * 18;
    }

    if (actionId === "frontFlip") {
      const p = easeInOut(clamp(elapsed / duration, 0, 1));
      if (motionScale < 0.5) {
        frame.global.y += -Math.sin(Math.PI * p) * 28;
        frame.global.rx += Math.sin(Math.PI * p) * 18;
      } else {
        frame.global.y += -Math.sin(Math.PI * p) * 190;
        frame.global.z += Math.sin(Math.PI * p) * 160;
        frame.global.rx += 360 * p;
        frame.global.sy *= 1 - Math.sin(Math.PI * p) * 0.055;
        frame.bodyBend += Math.sin(Math.PI * p) * 0.34;
      }
      if (name === "leftArm") frame.piece.r += Math.sin(Math.PI * p) * 18 * s;
      if (name === "rightArm") frame.piece.r += Math.sin(Math.PI * p) * -18 * s;
    }

    if (actionId === "backFlip") {
      const p = easeInOut(clamp(elapsed / duration, 0, 1));
      if (motionScale < 0.5) {
        frame.global.y += -Math.sin(Math.PI * p) * 28;
        frame.global.rx += -Math.sin(Math.PI * p) * 18;
      } else {
        frame.global.y += -Math.sin(Math.PI * p) * 190;
        frame.global.z += Math.sin(Math.PI * p) * 160;
        frame.global.rx += -360 * p;
        frame.global.sy *= 1 - Math.sin(Math.PI * p) * 0.055;
        frame.bodyBend += Math.sin(Math.PI * p) * -0.26;
      }
      if (name === "leftArm") frame.piece.r += Math.sin(Math.PI * p) * 16 * s;
      if (name === "rightArm") frame.piece.r += Math.sin(Math.PI * p) * -16 * s;
    }

    return frame;
  }

  class MoanaPuppetController {
    constructor(target, options) {
      this.host = resolveTarget(target);
      this.options = Object.assign({}, DEFAULTS, options || {});
      this.assetBase = normalizeAssetBase(this.options.assetBase);
      this.action = ACTIONS[this.options.action] ? this.options.action : DEFAULTS.action;
      this.orientation = ORIENTATIONS[this.options.orientation] ? this.options.orientation : DEFAULTS.orientation;
      this.fromLayout = this.options.layout === "exploded" ? "exploded" : "assembled";
      this.targetLayout = this.fromLayout;
      this.layoutProgress = 1;
      this.actionStarted = performance.now() / 1000;
      this.onceAction = ACTIONS[this.action].playback === "once";
      this.returnAction = "idle";
      this.isDestroyed = false;
      this.reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.lastFrameTime = performance.now();
      this.frameRequest = 0;
      this.elements = {};
      this.headEffects = {};
      this.altArms = {};
      this.bodySegments = [];

      this.build();
      this.setSize(this.options.size);
      this.setShadow(this.options.shadow);
      this.applyFrame(this.actionStarted);

      if (this.options.autoStart !== false) this.start();
    }

    build() {
      this.host.classList.add("moana-puppet");
      this.host.dataset.action = this.action;
      this.host.dataset.orientation = this.orientation;
      this.host.dataset.layout = this.targetLayout;
      this.host.innerHTML = "";

      const viewport = document.createElement("div");
      viewport.className = "moana-puppet__viewport";

      const scene = document.createElement("div");
      scene.className = "moana-puppet__scene";

      const global = document.createElement("div");
      global.className = "moana-puppet__global";

      const leftArm = this.createPiece("leftArm");
      const rightArm = this.createPiece("rightArm");
      const leftArmIn = this.createAltArm("leftArmIn");
      const rightArmIn = this.createAltArm("rightArmIn");
      const body = this.createPiece("body");
      const bodySegmentsWrap = document.createElement("div");
      bodySegmentsWrap.className = "moana-puppet__body-segments";
      BODY_SEGMENTS.forEach((segment) => {
        const wrap = document.createElement("div");
        const img = document.createElement("img");
        wrap.className = "moana-puppet__body-segment";
        wrap.dataset.segment = segment.id;
        wrap.style.height = `${segment.height}px`;
        wrap.style.transformOrigin = segment.origin;
        img.src = `${this.assetBase}${PIECES.body.file}`;
        img.alt = "";
        img.decoding = "async";
        img.draggable = false;
        img.style.transform = `translateY(${segment.imageY}px)`;
        wrap.appendChild(img);
        bodySegmentsWrap.appendChild(wrap);
        this.bodySegments.push({ wrap, segment });
      });
      const head = this.createPiece("head");

      global.append(leftArm, rightArm, leftArmIn, rightArmIn, body, bodySegmentsWrap, head);
      scene.appendChild(global);
      viewport.appendChild(scene);
      this.host.appendChild(viewport);

      this.elements = {
        viewport,
        scene,
        global,
        pieces: { head, body, leftArm, rightArm },
        altArms: { leftArmIn, rightArmIn },
      };

      this.resizeObserver = new ResizeObserver(() => this.fitScene());
      this.resizeObserver.observe(this.host);
      this.fitScene();
    }

    createPiece(name) {
      const piece = PIECES[name];
      if (name === "head") return this.createHeadPiece(piece);

      const img = document.createElement("img");
      img.className = `moana-puppet__piece ${piece.className}`;
      img.src = `${this.assetBase}${piece.file}`;
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.style.width = `${piece.width}px`;
      img.style.transformOrigin = piece.origin;
      return img;
    }

    createHeadPiece(piece) {
      const wrap = document.createElement("div");
      wrap.className = `moana-puppet__piece ${piece.className} moana-puppet__head-group`;
      wrap.style.width = `${piece.width}px`;
      wrap.style.height = `${piece.height}px`;
      wrap.style.transformOrigin = piece.origin;

      const art = document.createElement("img");
      art.className = "moana-puppet__head-art";
      art.src = `${this.assetBase}${piece.file}`;
      art.alt = "";
      art.decoding = "async";
      art.draggable = false;
      wrap.appendChild(art);

      const frown = document.createElement("img");
      frown.className = "moana-puppet__face-layer";
      frown.src = `${this.assetBase}${EFFECT_LAYERS.frown.file}`;
      frown.alt = "";
      frown.decoding = "async";
      frown.draggable = false;
      wrap.appendChild(frown);
      this.headEffects.frown = frown;

      ["nose"].forEach((key) => {
        const config = EFFECT_LAYERS[key];
        const feature = document.createElement("img");
        feature.className = `moana-puppet__feature moana-puppet__feature-${key}`;
        feature.src = `${this.assetBase}${config.file}`;
        feature.alt = "";
        feature.decoding = "async";
        feature.draggable = false;
        feature.style.width = `${config.width}px`;
        feature.style.height = `${config.height}px`;
        feature.style.transform = `translate(${config.x}px, ${config.y}px)`;
        wrap.appendChild(feature);
        this.headEffects[key] = feature;
      });

      return wrap;
    }

    createAltArm(name) {
      const arm = ALT_ARMS[name];
      const img = document.createElement("img");
      img.className = `moana-puppet__piece moana-puppet__alt-arm moana-puppet__${name === "leftArmIn" ? "left-arm-in" : "right-arm-in"}`;
      img.src = `${this.assetBase}${arm.file}`;
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.style.width = `${arm.width}px`;
      img.style.transformOrigin = arm.origin;
      img.style.opacity = "0";
      this.altArms[name] = img;
      return img;
    }

    fitScene() {
      if (!this.elements.scene) return;
      const rect = this.host.getBoundingClientRect();
      const width = rect.width || Number(this.options.size) || DEFAULTS.size;
      const scale = width / STAGE.width;
      this.elements.scene.style.transform = `scale(${scale})`;
    }

    start() {
      if (this.frameRequest) return this;
      const tick = (now) => {
        if (this.isDestroyed) return;
        this.update(now);
        this.frameRequest = requestAnimationFrame(tick);
      };
      this.frameRequest = requestAnimationFrame(tick);
      this.host.classList.remove("is-paused");
      return this;
    }

    pause() {
      if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      this.host.classList.add("is-paused");
      return this;
    }

    update(now) {
      const delta = clamp((now - this.lastFrameTime) / 1000, 0, 0.05);
      this.lastFrameTime = now;
      if (this.layoutProgress < 1) {
        this.layoutProgress = clamp(this.layoutProgress + delta * 1.9, 0, 1);
        if (this.layoutProgress >= 1) this.fromLayout = this.targetLayout;
      }

      const seconds = now / 1000;
      this.applyFrame(seconds);

      const action = ACTIONS[this.action] || ACTIONS.idle;
      if (this.onceAction && seconds - this.actionStarted >= action.duration) {
        this.setAction(this.returnAction || "idle", { forceLoop: true });
      }
    }

    poseFor(name) {
      const piece = PIECES[name];
      const from = piece[this.fromLayout];
      const to = piece[this.targetLayout];
      const t = easeInOut(this.layoutProgress);
      return {
        x: lerp(from.x, to.x, t),
        y: lerp(from.y, to.y, t),
        z: 0,
        r: lerp(from.r, to.r, t),
        rx: 0,
        ry: 0,
        sx: 1,
        sy: 1,
        opacity: 1,
      };
    }

    applyFrame(seconds) {
      const elapsed = seconds - this.actionStarted;
      const motionScale = this.reducedMotion ? 0.25 : 1;
      const orientation = ORIENTATIONS[this.orientation] || ORIENTATIONS.front;
      const global = blankOffset();
      const orientationGlobal = orientation.global || {};
      const globalAction = actionFrame(this.action, "__global", elapsed, motionScale);
      let bodyBend = globalAction.bodyBend || 0;

      addOffset(global, orientationGlobal);
      addOffset(global, globalAction.global);

      Object.keys(PIECES).forEach((name) => {
        const pose = this.poseFor(name);
        const oriented = orientation.pieces && orientation.pieces[name] ? orientation.pieces[name] : null;
        const action = actionFrame(this.action, name, elapsed, motionScale);
        addOffset(pose, oriented);
        addOffset(pose, action.piece);
        if (name === "body") this.currentBodyPoseForSegments = Object.assign({}, pose);
        this.elements.pieces[name].style.transform = transformString(pose);
        this.elements.pieces[name].style.opacity = pose.opacity.toFixed(3);
      });

      this.elements.global.style.transform = transformString(global);
      this.applyHeadEffects(elapsed, motionScale);
      this.applyAltArms(elapsed, motionScale);
      this.applyBodySegments(bodyBend, elapsed, motionScale);
    }

    applyHeadEffects(elapsed, motionScale) {
      const nosePulse = this.action === "nosePulse";
      const frown = this.action === "sad";
      const noseScale = nosePulse ? 1.08 + Math.max(0, Math.sin(elapsed * 6)) * 0.32 * motionScale : 1;

      if (this.headEffects.frown) {
        this.headEffects.frown.style.opacity = frown ? "1" : "0";
      }
      if (this.headEffects.nose) {
        const config = EFFECT_LAYERS.nose;
        this.headEffects.nose.style.opacity = nosePulse ? "1" : "0";
        this.headEffects.nose.style.transform = `translate(${config.x}px, ${config.y}px) scale(${noseScale.toFixed(3)})`;
      }
    }

    applyAltArms(elapsed, motionScale) {
      const visible = false;
      Object.entries(ALT_ARMS).forEach(([name, arm]) => {
        const el = this.elements.altArms[name];
        if (!el) return;
        const from = arm[this.fromLayout];
        const to = arm[this.targetLayout];
        const t = easeInOut(this.layoutProgress);
        const sway = visible ? Math.sin(elapsed * 2.2 + (name === "leftArmIn" ? 0 : Math.PI)) * 2.2 * motionScale : 0;
        const pose = {
          x: lerp(from.x, to.x, t),
          y: lerp(from.y, to.y, t) + sway,
          z: visible ? 18 : 0,
          r: lerp(from.r, to.r, t) + sway,
          rx: 0,
          ry: visible ? (name === "leftArmIn" ? -8 : 8) : 0,
          sx: 1,
          sy: 1,
          opacity: visible ? 1 : 0,
        };
        el.style.transform = transformString(pose);
        el.style.opacity = pose.opacity.toFixed(3);
      });
    }

    applyBodySegments(bodyBend, elapsed, motionScale) {
      const useSegments = Math.abs(bodyBend) > 0.06;
      this.host.classList.toggle("is-bending", useSegments);
      if (!useSegments) return;

      const bodyPose = this.currentBodyPoseForSegments || this.poseFor("body");
      const pulse = Math.sin(elapsed * 2.2) * 0.06 * motionScale;
      const bend = bodyBend + pulse;
      const depth = Math.abs(bend);

      this.bodySegments.forEach(({ wrap, segment }) => {
        const offset = Object.assign(blankOffset(), bodyPose);
        offset.y += segment.y;
        offset.z += depth * 24;

        if (segment.id === "top") {
          offset.rx += -bend * 24;
          offset.y += -depth * 10;
          offset.z += depth * 10;
        }
        if (segment.id === "middle") {
          offset.rx += bend * 34;
          offset.z += depth * 48;
          offset.sy *= 1 - depth * 0.055;
          offset.sx *= 1 + depth * 0.018;
        }
        if (segment.id === "bottom") {
          offset.rx += -bend * 28;
          offset.y += depth * 14;
          offset.z += depth * 6;
        }

        wrap.style.transform = transformString(offset);
      });
    }

    setAction(action, options) {
      if (!ACTIONS[action]) {
        throw new Error(`Unknown MoanaPuppet action: ${action}`);
      }
      const opts = options || {};
      this.action = action;
      this.actionStarted = performance.now() / 1000;
      this.onceAction = opts.once === true || (ACTIONS[action].playback === "once" && opts.forceLoop !== true);
      this.returnAction = opts.returnTo || "idle";
      this.host.dataset.action = action;
      this.emitChange();
      return this;
    }

    playOnce(action, options) {
      return this.setAction(action, Object.assign({}, options || {}, { once: true }));
    }

    setOrientation(orientation) {
      if (!ORIENTATIONS[orientation]) {
        throw new Error(`Unknown MoanaPuppet orientation: ${orientation}`);
      }
      this.orientation = orientation;
      this.host.dataset.orientation = orientation;
      this.emitChange();
      return this;
    }

    setLayout(layout) {
      if (layout !== "assembled" && layout !== "exploded") {
        throw new Error(`Unknown MoanaPuppet layout: ${layout}`);
      }
      if (this.targetLayout === layout && this.layoutProgress >= 1) return this;
      this.fromLayout = this.layoutProgress < 0.5 ? this.fromLayout : this.targetLayout;
      this.targetLayout = layout;
      this.layoutProgress = 0;
      this.host.dataset.layout = layout;
      this.emitChange();
      return this;
    }

    setSize(size) {
      const px = Number(size);
      if (Number.isFinite(px) && px > 0) {
        this.options.size = px;
        this.host.style.setProperty("--moana-size", `${px}px`);
        this.fitScene();
      }
      return this;
    }

    setShadow(shadow) {
      if (shadow === "none" || shadow === "soft") {
        this.host.dataset.shadow = shadow;
      } else {
        this.host.removeAttribute("data-shadow");
      }
      return this;
    }

    emitChange() {
      this.host.dispatchEvent(
        new CustomEvent("moana-puppet-change", {
          bubbles: true,
          detail: {
            action: this.action,
            actionLabel: ACTIONS[this.action].label,
            orientation: this.orientation,
            orientationLabel: ORIENTATIONS[this.orientation].label,
            layout: this.targetLayout,
          },
        }),
      );
    }

    destroy() {
      this.pause();
      this.isDestroyed = true;
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.host.innerHTML = "";
      this.host.classList.remove("moana-puppet", "is-bending", "is-paused");
    }
  }

  function mount(target, options) {
    return new MoanaPuppetController(target, options);
  }

  const api = {
    mount,
    Controller: MoanaPuppetController,
    actions: ACTIONS,
    orientations: ORIENTATIONS,
    pieces: PIECES,
    stage: STAGE,
  };

  window.MoanaPuppet = api;

  if ("customElements" in window && !customElements.get("moana-puppet")) {
    customElements.define(
      "moana-puppet",
      class MoanaPuppetElement extends HTMLElement {
        static get observedAttributes() {
          return ["asset-base", "size", "action", "orientation", "layout", "shadow"];
        }

        connectedCallback() {
          if (this.controller) return;
          this.controller = mount(this, {
            assetBase: this.getAttribute("asset-base") || DEFAULTS.assetBase,
            size: Number(this.getAttribute("size")) || DEFAULTS.size,
            action: this.getAttribute("action") || DEFAULTS.action,
            orientation: this.getAttribute("orientation") || DEFAULTS.orientation,
            layout: this.getAttribute("layout") || DEFAULTS.layout,
            shadow: this.getAttribute("shadow") || DEFAULTS.shadow,
          });
        }

        disconnectedCallback() {
          if (this.controller) {
            this.controller.destroy();
            this.controller = null;
          }
        }

        attributeChangedCallback(name, oldValue, newValue) {
          if (!this.controller || oldValue === newValue) return;
          if (name === "size") this.controller.setSize(Number(newValue));
          if (name === "action") this.controller.setAction(newValue || DEFAULTS.action);
          if (name === "orientation") this.controller.setOrientation(newValue || DEFAULTS.orientation);
          if (name === "layout") this.controller.setLayout(newValue || DEFAULTS.layout);
          if (name === "shadow") this.controller.setShadow(newValue || DEFAULTS.shadow);
          if (name === "asset-base") {
            this.controller.destroy();
            this.controller = null;
            this.connectedCallback();
          }
        }

        setAction(action, options) {
          return this.controller.setAction(action, options);
        }

        setOrientation(orientation) {
          return this.controller.setOrientation(orientation);
        }

        setLayout(layout) {
          return this.controller.setLayout(layout);
        }

        playOnce(action, options) {
          return this.controller.playOnce(action, options);
        }
      },
    );
  }
})();
