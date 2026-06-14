# 🎬 Puti-AI 自動簡報影片生成器 (Puti-AI Presentation Video Generator)

**一鍵將投影片與腳本自動合成配音、流暢轉場與 PPT 級別動畫的影片生成神器！**

---

## 🌟 核心特色

### 1. 👥 智能多角色對白與過濾人名前綴
* **多語音指派 (Voice Mapping)**：自動識別腳本中的對話格式（如 `小螺：「對白」` 和 `菩菩：「對白」`）。小螺自動指派為活潑男聲（`zh-TW-YunJheNeural`），菩菩指派為優雅女聲（`zh-TW-HsiaoChenNeural`），旁白預設使用溫柔女聲。
* **人名與引號過濾**：TTS 語音生成時會**自動過濾掉角色名稱與冒號引號**，僅由對應的角色聲音念出台詞。
* **字幕電影感呈現**：底部字幕去除角色前綴，僅以引號表示對白內容，畫面簡潔乾淨。
* **無損音軌拼接**：分段生成臨時語音後，透過 FFmpeg 重新編碼無損拼接，讓簡報每一頁的時長與對白時間 100% 精確緊湊對齊。

### 2. 🛡️ 物理定位與動畫分離防抖 (Margin-Based)
* **物理像素對齊**：捨棄了在 `transform` 屬性中進行定位的傳統做法，改為將物理定位（`left` / `top`）搭配 `margin-left` / `margin-top`（置中為 `-500px` 與 `-80px`，靠左為 `0px` 與 `-80px`）完全固定在容器物理邊界上，定位像素依然透過 `Math.round()` 取整。
* **動畫 100% 釋放**：將 `transform` 與 `opacity` 釋放給獨立的 CSS `@keyframes` 動畫（如 `float`、`pulse`、`wiggle`、`spin`）。這徹底解決了當 CSS 動畫生效時，會覆蓋 `transform` 定位值而使文字飛去左上角的致命 Bug！

### 3. 🎨 電影級 3.5px 雙層陰影消鋸齒描邊
* 字幕與物件文字使用 `3.5px` 的黑色加厚向量描邊，並將描邊順序設為下層（`paint-order: stroke fill`），絕不侵蝕白色文字本體。
* 外加 **4 向多重對角線黑投影陰影**，完全抹平文字在網頁中產生的毛糙與鋸齒，字體圓滑立體。

### 4. 💫 豐富的 PPT 級轉場與進場強調動畫
* **頁面轉場 (`transition`)**：
  - `morph`：**神級轉化轉場**。跨頁的同 ID 物件會自動計算大小與坐標，實現無縫的平滑移動與變形！
  - `zoom`：**縮放頁面轉場**。上一頁淡出，新一頁從小放大浮現，非常流暢。
  - `fade`：交叉淡入淡出。
  - `slide-left` / `slide-right` / `slide-up` / `slide-down`：推入過場。
  - `wipe`：遮罩擦除過場。
* **元件進場 (`entrance`)**：
  - `pop-in` (彈簧彈出)、`fade-in` (漸顯)、`fly-in` (滑入)、`typewriter` (**打字機逐字浮現**)。
* **元件強調 (`motion`)**：
  - `float` (上下漂浮)、`pulse` (心跳縮放)、`spin` (旋轉)、`wiggle` (**持續晃動強調**)、`flash` (**閃爍強調**)。

### 5. ⏳ 抗封鎖隨機抖動延遲 (Jitter Delay)
* 為了防止微軟 TTS 伺服器對頻繁發起的 WebSocket 連線進行 Rate Limit 阻擋，每次請求成功後自動加入 `3.0~4.5 秒的隨機抖動延遲`（模擬人類操作），並設有 5 次最大重試與 8.0 秒間隔的自動退避機制，極度穩定。

---

## 🛠️ 快速開始

### 1. 安裝與設定
請確保系統中已安裝 Python、Node.js 以及 FFmpeg。

```bash
# 安裝 Remotion 與相關依賴
npm install
```

### 2. 執行影片生成
將投影片圖片（如 `Slide_01.png`）與 `script.txt` 放在同一個專案資料夾（例如 `麥積山`），然後一鍵生成：

```powershell
python puti_generator.py "麥積山"
```

影片生成成功後，會自動存放於該資料夾下：`麥積山/out.mp4`！

---

## 📝 腳本配置 (script.txt) 說明

每個簡報以 `# [圖片檔名]` 分隔，格式如下：

```text
# 1_maijishan_panorama.png
[animation: zoom-in, pan: right-to-left]
[transition: zoom]
[object: main-title, type: text, content: "麥積山石窟", x: 50, y: 35, size: 54, color: "#ffffff", entrance: typewriter]
小螺：「啊，睡了千把年，一睜眼怎麼外面這麼吵啊？」菩菩：「小螺，小聲點。咱們這可是麥積山石窟呢。」
```

* `animation` / `pan`：背景圖片的 Pan & Zoom 動態。
* `transition`：頁面轉場方式（可選 `morph`, `zoom`, `fade`, `wipe` 等）。
* `object`：獨立的大字或標題物件，可指定坐標 (`x`, `y`)、進入動畫（`typewriter` 等）。
* `對白`：只要包含 `名字：「台詞」` 的格式，配音時會自動過濾人名，並為該角色朗讀對白。

---

## 🤖 AI Agent 零人工自動化工作流指南 (AI Agent Zero-Touch Guide)

如果你是讀取此 Repo 的 AI Coding Agent，你可以利用以下標準工作流，幫助使用者實現**「零手動，僅憑圖片一鍵生影片」**：

### 1. 視覺分析與劇本自動編撰
當使用者僅提供投影片圖片（如 `Slide_01.png` ~ `Slide_10.png`）而沒有 `script.txt` 腳本時，你應該：
1. **讀取圖片**：使用你的 Multimodal (視覺) 能力，依次讀取分析資料夾中的每張圖片，識別其主題、標題與內文大綱。
2. **設定 Morph 骨架**：尋找每張投影片的標題或共通物件，為其設定相同的 `[object: ID]`（例如 `[object: section-title]`），這樣在 `[transition: morph]` 時能產生流暢的平滑移動與變形。
3. **編撰雙人對話劇本**：將簡報的文字大綱改寫為生動的雙人對話格式，使用 `小螺：「台詞內容」` 與 `菩菩：「台詞內容」` 交替（這會自動分配男女聲並過濾人名前綴）。
4. **寫入 script.txt**：將生成的內容寫入該資料夾下的 `script.txt`。

### 2. 一鍵執行影片渲染
腳本寫入完成後，在目前工作目錄下執行以下命令：
```powershell
python puti_generator.py "資料夾名稱"
```

你就可以完全不需要使用者手動輸入任何腳本，直接為他交付完美的配音動效簡報影片！
