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

## API 健康與部署就緒檢查

匿名 `GET /api/v1/health` 使用既有 Prisma 連線執行唯讀 `SELECT 1`，成功回傳 HTTP `200` 與 `{"status":"ok"}`。資料庫查詢失敗或超過 3 秒回傳 HTTP `503` 與 `{"status":"unavailable"}`，回應皆含 `Cache-Control: no-store`。空活動資料庫也能通過檢查。

Compose 每 5 秒從後端容器內探測此端點，單次探測上限 5 秒，啟動寬限期 30 秒，連續失敗 10 次會標為 `unhealthy`。冷啟動依序等待資料庫健康、migration 與 seed 完成、API 健康，再啟動 Caddy。

```bash
docker compose ps
docker compose logs --tail=100 backend db
curl -i http://localhost/api/v1/health
```

後端顯示 `starting` 時請先查看 migration、seed 與 API 啟動紀錄。顯示 `unhealthy` 或端點回 `503` 時，檢查資料庫容器、連線設定與可用資源。資料庫恢復後，後端會透過後續探測恢復為 `healthy`。Compose 的相依就緒條件作用於啟動階段，執行期間後端變為 `unhealthy` 時，Caddy 會繼續執行，端點可回報 `503`。健康狀態本身不會觸發自動重啟，服務告警由後續 H 維運工作接入。

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
- 後端每次受保護請求都重新讀取帳號啟用狀態與角色。`ADMIN` 與已設定密碼的 `EDITOR` 都可登入；編輯者僅能讀取授權分類或指定活動，歷史版本也逐筆檢查分類。
- `SessionGuard` 檢查登入與寫入 CSRF，`AdminGuard` 限定管理員，`ContentScopeGuard`／`ContentAccess` 檢查活動與目的分類。管理帳號、授權、操作紀錄與聯絡收件匣僅限管理員。前端隱藏頁面不作為授權依據。
- 登入限速為每 IP、每個固定的一分鐘區間最多 5 次；第 6 次回傳 429。錯誤帳密與停用帳號使用相同訊息。
- 過期 Session 每 15 分鐘清理；到期當下即停止接受該 Session，不等待清理。

| API | 用途 |
| --- | --- |
| `GET /api/v1/auth/csrf` | 取得綁定目前 Session 的 CSRF Token；未登入時建立短效匿名 Session |
| `POST /api/v1/auth/login` | JSON `{ "username": "admin", "password": "admin" }`，成功回傳 `{ "user": { "id", "username", "role" } }` |
| `GET /api/v1/auth/me` | 回傳目前使用者資料（ADMIN 或 EDITOR）；未登入或停用為 401 |
| `POST /api/v1/auth/logout` | 刪除目前 Session，回傳 `{ "ok": true }` |

兩個 POST 都必須攜帶 `X-CSRF-Token`，值取自同一 Cookie Session 的 `csrf` 回應，並使用 JSON 請求。登入成功後請重新取得 Token。驗證回應禁止快取，密碼雜湊不會回傳至前端。

後台提供登入、登出、聯絡收件匣、真實帳號授權與紀錄管理。C／D／E 的真實 API 已加入，F 的既有介面可呼叫活動編輯、預覽、審核、媒體與分類服務；本次已通過編譯與隔離環境主要流程檢查，尚未部署至目前運行中的服務。

## C：帳號、授權與密碼管理

管理員從「帳號與授權」建立帳號，透過既有聯絡方式交付一次顯示的啟用連結；密碼由使用者自行設定。連結預設 30 分鐘有效、只能使用一次，資料庫只保存 Token 雜湊；重發同用途連結會使舊連結失效。

新增帳號不開放自行註冊。管理員可變更角色、停用帳號、替換分類／指定活動授權、產生重設連結。帳號與授權更新帶入目前 `version`，遇到其他人先更新則回 409。停用或降級時會以 Serializable 交易保護最後一位可登入的管理員，未設定密碼也未綁定 Google 的待啟用帳號不作為替代管理員。停用會撤銷現有 Session 與未使用的密碼連結；撤銷範圍或改角色則在下一次 API 請求生效。

「我的帳號」提供自行變更密碼，需輸入目前密碼，新密碼為 12–1024 字元。透過啟用／重設或自行變更密碼，都會作廢未使用的密碼連結並撤銷該帳號所有裝置的 Session，完成後重新登入。不強制首次改密碼；本機預設 `admin/admin` 維持原設定。

| API | 用途 |
| --- | --- |
| `GET/POST /api/v1/admin/users` | 列出帳號／建立帳號並回傳一次性啟用連結 |
| `GET /api/v1/admin/users/grant-options` | 授權選單所需的分類與活動名稱；不依賴 D 的編輯服務 |
| `PATCH /api/v1/admin/users/:id` | 變更角色或啟用狀態，帶入 `version` |
| `GET/PUT /api/v1/admin/users/:id/grants` | 讀取／整份替換分類與指定活動授權 |
| `POST /api/v1/admin/users/:id/password-token` | 產生啟用或重設連結，帶入 `version` 與 `purpose` |
| `POST /api/v1/auth/password/consume` | 匿名 CSRF 加有效 Token 設定密碼 |
| `POST /api/v1/auth/password/change` | 已登入使用者驗證目前密碼後變更密碼 |
| `GET /api/v1/admin/audit-entries` | 操作紀錄；支援 `page`、`entityType`、`entityId`，每頁 20 筆 |

帳號、授權、密碼及 Google 綁定的操作紀錄與業務資料一起寫入交易，不保存明文密碼、憑證、Session、Token 或啟用連結。所有第一方寫入皆須 CSRF；密碼設置／變更與 Google 發起流程另有限速。

## Google 登入設定

使用 Google Cloud 的 Web application OAuth 用戶端，設定後端環境變數：

```dotenv
APP_ORIGIN=http://localhost
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

授權重新導向 URI 必須精確設定為 `APP_ORIGIN` 加 `/api/v1/auth/google/callback`。Docker 本機使用 `http://localhost/api/v1/auth/google/callback`；Vite 開發使用 `http://localhost:5173/api/v1/auth/google/callback`，其 `/api` 代理至後端。`APP_ORIGIN` 只填協定與網域／連接埠，不填路徑或 `#`，不從請求 Host 推導；正式環境必須 HTTPS。

先以帳密登入，在「我的帳號」選「綁定 Google」，之後才可用該 Google 身分登入。帳號採 `sub` 唯一對應，不因 email 相同合併、不自動註冊，也不允許直接替換既有綁定。未配置 OAuth 憑證時帳密登入仍可使用，Google 端點回傳設定未完成的錯誤。

流程使用授權碼、PKCE、綁定發起 Session 的一次性 state，以及 nonce；暫存 10 分鐘到期。ID Token 的簽章、issuer、audience 與有效期限交由 Google 官方 `google-auth-library` 驗證，回跳網址固定為 `APP_ORIGIN`。

本次 C／D／E 程式碼已加入，**前後端編譯及隔離資料庫 47 項主要流程檢查通過；未跑完整測試、瀏覽器或實際 Google OAuth，也未更新執行中的 Docker 服務**。套用時需安裝新依賴、重新產生 Prisma Client 並套用新增 migration；Docker 重新建置及啟動會執行這些步驟。正式環境首次建立管理員需設定 `ADMIN_INITIAL_PASSWORD`（12–1024 字元）；已存在的 admin 不會被覆寫。

## D／E：活動審核與媒體服務

活動管理使用真實 `/api/v1/admin/activities` API。編輯者須具原活動及目的分類的必要授權，所有寫入帶入資源 `version`；版本過時回 409，保留前端表單供重新載入。建立／儲存草稿不改動原公開快照，送審後凍結，撤回或管理員退回後才能繼續編輯。

管理員發布時，在同一 Serializable 交易重新驗證內容、分類、精選入口及圖片引用，公開引用媒體，再切換公開指標並清空工作指標。已發布內容不原地修改；歷史還原會建立新草稿，已有工作版本時回 409。下架保留歷史與已公開圖片，精選入口仍引用該活動時須先調整入口。

圖片上傳使用 multipart，接受實際可解碼的 JPEG、PNG、WebP；單檔最多 10 MiB、40MP，拒絕動畫。後端重新編碼為 WebP，長邊最多 4096px，檔名由伺服器產生，並移除輸入中繼資料。Docker 保存於 `media_data` volume，本機預設在 `backend/media`（已忽略）；可用 `MEDIA_ROOT` 指定持久化目錄。

未公開圖片須登入並通過範圍檢查，檔案回應禁止快取。發布後內容改用公開媒體 URL，私人圖片不會由公開端點取得。媒體引用在儲存及發布交易建立，已被任何版本引用或已公開的圖片不可刪除；編輯者還須是上傳者才可刪除。既有 65 張靜態圖片保留原路徑，新的內容圖片只接受媒體庫或既有內容中的圖片路徑。

上傳失敗會清除尚未登錄的檔案。媒體目錄不直接交給 Caddy，檔案由 API 按權限提供；正式備份必須同時保存 PostgreSQL 與媒體 volume。異機備份、還原演練及告警仍屬 H 的待辦。

本次已通過前後端編譯、隔離資料庫 migration 及 47 項主要 HTTP 流程檢查；未更新目前容器與資料庫。Google 實際授權需設定 OAuth 憑證，完整回歸、瀏覽器與正式部署驗收仍待完成。

## 活動 CMS：A／B／G 基礎與 F 介面

前台活動預設使用資料庫公開 API。A／B／G 基礎及 F 的介面與 mock 已交付；C／D／E 已新增帳號、Google、授權、審核發布與媒體服務程式碼，本次編譯與隔離主要流程檢查通過，尚未部署至目前服務。

進度及下一任務見 [CMS 規劃](docs/admin-cms-plan.md)；活動流程見 [活動契約](docs/activity-cms-contract.md)，帳號與媒體見 [平台契約](docs/cms-platform-contract.md)，機器介面見 [OpenAPI](docs/activity-cms.openapi.json)。其中 `implemented` 與 `planned` 明確區分可呼叫及待實作的端點。

### 後台示範模式（F）

在 PowerShell 從專案根目錄啟動前端示範模式。

```powershell
Set-Location frontend
$env:VITE_ADMIN_SOURCE='mock'
npm run dev
```

開啟終端機列出的網址加上 `/#/admin`。預設使用示範管理員，可切換管理員／編輯者或重設示範資料。登出後可使用 `admin` 或 `editor`，密碼填任意非空文字。示範模式持續顯示提示，活動、帳號、Token 與圖片都保存在瀏覽器記憶體，重新整理即重設。

介面包含活動搜尋及篩選、分區表單、共用前台的詳情／相簿預覽、送審／撤回／退回／發布／下架／還原、媒體範圍與選圖、分類設定、帳號及授權、一次顯示的啟用／重設連結與操作紀錄。修改採手動儲存，離開提示與 409 衝突處理會保留目前表單。圖片示範使用本機物件 URL，正式圖片重新編碼、持久化及存取授權由 E 提供。

`VITE_ADMIN_SOURCE` 預設為 `api`。回到 API 模式時設定 `$env:VITE_ADMIN_SOURCE='api'` 並重啟 Vite。API 失敗顯示錯誤及重試；本次 C／D／E 的服務均由真實 API 提供，需重新建置與 migration 後才能在執行環境使用。

Google 主動綁定使用 `POST /api/v1/auth/google/link` 攜帶 CSRF，成功回 `200 { url }`，由前端導向 Google。OAuth callback 成功後重新導向我的帳號頁。

### 首次匯入舊活動

**首次啟動的空資料庫不會自動匯入活動。** 若更新後活動與分類同時空白，而 API 回傳兩個空陣列，請先試跑確認當前資料庫是否尚未初始化；舊 JSON 與圖片仍保留為匯入基準。 啟動 Docker 後，在專案根目錄依序執行：

```powershell
docker compose exec backend npm run content:import -- --dry-run
docker compose exec backend npm run content:import
```

試跑會列出 11 筆活動、5 個分類與 65 張圖片的檢查及預計新增／跳過數量，不寫入資料。正式匯入於單一交易執行，保留 ID、分頁、相簿、日期與圖片設定；相同資料可重跑且不新增版本。已有不同內容、分類設定或工作版本時，整批中止並列出衝突，不覆寫資料庫，也沒有強制覆寫旗標。這是初始化工具，API 模式日後的線上維護需由 D／F 的編輯與發布流程處理。

本機開發請先完成 `db:generate`、`db:migrate`、`db:seed`，再於 `backend` 執行：

```powershell
npm run content:import -- --dry-run
npm run content:import
```

預設讀取 `frontend/src/content/activities` 與 `frontend/public`，可用 `LEGACY_CONTENT_DIR`、`LEGACY_PUBLIC_DIR` 指定其他路徑。本機檢查實際圖片；Docker 建置先驗證圖片並產生大小／SHA-256 清單，後端僅攜帶內容與清單，65 張既有圖片仍由前台靜態路徑供應。前後端應使用同一版來源建置。

### 前台資料來源

`VITE_ACTIVITY_SOURCE` 在建置時決定來源，預設 `api`。同一份公開快照驅動活動頁、相簿、首頁近期活動、行事曆、ICS、導覽及搜尋；載入／錯誤／重試分開顯示，路由切換與回到頁面會重新驗證，API 失敗不回退 JSON。

| API | 用途 |
|---|---|
| `GET /api/v1/public/activity-content` | 一致快照 `{ activities, categories }`；空資料庫回空陣列 |
| `GET /api/v1/public/activities` | 公開活動 `{ items }` |
| `GET /api/v1/public/activities/:id` | 單筆公開內容；草稿／下架為 404 |
| `GET /api/v1/public/activity-categories` | 依順序排列的公開分類 `{ items }` |

純靜態部署在 `frontend/.env` 設 `VITE_ACTIVITY_SOURCE=json` 後建置；也可在 PowerShell 執行：

```powershell
$env:VITE_ACTIVITY_SOURCE='json'
npm run build
```

JSON 模式只打包共用驗證產生的公開快照，不包含草稿原文。Docker 則在根目錄 `.env` 設 `VITE_ACTIVITY_SOURCE=json` 後重建 `web`。JSON 模式不反映資料庫後續更新；切回 API 時改回 `api` 並重建。正式遷移前先備份資料庫、凍結舊 JSON 更新、試跑、匯入及逐筆比對；回復內容以資料庫備份／發布程序處理。

### 完整驗收

共用程式碼位於根目錄 `shared/`，兩個 Dockerfile 均以根目錄為 context。後端編譯輸出為 `backend/dist/backend/src` 及 `backend/dist/shared`，以 `npm start` 啟動。`npm test`（backend）執行純驗證／契約測試；未設定測試庫時會明確跳過資料庫整合。

完整測試使用一次性 PostgreSQL 容器及三個隔離資料庫：

```powershell
docker run --rm -d --name nycuee-cms-tests -e POSTGRES_PASSWORD=cms-test-only -p 127.0.0.1:55434:5432 postgres:16-alpine
# 等待資料庫就緒後：
docker exec nycuee-cms-tests createdb -U postgres contact_test
docker exec nycuee-cms-tests createdb -U postgres cms_test
docker exec nycuee-cms-tests createdb -U postgres content_test
cd backend
npm run db:generate
$env:DATABASE_URL='postgresql://postgres:cms-test-only@127.0.0.1:55434/content_test'
npm run db:migrate
$env:CONTENT_TEST_DATABASE_URL=$env:DATABASE_URL
$env:DATABASE_URL='postgresql://postgres:cms-test-only@127.0.0.1:55434/contact_test'
npm run db:migrate
$env:TEST_DATABASE_URL=$env:DATABASE_URL
$env:CMS_TEST_DATABASE_URL='postgresql://postgres:cms-test-only@127.0.0.1:55434/cms_test'
npm test
docker stop nycuee-cms-tests
```

`contact_test` 會清空收件測試資料；`content_test` 會清空活動、分類、媒體與紀錄測試資料；**`cms_test` 會重設整個 public schema**。僅能使用這些專用測試庫名稱。升級測試先建舊表與既有資料，再套用所有 migrations，驗證登入／收件保留及新模型約束；公開內容測試涵蓋匯入、重跑、衝突、缺圖、私有版本隔離與一致快照。

## 正式 HTTPS 部署

將網域指向 Linux 主機，開放 80、443 TCP 與 443 UDP，修改根目錄 `.env`：

```dotenv
POSTGRES_PASSWORD=replace-with-a-long-url-safe-password
SITE_ADDRESS=admin.example.com
APP_ORIGIN=https://admin.example.com
NODE_ENV=production
COOKIE_SECURE=true
ADMIN_INITIAL_PASSWORD=replace-with-a-long-initial-password
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

活動預設由公開 API 提供；`frontend/src/content/activities/events/` 保留為初始遷移及 JSON 靜態模式的基準，照片仍在 `frontend/public/activities/`。JSON 模式修改後需重建部署；API 模式不直接讀取這些檔案，初次資料請依上方匯入步驟處理。

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
