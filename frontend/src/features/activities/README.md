# 系上活動內容維護指南

活動頁採「JSON 內容、資料驗證、React 顯示」三層設計。一般更新只需修改 JSON 與圖片，不必碰 React 元件；新增活動 JSON 後，Vite 會自動載入，不需要另外加入 `import`。

## 檔案分工

```text
src/content/activities/
├─ categories.json                 # 分類、顯示名稱與分類入口連結
├─ categories.schema.json          # 分類 JSON 編輯提示
├─ activity.schema.json            # 活動 JSON 編輯提示
└─ events/                         # 一個活動一個 JSON
   ├─ smart-ee-camp.json
   ├─ department-camping-night.json
   └─ ...

src/features/activities/
├─ data/activityRepository.ts      # 自動載入、驗證、發布狀態與分類名稱轉換
├─ data/activities.ts              # 對元件提供穩定的匯出入口
├─ activityTypes.ts                # React 使用的資料型別
├─ ActivitiesPage.tsx              # 活動總覽
├─ ActivityDetailPage.tsx          # 共用詳細頁版型
└─ activities.css                  # 總覽與詳細頁樣式
```

## 修改既有活動

開啟 `src/content/activities/events/` 中對應的 JSON：

- `id`：永久識別值，也是網址的一部分；上線後不要隨意修改。
- `status`：`draft`、`published` 或 `archived`。只有 `published` 會出現在網站。
- `title`：卡片及詳細頁副標題。
- `date`：使用 `YYYY-MM-DD`，總覽會自動依日期排序。
- `categoryId`：必須對應 `categories.json` 的分類 `id`。
- `summary`：總覽卡片摘要。
- `details`：沒有獨立專頁時，顯示於彈窗的完整介紹。
- `location`：活動地點。
- `detail`：選填；存在時卡片會連到獨立詳細頁，省略時維持彈窗。

JSON 最上方的 `$schema` 會讓支援 JSON Schema 的編輯器提示欄位及格式錯誤。請保留：

```json
"$schema": "../activity.schema.json"
```

## 新增活動

1. 複製 `src/content/activities/events/student-community-day.json`。
2. 將檔名與 `id` 改成相同的英文小寫連字號格式，例如 `example-event.json` 與 `example-event`。
3. 更新日期、分類、文字及地點。
4. 編輯期間使用 `"status": "draft"`；確認後改成 `"published"`。
5. 執行 `npm run validate:content`。

只有總覽卡片及彈窗的最小範例：

```json
{
  "$schema": "../activity.schema.json",
  "id": "example-event",
  "status": "draft",
  "title": "活動名稱",
  "date": "2027-01-15",
  "categoryId": "other",
  "summary": "顯示於活動卡片的摘要。",
  "details": "點擊卡片後顯示的完整介紹。",
  "location": "活動地點"
}
```

不需要在 TypeScript 中匯入新檔案；`activityRepository.ts` 會自動掃描 `events/*.json`。

## 建立或修改詳細頁

在活動 JSON 加入 `detail`：

```json
"detail": {
  "eyebrow": "EVENT NAME · SHORT MESSAGE",
  "intro": ["第一段活動介紹。", "第二段補充說明。"],
  "heroImages": [
    { "src": "/activities/example-event/hero-01.webp", "alt": "第一張照片描述" },
    { "src": "/activities/example-event/hero-02.webp", "alt": "第二張照片描述" }
  ],
  "sections": [
    {
      "id": "first-section",
      "navLabel": "章節名稱",
      "eyebrow": "SECTION LABEL",
      "title": "章節標題",
      "paragraphs": ["章節第一段。", "章節第二段。"],
      "image": {
        "src": "/activities/example-event/section-01.webp",
        "alt": "章節照片描述",
        "objectPosition": "50% 35%"
      }
    }
  ]
}
```

- `heroImages` 固定兩張。
- `sections` 可自由增減、排序；導覽按鈕、圖文順序與編號會自動更新。
- 每個 section 的 `id` 在同一活動內不可重複。
- `objectPosition` 選填，可調整照片在裁切框中的焦點，例如 `center top` 或 `50% 35%`。

若要讓總覽的大型分類圓形直接連到這個詳細頁，請在 `categories.json` 的對應分類設定：

```json
"featuredActivityId": "example-event"
```

系統會檢查該活動已發布、有詳細內容，而且屬於同一分類。

## 圖片管理

既有共用圖片保留在 `public/intro/activities/`。新活動建議使用獨立資料夾：

```text
public/activities/<activity-id>/hero-01.webp
public/activities/<activity-id>/hero-02.webp
public/activities/<activity-id>/section-01.webp
```

JSON 路徑從 `/activities/` 開始，不包含 `public`。建議使用至少 1600 × 1000 px 的橫式 WebP 或 JPG；每張圖都要有描述畫面內容的 `alt`，檔名只使用英文小寫、數字及連字號。

## 新增或調整分類

只需編輯 `src/content/activities/categories.json`：

```json
{
  "id": "new-category",
  "label": "新分類",
  "shortLabel": "NEW CATEGORY",
  "featuredActivityId": "example-event"
}
```

`id` 是程式與網址使用的穩定值；`label` 可日後修改顯示文字。`featuredActivityId` 選填：有設定時分類圓形前往詳細頁，沒有設定時作為篩選按鈕。

分類圓形目前針對前五個項目設計位置與顏色。增加第六類以上時，仍需在 `activities.css` 補上版面位置或改用新的排列方式。

## 驗證與發布

在 `frontend` 資料夾執行：

```powershell
npm run validate:content
npm test
npm run build
```

載入器會在測試及建置時檢查：重複或不合法的 id、日期格式、未知分類、圖片路徑與替代文字、重複章節，以及錯誤的 `featuredActivityId`。錯誤訊息會指出 JSON 檔案與欄位位置。

JSON 會被打包到前端，更新內容後仍需重新建置與部署。若未來改接 CMS 或 API，只要讓新的資料來源輸出相同的 `ActivityItem` 格式，React 頁面可保持不變；`activityRepository.ts` 就是預留的資料來源邊界。
