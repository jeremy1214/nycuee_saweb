# 既有活動維護參考

新增活動請先閱讀[系上活動內容維護指南](README.md)。本文件保留既有活動的分頁配置、照片來源及轉檔紀錄；其中的本機舊站路徑是歷史來源，不是新增活動的必要檔案。

## 電機營內容維護

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

## 系露營內容維護

系露營使用獨立介紹模式，導覽依序為活動介紹、各組介紹，沿用本站膠囊導覽、雙照片簡介與各組圖文交錯版型；手機版改為上下排列。

| 分頁 | 實際網址 | 內容來源 |
| --- | --- | --- |
| 活動介紹 | `/#/activities/department-camping-night/intro` | `detail.intro`、`detail.heroImages`：大一共同籌辦營隊、與學長姐交流的介紹 |
| 各組介紹 | `/#/activities/department-camping-night/groups` | `detail.tabs` 中 `id: "groups"` 的 `sections`：活動組、場美組、美公組 |

- 修改文字時編輯 `src/content/activities/events/department-camping-night.json`；`detail.sections` 保持 `[]`，三組放在 `groups` 分頁。
- 基本網址 `/#/activities/department-camping-night` 自動導向 `intro`；各頁可直接開啟、重新整理及返回／前進，切換時回到頁首。不支援的分頁顯示 404。
- 文字參考舊網站 `D:/Coding/eesa-web/frontend/src/page/activities/SiloCamp.jsx`；照片取自同目錄的 `imgae/siloPic/`，保存於 `public/activities/department-camping/`。
- 五張 WebP 的長邊最多 1600px、品質 82，不放大小圖：`intro-01.webp`、`intro-02.webp` 對應原本兩張活動介紹照片；`group-activity.webp` 對應 `活動照片_1.jpg`；`group-scenography.webp` 對應 `場美照片_1.jpg`；`group-public-relations.webp` 對應 `美公照片_2.jpg`。替代文字描述實際畫面。

## 光舞內容維護

光舞使用 `introMode: "tab"`，沿用電機營的獨立介紹與圖文交錯版型，分為「活動介紹」與「各組介紹」。基本網址 `/#/activities/light-dance-workshop` 自動導向 `/intro`；四組介紹位於 `/#/activities/light-dance-workshop/groups`，依序為系統組、軟體組、服裝與表演組、宣傳組。

- 文字編輯 `src/content/activities/events/light-dance-workshop.json`，參考舊網站 `LightDance.jsx`；活動 id 保持不變。標題與摘要採團隊介紹，日期與地點仍為原有示意資料。
- 六張 JPG 複製自舊站 `imgae/lightDancePic/`，存於 `public/activities/light-dance/`。`intro-01.jpg`、`intro-02.jpg` 對應活動介紹照片 1、2；`group-system.jpg`、`group-software.jpg`、`group-performance.jpg`、`group-publicity.jpg` 分別對應系統、軟體、服裝、宣傳照片 1。宣傳圖片為圖案，替代文字描述實際畫面。
- 光舞分類的 `featuredActivityId` 指向此活動；分類圓形與近期活動卡片皆連到詳細頁。

## 電機週內容維護

電機週使用 `introMode: "shared"`，分頁依序為 `groups`（各組介紹，六組）、`events`（細項活動，八項）及 `performances`（電夜表演，六項）。文字參考舊網站 `EEweek_2.jsx`、`EEweek.jsx` 與 `EEweek_1.jsx`，移除年度限定條件；照片取自 `imgae/eeWeek`，使用每項一張對應照片，簡介共用 Open Lab 與光舞照片。圖片存於 `public/activities/ee-week/`，轉為 WebP，長邊最多 1600px、品質 82；無對應照片的活動只顯示文字。

| 分頁 | 實際網址 | 章節 |
| --- | --- | --- |
| 各組介紹 | `/#/activities/ee-week-showcase/groups` | 公關部、宣傳部、課學部、活動部、場器部、Open Lab |
| 細項活動 | `/#/activities/ee-week-showcase/events` | 擺攤、圓桌分享、Open Lab、企業參訪、麻將大賽、電競比賽、人氣王、養樂多大賽 |
| 電夜表演 | `/#/activities/ee-week-showcase/performances` | 儀隊、光球、光棍、光舞、樂團、長劇 |

維護電機週時修改 `events/ee-week-showcase.json`；保持 `tabs` 順序即可維持「各組介紹」為預設入口。共用簡介使用 `intro` 與 `heroImages`，`detail.sections` 保持 `[]`，各頁章節分別放在對應的 `tabs[].sections`。

## 其他活動相簿

`/#/activities/other` 保留原本相簿，由活動總覽「其他活動」圓形進入；原有 `overview?category=other` 篩選網址仍可使用。每個活動也能直接開啟 `/#/activities/<id>`，或從相簿介紹中的「查看活動詳細頁」進入。

- 每個活動都放在 `src/content/activities/events/<id>.json`，由共用載入器驗證；相簿與詳細頁共用同一份文字與照片，沒有額外的相簿內容 JSON。
- 現有七個活動依序為選課大會、破冰大會、分家大會、新生晚會、宿營、系烤、小畢典。`categoryId` 設為 `other`，`status` 設為 `published` 才會顯示；草稿與封存項目不會出現在相簿或詳細頁。
- `detail.intro` 是活動介紹，`detail.heroImages` 是兩張主照片，`detail.sections` 放組別介紹；宿營保留五組，一般活動填 `[]`，不必建立分頁。
- `album.order` 為非負整數，由小到大排序，同值時依 ID 排序。`album.cover` 是輪播與首頁卡片封面，`album.photos` 是相簿及詳細頁完整照片清單，不可為空。
- 圖片共用 `src`、`alt`，可選填 `objectPosition` 與 `fit: "cover" | "contain"`；選課簡報用 `contain` 保留完整畫面。現有照片仍位於 `public/activities/other/`。
- 相簿保留自動輪播、暫停、左右方向鍵、觸控切換及減少動態效果支援；切換活動會同步更新介紹、照片、組別與詳細頁連結。

新增其他活動相簿時，請先閱讀主指南的「新增其他活動相簿」與「常見問題」；目前測試仍有固定七筆活動與圖片範圍的限制。
