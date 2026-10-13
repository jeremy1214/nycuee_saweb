# 陽明交大電機系網站

使用 Vite、React 19、TypeScript 及 Hash Router 的前端網站，包含首頁、系學會、系上活動、系隊、學習資料與聯絡頁。

## 本機開啟

需安裝符合 Vite 7 要求的 Node.js（20.19+ 或 22.12+）。

```bash
cd frontend
npm ci
npm run dev
```

依終端機顯示的網址開啟網站，預設為 `http://127.0.0.1:5173/#/`。

## 網址

- 首頁：`/#/`
- 系學會：`/#/eesa`、`/#/eesa/<部門id>`
- 系上活動：`/#/activities/overview`、`/#/activities/<活動id>`、`/#/activities/<活動id>/<分頁id>`
- 系隊：`/#/team`、`/#/team/<隊伍id>`
- 學習資料：`/#/resources/courses`、`scholarships`、`exchange`、`graduate`
- 聯絡我們：`/#/contact`

## 原始碼與內容

原始碼分工請見 [frontend/src/README.md](frontend/src/README.md)。

- `shared/components`：跨功能共用的版面及介面元件。
- `shared/data`：全站導覽、搜尋及聯絡資訊。
- `shared/pages`：404 等全站頁面。
- `shared/hooks`：輪播等跨功能互動。
- `features`：各功能的頁面、components、data、型別及樣式。
- `content`：活動、系學會、系隊等可單獨編輯的 JSON。

功能維護說明：

- [首頁](frontend/src/features/home/README.md)
- [系學會](frontend/src/features/eesa/README.md)
- [系上活動](frontend/src/features/activities/README.md)
- [系隊](frontend/src/features/teams/README.md)
- [學習資料](frontend/src/features/resources/README.md)
- [聯絡頁](frontend/src/features/contact/README.md)

## 活動詳細頁與分頁

活動內容由 `frontend/src/content/activities/events/` 的 JSON 管理，照片放在 `frontend/public/activities/`。新增或更新內容後需重新建置與部署。

電機週每頁依序顯示共用簡介、三個分頁按鈕與該頁內容，保留本站青綠色導覽及圖文版型：

| 分頁 | 網址 | 內容 |
| --- | --- | --- |
| 各組介紹 | `/#/activities/ee-week-showcase/groups` | 公關部、宣傳部、課學部、活動部、場器部、Open Lab |
| 細項活動 | `/#/activities/ee-week-showcase/events` | 擺攤、圓桌分享、Open Lab、企業參訪、麻將大賽、電競比賽、人氣王、養樂多大賽 |
| 電夜表演 | `/#/activities/ee-week-showcase/performances` | 儀隊、光球、光棍、光舞、樂團、長劇 |

電機週基本網址及 `/intro` 會導向「各組介紹」。各分頁支援直接開啟、重新整理、瀏覽器返回與前進，切換時回到頁首。

- `detail.tabs` 定義分頁順序與內容；`detail.introMode` 省略或設為 `tab` 時，活動介紹維持獨立分頁。
- 電機週使用 `introMode: "shared"`，每頁顯示共用簡介，導覽只列三個內容分頁。
- 章節 `image` 可省略，缺照片時顯示單欄文字，不留下圖片框。
- 電機週照片位於 `frontend/public/activities/ee-week/`，14 張 WebP 總大小約 1.67 MB，長邊最多 1600px、品質 82。
- 電機營維持 `intro`、`groups`、`practice` 三頁；未設定分頁的活動使用單頁章節導覽。

欄位格式、內容來源與圖片維護方式請見[系上活動維護指南](frontend/src/features/activities/README.md)。

## Google 日曆

首頁行事曆可下載全部活動的 ICS 檔案，再到 Google 日曆選取檔案和目標日曆完成匯入。單一活動可直接開啟預填的 Google 新增活動畫面。目前活動只有日期，匯入為全天活動；匯入後不會自動同步。

## 聯絡表單

參考 `frontend/.env.example` 設定 `VITE_CONTACT_FORM_ENDPOINT`。未設定時，頁面提供直接寄信方式；設定後會以 JSON POST 傳送表單資料。

## 開發指令

```bash
cd frontend
npm test
npm run validate:content
npm run build
```

Hash Router 可部署至一般靜態空間；建置結果位於 `frontend/dist/`。不要提交 `node_modules/` 或 `dist/`。
測試涵蓋全站主要操作、活動內容驗證、分頁轉址與內容隔離、共用簡介、無照片章節，以及返回／前進與捲動重設。版面更新後應另外檢查桌面與手機的圖片裁切、導覽與水平溢出。

若平行測試因資源競爭而逾時，可使用單一工作程序執行：

```bash
npm test -- --maxWorkers=1
```
