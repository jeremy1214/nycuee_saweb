# 陽明交大電機系網站

以 Vite、React 與 TypeScript 製作的電機系網站前端。網站延續深藍、青綠的視覺風格，提供首頁焦點資訊、系上活動總覽、系隊介紹、學習資源與聯絡問題提交頁面。

## 首頁與主要入口

首頁依照 `/home/yoei/Downloads/test.html` 的深藍／青綠視覺稿製作，保留輪播、三欄消息、四個入口、行事曆與頁尾。輪播使用從 `eesa-web` 選出的六張活動、課程與畢業照片。
四個入口在桌面為四欄、窄螢幕為兩欄，依序為系學會、系上活動、系隊、學習資料。點選標題會進入主頁，滑鼠移入或鍵盤聚焦可展開內容連結；系隊選單先顯示五支隊伍，按「顯示更多系隊」可查看其餘隊伍。

- 系學會：`/#/eesa`
- 系上活動：`/#/activities`
- 系隊：`/#/team`
- 學習資料：`/#/resources`

系學會入口已整合原 eesa-web 的介紹、部門、活動、學習能力與體驗談頁面；系隊入口已整合九支隊伍的照片輪播、三欄連結與隊伍詳情；系上活動與學習資料主入口目前提供導覽頁，分項內容由下拉選單進入。
頁尾聯絡資訊附有系學會 Instagram、Facebook 與電機系 YouTube 連結及圖示。
全站頁首、頁尾與搜尋皆提供「聯絡我們」入口，前往 `/#/contact` 填寫問題表單。
頁面導覽資料位於 `frontend/src/data/navigation.ts`，共用頁面位於 `frontend/src/pages/SectionPage.tsx`，後續可分別替換成正式設計。
既有活動總覽保留在 `/#/activities/overview`，學習資料分類頁仍保留原本網址。
系學會模組與搬移說明請見 [frontend/src/features/eesa/README.md](frontend/src/features/eesa/README.md)。

系隊模組與資料說明請見 [frontend/src/features/teams/README.md](frontend/src/features/teams/README.md)。

活動卡片、詳細頁、照片與新增活動的維護方式請見 [frontend/src/features/activities/README.md](frontend/src/features/activities/README.md)。

## 目前功能

- 首頁焦點輪播、系上新訊、快捷入口與互動式行事曆
- 系上活動總覽，以及電機營、系露營、電機週、光舞、其他活動五類篩選
- 電機營、系露營與電機週獨立詳細頁，以及其他活動的無障礙詳情視窗
- 修課、獎助學金、交換資訊與研究所四類學習資源
- 全站搜尋、響應式版面及 reduced-motion 動態偏好
- 聯絡我們頁面、問題分類、欄位驗證與可設定的表單提交端點

## 聯絡表單設定

聯絡頁位於 `/#/contact`，提供姓名、Email、問題類別、主旨與問題內容欄位，包含必填、Email 格式、字數限制、送出中、成功及失敗狀態。表單會將 JSON 資料以 `POST` 送到 `VITE_CONTACT_FORM_ENDPOINT` 指定的網址；未設定時不會假裝提交成功，而會引導使用者直接寄信至 `eesa@nycu.edu.tw`。

在 `frontend/.env.local` 設定接收端點後重新啟動開發伺服器：

```text
VITE_CONTACT_FORM_ENDPOINT=https://example.com/api/contact
```

可複製 `frontend/.env.example` 為 `frontend/.env.local` 再替換網址。接收端必須允許網站來源的 CORS，並處理以下 JSON 欄位：

- `name`：使用者姓名
- `email`：回覆用 Email
- `category`：問題分類代碼
- `subject`：問題主旨
- `message`：問題內容
- `source`：固定為 `nycu-ee-website`
- `submittedAt`：ISO 8601 格式的提交時間

收到成功回應時，端點應回傳 HTTP `2xx`。正式環境也應在伺服器端重新驗證輸入、限制請求頻率並加入垃圾訊息防護；前端內建隱藏欄位，只能作為基礎防護，不能取代伺服器端檢查。

## 技術架構

- React 19
- TypeScript
- Vite
- React Router（Hash Router）
- Vitest、React Testing Library
- 純 CSS 響應式版面，沒有使用 UI framework

網站主體是純前端單頁應用程式，不需要資料庫即可瀏覽。Hash Router 讓建置結果可以部署到一般靜態網站空間；若要啟用線上聯絡表單，則需額外提供可接收 JSON `POST` 的 API 或表單服務。

## 在本機開啟網站

### 環境需求

- Node.js 20 以上版本
- npm

### 第一次執行

在專案根目錄開啟 PowerShell 或終端機：

```powershell
cd frontend
npm install
npm run dev
```

Vite 啟動後會顯示本機網址，預設通常是：

```text
http://127.0.0.1:5173/
```

若 5173 port 已被使用，Vite 會自動選擇其他 port，請以終端機顯示的網址為準。按 `Ctrl+C` 可以停止開發伺服器。

### 常用頁面

- 首頁：`http://127.0.0.1:5173/#/`
- 系上活動：`http://127.0.0.1:5173/#/activities`
- 關於修課：`http://127.0.0.1:5173/#/resources/courses`
- 獎助學金：`http://127.0.0.1:5173/#/resources/scholarships`
- 交換資訊：`http://127.0.0.1:5173/#/resources/exchange`
- 研究所：`http://127.0.0.1:5173/#/resources/graduate`
- 聯絡我們：`http://127.0.0.1:5173/#/contact`

## 測試與正式建置

請先進入 `frontend` 資料夾：

```powershell
cd frontend
```

執行全部測試：

```powershell
npm test
```

執行 TypeScript 檢查並產生正式版本：

```powershell
npm run build
```

建置結果會產生在 `frontend/dist/`。如要預覽建置結果，可執行：

```powershell
npx vite preview
```

## 專案目錄

```text
nycuee_saweb/
├─ frontend/                       # React 前端專案
│  ├─ src/
│  │  ├─ components/              # 全站共用與首頁區塊元件
│  │  │  ├─ HomeSections.tsx
│  │  │  ├─ SearchDialog.tsx
│  │  │  └─ SiteChrome.tsx        # Header、Footer、Modal 等共用元件
│  │  ├─ data/
│  │  │  └─ home.ts               # 首頁輪播、焦點與月曆資料
│  │  ├─ content/
│  │  │  └─ activities/           # JSON 活動內容、分類與 JSON Schema
│  │  ├─ features/
│  │  │  ├─ activities/           # 系上活動功能模組
│  │  │  │  ├─ components/        # 活動總覽、分類泡泡與近期活動列表
│  │  │  │  ├─ data/              # JSON 自動載入、驗證與資料來源介面
│  │  │  │  ├─ ActivitiesPage.tsx # 活動總覽入口與互動狀態
│  │  │  │  ├─ ActivityDetailPage.tsx # 共用活動詳細頁
│  │  │  │  ├─ activityTypes.ts   # 活動分類與資料型別
│  │  │  │  ├─ README.md          # 活動、照片與詳細頁維護指南
│  │  │  │  └─ activities.css     # 活動頁桌面及響應式樣式
│  │  │  └─ resources/            # 完整的學習資源功能模組
│  │  │     ├─ components/        # 資源頁區塊元件
│  │  │     ├─ data/              # 四類資源內容與官方連結
│  │  │     ├─ ResourcePage.tsx   # 資源頁入口
│  │  │     ├─ resources.css      # 資源頁專屬樣式
│  │  │     ├─ resourceTypes.ts   # 資源頁型別
│  │  │     └─ README.md          # Resource 模組共編說明
│  │  ├─ pages/                   # 首頁、共用內容、聯絡與 404 頁面
│  │  │  ├─ HomePage.tsx
│  │  │  ├─ SectionPage.tsx
│  │  │  ├─ NotFoundPage.tsx
│  │  │  ├─ ContactPage.tsx       # 聯絡資訊、問題表單及提交流程
│  │  │  └─ contact.css           # 聯絡頁桌面及響應式樣式
│  │  ├─ test/                    # 全站測試設定與整合測試
│  │  ├─ App.tsx                  # 路由及全站外框
│  │  ├─ main.tsx                 # React 啟動入口
│  │  └─ styles.css               # 全站及首頁共用樣式
│  ├─ index.html
│  ├─ .env.example                # 聯絡表單 API 端點範例
│  ├─ package.json
│  └─ vite.config.ts
├─ scratch.html                    # 最初的純 HTML 視覺參考稿
└─ README.md
```

## 網站運作方式

1. `main.tsx` 建立 React 應用程式並啟用 Hash Router。
2. `App.tsx` 根據網址載入首頁、系學會、活動、系隊、學習資源、聯絡或 404 頁面。
3. 首頁內容由 `data/home.ts` 提供，再交給 `HomeSections.tsx` 呈現。
4. Activities Page 透過資料來源介面讀取 `content/activities/events/*.json`；有 `detail` 資料的活動會進入獨立詳細頁，其餘活動開啟詳情視窗。
5. Resource Page 從網址取得目前分類，讀取 `features/resources/data/resources.ts` 的對應資料。
6. `ContactPage.tsx` 驗證表單後，將資料送往環境變數指定的 API；未設定時顯示寄信備援。
7. 共用 Header、Footer、搜尋及 Modal 由 `SiteChrome.tsx` 等共用元件負責。

## 活動資料格式

活動頁內容位於 `frontend/src/content/activities/`，一個活動使用一個 JSON；新增檔案後會自動載入。每筆活動包含：

- `id`：活動的唯一識別值
- `title`：活動標題
- `date`：`YYYY-MM-DD` 格式日期；頁面會依日期由近到遠排列
- `status`：`draft`、`published` 或 `archived`；只有 `published` 會顯示
- `categoryId`：對應 `categories.json` 的穩定分類識別值
- `summary`：顯示於近期活動列表的摘要
- `details`：顯示於活動詳情視窗的完整介紹
- `location`：活動地點
- `detail`：選填的活動專頁資料，包含頁首照片、介紹、章節導覽與可擴充圖文段落

目前活動內容皆為版面示意，不代表正式系所公告。替換成真實資料時，請同步確認日期、地點、報名資訊與分類。

## 共編指南

- 修改首頁文字、輪播或月曆資料：`frontend/src/data/home.ts`
- 修改首頁區塊與快捷連結：`frontend/src/components/HomeSections.tsx`
- 修改活動內容與分類：`frontend/src/content/activities/`
- 修改活動頁版面：`frontend/src/features/activities/components/ActivitySections.tsx`
- 修改活動頁響應式樣式：`frontend/src/features/activities/activities.css`
- 修改學習資源文字與官方連結：`frontend/src/features/resources/data/resources.ts`
- 修改學習資源版面：`frontend/src/features/resources/components/ResourceSections.tsx`
- 修改學習資源樣式：`frontend/src/features/resources/resources.css`
- 修改全站 Header、Footer 或 Modal：`frontend/src/components/SiteChrome.tsx`
- 修改聯絡表單欄位或提交流程：`frontend/src/pages/ContactPage.tsx`
- 修改聯絡頁響應式版面：`frontend/src/pages/contact.css`
- 設定聯絡表單接收端：複製 `frontend/.env.example` 為 `frontend/.env.local`
- 修改全站或首頁樣式：`frontend/src/styles.css`

Resource Page 的詳細分工請參考 [`frontend/src/features/resources/README.md`](frontend/src/features/resources/README.md)。活動維護方式請參考 [`frontend/src/features/activities/README.md`](frontend/src/features/activities/README.md)；活動資料、篩選與詳情測試位於 `frontend/src/features/activities/`，全站導覽、聯絡表單備援與其他整合測試位於 `frontend/src/test/App.test.tsx`。

共同編輯完成後，提交前至少執行：

```powershell
cd frontend
npm test
npm run build
```

請勿提交 `node_modules/` 或 `dist/`；這些資料夾會由安裝與建置指令重新產生。


## Google 日曆匯入

首頁行事曆提供「匯入 Google 日曆」按鈕，可下載包含 `calendarEvents` 全部活動的 `nycu-ee-calendar.ics`，再開啟 Google 日曆匯入頁面選擇檔案與目標日曆完成批次匯入。
點選月曆上的單一活動，則可用「加入 Google 日曆」直接開啟預填新增活動畫面，由使用者按儲存完成。

- `src/utils/calendarExport.ts`：iCalendar 匯出、UTF-8 長行摺行、日期與 Google 新增活動連結。
- `src/components/CalendarImport.tsx`：匯入操作視窗與單一活動入口。

目前活動僅有日期，故匯出為全天活動；全天結束日期為隔天，不因時區而改變顯示日期。批次匯入需使用電腦版 Google 日曆，屬於一次匯入，不會自動同步網站後續更新。
官方操作說明：https://support.google.com/calendar/answer/37118?hl=zh-Hant
