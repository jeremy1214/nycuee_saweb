# 系上活動內容維護指南

> 2026/10/29：前台預設改讀公開 API，以下 JSON 維護範例用於遷移基準與明確選用的 `VITE_ACTIVITY_SOURCE=json` 靜態模式。API 模式先依根目錄 README 執行匯入；匯入工具只初始化／比對，不覆寫資料庫已有內容。線上編輯與發布仍待 D／F。

新增活動主要是「建立一份 JSON → 放入照片 → 預覽 → 驗證與發布」。一般內容維護不用修改 React，也不用手動匯入新檔案；系統會自動讀取 `events/*.json`。

本文的 `src/`、`public/` 路徑皆以專案的 `frontend/` 為起點。正式網站更新後仍需重新建置與部署。

## 快速找到要做的事

| 我要做什麼 | 從哪裡開始 |
| --- | --- |
| 新增只有文字與連結的活動 | 下方「新增活動：照這六步做」 |
| 新增有照片的活動介紹 | 先建立活動，再看「加入照片與詳細介紹」 |
| 新增到「其他活動」輪播相簿 | 看「新增其他活動相簿」，並留意目前的測試限制 |
| 加入報名、Instagram 或粉專 | 看「加入官網、社群與報名連結」 |
| 設定多天活動 | 看「設定活動日期區間」 |
| 增加各組介紹等分頁 | 看「需要多個分頁時」 |
| 修改電機營、系露營、光舞、電機週 | 看[既有活動維護參考](EXISTING_ACTIVITIES.md) |

## 新增活動：照這六步做

### 1. 決定分類與活動 ID

先從以下現有分類選一個 `categoryId`：

| categoryId | 顯示分類 |
| --- | --- |
| `ee-camp` | 電機營 |
| `department-camping` | 系露營 |
| `ee-week` | 電機週 |
| `light-dance` | 光舞 |
| `other` | 其他活動 |

活動 `id` 使用英文小寫、數字與連字號，例如 `career-sharing`。每個活動都要有不同的 ID；發布後不要任意修改，避免舊連結失效。

同一分類可以有多個活動，不必為每個新活動新增分類。

### 2. 建立活動 JSON

在 `frontend/src/content/activities/events/` 建立 `career-sharing.json`，貼上以下完整範例：

~~~json
{
  "$schema": "../activity.schema.json",
  "id": "career-sharing",
  "status": "draft",
  "title": "職涯分享會",
  "date": "2027-01-15",
  "categoryId": "other",
  "summary": "聽學長姐分享電機領域的職涯與求職經驗。",
  "details": "活動將分享職涯選擇、求職準備與實務經驗，並安排現場交流。",
  "location": "工程四館",
  "links": []
}
~~~

日期、地點與文字都是範例，請換成實際資訊。日期或地點未確認時，直接刪除該欄位；移除開始日期時也要移除 `endDate`，不填空字串或 `null`。JSON 最後一個欄位後方不能有逗號，也不能加入註解。

這份最小範例不需照片即可使用。總覽與行事曆點擊時會開啟資訊彈窗；直接開啟活動網址仍有文字介紹頁。若想從總覽直接進入有照片的專頁，接著加入 `detail`。

也可以複製既有活動：

| 需要的形式 | 建議複製來源 | 複製後要注意 |
| --- | --- | --- |
| 簡介、雙照片與相簿 | [選課大會](../../content/activities/events/course-selection.json) | 不需要相簿時刪除 `album`；更換文字、日期與所有照片路徑 |
| 活動介紹與獨立分頁 | [電機營](../../content/activities/events/smart-ee-camp.json) | 更新 `links`、各分頁與組別內容 |
| 每頁共用簡介 | [電機週](../../content/activities/events/ee-week-showcase.json) | 保留 `introMode: "shared"`，調整 `tabs` |

複製後先改檔名、`id`、`status: "draft"`，再改內容。不要留下原活動的報名網址或社群帳號。

### 3. 加入需要的內容

依需求選填下列項目，格式見後面的對應章節：

| 欄位 | 用途 |
| --- | --- |
| `links` | 官網、Instagram、Facebook、報名表單等連結 |
| `detail` | 雙照片簡介與章節式介紹 |
| `detail.tabs` | 各組介紹等獨立分頁 |
| `album` | 「其他活動」輪播相簿；必須搭配 `detail` |

只要文字活動就不需增加其他欄位。若要出現在「其他活動」相簿，則必須完成後面的相簿設定，單填 `categoryId: "other"` 不夠。

### 4. 發布並在本機預覽

`draft` 不會出現在前台，直接開啟活動網址也會顯示 404；資料格式仍會被驗證。需要預覽時，在尚未部署的本機版本把 `status` 改成 `published`。

從專案根目錄執行：

~~~powershell
cd frontend
npm run dev
~~~

以終端機顯示的實際網址為準，開啟：

- 活動頁：`http://localhost:5173/#/activities/career-sharing`。
- 活動總覽：`http://localhost:5173/#/activities/overview`。
- 其他活動相簿：`http://localhost:5173/#/activities/other`。

檢查照片、文字、連結與小螢幕排版。預覽完若尚未準備公開，請改回 `draft`。

### 5. 驗證內容與建置

在 `frontend/` 執行：

~~~powershell
npm run validate:content
npm run build
~~~

內容驗證會檢查 ID、分類、日期、圖片檔案等；載入器也會檢查連結與分頁欄位。讀取錯誤會指出檔案或欄位位置。加入分頁或調整連結行為時，可再執行相關測試：

~~~powershell
npm test -- src/features/activities/data/activityRepository.test.ts src/features/activities/ActivityLinks.integration.test.tsx --maxWorkers=1
~~~

若新增「其他活動相簿」，先處理下方說明的既有測試限制。

### 6. 部署正式網站

確認要公開的活動為 `published`，將 JSON 與照片一併納入版本管理，依專案現有流程部署。前端建置輸出在 `frontend/dist/`；Docker 部署則依根目錄 README 的流程重新建置服務。

只修改本機 JSON 或只執行 `npm run build`，都不會自動更新遠端網站。部署後再次確認正式活動網址與外部連結。

## 設定活動日期區間

`date` 是開始日期，`endDate` 是最後一天，**開始與結束當天都包含在活動期間內**。兩個欄位放在 JSON 最外層，使用 `YYYY-MM-DD`，不可把整段區間填入 `date`。

例如宿營從 2026/9/28 到 2026/9/30：

~~~json
"date": "2026-09-28",
"endDate": "2026-09-30"
~~~

- 單日活動只填 `date`，或讓 `endDate` 與 `date` 相同；原有單日資料不用改。
- 未定日期時兩個欄位都省略；`endDate` 不可單獨存在，也不可早於 `date`。
- 可跨月、跨年。活動頁、相簿、列表與資訊彈窗會顯示日期或完整區間。
- 行事曆在活動期間每天顯示同一活動；首頁最新消息會保留仍在進行中的活動，直到最後一天結束，再按開始日期及 ID 排序取三筆。
- Google 日曆與 ICS 匯出是一筆涵蓋完整區間的全天活動。匯出格式使用「最後一天的隔天」作為不包含的結束日期，因此上述宿營匯出的結束值是 2026/10/1；活動仍只涵蓋 9/28–9/30，JSON 不要多加一天。

## 加入官網、社群與報名連結

把 `links` 放在 JSON 最外層，與 `title`、`detail` 同一層。以下是欄位片段，加入既有物件時注意逗號：

~~~json
"links": [
  { "label": "活動官方網站", "url": "https://example.com/event/" },
  { "label": "Instagram", "url": "https://www.instagram.com/你的帳號/" },
  { "label": "Facebook 粉專", "url": "https://www.facebook.com/你的粉專帳號" },
  { "label": "立即報名", "url": "https://forms.gle/你的表單代碼" }
]
~~~

請將示意網址換成實際網址。每筆只有兩個欄位：

| 欄位 | 填寫方式 |
| --- | --- |
| `label` | 想顯示的按鈕文字，例如「電機營 Instagram」 |
| `url` | 完整 `https://` 或 `http://` 網址 |

依陣列順序顯示，新增一筆就多一張卡片；刪除整筆即可移除。`links` 可省略或設為 `[]`。

系統依網域自動辨識 Instagram、Facebook 與 Google 表單，套用圖示、配色與平台名稱；一般網址顯示網站圖示及網域。Instagram 個人頁會顯示 `@帳號`。卡片包含進場、滑入、聚焦及點擊效果，並支援減少動態效果設定，不必另外填樣式欄位。

連結會另開分頁，顯示於活動簡介下方、其他活動相簿介紹，以及總覽／首頁行事曆的資訊彈窗。獨立分頁模式只在活動介紹頁顯示；共用簡介模式則每頁隨簡介顯示。

可直接參考電機營目前的設定：

~~~json
"links": [
  { "label": "電機營官方網站", "url": "https://eesa.dece.nycu.edu.tw/EECAMP/" },
  { "label": "電機營 Instagram", "url": "https://www.instagram.com/nycueecamp/" }
]
~~~

## 加入照片與詳細介紹

先放照片，再設定 JSON。以 `career-sharing` 為例：

~~~text
frontend/public/activities/career-sharing/
├─ hero-01.webp
├─ hero-02.webp
└─ section-01.webp
~~~

建議用壓縮後的 WebP 或 JPG、英文小寫檔名，保留圖片比例，不放大小圖；既有活動多採長邊最多 1600px。每張圖片填寫描述實際畫面的 `alt`。

在活動 JSON 最外層加入下列 `detail` 片段：

~~~json
"detail": {
  "eyebrow": "CAREER SHARING",
  "intro": ["第一段活動介紹。", "第二段補充說明。"],
  "heroImages": [
    { "src": "/activities/career-sharing/hero-01.webp", "alt": "學長姐在教室與同學交流職涯經驗" },
    { "src": "/activities/career-sharing/hero-02.webp", "alt": "參加職涯分享會的同學與講者合照" }
  ],
  "sections": [
    {
      "id": "schedule",
      "navLabel": "活動流程",
      "eyebrow": "SCHEDULE",
      "title": "分享與交流",
      "paragraphs": ["介紹講座內容與現場交流安排。"],
      "image": {
        "src": "/activities/career-sharing/section-01.webp",
        "alt": "講者在投影片前說明求職準備方式"
      }
    }
  ]
}
~~~

- `heroImages` 必須剛好兩張；`intro` 至少一段。
- `sections` 必須存在，但沒有補充章節時可填 `[]`；章節按陣列順序顯示。
- 每個章節的 `id` 在同一組 `sections` 中不可重複；避免使用頁面既有的 `activity-intro`、`activity-photos`。
- 章節的 `image` 可省略，顯示純文字版型；`paragraphs` 至少一段。
- 圖片 `src` 從 `/activities/` 開始，不包含 `public` 或 `frontend`，大小寫與副檔名須和實際檔案一致。
- 圖片選填 `objectPosition: "50% 35%"` 調整裁切焦點，或 `fit: "contain"` 保留簡報、海報完整畫面；一般照片使用 `cover`。
- `details` 與 `detail.intro` 是不同欄位，不會自動同步；修改介紹時請一起檢查。

## 新增其他活動相簿

最方便的方式是複製選課大會，保留 `detail` 和 `album`，更換活動 ID、內容與照片。相簿顯示條件為 `categoryId: "other"`、`status: "published"`，且同時具有 `detail` 和 `album`。

以下 `album` 放在最外層，與 `detail` 同一層：

~~~json
"album": {
  "order": 8,
  "cover": {
    "src": "/activities/career-sharing/hero-01.webp",
    "alt": "學長姐在教室與同學交流職涯經驗"
  },
  "photos": [
    {
      "src": "/activities/career-sharing/hero-01.webp",
      "alt": "學長姐在教室與同學交流職涯經驗"
    },
    {
      "src": "/activities/career-sharing/hero-02.webp",
      "alt": "參加職涯分享會的同學與講者合照"
    }
  ]
}
~~~

`order` 是非負整數，由小到大排序，同值按 ID 排序。`cover` 是相簿與首頁卡片封面，`photos` 是完整照片清單且不可為空。建議前兩張與 `detail.heroImages` 相同，文字及 `fit` 等圖片設定也保持一致。同一份 JSON 會供相簿與活動詳細頁共用。

**目前的測試限制：** [otherActivities.test.ts](data/otherActivities.test.ts) 固定檢查既有七筆活動名稱與順序，圖片也只掃描 `public/activities/other/*.webp`。新增、改名或重新排序相簿時，需同步更新預期名單；若照片放在新的活動資料夾，還需調整圖片檢查範圍。該測試另要求前兩張照片與主照片一致、替代文字長於五個字，並保留既有介紹文字的檢查。這些是目前測試的限制，不是 JSON 載入器的通用欄位規則；只改 JSON 與照片可能使 `validate:content` 失敗。

## 需要多個分頁時

在 `detail` 內新增 `tabs`。以下是放在 `detail` 物件內的片段，與 `intro`、`heroImages`、`sections` 同層：

~~~json
"tabs": [
  {
    "id": "groups",
    "navLabel": "各組介紹",
    "sections": [
      {
        "id": "activity-team",
        "navLabel": "活動組",
        "eyebrow": "ACTIVITY TEAM",
        "title": "活動組",
        "paragraphs": ["活動組的工作介紹。"]
      }
    ]
  }
]
~~~

| 模式 | 設定 | 顯示與預設入口 |
| --- | --- | --- |
| 單頁 | 不填 `tabs` | 簡介與 `detail.sections` 在同一頁，導覽按鈕捲動到章節 |
| 獨立介紹 | 有 `tabs`，`introMode` 省略或填 `"tab"` | 活動介紹是獨立頁，基本網址轉到 `/intro`；參考電機營 |
| 共用簡介 | 有 `tabs`，`introMode: "shared"` | 每頁保留簡介，基本網址與 `/intro` 都轉到第一個分頁；參考電機週 |

使用分頁時，保留必填的 `detail.sections`，不需要可填 `[]`。獨立介紹模式將它顯示於介紹頁；共用簡介模式請把內容放到各 `tabs[].sections`。

`tabs` 不可為空；分頁 ID 不可重複或使用保留的 `intro`，每頁 `sections` 至少一個章節。分頁網址為 `/#/activities/<活動id>/<分頁id>`，支援直接開啟、重新整理、返回與前進；不存在的分頁顯示 404。

## 決定活動出現在哪裡

| 位置 | 條件／操作 |
| --- | --- |
| 直接開啟活動網址 | `status: "published"`；沒有日期也能開啟 |
| 總覽「近期活動」列表 | 已發布且有 `date`；目前也包含過去日期 |
| 首頁「最新消息」 | 已發布且依台灣日期尚未結束，包含進行中活動；按開始日期、ID 排序取三筆 |
| 首頁行事曆及日曆匯出 | 已發布且有開始日期；涵蓋完整區間，包含過去月份，無日期不列入 |
| 「其他活動」相簿 | 已發布、分類為 `other`，且有 `detail` 與 `album` |
| 總覽前四個分類圓形 | 修改分類的 `featuredActivityId` 指向想展示的活動 |

日期只是排序與顯示資料，不會自動隱藏整個過期活動。要下架時設為 `archived`；如果分類入口仍指向該活動，需先調整分類入口，否則驗證會失敗。

分類資料在 [categories.json](../../content/activities/categories.json)。`featuredActivityId` 必須指向已發布、有 `detail`、且同分類的活動。`other` 圓形固定開啟相簿，不使用這個欄位切換到單一活動。

如需新分類，在 `categories` 陣列新增含 `id`、`label`、`shortLabel` 的物件；`featuredActivityId` 選填。目前分類圓形樣式只替前五項設定位置與配色，增加第六類以上需另調整 `activities.css`。這與在既有分類內新增一個活動不同。

## 常見問題

| 狀況 | 優先檢查 |
| --- | --- |
| 新增後網站找不到 | 是否仍為 `draft`？網址 ID 是否正確？正式網站是否已重新部署？ |
| 有活動頁，但總覽列表沒有 | 是否省略了 `date`？未填日期不會進入列表 |
| 結束日期驗證失敗 | 是否先填 `date`？`endDate` 是否為有效日期且不早於開始日期？ |
| 沒出現在首頁最新消息 | 日期是否已過期？是否在最近三筆以外？ |
| 「其他活動」相簿沒有新項目 | 是否同時設定 `other`、`published`、`detail`、`album`？ |
| 點卡片只出現彈窗 | 總覽／行事曆在沒有 `detail` 時使用資訊彈窗 |
| 主標題和 `title` 不同 | `other` 顯示活動名稱；其他分類的主標題使用分類名稱，`title` 顯示為副標題 |
| 圖片空白或驗證說缺圖 | 實際檔案、大小寫、副檔名、`src` 的路徑是否一致？ |
| 連結沒有出現 | `links` 是否在最外層？是否在獨立分頁的「活動介紹」頁查看？ |
| 新增相簿後測試仍要求七筆 | 需同步調整相簿內容測試的固定名單與圖片範圍 |
| 出現未知欄位錯誤 | 對照 Schema；載入器不接受任意額外欄位 |
| 封存後整站驗證失敗 | 是否仍被 `featuredActivityId` 引用？先換分類入口或移除引用 |

## 檔案索引與進一步維護

| 檔案／資料夾 | 用途 |
| --- | --- |
| [events](../../content/activities/events) | 一個活動一份 JSON，新增後自動載入 |
| [activity.schema.json](../../content/activities/activity.schema.json) | 編輯器欄位提示與格式說明 |
| [categories.json](../../content/activities/categories.json) | 分類與圓形入口 |
| `frontend/public/activities/` | 活動照片實體檔案 |
| [activityTypes.ts](activityTypes.ts) | 頁面使用的資料型別 |
| [activityRepository.ts](data/activityRepository.ts) | 內容解析、驗證與發布篩選 |
| [ActivityDetailPage.tsx](ActivityDetailPage.tsx) | 共用活動詳細頁 |
| [ActivityLinks.tsx](components/ActivityLinks.tsx) | 外部連結卡片與平台辨識 |
| [EXISTING_ACTIVITIES.md](EXISTING_ACTIVITIES.md) | 既有活動配置、照片來源與歷史紀錄 |

`$schema` 請保留 `"../activity.schema.json"`，支援 JSON Schema 的編輯器就能提供提示。所有活動內容（包含草稿與封存）都必須符合資料格式；只有已發布活動會輸出到前台。

改動 React、導覽、分頁或互動行為時，另執行完整 `npm test -- --maxWorkers=1`，並檢查桌面與手機、分頁切換及直接網址。
