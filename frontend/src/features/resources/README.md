# 學習資料內容維護指南

學習資料沿用活動的「JSON 內容、資料驗證、React 顯示」三層設計。一般更新只需編輯 JSON；新增分類不必增加 TypeScript 匯入或修改元件。

## 檔案分工

```text
frontend/src/content/resources/
├─ categories.json                # 預設分類、名稱、搜尋摘要與顯示順序
├─ categories.schema.json         # 分類設定的編輯器提示
├─ resource.schema.json           # 分類內容的編輯器提示
└─ pages/                         # 一個分類一個 JSON，自動載入
   ├─ courses.json
   ├─ scholarships.json
   ├─ exchange.json
   └─ graduate.json
```

`features/resources/data/resourceRepository.ts` 使用 Vite 自動載入；`resourceContent.ts` 負責驗證與發布狀態篩選；`data/resources.ts` 提供穩定的元件資料入口。頁籤、網站選單與搜尋都使用同一份已發布分類。

## 修改現有內容

在 `pages/` 找到對應分類：

- `id`：與檔名、分類設定的 `id` 相同，使用英文小寫、數字和連字號；它也是網址的一部分，上線後不要隨意更名。
- `status`：`draft`、`published`、`archived`，只有 `published` 顯示在頁籤、選單與搜尋。草稿與封存仍須通過資料驗證，勿放入敏感內容；它們不是存取控制功能。
- `links`：至少一筆，依陣列順序顯示官方連結。每筆填入 `label`、`description`、完整的 HTTP／HTTPS `href`；連結固定在頁面最上方，桌面每列三張、手機每列一張。
- `sections`：選填；省略或填 `[]` 時只顯示官方入口。可新增、刪除、排序多組流程和清單，沒有固定的區塊、步驟或清單項目數量。

保留 `$schema` 可取得支援 JSON Schema 編輯器的欄位提示。內容以純文字呈現，不接受 HTML，也沒有圖片、附件或一般文章區塊。

### 流程區塊

```json
{
  "id": "preparation",
  "type": "process",
  "title": "準備流程",
  "items": [
    { "title": "確認規定", "description": "先閱讀官方公告。" },
    { "title": "完成準備", "description": "依官方要求備妥資料。" }
  ]
}
```

流程沿用深藍底色，編號自動產生；桌面每列最多四步、平板兩步、手機一步，換列時不跨列連線。

### 清單區塊

```json
{
  "id": "documents",
  "type": "checklist",
  "title": "文件清單",
  "items": ["申請表", "在學證明"]
}
```

清單沿用淺綠底色。每個區塊的 `id` 必須在同一分類內唯一；每個區塊至少一個項目。不同分類可重複使用相同區塊 `id`。

## 新增分類

1. 在 `categories.json` 的 `categories` 陣列加入一筆設定；陣列順序就是頁籤、選單與搜尋的順序：

```json
{
  "id": "new-category",
  "label": "新分類",
  "searchDescription": "這個分類提供哪些官方資訊。"
}
```

2. 在 `pages/` 建立同名的 `new-category.json`，可複製以下最小範例。範例只供複製，不會自動出現在正式網站：

```json
{
  "$schema": "../resource.schema.json",
  "id": "new-category",
  "status": "draft",
  "links": [
    {
      "label": "官方資訊入口",
      "description": "前往官方網站查詢。",
      "href": "https://www.nycu.edu.tw/"
    }
  ],
  "sections": []
}
```

3. 按需要加入流程／清單，執行內容驗證，確認後將 `status` 改為 `published`。
4. 新分類會自動出現在頁籤、網站選單與搜尋，網址為 `/#/resources/new-category`。分類很多時頁籤可橫向捲動，支援方向鍵、Home 與 End。

所有分類設定都必須有對應內容檔，所有內容檔也必須登記分類。識別碼和顯示名稱不可重複，禁止不認識的欄位以避免拼字錯誤。

## 預設分類與封存

`categories.json` 的 `defaultCategory` 目前是 `courses`。必須指向已發布分類，且至少保留一個已發布分類；如要封存預設分類，請先修改預設值。

直接前往 `/#/resources`、不存在的分類或未發布分類時，會導向設定的預設分類。現有四個網址不變：`courses`、`scholarships`、`exchange`、`graduate`。

封存時只改 `status`，可保留資料供日後重新發布；永久刪除時需同時刪掉分類設定與內容檔。分類網址與狀態變更後請檢查導覽與既有連結。

## 驗證與部署

在 `frontend` 資料夾執行：

```powershell
npm run validate:content
npm test -- --maxWorkers=1
npm run build
```

JSON Schema 提供編輯提示；執行時驗證也會在測試與建置階段檢查必要欄位、重複 id、檔名對應、發布狀態、預設分類、區塊種類、項目與網址。錯誤訊息包含來源檔案及欄位位置。網址驗證只檢查格式，不會連線判斷網站是否可用。

現有四個分類與 12 個官方連結已完整搬移。測試另用隔離的測試資料驗證第五分類、第四連結、多組區塊、草稿與封存；正式內容沒有新增示意分類。

內容會被打包進前端，修改 JSON 後仍需重新建置部署。本次不含管理後台、CMS 或 API；日後更換來源可維持相同的 `ResourceCategory` 格式與元件。
