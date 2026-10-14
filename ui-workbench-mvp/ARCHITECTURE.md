# UI Workbench — 架構決策與下一步

## 產品的兩個核心入口

1. **Component Hub**：可搜尋、可預覽、可下載的元件目錄，資料來源應是可版本化的 Component Registry。
2. **Visual Builder**：可拖曳與組合元件、調整樣式、設定 Binding/Callback，並匯出給既有 MVC / Razor 專案。

真正的目標不是重新創造 Bootstrap / Tailwind / Tom Select，而是使不同專案中可用的元件「能被發現、能被編輯、能被整合」。

## 現有原型架構

```text
Component Definitions (src/core.js)
       │
       ▼
Canonical JSON Component Tree ◄─── Visual Editor (src/app.js)
       │                                │
       │                                ├── Catalog
       │                                ├── Drag-and-drop
       │                                ├── Layers + Inspector
       │                                └── History / JSON persistence
       │
       ├──► Vanilla HTML + CSS + JS Generator
       │
       └──► Vue 3 Global HTML + CSS + JS Generator
                               │
                               ▼
                        Sandboxed iframe Preview
```

編輯器本身無第三方 Runtime 依賴。使用者的 Bootstrap、Vue、Tom Select、自訂 CSS/JS 僅在獨立 Preview 或最終匯出檔案載入。

## 後續最值得實驗的五件事（依優先順序）

### 1. 產生程式碼的整合模式

目前只有完整 HTML 範例。下一步應拆成：

- **Snippet**：可貼至 `.cshtml` 的 HTML 區塊（不重複宣告已存在的 CDN）。
- **Initializer**：Vanilla JS 初始化與 Callback 補接程式碼。
- **Vue Global**：適合 MVC Razor 的 `createApp` + `v-model`、`@@click`。
- **Dependencies**：顯示版本、引用路徑、相容性，使用者自己整合到 LibMan / wwwroot/lib。

### 2. 元件 Adapter 系統

可先用 Manifest 管理元件，定義：

```json
{
  "id": "tomselect",
  "adapterVersion": "1.0",
  "supportedRuntimes": ["vanilla", "vue-global"],
  "dependencies": [{"name":"tom-select", "version":"2.6.2"}],
  "props": ["label", "field", "options"],
  "events": ["onChange"],
  "renderers": ["design", "preview", "vanilla", "vue-global"]
}
```

這只是一個設計方向，尚未實作 Plugin Loader。要做海量元件，必須確保安裝、授權、版本、Registry、Renderer 與 Exporter 的責任邊界。

### 3. 元件預覽環境與真實 MVC 專案的一致性

現在 Project Profile 是使用者手動輸入 CSS/JS URL。

未來可提供「匯入 `libman.json` / `package.json` / `wwwroot` 資訊」功能；但不應讓平台任意掃描電腦磁碟或自動執行未知腳本。企業內網環境優先本地套件／經核准 CDN。

### 4. 編輯器引擎選擇

現在為原生 HTML5 DnD，只支援樹狀巢狀配置和基本 CSS，不支援自由座標、CSS Grid 自由格線、完整回應式斷點或動畫設計。如果需求確定往這些方向擴大，再評估 GrapesJS / Puck / Craft.js 等工具是否應取代目前的編輯器。

原則：**Canonical JSON 格式、輸出 Adapter 與 Editor Engine 分離**，不要讓整個平台跟單一拖拉引擎綁死。

### 5. 內部公版與治理

先保留 User Template 與 Approved Component 兩種層級。不要讓所有使用者隨意發布的元件自動進入正式共用元件庫。

- Theme / Design Token 版本化
- 組合元件審查與相容性測試
- 依賴授權確認
- 核准後才提供公司共用元件

## 不應誤解的限制

- 提供 Project Profile **不代表**已與 Visual Studio IDE 整合；它目前是獨立瀏覽器平台。
- Tailwind Browser Compiler 僅限原型，正式部署需預先編譯 CSS。
- Data Table 現階段是靜態 HTML Table，尚未接入 DataTables 套件。
- Tom Select 需要網路 CDN 可用或自行替換為內部 URL，預覽才有真正的進階選單功能。
- Vue Global 輸出已包含基本資料鍵與 Callback，但複雜元件仍需專屬 Lifecycle Adapter。
- 不保證任意第三方 JavaScript 與 Vue 或 Bootstrap 可直接相容。
