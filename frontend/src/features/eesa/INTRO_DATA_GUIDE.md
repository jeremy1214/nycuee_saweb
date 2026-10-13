# 系學會內容維護

## 檔案位置

- 總覽：`src/content/eesa/overview.json`
- 部門：`src/content/eesa/departments/<id>.json`
- 圖片：`public/intro/`、`public/intro/activities/`
- 共用聯絡與社群資訊：`src/shared/data/site.ts`

## 部門欄位

- `id`：穩定的網址識別，例如 `operation`；連結為 `/eesa/operation`。
- `order`：卡片排列順序，由小到大。
- `title`：部門中文名稱，也是入口卡片的標題。
- `nameEn`：卡片上的英文名稱。
- `cardImage`、`cardDescription`：入口卡片圖片及摘要。
- `bannerImage`、`groupPhotoImage`：部門橫幅及合照。
- `introParagraphs`：每段簡介各放一個字串。
- `memberDescription`：部員名單介紹。
- `extraSidebarItems`：額外側邊選單的 `label`、`to`；不要重複放部門介紹及部門活動。
- `activities`：活動的 `slug`、`name`、`image`、`description`，可選擇加 `detailImages`；陣列順序決定列表及上一篇／下一篇。
- `skills`：`mainTitle`、`subTitle`、`items`（每項 `title`、`content`）。
- `experiences`：每篇的 `id`、`title`、`images`、`content`；陣列順序決定體驗談切換。

## 新增內容

複製對應部門檔案，保留所需欄位並修改 `id`、`order` 及文字。載入器會自動收集該目錄中的 JSON，不需修改 React 的 import。
新增活動時，將資料加入該部門的 `activities`；網址會成為 `/eesa/<部門id>/activities/<活動slug>`。

圖片路徑從 `/intro/` 開始，不能包含 `public/`。未提供的文字或照片保留預留區，不以其他資料冒充。
內容隨前端打包，更新後須重新部署才能出現在正式網站。
