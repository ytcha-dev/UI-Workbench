# UI Workbench MVP（技術驗證版）

## 企業系統框架 · Style 01

啟動 HTTP server 後，從右上「系統框架範例」進入 `styles/enterprise/`。第一版採用深藍商務風格，預設包含簽核管理、系統管理與主檔管理。

- 可使用三層功能選單、新增模組／群組／功能頁、修改名稱與匯出框架 JSON。
- 可搜尋與分頁簽核清單、查看明細、核准／退回、批次核准及匯出 CSV。
- 角色、使用者、分類、代碼與主檔具備示範資料的新增、編輯及啟用切換。
- 功能架構在 `styles/enterprise/schema.js`，風格變數在 `tokens.css`，便於後續建立其他風格與 Workbench 轉接。

這是第一階段的互動框架，不含後端、登入、實際簽核引擎或權限執行。選單、主檔及簽核決定保存在瀏覽器；臨時新增的申請僅保留在當次頁面。點選右上使用者可還原範例。第二階段的 Workbench 編輯整合尚未實作。

這是一個可以實際操作的 **企業前端元件目錄 + Visual Builder + Code Export** 原型。

> 範圍：驗證「挑選元件 → 拖曳組合 → 編輯 Props → 配置專案依賴 → 輸出程式碼」。不是商用 Low-code 平台，也尚未處理多人協作或完整的 NPM 套件整合。

## 執行方式

**不需要 `npm install`、資料庫或後端。** 只要 Python 3，於本資料夾執行：

```powershell
python -m http.server 8000
```

然後瀏覽 `http://localhost:8000`。如果 8000 已被占用可改用 `python -m http.server 8765`。

> 請用本機 HTTP server 開啟，不要直接雙擊 `index.html`，因為 ES Module 在 `file://` 下可能受到瀏覽器限制。

## 目前完成的功能

- **元件庫**：18 種元件範本、分類與搜尋（版面／文字／表單／互動）。
- **視覺畫布**：從左側拖放到畫布，點擊新增，容器巢狀，拖放重新排列，圖層選取。
- **屬性編輯**：標籤、文字、欄位 Binding、Callback 名稱、選項、表格測試資料；Container 的 padding、gap、背景與圓角。
- **專案 Profile**：Bootstrap 5 / Tailwind CSS（原型用 browser compiler）/ 原生 CSS；Vanilla JS / Vue 3 Global。
- **外部依賴**：Tom Select（啟用並使用時才載入）；額外 CSS、JS URL 和自訂 CSS。
- **隔離預覽**：真正輸出的 HTML 載入 `sandbox="allow-scripts"` iframe 執行，不把外部 JS 注入編輯器主視窗。
- **輸出**：完整 HTML + CSS + Vanilla JS，或 Vue 3 Global 的非 `.vue` HTML；支援 Razor `@@click` 慣例。
- **儲存**：本機瀏覽器自動儲存、JSON 匯入匯出、復原／重做、HTML 下載。
- **兩份模板**：請款單查詢、客戶資料維護，以及空白畫布。

## 操作建議

1. 初次進入會看到請款單查詢 Demo。
2. 點左側「欄位」「按鈕」等元件，或拖曳到卡片／Row／雙欄容器內。
3. 點選畫布上的元件後，在右側 Inspector 編輯內容與 Callback 名稱。
4. 點右上方「專案環境」選擇 Bootstrap、Vue 3 Global、Tom Select 等依賴。
5. 點「預覽」使用隔離 iframe 查看最終渲染；再點「返回編輯」。
6. 點「查看 / 匯出程式碼」，選 Vanilla 或 Vue，下載可以獨立執行的 HTML。

## 支援／限制

| 項目 | 目前狀態 |
|---|---|
| 版面拖放／容器巢狀 | 已有基礎版本，非 Figma 式自由座標拖動 |
| 元件分類、Props、基本 CSS | 已完成 |
| 使用真正 Bootstrap 5 / Tom Select 依賴預覽 | 在有網路並允許 CDN 的環境可運作 |
| Vue 3 Global 非 `.vue` 輸出 | 已完成基礎事件、資料欄位綁定 |
| Tailwind | PoC 使用 CDN browser compiler；正式版應由 build step 產生 CSS |
| 自動掃描 .NET / Visual Studio solution | 尚未實作 |
| 套件海量匯入與任意第三方元件自動轉換 | 尚未實作；需要 Adapter 與相容性驗證 |
| DataTable | 目前只有靜態表格，不是 jQuery DataTables |
| Tom Select | 目前可在預覽和匯出頁初始化（外部 CDN 可用時） |
| Callback | 只產生對外介面，不會自動呼叫後端 API |
| 元件獨立 snippet 複製 | 目前輸出完整 HTML 範例；正式版再新增 snippet / MVC partial / 依賴 manifest |
| 自訂 CSS / JS URL | 支援完整 URL，不支援上傳本機檔案或直接解析目前專案 |

## 輸出的 Callback 如何接到專案？

例如把 Button 的 Callback 名稱設成 `onSearch`，輸出 HTML 後在初始化之前提供：

```html
<script>
  window.UIWorkbenchCallbacks = {
    onSearch: (values) => {
      console.log('請款單查詢條件', values);
      // 由你的 MVC / Web API 專案決定如何呼叫 API
    }
  };
</script>
```

這是 **API 介面示範**，不是完整業務流程。

## 安全提醒

- 匯入 JSON 會驗證元件種類、節點數量、URL 格式；但不代表可以完全信任任何外部 CSS / JS。
- Preview iframe 具 `sandbox="allow-scripts"` 且**沒有** `allow-same-origin`，用於隔離平台與預覽的 DOM／JS 執行環境。
- 若使用者在設定中新增自訂 JS URL，Preview 仍會執行該腳本，請只加入可信任的資源。企業內網使用時應建立 CSP / allowlist / 代理與離線套件庫。
- 複製到正式系統前，仍須進行 XSS、CSP、SRI、授權、可及性與相容性測試。

## 程式碼架構

```
index.html              # 三欄工作台與 Dialog
src/styles.css          # 工作台 UI + Edit Canvas 樣式
src/core.js             # Schema、元件樹、操作、程式碼生成
src/app.js              # Drag-and-drop、Inspector、視圖狀態
package.json            # npm test（使用 Node 內建測試框架）
tests/core.test.js      # 元件樹、輸出與輸入驗證測試
```

### 為什麼沒有直接選 GrapesJS？

這是**驗證產品需求**的第一版，所以先採用原生 HTML5 Drag & Drop + 自有 JSON Schema。好處是零套件安裝、可檢查完整資料流、沒有把資料格式綁死第三方編輯器。若正式驗證大規模複雜嵌套與可視化 CSS 編輯，再評估 GrapesJS、Puck、Craft 或其他引擎的替換成本。

## 測試

```powershell
npm test
```

測試不需要下載額外 NPM 套件。

## 延伸設計

請閱讀 [ARCHITECTURE.md](./ARCHITECTURE.md)，其中整理了元件 Adapter、跨框架輸出、Razor 片段模式、套件治理與未來的編輯器選型。
