# 不使用管理後台修改網站內容

先確認你要改的頁面採用哪種來源。靜態內容可直接改原始檔並重新部署。使用 API 的內容存放在 PostgreSQL，可用 PowerShell 呼叫管理 API 儲存、送審及發布，整個過程可以在終端機完成。

## 1. 找到要改的檔案或 API

| 要改的內容 | 原始檔 | 何時編輯原始檔會更新前台 |
| --- | --- | --- |
| 首頁「一起探索電機生活」輪播 | [explore.json](../frontend/src/content/home/explore.json) | 每次修改後重建前台 |
| 學習資料（選課、獎學金、交換、升學） | [pages/](../frontend/src/content/resources/pages/) 和 [categories.json](../frontend/src/content/resources/categories.json) | 每次修改後重建前台 |
| 全站聯絡信箱、辦公室與社群連結 | [site.ts](../frontend/src/shared/data/site.ts) | 每次修改後重建前台 |
| 系上活動及分類 | [events/](../frontend/src/content/activities/events/) 和 [categories.json](../frontend/src/content/activities/categories.json) | `VITE_ACTIVITY_SOURCE=json` 時 |
| 系學會總覽與部門 | [overview.json](../frontend/src/content/eesa/overview.json) 和 [departments/](../frontend/src/content/eesa/departments/) | `VITE_EESA_SOURCE=json` 時 |
| 系隊 | [teams/](../frontend/src/content/teams/) | `VITE_TEAM_SOURCE=json` 時 |

首頁近期活動與行事曆共用系上活動來源。比如改系烤日期時，JSON 模式應修改 [department-bbq.json](../frontend/src/content/activities/events/department-bbq.json) 的 `date`，API 模式則應更新並發布 `department-bbq` 的資料庫版本。

Docker Compose 的來源由前台建置時使用的根目錄 `.env`（或部署指定的 `--env-file`）與環境變數決定。本機直接啟動 Vite 時看 `frontend/.env` 與終端機環境變數。程式預設活動為 `api`，系學會與系隊為 `json`。若無法確認正在執行的版本，可開啟相應前台頁面，在瀏覽器開發者工具的 Network 中查看是否請求 `/api/v1/public/activity-content`、`/api/v1/public/eesa/content` 或 `/api/v1/public/teams/content`。[Compose 設定](../compose.yaml)

## 2. 修改 JSON 或其他靜態檔案

1. 開啟表格中的檔案，修改文字、日期、連結或圖片路徑。保留既有 `id` 與 `slug`，它們可能用在網址及站內連結。
2. 新增靜態圖片時放在 `frontend/public/` 下的對應目錄。例如 `frontend/public/home/example.webp` 在 JSON 裡填 `/home/example.webp`。
3. 從專案根目錄開啟 PowerShell，安裝前端依賴、驗證活動與學習資料，並啟動本機預覽。已安裝依賴時可略過 `npm ci`。

```powershell
Set-Location frontend
npm ci
npm run validate:content
npm run dev
```

開啟 Vite 顯示的網址檢查修改過的頁面。若只想在本機預覽某個模組的 JSON，在執行 `npm run dev` 前設定該模組的來源。例如 `$env:VITE_ACTIVITY_SOURCE = 'json'`。測試結束可關閉該終端機。

### 發布靜態內容

- **既有 Docker Compose 部署**。將修改送到部署主機，從專案根目錄沿用該站的 Compose 檔案與環境參數，執行 `docker compose up -d --build web`。
- **靜態代管**。在 `frontend` 執行 `npm run build`，將產出的 `frontend/dist/` 內容部署到原本的靜態站。建置時須使用預期的來源設定。

將正式站從 `api` 改成 `json` 會讓該模組改顯示原始檔內容，資料庫裡後來發布的版本會從前台消失。只想改 API 模式下的一筆內容時，使用下節的發布流程即可。

## 3. 保留 API 模式，從終端機修改已存在的內容

下列範例使用 PowerShell 7 與已具權限的帳密。可用具授權的編輯者帳號存草稿及送審。發布需要管理員帳號，系學會總覽的編輯也限管理員。

### 登入 API 並讀取現有內容

將 `$site` 改為你要操作的站點。先在本機或測試站確認流程，再連正式站。

```powershell
$site = 'http://localhost'
$api = "$site/api/v1"
$credential = Get-Credential -Message '輸入網站帳號與密碼'
$csrf = Invoke-RestMethod "$api/auth/csrf" -SessionVariable cmsSession
$login = @{
    username = $credential.UserName
    password = $credential.GetNetworkCredential().Password
} | ConvertTo-Json -Compress

Invoke-RestMethod "$api/auth/login" -Method Post -WebSession $cmsSession `
    -Headers @{ 'X-CSRF-Token' = $csrf.csrfToken } `
    -ContentType 'application/json; charset=utf-8' -Body $login -ErrorAction Stop | Out-Null
Remove-Variable login, credential

$csrf = Invoke-RestMethod "$api/auth/csrf" -WebSession $cmsSession
$headers = @{ 'X-CSRF-Token' = $csrf.csrfToken }

$item = "$api/admin/activities/department-bbq"
$state = Invoke-RestMethod $item -WebSession $cmsSession
$preview = Invoke-RestMethod "$item/preview" -WebSession $cmsSession
$preview | Select-Object status, content | ConvertTo-Json -Depth 100
```

修改其他資源時，將 `$item` 改成對應路徑。部門和隊伍的 ID 可查上表的 JSON 檔名。

| 資源 | 接在 `$api` 後的路徑 |
| --- | --- |
| 系上活動 | `/admin/activities/<活動 ID>` |
| 系學會總覽 | `/admin/eesa/overview` |
| 系學會部門 | `/admin/eesa/departments/<部門 ID>` |
| 系隊 | `/admin/teams/<隊伍 ID>` |

預覽優先讀取工作版本，沒有工作版本才讀已發布版本。若已有草稿，請先確認該草稿可接續編輯。送審中的版本已凍結，須經撤回或退回後才能修改。

### 儲存草稿、送審及發布

以下以修改系烤摘要為例。替換範例文字，並保留 API 讀出的整份 `content`。各步驟可分開執行，送審前先確認草稿，管理員也可在另一個已登入的 PowerShell 工作階段讀取目前版本後發布。

```powershell
$content = $preview.content
$content.summary = '在這裡填入新的系烤摘要。'
$draftBody = @{ version = $state.version; content = $content } | ConvertTo-Json -Depth 100
$draft = Invoke-RestMethod "$item/draft" -Method Put -WebSession $cmsSession `
    -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $draftBody -ErrorAction Stop
$draft.workingRevision.content | ConvertTo-Json -Depth 100
```

```powershell
$submitBody = @{ version = $draft.version } | ConvertTo-Json
$submitted = Invoke-RestMethod "$item/submit" -Method Post -WebSession $cmsSession `
    -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $submitBody -ErrorAction Stop
```

```powershell
# 用管理員的 Session 執行。跨工作階段時，先重新讀取 $item 並確認送審內容。
$publishBody = @{ version = $submitted.version } | ConvertTo-Json
Invoke-RestMethod "$item/publish" -Method Post -WebSession $cmsSession `
    -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $publishBody -ErrorAction Stop

Invoke-RestMethod "$api/public/activities/department-bbq" | ConvertTo-Json -Depth 100
```

系學會或系隊發布後，分別用 `GET /api/v1/public/eesa/content` 或 `GET /api/v1/public/teams/content` 核對，再刷新對應前台頁面。API 模式的文案發布後無須重建前台。

每次寫入使用上一步回傳的最新 `version`。收到 `409` 時重新讀取目前版本與狀態，確認差異後再操作。收到 `401` 時重新登入，收到 `403` 時檢查角色、資源授權和同一 Session 的 CSRF Token。新增活動、調整活動分類或上傳 CMS 圖片時，請依各端點的資料格式操作。[活動 API](../docs/activity-cms.openapi.json) · [系學會與系隊 API](../docs/organization-cms.openapi.json) · [媒體與權限](../docs/cms-platform-contract.md)

## 匯入工具的用途

`npm run content:import` 與 `npm run organization:import` 用於初次匯入或補入缺少的來源資源。兩者都支援 `-- --dry-run`，遇到既有資料與 JSON 不同時會停止。Docker 啟動時的 `content:bootstrap` 只會初始化相關資料表全空的模組。既有 API 內容應透過草稿與發布流程更新，讓內容驗證、版本歷史、媒體引用及操作紀錄一併生效。[活動匯入契約](../docs/activity-cms-contract.md) · [組織內容匯入手冊](../docs/organization-cms-rollout.md)
