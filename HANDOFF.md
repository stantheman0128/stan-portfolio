# Project Handoff — stan-portfolio

> 給接手的 AI(Codex / Claude / 其他):這份檔案讓你無縫接續。請先讀完「專案背景」「本次任務」再動手。本專案最初由 Codex 建立,接手請沿用其手刻風格,**不要重寫成框架**。

---

## Latest Session: 2026-07-10 — Paper Stan「活化」升級（交接給 Codex 實作）

> **這段是寫給接手實作的 Codex**：任務、脈絡、鐵律、驗證方式都在這裡。開工前先讀完本段＋兩份文件：
> ① spec（已由 Stan 核可）：`docs/superpowers/specs/2026-07-10-paper-stan-alive-design.md`
> ② 現況台詞/觸發總表：`docs/superpowers/specs/2026-07-09-paper-stan-script.md`

### 你的任務

在 branch `feat/moana-puppet-guide` 上開新分支 `feat/paper-stan-alive`，實作 spec 的五件事：

1. **表情軸解鎖**：kit 把皺眉臉(face-frown.png)硬綁在 `sad` 動作；掛載後在 puppet **instance** 上 shadow `applyHeadEffects`（prototype 與 kit 檔案都不動），讓 `expression ∈ {smile, frown}` 變獨立狀態（皺眉條件 = expression==="frown" 或 action==="sad"）。
2. **情緒引擎**：export `MOODS`（cheerful/calm/sleepy/miffed 四情緒；進入條件、閒置池權重、朝向/表情偏好、台詞池 key、節奏倍率；強度會隨時間衰減、miffed ~45s 消氣回 calm）。情緒調變：lifeLoop 池與間隔、台詞選池、視線積極度、反應編排。
3. **視線系統**：游標相對紙片人位置 → 3×3 視線格（lookLeft/front/lookRight × heroUp/front/shyDown），節流（區域變化＋≥400ms）、僅 idle、優先權低於手勢/演出；miffed 反轉（別過頭）、sleepy 遲鈍；reduced-motion 保留視線但去漫遊。
4. **演出序列器**：`perform([{action, orientation, expression, ms}...])` 可取消（拖曳/點擊/travel 打斷）；點擊與區塊反應升級成 2-3 步、與當下情緒一致的小劇（spec 有範例）。export `PERFORMANCES` 供測試驗證。
5. **烘焙台詞池**：`LINES[情境][情緒]` 每格 6-12 句英文變體（第一人稱 Paper Stan 口吻，語氣依情緒），選句避開同情境上一句。**你自己生成台詞**，Stan 會在 commit review 過稿。

外加：資料切檔到新 `src/render/fx/sprite-data.js`（純資料，`sprite.js` 留 runtime 並用 `JSON.stringify` 內插進 spriteJS 字串——這是現有的「單一真相」模式，測試與 runtime 共用同一份物件，必須保留）；更新 `2026-07-09-paper-stan-script.md` 反映新行為。

### 現況脈絡（你接手時的地基）

- **branch `feat/moana-puppet-guide`**：11 commits（未 push，tip `e97a991`）＝ Moana 紙片人 kit 進 `public/moana-puppet-kit/`、刺蝟換成紙片人（PuppetActor adapter）、捲動指向/點擊彩蛋/首訪三站導覽、Paper Stan 第一人稱台詞、嘴巴旁對話框（rAF 跟隨＋左右自動換邊）、拖曳＋滾輪縮放、幾乎用滿 28 動作×9 朝向（有覆蓋率測試）、hover 反應池不重複。
- **架構**：`src/render/fx/sprite.js` export 資料表＋`spriteCSS`/`spriteHTML`/`spriteJS` 三個字串；`src/render/themes/minimal.js` 把字串內插進渲染出的 HTML（互動版 `/interactive` 專用）。行為引擎（roam/lifeLoop/botherLoop/suggest/sectionDocent/runTour）全在 spriteJS 字串裡。`#sprite`＝定位層（JS translate），`#puppet-host`＝MoanaPuppet 掛載點；host transform 由 CSS 變數 `--flip`（翻面）×`--hscale`（hover 縮放）合成，別直接寫 host 的 transform。
- **測試**：`tests/sprite-puppet-map.test.js` 9 tests——以 `public/moana-puppet-kit/motions.json` 為唯一權威，驗所有引用動作/朝向存在＋全覆蓋守衛＋無 hedgehog 殘留。全套 `npx vitest run` 目前 18 檔 69 綠。

### 鐵律（違反任一條 = review 打回）

- **TDD**：先擴測試再實作。必加：MOODS/PERFORMANCES/池引用全部對 motions.json 驗真；**台詞衛生測試**——掃 LINES 每一句，出現 em dash（—）、en dash（–）或 emoji 即紅。
- **美術零更動**：`public/moana-puppet-kit/` 整包（PNG＋js＋css）一個 byte 都不改；表情解鎖只能 instance shadow。
- **只用 explicit path commit**（工作區有其他 session 的髒檔）：`git add <明確路徑>`，禁 `git add -A`/`-u`。granular commits（schema+tests / 表情 / 情緒 / 視線 / 序列器 / 台詞 / docs 各自成 commit）。
- **不 push、不 merge、不 rebase**；不碰 `featherweight.js`、`quest.js`/`cta.js`/`rate.js`/`shatter.js`、`freeform.js`/`studio.js`（別條線的地盤）；`minimal.js` 已接好 kit 的 link/script，原則上不用動。
- 台詞一律英文第一人稱（他就是 Stan 本人的紙片版）、**零破折號零 emoji**；`prefers-reduced-motion` 的既有閘門與降級全部保留。
- 引擎既有行為（漫遊/戳游標/引導/任務事件/評分反應）只能「換編排」不能刪功能。

### 驗證（收工前全綠才算完）

```bash
npx vitest run          # 全套綠（現 69，做完應更多）
npm run build           # vite build + postbuild 綠
npx vite --port 5189 --strictPort   # 手動看 /interactive（見下面陷阱）
```

### 陷阱

- **port 5173 是另一個 session 的 worktree（layout 線），跑的還是舊刺蝟**——手動驗證用自己的 port（5189）。port 5188 可能還掛著 Claude session 的舊 vite，別依賴它。
- 首訪開場泡泡被 localStorage（`quest-v2`）擋——想看 onboarding 用無痕視窗或清 localStorage。
- `sprite-data.js`/`sprite.js` 是 vitest 直接 import 的模組：**module top-level 不能碰 DOM**（runtime 邏輯都得住在 spriteJS 字串內）。
- Windows：git 的 LF→CRLF 警告無害；PowerShell 用 `;` 不是 `&&`（bash 環境不受限）。

### 做完之後

把你的 session 摘要（做了什麼/決策/狀態/坑）追加在本段下方，然後停手——Claude 會對這條分支的 diff 做對抗式審查，過了才由 Stan 決定 merge。

### Codex 實作摘要（2026-07-10）

- **分支與提交**：從 `feat/moana-puppet-guide` 的 `6599ff5` 建立
  `feat/paper-stan-alive`。目前功能提交為 `3e27416`（純資料）與
  `bdbc013`（runtime 與測試）。未 push、未 merge、未 rebase。
- **完成內容**：新增 `src/render/fx/sprite-data.js`，作為 `EXPRESSIONS`、
  `MOODS`、`PERFORMANCES`、`LINES` 的純資料單一真相。runtime 在
  `sprite.js` 以 JSON 內插這些資料，並只在已掛載的 puppet instance
  shadow `applyHeadEffects`，使 smile/frown 和 action 解耦。
- **行為決策**：miffed 在約 45 秒內回 calm；sleepy 由晚間或 90 秒無活動
  觸發；視線用九個 kit orientation 對應游標九格，miffed 反向、sleepy
  延遲。點擊與 section docent 走可被 click/drag/travel 取消的短演出。
  `LINES` 每個情境與情緒各有六句、避開同情境上一句，測試會拒絕非第一人稱、
  em/en dash 或 emoji。
- **測試與驗證**：`npx vitest run` 通過 18 檔、75 tests；`npm run build`
  通過。用 `npx vite --host 127.0.0.1 --port 5189 --strictPort` 實測
  `/interactive`：紙片人正常掛載、視線會改變頭部 transform、兩次點擊會進
  miffed 並顯示 frown，tap mini-scene 與第一人稱泡泡正常，console 無 warn/error。
- **美術與工作區**：`public/moana-puppet-kit/` 零 diff。保留了其他 session
  的髒檔，沒有加入任何無關路徑。
- **陷阱**：未指定 host 的 Vite 在此機器只監聽 IPv6 `::1`，內建瀏覽器無法用
  IPv4 localhost 路徑驗證，因此需加 `--host 127.0.0.1`。Vite 現在仍由本 session
  在 port 5189 運行；交接後可自行停止或重開。

### Codex follow-up: purposeful action timing（2026-07-10）

- **問題與原因**：快速 hover 會立刻開一個 gesture；舊 gesture 的 timeout 只看
  `mode === "busy"`，因此可能在新 gesture 尚未結束時把它提早釋放回 idle，接著被
  gaze 或 ambient 動作接走。
- **修正**：新增 `INTERACTION_POLICY`（280ms hover dwell、4.8s cooldown），快速
  移入移出只取消 pending hover。短 gesture 有 token 與 purpose priority，舊 timeout
  不會影響新 gesture。優先序為 gaze < ambient < hover < section < interaction < travel；
  低目的動作無法打斷較高目的回應。click、drag、travel 會明確取消現有 gesture。
- **驗證**：新增 runtime 契約測試，`npx vitest run` 通過 18 檔、76 tests，
  `npm run build` 通過。Vite 預覽仍在 5189 且 `/interactive` 正常掛載、console 無錯誤。
  內建自動化可確認快速掠過不改變 mood；fixed overlay 在該自動化 surface 無法命中
  真實 hover hit area，故最後的手感判斷仍應由 Stan 在一般瀏覽器試一次。

### Codex follow-up: Paper Stan director brain v1.5（2026-07-10）

- **Scope change approved by Stan**：原已核可 spec 把 live LLM director 延後；Stan
  後續明確要求開始做小模型或演算法的大腦。本次只完成受限的 director，不做 chat、
  persistent memory、WebLLM、Gemini Nano 或 deployment。完整設計在
  `docs/superpowers/specs/2026-07-10-paper-stan-director-design.md`。
- **Implementation**：新增 pure `src/render/fx/sprite-director.js`，把 event 轉成
  bounded plan。`sprite.js` local-first 接到 hover、tap、section docent、project
  prompt、cursor boop。既有 gesture token/purpose priority 仍掌管真正的動畫時間，
  remote result 僅 cache 給下一個 matching event，絕不打斷當前動作。
- **Cloudflare boundary**：新增 `functions/api/paper-stan/plan.js` 與 Pages AI binding
  (`AI`)。endpoint 預設回 403，除非 environment 明確設
  `PAPER_STAN_AI_ENABLED=true`；browser 也必須有 `?paperStanAi=1` 才會發 request。
  送出的 context 只含 event/mood/allowed section/coarse dwell，無座標、DOM、title、
  input、IP 或 tracking data。模型只能從 server 列出的 plan 選一份，server 會再
  validate，不可產生任意 action 或 visible copy。
- **Model decision**：暫用 `@cf/meta/llama-3.2-1b-instruct` 做可選 edge intent
  selection。沒有假設它支援 JSON Mode；exact allowed-plan prompt + server validation
  才是安全邊界。AI Gateway、rate caps/observability 和更大模型 fallback 留給啟用前的
  deployment review。
- **Verification**：新增 `tests/sprite-director.test.js`、
  `tests/paper-stan-plan.test.js`；`npx vitest run` 已通過 20 files / 88 tests，
  `npm run build` 已通過。`public/moana-puppet-kit/` 未改。沒有跑
  `wrangler pages dev`、沒有呼叫 inference、沒有 deploy，因本地 Workers AI 也可能
  連到帳戶並產生用量。

### Codex follow-up: Paper Stan director v2 generated dialogue（2026-07-10）

- **做了什麼**：optional remote director 現在會回傳一個既有、驗證過的動畫 plan，加上一句
  生成的 Paper Stan 台詞。`functions/api/paper-stan/plan.js` 的 System Prompt 將角色定義為
  簡短、有用、英文第一人稱的導覽者，不是 chat bot，並禁止 em/en dash、emoji、數字、URL、
  markdown、動作名稱、私密資料、tracking 宣稱與無根據事實。
- **硬邊界**：`validateDirectorLine()` 只接受 4 到 22 個英文單字、最長 160 字元、含第一人稱
  代名詞的一句 ASCII 台詞。`validateDirectorPlan()` 現在要求每一個非 line 欄位，包含 expiry，
  都完全等於允許的 plan。錯誤的模型輸出回 `422 invalid_plan`；browser 保留 local motion 和
  baked `LINES` fallback。模型不能打斷進行中的動作。
- **如何測真模型**：deterministic tests mock `env.AI.run`，會驗證 prompt 與錯誤輸出拒絕。
  要做會計費的本機 inference，使用被忽略的 `.dev.vars` 加上 `PAPER_STAN_AI_ENABLED="true"`，
  跑 `npm run build`，再跑 `npx wrangler pages dev dist --port 5190`，並開
  `/interactive?paperStanAi=1`。進入 Works、等 `POST /api/paper-stan/plan`，離開後超過 4.5 秒
  cooldown 再回來，就能看到 cache 的 remote plan。Vite 5189 沒有 Pages Function，只會測 fallback。
- **驗證**：`npx vitest run` 通過 20 files / 92 tests；`npm run build` 通過；
  `git diff --check` 通過；`public/moana-puppet-kit/` 相對 `6599ff5` 沒有 tracked 或 untracked diff。
- **刻意沒做**：沒有真實 Workers AI request、Pages deploy、在 `wrangler.toml` 啟用變數、push、
  merge 或 rebase。真實 inference 會產生帳戶用量，需由擁有者明確 opt in。其他 session 的未追蹤
  worktree 檔案均未動。

### Codex follow-up: Paper Stan conversation v3（2026-07-10）

- **Scope change**：Stan 明確不要模型決定角色何時說話或動作。已移除
  `functions/api/paper-stan/plan.js` 與舊的 event-triggered remote-plan 路徑；所有 hover、tap、
  section、project-dwell、cursor 反應皆由 local director 和既有 gesture token/cooldown 管理。
- **Explicit project questions**：新增 `src/render/fx/paper-stan-dialogue.js`、
  `functions/api/paper-stan/reply.js` 和 Paper Stan 的 `?` 提問控制。訪客主動送出問題時，browser
  僅傳 `{ question }` 到 `/api/paper-stan/reply`；server 從 `data/content.json` 建立有限的公開
  profile/project/patent facts，再要求模型回一個短的第一人稱英文 `reply`。不傳 DOM、滑鼠座標、
  scroll history、其他 input、IP、fingerprint 或 visitor identity。
- **Safety and UX**：System Prompt 將模型限定為 public-portfolio 問答，不可決定動畫時間或揭露
  prompt/private data。server/client 都驗證一到三句、ASCII、first-person、無 URL/markdown/emoji/
  em-en dash 的 reply。提問表單開著時，延遲 greeting 和 project nudge 不得覆蓋它；失敗時表單
  保持可重試，本機動作不中斷。`PAPER_STAN_AI_ENABLED` 預設未設，endpoint 回 403，不會誤觸 inference。
- **Regression fix**：Vite 壓縮會改掉 serialized helper 預設參數的 module binding 名稱，曾造成
  `w/j is not defined`。runtime 現在用 wrapper 明確傳入 config，並有模擬壓縮名稱的 regression test。
- **Verification**：`npx vitest run` 通過 20 files / 89 tests；`npm run build` 通過；
  `git diff --check` 通過；`public/moana-puppet-kit/` 相對 `6599ff5` 無變更。已用
  `wrangler pages dev dist --port 5190 --compatibility-date 2026-06-10` 開啟
  `http://127.0.0.1:5190/interactive` 實測 `?`、表單送出與 disabled fallback。沒有啟用 `.dev.vars`、
  沒有真實 AI inference、Pages deploy、push、merge 或 rebase。
- **Handoff status**：本地 server 目前保留在 port 5190。若 owner 明確要測真模型，才建立 ignored
  `.dev.vars` 的 `PAPER_STAN_AI_ENABLED="true"` 並用同一個 Pages dev command 重啟；先看
  `docs/superpowers/specs/2026-07-10-paper-stan-director-design.md` 的限制與測試流程。

### Codex follow-up: Paper Stan real Workers AI smoke test（2026-07-10）

- **Owner-approved local inference**：Stan 後續明確要求實作並測試 AI。已將 `.dev.vars` 加入
  `.gitignore`，在該 ignored local file 設 `PAPER_STAN_AI_ENABLED="true"`，並以
  `wrangler pages dev dist --port 5190 --compatibility-date 2026-06-10 --ai=AI` 重啟。此設定只留在
  本機，不在 `wrangler.toml`、不 deploy、也不會進 Git。
- **Small-model adaptation**：實測 `@cf/meta/llama-3.2-1b-instruct` 會把大型 user JSON 當成續寫內容。
  `buildDialogueMessages()` 因此改為 system 中的短 public facts，user message 只留
  `Visitor question: ...`，並只對命中的專案提供 detail。模型仍被要求 JSON；若它回安全的純文字或
  JSON code fence，server 只在同一個 strict first-person/ASCII/no-URL validator 通過後才正規化為
  `{ reply }`，不會把 raw model output 直接交給 browser。
- **Real result**：實際 `POST /api/paper-stan/reply` 已回 `200`，Course Checker 問題得到
  「I built Course Checker ... reporting remaining required credits by category」的有效回覆。已移除
  用來診斷 raw response 的暫時 debug gate。
- **Current status**：server 仍在 `http://127.0.0.1:5190/interactive`，可點 Paper Stan 的 `?`
  直接測試。這會使用 Cloudflare Workers AI 帳戶用量；測完可停止 server 或刪除 ignored `.dev.vars`
  回到 403 disabled。尚未 push、merge、rebase 或 deploy。

### Codex follow-up: Paper Stan public persona context（2026-07-10）

- **Why**：Stan 詢問 System Prompt 是否應更理解本人和 projects。已把 `data/content.json` 中公開的
  `latinName`、`location`、role、tagline、subtagline、availability 納入 server-only identity block；
  命中特定 project 時同時帶入 detail 和 tags。`?` 的文案現在可問 Stan 本人或 project。
- **Prompt behavior**：Paper Stan 明確以 Stan 第一人稱說話。identity/work-style 的多段問題必須回答
  role、personal approach、relevant build scope；同時禁止模型自行補編動機、個人經歷、clients、
  collaborators、tradeoffs、metrics 或技術細節。通用問句不會因 `work`、`project` 等 stopwords 誤把
  不相關 project 當成 context。
- **Verification**：TDD 新增 public-dossier assertions，targeted tests 通過。真實 Workers AI 問
  「Who are you, and what kind of work do you build?」得到有效 200 與兩句第一人稱回答，含 product
  builder/AI-first identity 與 end-to-end build approach。更深的個人故事或未公開 motivation 不應由
  模型猜測，需 Stan 另行審核後寫入 public source data。

### Codex follow-up: Paper Stan conversation v4（2026-07-10）

- **做了什麼**：升級 `?` 對話為有目的的 Paper Stan 互動。角色會在本機 idle 後以
  「I'm curious what brought you here.」提出邀請，提供 `Looking at projects`、`Recruiting`、
  `Just curious` 和 local tour；僅當訪客點選意圖或主動送出文字時才呼叫
  `/api/paper-stan/reply`。對話回合固定為 `{ reply, tone, gesture, followUp }`，而模型給的手勢
  只會等角色 idle 後排隊播放，不能搶走 travel、drag、tour、active performance 或 reduced-motion
  的控制權。
- **Persona / data boundary**：System Prompt 現在明確要求 Paper Stan 是 Stan 本人的 fun、energetic、
  creative、slightly quirky、curious paper self，說第一人稱英文、可回答公開 project／identity 問題，
  可自然追問但不可編造公開資料以外細節或排程動畫。browser 只送 allowlisted 的
  `section`、`visitIntent`、`conversationStage`；不讀、不存、不傳 DOM、pointer、scroll history、
  user agent、IP、fingerprint 或其他輸入。`sessionStorage` 只留本 tab 的 invited/intent/stage，不留
  question 或 reply。完整規格已更新為
  `docs/superpowers/specs/2026-07-10-paper-stan-director-design.md` v4。
- **可靠性**：1B model 偶爾會回 plain text、code fence、過長或不合 contract 的內容。server 會接受
  通過 strict first-person/ASCII/no-URL/no-markdown/no-emoji/no-em/en-dash 驗證的內容；若輸出不合法或
  inference throw，絕不將 raw response 交給 browser，而是以對應 intent 的 public-fact local turn
  安全降級。剛選完 intent 而模型漏掉 tone/gesture/followUp 時，`completeDialogueTurn()` 才補已安裝的
  defaults；模型明確選 `none` 或 `null` 時不覆寫。
- **重要陷阱 / 修復**：舊版以 `function.toString()` 注入 browser helper。Vite 壓縮後 helper 內部會抓到
  module alias，造成實際頁面 `F/T is not defined`，導致 server 200 仍被 UI 當作 failure，也讓 local
  director console error。`sprite-dialogue-runtime` 和 `sprite-director-runtime` 現在均為 standalone
  browser strings，並新增 regression test 禁止再引入 `raw*` captured helpers。不要回退成 source
  serialization。
- **驗證**：`npx vitest run` 通過 **20 files / 99 tests**；`npm run build`、`git diff --check` 皆通過；
  `public/moana-puppet-kit/` 相對 `6599ff5` 無 diff。實測 remote Workers AI 的 Course Checker 問題取得
  第一人稱有效回覆；以 `/interactive` 實測本機邀請、intent chip、reply、follow-up textbox 與 browser
  console，console 無 error。Pages dev 保留在 `http://127.0.0.1:5190/interactive`，它使用 ignored
  `.dev.vars` 的 owner-approved `PAPER_STAN_AI_ENABLED="true"`，會產生 Workers AI 用量。
- **狀態**：目前 branch 是 `feat/paper-stan-alive`；沒有 deploy、push、merge 或 rebase。請由 Claude
  先對本 branch diff 做對抗式審查，再決定是否合併。其他 session 的 untracked `demo-concepts/`、
  `tasks/mascot-candidates/` 檔案均未碰。

---

## Previous Session: 2026-07-02 — Live Studio 自助編輯器（HackMD 式）

### 做了什麼
- 從「純作品集」升級為「完整個人網站 + 自助編輯器」。先跑 6 設計方向探索（`demo-concepts/`），Stan 選定 **Featherweight + Minimal** 兩個。
- **自建 Live Studio 編輯器**（左編輯／右即時預覽，像 HackMD）+ 內容/設計分離 + 兩主題 + 公開站入口。
- 三個 commit 全推上分支 `demo/personal-site-concepts`：`dc40398`（6 demo + 第一版極簡）、`c866200`（Studio + 共用 render + 兩主題）、`7c699e6`（公開站入口）。origin/main 完全沒動。

### 關鍵決策
- **棄用 Sveltia CMS，改自建 Live Studio**：Sveltia 是「填表單 → 存 → 之後才看到結果」，Stan 要「邊改邊即時看到整個網站長出來」。→ **下個 AI 不要回去用 Sveltia/Decap。**
- **內容/設計分離**：`data/content.json` 單一真相 → 共用 `renderSite(content, theme)` → 正式站與 Studio 右側預覽**共用同一 render 函式**（所見即所發布）。
- **持久化走 GitHub-backed（非後端 DB）**：維持靜態/快/任何裝置可開；發布時 commit 回 repo。
- **主題零外部資源**（系統字體、CSS/JS 全內嵌）：快、離線可用，並避開 Google Fonts 害 headless 截圖卡死。
- **通用 portfolio（非 Colonist 專屬）**：公開內容＝作品/專利(US10699576B1)/Nothing/Dcard/CMU 成長故事/工作經歷；**排除（隱私）**＝投資/ETF 績效、完整得獎史、女友脈絡。

### 目前狀態
- 能跑嗎：**是（本機）**。Stan 雙擊 `serve-demos.cmd` 跑自己的 vite（port 5173）。
  - Studio：`http://localhost:5173/studio.html`（左編右即時預覽、切主題、items 增刪改、localStorage 自動存、Export JSON）
  - 公開站：`http://localhost:5173/site.html`（新主題渲染 + 右下訪客切主題）
- 已完成（P1 + P2c，皆 Playwright/headless 實測）：內容模型、共用 render、Featherweight/Minimal 兩主題、Studio 編輯器、公開站入口。

### 已知問題 / 陷阱
- **localhost 一直掛**：Claude Preview MCP 的 dev server 綁 session、會被系統回收。解法＝Stan 自己 `serve-demos.cmd` 或 `npm run dev`（脫離 Claude session）。別再靠 `preview_start` 當常駐。
- **在分支、不在 main**：新東西全在 `demo/personal-site-concepts`；正式站 `main`（`index.html` + `src/main.js`）仍是舊 Colonist SPA，沒動。新 session／新電腦要先 `git checkout demo/personal-site-concepts` + `npm install`。
- **兩套內容並存**：新編輯器用 `data/content.json`；舊的 `data/site.json` + `data/projects/*.md`（給舊 index / 已棄的 Sveltia）仍在，別搞混。
- Windows：PowerShell（`;` 不是 `&&`）；headless 截圖用 `"/c/Program Files/Google/Chrome/Application/chrome.exe"`。

### 下一步（P2 收尾）
1. **Studio「Publish」接 GitHub**：沿用現有 OAuth worker（`base_url: https://stan-portfolio-cms-auth.stanshih888.workers.dev`，見 `public/admin/config.yml`）拿 token → GitHub Contents API commit `data/content.json`。⚠️ 最終測試**要 Stan 在瀏覽器用 GitHub 登入一次**（OAuth 無法代點）。
2. **圖片真上傳**：Studio 目前只有本機 objectURL 預覽；Publish 時把新圖 commit 到 `public/assets`。
3. **公開站 build 期預渲染成靜態**（拿掉 `src/site/site.js` 的 `document.write`），並決定何時把 `index.html` 換成新設計。
4. **部署 preview 網址**：`wrangler pages deploy`（wrangler 已登入 stanshih888@gmail.com；account `97cf88bf307d6a78c496e80ae99677de`），獨立 pages 專案、不碰正式站。
5. 次要：Studio 左側補上 patent/experience/press/education/skills 的編輯（目前只做了 profile/about/items）。

### 檔案地圖（本次新增，皆在分支上）
- `data/content.json` — 內容單一真相
- `src/render/renderSite.js`（dispatcher）、`src/render/util.js`（esc/md/realLinks）、`src/render/themes/{featherweight,minimal}.js`（`render(content)→完整HTML`）
- `src/studio/studio.js` + `studio.html` — 編輯器
- `src/site/site.js` + `site.html` — 公開站入口
- `serve-demos.cmd` — 雙擊啟本機 server；`tasks/todo.md` — 進度；`demo-concepts/` — 6 設計方向 demo

### 給下一個 AI 的提示
- **不要回去用 Sveltia CMS**（Stan 明確不要表單式編輯）。
- 別靠 Claude 管的 preview server 當常駐（會週期性掛）；要 Stan 自己終端機開。
- 對外/不可逆動作（部署公開網址、動 main、commit）**先確認**；Stan 重視審閱權，故一切在 feature 分支。
- 記憶檔 `project_stan_portfolio.md` 有更完整的歷史脈絡。

### 建議下個 AI 用的 skill
- 接發布/部署管線 → `guided-dev` 或 `feature-dev`；Cloudflare 部署 → `wrangler` / `cloudflare`。
- 動 UI 手感 → `impeccable`；對外文案定稿 → `humanizer`。

---

## Previous Session: 2026-06-06 — 交接「Tier 3 視覺化 CMS 編輯器」實作

### 本次任務(要你做的事)
擁有者(Stan)要的最終目標:**在這個手刻網站上加一個 `/admin` 視覺化編輯器(Git-based CMS)**,讓他之後改文字/換圖**完全不用碰程式、不用跑指令、手機也能改**,存檔後自動部署上線。他最在意的就是「**能自己做一個屬於這個站的編輯器**」。

這是「Tier 3」。它 = 「Tier 2 自動部署基礎建設」+「內容與程式分離」+「CMS 層」。三層都要做。

### 目標架構(建議,可與擁有者確認後微調)
- **CMS**:**Sveltia CMS**(現代、輕量、CF Pages 友善,Decap/Netlify CMS 的後繼者)。Decap CMS 亦可,但優先 Sveltia。
- **內容格式**:每個專案一個 Markdown 檔(frontmatter)放在 `data/projects/`,全站文案放 `data/site.json`(或 `.md`)。理由:Markdown collection 對 CMS 最友善,改一個專案 = 改一個檔。
- **自動部署**:**Path B(建議,對現有網域零干擾)** = 保留現有 direct-upload Pages 專案,新增 GitHub Actions,在 push 到 `main` 時 build + `wrangler pages deploy`。
  - Path A(不建議,除非擁有者要):另建 Git-connected Pages 專案 + 搬 custom domain + 改 DNS CNAME target。會動到目前正常運作的網域,風險高。

### 建議實作階段(Phase)
**Phase 0 — 內容 ÷ 程式(地基,先做)**
1. 把 `src/main.js` 裡的 `projects` 陣列、`strengths`、`highlights`、各頁文案(hero headline/subhead、colonist callout、about prose)抽到 `data/`:
   - `data/projects/<slug>.md` × 8(frontmatter:`title, status, path, description, tags[], image, imageMode("" | "icon" | "contain"), alt, links[{label,href}], hero(bool), order`)
   - `data/site.json`:`email, github, linkedin, resume, hero{headline,subhead}, colonistCallout, about{...}, strengths[], highlights[]`
2. 重構 `main.js` 改成 build-time 載入這些資料(Vite 的 `import.meta.glob('../data/projects/*.md')` 或 import JSON)。**渲染輸出與 CSS 必須完全不變**——這是搬水電,不是重新設計。
3. 驗證:build 後頁面內容與現在逐字一致(可比對截圖)。

**Phase 1 — Git + 自動部署**
1. `git init` → 推到新的 GitHub repo(建議名 `stan-portfolio`)。
2. 新增 `.github/workflows/deploy.yml`:push `main` → `npm ci && npm run build` → `wrangler pages deploy dist --project-name=stan-portfolio --branch=main`。
   - GitHub secrets 需要:`CLOUDFLARE_API_TOKEN`(權限 Pages:Edit)、`CLOUDFLARE_ACCOUNT_ID`(= `97cf88bf307d6a78c496e80ae99677de`)。
3. 驗證:隨意改一行 → push → Actions 綠燈 → 線上更新。

**Phase 2 — Sveltia CMS(`/admin`)**
1. 新增 `public/admin/index.html`(載入 Sveltia CDN)+ `public/admin/config.yml`:
   - `backend: { name: github, repo: <user>/stan-portfolio, branch: main, base_url: <OAuth worker URL> }`
   - `media_folder: "public/assets"`,`public_folder: "/assets"`
   - `collections`:`projects`(folder collection 對 `data/projects`,欄位對應 frontmatter)+ `site`(file collection 對 `data/site.json`)
2. GitHub OAuth(讓 CMS 能 commit):部署官方 **`sveltia-cms-auth` Cloudflare Worker**,在 GitHub 建一個 OAuth App(callback = worker URL),設 Worker secrets(`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`/`ALLOWED_DOMAINS`),把 CMS `base_url` 指向它。
3. 驗證端到端:`portfolio.stan-shih.com/admin` → GitHub 登入 → 改一個專案 / 拖拉上傳一張圖 → Publish → repo 出現 commit → Actions build → 線上更新。

### 關鍵決策(以及為什麼)
- **沿用手刻、不導入框架**:擁有者偏好手刻、無鎖定。CMS 選 Git-based 而非 headless,就是為了不養外部資料庫、編輯器內建於站。
- **內容抽成資料檔**:Tier 3 的 CMS 必須編輯「純資料」,不能讓使用者誤改渲染邏輯。
- **自動部署走 Path B(GitHub Actions)**:避免搬動目前正常的 custom domain + DNS,風險最低。

### ⚠️ 必讀陷阱 / 限制
- **`renderColonistPage()` 目前用硬編 index**(`projects[0]`、`related = [projects[1],[2],[3],[5]]`)。內容搬到資料檔、且 CMS 可重排順序後,**這會壞**。請改成用明確旗標/key 選取(例如 per-project 的 `colonistRelated: true`,或 site.json 裡一個 slug 清單)。**這是最容易踩的雷。**
- **`#TODO-*` placeholder 連結**是**故意**的:`renderLinks()` 會自動過濾隱藏(訪客看不到死按鈕)。重構後**務必保留這個過濾行為**,CMS 也要允許 href 留 `#TODO-...` 或空白。
- **ETF/Quant 那張圖**(`etf-tracker-screenshot.png`)會公開擁有者真實的投資組合數字(總值/持倉/報酬)。擁有者**已知情並同意公開**——不要自作主張移除或「修正」。
- **Resume PDF 故意不放**(目前沒有去敏感版本,footer 已移除該連結)。不要擅自加。
- **不要杜撰任何連結/數據**。未確認的一律 `#TODO-`。
- 語言:跟擁有者溝通一律**繁體中文(禁簡體)**;網站文案維持**英文**。
- 環境:Windows + bash。Python 用 `python`(Pillow/win32 已裝)。**`rm -rf` 被保護規則擋住**,要刪資料夾用 Python `shutil.rmtree`。
- cloudflare-api MCP(Code Mode 的 execute/search 工具)**只在 CLI session 出現,GUI app 抓不到**。要動 Cloudflare 請在 CLI 跑。

### 目前狀態(本次 session 已完成)
- 能跑嗎:**是**。已上線 `https://portfolio.stan-shih.com`(+ `/projects`、`/colonist`),全綠。
- 已完成:
  - 移除 **MP3 Converter**、**Nothing Voice Input** 兩張卡(含金量不足 / 根本沒 app)。
  - 補上真實圖:**ClaudePulse**(`claudepulse-screenshot.png`,imageMode `contain`,來源是其 README 既有的 session 清單截圖)、**ETF/Quant**(`etf-tracker-screenshot.png`,跑 `next dev` 截的真實 dashboard)。
  - **現在 8 個專案全部有真圖,文字 placeholder 歸零。**
  - rebuild + deploy(目前線上 bundle `index-DnNBWtLB.js`);README 已更新。
- 還沒做:**Tier 3(本交接的任務,Phase 0→2 全部)**。

### 基礎事實(接手會用到)
- 專案路徑:`C:\Users\stans\Projects\stan-portfolio`
- Stack:Vite 8 + 原生 JS SPA(client-side render),`src/main.js` 是內容+邏輯來源,`src/styles.css` 是樣式,`public/_redirects` 做 SPA fallback。
- Build:`npm run build`(= `vite build`,輸出 `dist/`)。
- 部署(現況 direct upload):`npx --yes wrangler@latest pages deploy dist --project-name=stan-portfolio --branch=main --commit-dirty=true`
- Cloudflare:account `97cf88bf307d6a78c496e80ae99677de`;Pages 專案 `stan-portfolio`;custom domain `portfolio.stan-shih.com`(zone `stan-shih.com` id `5fb4b4501bac832b61278ec5dddc9a17`,CNAME `portfolio → stan-portfolio.pages.dev`,proxied)。
- **尚未** git init、**尚未** 有 GitHub remote。

### 給下一個 AI 的提示
1. 先做 Phase 0(內容抽離)並驗證渲染零變化,再碰部署/CMS——地基不穩後面都白做。
2. 動手前先跟擁有者確認三個選項:CMS(Sveltia vs Decap)、自動部署(Path B GitHub Actions vs Path A Git-connected)、內容格式(md-per-project vs 單一 JSON)。建議值都已標在上面。
3. 擁有者是工程師、偏好直接執行、重視「少而精」與含金量;但**對外/不可逆動作(動網域、公開資料、刪檔)先確認**。
4. 完工標準:擁有者能在 `/admin` 改一段文字 + 換一張圖 + 按 Publish,1~2 分鐘後線上自動更新,全程不碰程式碼、不跑指令。
