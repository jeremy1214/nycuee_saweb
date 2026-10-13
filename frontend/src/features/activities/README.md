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
   ├─ ee-week-showcase.json
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
- 每個 section 的 `id` 在同一組 `sections` 內不可重複；不同分頁可使用相同 id。
- 章節 `image` 選填，省略時顯示單欄文字；`heroImages` 仍須提供兩張圖片。
- `objectPosition` 選填，可調整照片在裁切框中的焦點，例如 `center top` 或 `50% 35%`。

### 獨立分頁

若介紹內容需要分頁，可在 `detail` 加入選填的 `tabs`。預設模式（`introMode` 省略或設為 `tab`）的活動介紹使用既有 `intro` 與 `heroImages`，網址為 `/activities/<activity-id>/intro`；`detail.sections` 則作為介紹頁下方的補充章節，不需要時填入 `[]`。每頁共用簡介的 `shared` 模式見下一節。

```json
"tabs": [
  {
    "id": "groups",
    "navLabel": "各組介紹",
    "sections": [
      {
        "id": "recruitment",
        "navLabel": "招生",
        "eyebrow": "RECRUITMENT",
        "title": "招生",
        "paragraphs": ["招生組的工作介紹。"],
        "image": {
          "src": "/activities/example-event/group-recruitment.jpg",
          "alt": "招生組活動照片"
        }
      }
    ]
  }
]
```

- 預設模式的 `tabs` 依陣列順序顯示在活動介紹按鈕之後；每頁只顯示自己的內容。
- 分頁網址為 `/activities/<activity-id>/<tab-id>`，可直接分享與重新整理，支援瀏覽器返回及前進；網站使用 HashRouter，實際網址帶有 `#/` 前綴。
- 預設模式有 `tabs` 時，原本 `/activities/<activity-id>` 會自動導向 `intro`。兩種模式切換分頁時都會回到頁首。
- `tabs` 必須非空，分頁 `id` 不可重複，且不可使用保留的 `intro`；每頁 `sections` 必須非空，章節格式與原本相同，章節 `id` 在同一分頁內不可重複。
- 沒有 `tabs` 的活動維持原本的單頁章節捲動方式；不存在的分頁顯示 404。

### 電機營內容維護

電機營使用預設的獨立介紹模式，導覽依序為活動介紹、各組介紹、共練介紹，位於標題下方並標示目前所在分頁。

| 分頁 | 實際網址 | 內容來源 |
| --- | --- | --- |
| 活動介紹 | `/#/activities/smart-ee-camp/intro` | `detail.intro`、`detail.heroImages` |
| 各組介紹 | `/#/activities/smart-ee-camp/groups` | `detail.tabs` 中 `id: "groups"` 的 `sections`：招生、活動、課程、場器、美宣、生活 |
| 共練介紹 | `/#/activities/smart-ee-camp/practice` | `detail.tabs` 中 `id: "practice"` 的 `sections`：火球、火棍、香扇、小旗、蛇舞 |

- 修改文字時編輯 `src/content/activities/events/smart-ee-camp.json`，`detail.sections` 保持 `[]`，各組與共練放入對應分頁的 `sections`。
- 基本網址 `/#/activities/smart-ee-camp` 自動導向 `intro`；不存在的分頁顯示 404。每次只顯示該分頁內容，支援直接開啟、重新整理、返回／前進及切換回到頁首。
- 照片位於 `public/activities/smart-ee-camp/`：`intro-01.jpg`、`intro-02.jpg` 為介紹照片；`group-*.jpg` 為六組代表照片；`practice-*.jpg` 為五項共練代表照片。
- 文字參考舊網站 `D:/Coding/eesa-web/frontend/src/page/activities/EEcampNew.jsx`，照片取自同目錄的 `imgae/eeCampPic/`，未加入歷屆限定資訊。
- 共 13 張 JPG，總大小約 2.76 MB，長邊最多 1600px、品質 84，不放大小圖；舊網站原圖保留。更換照片時更新 JSON 的 `image.src` 或 `heroImages`，並提供符合實際畫面的 `alt`。

版面沿用本站配色及膠囊導覽，活動介紹搭配雙照片，各組與共練在桌機交錯排列、手機上下排列。

### 系露營內容維護

系露營使用獨立介紹模式，導覽依序為活動介紹、各組介紹，沿用本站膠囊導覽、雙照片簡介與各組圖文交錯版型；手機版改為上下排列。

| 分頁 | 實際網址 | 內容來源 |
| --- | --- | --- |
| 活動介紹 | `/#/activities/department-camping-night/intro` | `detail.intro`、`detail.heroImages`：大一共同籌辦營隊、與學長姐交流的介紹 |
| 各組介紹 | `/#/activities/department-camping-night/groups` | `detail.tabs` 中 `id: "groups"` 的 `sections`：活動組、場美組、美公組 |

- 修改文字時編輯 `src/content/activities/events/department-camping-night.json`；`detail.sections` 保持 `[]`，三組放在 `groups` 分頁。
- 基本網址 `/#/activities/department-camping-night` 自動導向 `intro`；各頁可直接開啟、重新整理及返回／前進，切換時回到頁首。不支援的分頁顯示 404。
- 文字參考舊網站 `D:/Coding/eesa-web/frontend/src/page/activities/SiloCamp.jsx`；照片取自同目錄的 `imgae/siloPic/`，保存於 `public/activities/department-camping/`。
- 五張 WebP 的長邊最多 1600px、品質 82，不放大小圖：`intro-01.webp`、`intro-02.webp` 對應原本兩張活動介紹照片；`group-activity.webp` 對應 `活動照片_1.jpg`；`group-scenography.webp` 對應 `場美照片_1.jpg`；`group-public-relations.webp` 對應 `美公照片_2.jpg`。替代文字描述實際畫面。

### 光舞內容維護

光舞使用 `introMode: "tab"`，沿用電機營的獨立介紹與圖文交錯版型，分為「活動介紹」與「各組介紹」。基本網址 `/#/activities/light-dance-workshop` 自動導向 `/intro`；四組介紹位於 `/#/activities/light-dance-workshop/groups`，依序為系統組、軟體組、服裝與表演組、宣傳組。

- 文字編輯 `src/content/activities/events/light-dance-workshop.json`，參考舊網站 `LightDance.jsx`；活動 id 保持不變。標題與摘要採團隊介紹，日期與地點仍為原有示意資料。
- 六張 JPG 複製自舊站 `imgae/lightDancePic/`，存於 `public/activities/light-dance/`。`intro-01.jpg`、`intro-02.jpg` 對應活動介紹照片 1、2；`group-system.jpg`、`group-software.jpg`、`group-performance.jpg`、`group-publicity.jpg` 分別對應系統、軟體、服裝、宣傳照片 1。宣傳圖片為圖案，替代文字描述實際畫面。
- 光舞分類的 `featuredActivityId` 指向此活動；分類圓形與近期活動卡片皆連到詳細頁。

### 共用簡介與無照片章節

- `detail.introMode` 選填，可使用 `tab` 或 `shared`；未設定時維持既有行為。
- `shared` 必須搭配非空的 `tabs`。每頁依序呈現共用簡介、分頁導覽及該頁章節，導覽只列 `tabs`，不另設「活動介紹」分頁。
- 共用簡介模式的活動基本網址及 `/intro` 會導向 `tabs` 的第一頁；不支援的分頁維持 404。
- 章節 `image` 可省略，省略時使用單欄文字版型，不產生圖片框。若提供圖片，仍須包含有效的 `src` 和 `alt`。

電機週使用 `introMode: "shared"`，分頁依序為 `groups`（各組介紹，六組）、`events`（細項活動，八項）及 `performances`（電夜表演，六項）。文字參考舊網站 `EEweek_2.jsx`、`EEweek.jsx` 與 `EEweek_1.jsx`，移除年度限定條件；照片取自 `imgae/eeWeek`，使用每項一張對應照片，簡介共用 Open Lab 與光舞照片。圖片存於 `public/activities/ee-week/`，轉為 WebP，長邊最多 1600px、品質 82；無對應照片的活動只顯示文字。

| 分頁 | 實際網址 | 章節 |
| --- | --- | --- |
| 各組介紹 | `/#/activities/ee-week-showcase/groups` | 公關部、宣傳部、課學部、活動部、場器部、Open Lab |
| 細項活動 | `/#/activities/ee-week-showcase/events` | 擺攤、圓桌分享、Open Lab、企業參訪、麻將大賽、電競比賽、人氣王、養樂多大賽 |
| 電夜表演 | `/#/activities/ee-week-showcase/performances` | 儀隊、光球、光棍、光舞、樂團、長劇 |

維護電機週時修改 `events/ee-week-showcase.json`；保持 `tabs` 順序即可維持「各組介紹」為預設入口。共用簡介使用 `intro` 與 `heroImages`，`detail.sections` 保持 `[]`，各頁章節分別放在對應的 `tabs[].sections`。

### 分類入口

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

JSON 路徑從 `/activities/` 開始，不包含 `public`。建議使用橫式 WebP 或 JPG，保留比例並壓縮至合適尺寸；電機週採長邊最多 1600px、WebP 品質 82，不放大較小的原圖。每張圖都要有描述實際畫面內容的 `alt`，例如團隊合照、器材或練習場景；檔名只使用英文小寫、數字及連字號。

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

載入器會在測試及建置時檢查：重複或不合法的 id、日期格式、未知分類、圖片路徑與替代文字、重複章節、分頁資料、`introMode` 合法值與 `shared` 必須搭配分頁，以及錯誤的 `featuredActivityId`。內容測試也會確認所有已提供的詳細頁圖片存在於 `public`。錯誤訊息會指出 JSON 檔案與欄位位置。

分頁變更還需確認預設入口與 `/intro` 轉址、直接開啟及重新整理、目前分頁標示、返回／前進、切換回到頁首、各頁內容隔離，以及未知分頁的 404。桌面與手機皆應檢查圖片裁切、無照片章節與導覽是否正常。

若完整測試平行執行時因資源競爭逾時，可改用 `npm test -- --maxWorkers=1`。

JSON 會被打包到前端，更新內容後仍需重新建置與部署。若未來改接 CMS 或 API，只要讓新的資料來源輸出相同的 `ActivityItem` 格式，React 頁面可保持不變；`activityRepository.ts` 就是預留的資料來源邊界。
