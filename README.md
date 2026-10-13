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
- 系上活動：`/#/activities/overview`、`/#/activities/<活動id>`
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
目前已完成 24 項測試與 TypeScript／Vite 正式建置，並檢查首頁、系學會部門及系隊頁面的瀏覽器操作。
