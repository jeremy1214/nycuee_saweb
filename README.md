# 陽明交大電機系網站

使用 Vite、React 19、TypeScript 及 Hash Router 的前端網站，包含首頁、系學會、系上活動、系隊、學習資料與聯絡頁。

另提供 NestJS、PostgreSQL 與 Prisma 的管理員帳密登入系統及聯絡表單收件匣。後台入口為 `/#/admin`，登入頁為 `/#/admin/login`；網站頁首的 Sign in 可開啟登入頁。

## 啟動登入系統（Docker）

在專案根目錄執行：

```bash
cp .env.example .env
docker compose up --build -d
```

開啟 `http://localhost/#/admin/login`，初始帳號為 **admin**，密碼為 **admin**。後端啟動時會執行 migration，並僅在帳號不存在時建立初始管理員；重啟不會覆寫密碼、角色或啟用狀態。

PostgreSQL 資料保存在 `postgres_data` volume，Caddy 憑證保存在 `caddy_data`。一般 `docker compose down` 會保留資料；加上 `-v` 會移除 volumes 與資料。

## 本機開發登入系統

在根目錄複製 `.env.example` 為 `.env`，先啟動資料庫：

```bash
docker compose up -d db
```

另一個終端機啟動後端（Node.js 22.12+）：

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

若更改根目錄 `.env` 的資料庫密碼，請同步修改 `backend/.env` 的 `DATABASE_URL`。`db:migrate` 套用已提交的 migration；`db:seed` 可重複執行，僅建立缺少的 `admin/admin` 帳號。資料庫連線密碼需使用 URL 安全字元，或在 `DATABASE_URL` 中進行 URL 編碼。

接著依下方前端開發指令啟動 Vite，開啟 `http://localhost:5173/#/admin/login`。Vite 會將 `/api` 代理至 `127.0.0.1:3000`；請使用終端機顯示的實際前端連接埠。

## 登入與權限行為

- 密碼以 Argon2id 雜湊保存；Session 使用隨機識別值，資料庫僅保存其 SHA-256 雜湊，固定有效期限為 8 小時。重新登入會更換識別值，登出會刪除 Session 並清除 Cookie。
- Cookie 使用 HttpOnly、SameSite=Lax 與 `/api` 路徑，正式 HTTPS 環境啟用 Secure。Session 及登入限速保存在 PostgreSQL，後端重啟不會清除登入狀態或限速紀錄。
- 後端每次受保護請求都重新讀取帳號啟用狀態與角色。目前僅 `ADMIN` 可以登入後台，資料模型保留 `EDITOR` 角色。
- `AdminGuard` 提供後續管理 API 共用：檢查登入、角色，以及寫入請求的 CSRF Token。前端隱藏頁面不作為授權依據。
- 登入限速為每 IP、每個固定的一分鐘區間最多 5 次；第 6 次回傳 429。錯誤帳密與停用帳號使用相同訊息。
- 過期 Session 每 15 分鐘清理；到期當下即停止接受該 Session，不等待清理。

| API | 用途 |
| --- | --- |
| `GET /api/v1/auth/csrf` | 取得綁定目前 Session 的 CSRF Token；未登入時建立短效匿名 Session |
| `POST /api/v1/auth/login` | JSON `{ "username": "admin", "password": "admin" }`，成功回傳 `{ "user": { "id", "username", "role" } }` |
| `GET /api/v1/auth/me` | 回傳目前管理員資料；未登入或停用為 401，無管理權限為 403 |
| `POST /api/v1/auth/logout` | 刪除目前 Session，回傳 `{ "ok": true }` |

兩個 POST 都必須攜帶 `X-CSRF-Token`，值取自同一 Cookie Session 的 `csrf` 回應，並使用 JSON 請求。登入成功後請重新取得 Token。驗證回應禁止快取，密碼雜湊不會回傳至前端。

後台提供登入、登出、目前帳號及聯絡表單收件匣；Google 登入、帳號管理介面、密碼重設與內容編輯依後續階段擴充。

## 活動 CMS 基礎

目前已建立活動分類、活動及內容版本的 Prisma 模型，並抽出前後端共用的 `shared/activity-content.ts`。公開與工作版本分開保存，分類與日期隨版本保存；前台仍從原 JSON 載入，不會因新增 migration 自動切換資料來源。

進度及下一任務見 [CMS 規劃](docs/admin-cms-plan.md)；狀態轉換、權限矩陣及介面見 [CMS 契約](docs/activity-cms-contract.md) 與 [OpenAPI](docs/activity-cms.openapi.json)。OpenAPI 中的活動端點均為待實作，尚未在 API 啟用。

共用原始碼位於專案根目錄，前後端 Docker 建置均以根目錄為 context；使用 `docker compose build backend web`。後端編譯輸出現為 `backend/dist/backend/src` 及 `backend/dist/shared`，仍以 `npm start` 啟動。

在 `backend` 執行 `npm test` 會執行活動內容與契約測試；未設定資料庫時，HTTP 與 migration 整合測試會明確跳過。要完整驗收，在暫時 PostgreSQL 容器建立兩個獨立資料庫：

```powershell
# 專案根目錄啟動暫時資料庫；完成驗收後停止容器即可移除。
docker run --rm -d --name nycuee-cms-tests -e POSTGRES_PASSWORD=cms-test-only -p 127.0.0.1:55433:5432 postgres:16-alpine
# 等待資料庫就緒後：
docker exec nycuee-cms-tests createdb -U postgres contact_test
docker exec nycuee-cms-tests createdb -U postgres cms_test
cd backend
$env:DATABASE_URL='postgresql://postgres:cms-test-only@127.0.0.1:55433/contact_test'
$env:TEST_DATABASE_URL=$env:DATABASE_URL
$env:CMS_TEST_DATABASE_URL='postgresql://postgres:cms-test-only@127.0.0.1:55433/cms_test'
npm run db:generate
npm run db:migrate
npm test
docker stop nycuee-cms-tests
```

`contact_test` 的收件測試會清空測試資料；**`cms_test` 的 migration 測試會重設整個 `public` schema**，只能指向專用測試庫。它先建立舊版資料表及帳號、Session、聯絡訊息與限速資料，再套用新 migration、比對資料保存，並驗證公開與工作版本互不影響。測試拒絕其他資料庫名稱。

## 正式 HTTPS 部署

將網域指向 Linux 主機，開放 80、443 TCP 與 443 UDP，修改根目錄 `.env`：

```dotenv
POSTGRES_PASSWORD=replace-with-a-long-url-safe-password
SITE_ADDRESS=admin.example.com
NODE_ENV=production
COOKIE_SECURE=true
```

執行 `docker compose up --build -d`，Caddy 會申請 HTTPS 憑證，同網域提供前台及 `/api`。後端在 production 模式要求 Secure Cookie。後端連接埠不對外發布，僅信任緊鄰的 Caddy 一層代理；本機直接啟動後端使用 `TRUST_PROXY=false`。資料庫連接埠僅綁定主機回環位址。

Dockerfile 內含部署所需的編譯步驟，後端啟動時自動套用已提交的 migrations。

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

### 電機營

電機營使用「活動介紹、各組介紹、共練介紹」三個獨立分頁，導覽位於標題下方，並標示目前所在分頁。每次只顯示該分頁內容；桌機圖文交錯排列，手機改為上下排列。

| 分頁 | 網址 | 內容 |
| --- | --- | --- |
| 活動介紹 | `/#/activities/smart-ee-camp/intro` | 營隊特色、活動與課程概述、籌備過程及兩張介紹照片 |
| 各組介紹 | `/#/activities/smart-ee-camp/groups` | 招生、活動、課程、場器、美宣、生活 |
| 共練介紹 | `/#/activities/smart-ee-camp/practice` | 火球、火棍、香扇、小旗、蛇舞 |

原本 `/#/activities/smart-ee-camp` 會自動導向「活動介紹」。三頁皆支援直接開啟、重新整理、瀏覽器返回與前進，切換時回到頁首；不存在的分頁顯示 404。

內容修改 `frontend/src/content/activities/events/smart-ee-camp.json`，照片位於 `frontend/public/activities/smart-ee-camp/`。文字與照片參考舊網站電機營頁，未加入歷屆限定資訊。共 13 張 JPG，總大小約 2.76 MB，長邊最多 1600px；舊網站原圖保留。

### 電機週

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
- 未設定分頁的活動使用單頁章節導覽。

欄位格式、內容來源與圖片維護方式請見[系上活動維護指南](frontend/src/features/activities/README.md)。

## Google 日曆

首頁行事曆與系上活動共用已發布且有日期的資料；`date` 是開始日期，選填的 `endDate` 是最後一天（包含當天），省略時為單日活動。行事曆在完整活動區間的每一天顯示，支援跨月、跨年及同日多筆，以台灣日期標示今天及預設月份；首頁最新消息也保留尚未結束的活動。可下載全部活動的 ICS 檔案，再到 Google 日曆選取檔案和目標日曆完成匯入；沒有詳細頁的活動資訊視窗亦可開啟預填的 Google 新增活動畫面。每個活動匯出為一筆涵蓋完整區間的全天活動，並帶入介紹、已知地點與活動網址；匯入後不會自動同步。

## 聯絡表單

聯絡頁 `/#/contact` 預設將表單送到本站 API，永久儲存在 PostgreSQL。管理員登入後，總覽顯示未讀數，`/#/admin/contact-messages` 提供全部／未讀篩選、每頁 20 筆分頁及重新整理；點開訊息可查看完整內容並按「標記已讀」。時間以台灣時區顯示，回覆請使用既有信箱；第一版未提供自動通知信、後台寄信或刪除功能。

| API | 用途 |
| --- | --- |
| `POST /api/v1/public/contact-messages` | 匿名 JSON 提交 `{ name, email, category, subject, message, website? }`；成功儲存回傳 201 `{ "ok": true }` |
| `GET /api/v1/admin/contact-messages?page=1&read=all` | 回傳 `{ items, total, unreadCount, page, pageSize }`；`read` 可為 `all` 或 `unread`，最新優先，摘要不含問題內容 |
| `GET /api/v1/admin/contact-messages/:id` | 回傳完整訊息，含伺服器收件時間 `createdAt` 與 `readAt`；不存在為 404 |
| `PATCH /api/v1/admin/contact-messages/:id/read` | 標記已讀並回傳訊息；重複操作保留首次已讀時間 |

所有管理 API 需要有效 ADMIN Session；PATCH 亦需從 `/api/v1/auth/csrf` 取得 `X-CSRF-Token`。未登入或停用帳號為 401、無管理權限或 CSRF 不符為 403。列表 `total` 為目前篩選筆數，`unreadCount` 為全部未讀數，非法分頁／篩選回傳 400。

姓名 1–60 字、Email 最高 120 字、主旨 1–120 字、內容 10–2000 字；所有字串去除首尾空白。類別限 `association`、`activities`、`teams`、`resources`、`website`、`other`。收件與已讀時間均由伺服器產生，不採用訪客提供的時間；必填、格式或長度錯誤為 400，JSON 請求上限 32 KB。

公開收件以 IP 的 SHA-256 雜湊加固定時間區間進行資料庫限速，每 10 分鐘最多 5 次請求（含無效資料及隱藏欄位命中），第 6 次回傳 429 及 `Retry-After` 秒數。非空的 `website` 隱藏欄位回傳成功但不儲存，降低簡單機器人垃圾訊息。限速紀錄每 15 分鐘清理，後端重啟仍保留當期次數。代理信任設定沿用登入系統。

表單傳送時停用輸入，成功才清空；錯誤及限速均保留原內容。`frontend/.env.example` 的 `VITE_CONTACT_FORM_ENDPOINT` 留白即可使用本站 API，也可在建置時覆寫為外部收件服務；僅部署靜態前端時須自行提供收件端點。

既有 Docker 環境更新後執行 `docker compose up --build -d`，後端會自動套用新增資料表；本機開發則在 `backend` 執行 `npm run db:generate`、`npm run db:migrate` 再重啟後端。訊息與登入資料共用既有 PostgreSQL volume。

後端整合測試使用獨立資料庫，**必須命名為 `contact_test`，測試會清空其中的使用者、Session、聯絡訊息與限速資料**。例如在 PowerShell 啟動暫時資料庫並執行：

```powershell
docker run --rm -d --name nycuee-contact-tests -e POSTGRES_PASSWORD=contact-test-only -p 127.0.0.1:55432:5432 postgres:16-alpine
# 資料庫就緒後建立測試庫。
docker exec nycuee-contact-tests createdb -U postgres contact_test
cd backend
npm ci
$env:DATABASE_URL='postgresql://postgres:contact-test-only@127.0.0.1:55432/contact_test'
$env:TEST_DATABASE_URL=$env:DATABASE_URL
npm run db:generate
npm run db:migrate
npm test
docker stop nycuee-contact-tests
```

未設定 `TEST_DATABASE_URL` 時，整合測試會明確顯示跳過；上述測試包含真實 HTTP、migration 後資料寫入、API 重啟保留、限速、管理員／CSRF 保護及已讀操作。

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
