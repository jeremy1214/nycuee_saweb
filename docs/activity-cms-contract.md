# 活動 CMS 基礎契約（v0.1）

> 現況（2026/11/10）：帳號、授權、活動寫入、審核發布與媒體已接入真實 API。11/03 有隔離環境 47 項主要 HTTP 流程檢查紀錄，完整回歸及正式部署見[總計畫第 17 節](admin-cms-plan.md#17-未完成任務盤點與後續交辦20261110)。

機器可讀介面見 [OpenAPI 3.1](activity-cms.openapi.json)。內容驗證的單一實作為 [`shared/activity-content.ts`](../shared/activity-content.ts)，後端透過 `validateActivityRevision` 轉成 400 欄位錯誤。JSON Schema 描述結構，日期先後、重複識別值與跨記錄引用由共用驗證及交易服務檢查。

## 資料與相容性

- `Activity.id` 沿用現有 slug，建立後不改名；新增時保留 `overview`、`other` 給既有路由，不接受這兩個 ID；`version` 是整個活動資源的樂觀鎖。`ActivityCategory` 保存分類標籤、排序與精選入口。
- `ActivityRevision` 以活動與遞增 `number` 唯一識別版本；標題、分類、日期、摘要、介紹及地點均隨版本保存。`links`、`detail`、`album` 為 JSONB，不另建其他活動資料表。
- `publishedRevisionId` 指向公開快照，`workingRevisionId` 指向草稿或送審快照。複合外鍵限制兩個指標只能引用同一活動的版本，且不能同時指向相同版本。
- 公開 API 依公開指標讀取，分類及日期均取自公開版本。後台工作版本由 [`ActivityWorkflow`](../backend/src/activity-workflow.ts) 處理。
- 日期為 PostgreSQL `DATE`，API 為 `YYYY-MM-DD`；Prisma 轉換時使用 UTC 午夜，輸出取 UTC 日期，不套用主機時區。`endDate` 包含當天，省略為單日；無日期介紹合法。
- 保留獨立介紹／共用簡介、雙主圖、選填章節圖片、分頁排序、圖片 `fit`／`objectPosition`、活動外部連結與相簿排序。舊 JSON 的 `$schema`／`status` 僅由舊資料解析器接受，CMS 可編輯內容不接受身分或流程欄位。
- migration 更新資料表、索引、關聯與檢查。資料庫約束涵蓋日期區間、JSONB 容器及版本編號，巢狀格式與引用則由寫入及發布服務檢查。舊內容另由匯入工具或 Docker 空庫初始化處理。

## 工作流程與衝突規則

| 操作 | 前置狀態與結果 |
|---|---|
| 建立 | 建立活動及第 1 個 `DRAFT`，資源 `version=1`；重複 ID 回 409 |
| 儲存草稿 | 工作版本為 `DRAFT` 才可覆寫；沒有工作版本時複製公開快照建立新草稿，不修改公開快照 |
| 送審 | 完整驗證草稿，`DRAFT → SUBMITTED`，設定 `submittedAt` 並清除舊退回原因 |
| 撤回 | `SUBMITTED → DRAFT`，解除凍結並清除 `submittedAt` |
| 退回 | 管理員提供非空原因，`SUBMITTED → DRAFT`，保存 `rejectionNote` 並清除 `submittedAt` |
| 發布 | 管理員只發布目前送審版本；再次驗證分類、媒體與入口引用，在同一交易設定 `PUBLISHED`／`publishedAt`、切換公開指標並清空工作指標 |
| 下架 | 清空公開指標，保留所有版本與現有工作版本；沒有公開版本時回 400 |
| 還原 | 將指定歷史版本複製為新編號的 `DRAFT`；已有工作版本回 409，不默默覆寫他人草稿 |

已發布版本不可原地修改。送審版本不可編輯；先撤回或退回。所有既有活動寫入都帶正整數 `version`，在交易中以 `id + version` 比對並遞增；過時版本回 409。非法狀態轉換回 400。重複發送已成功的命令因版本過時回 409，不重複發布。版本還原不直接公開。

發布、變更分類或下架若導致分類精選入口指向未公開、無詳細頁或不同分類的活動，回 409，由管理員先調整入口。發布服務在同一交易驗證媒體引用、切換公開版本及寫入操作紀錄。

## API 與權限

已實作的公開端點為 `GET /api/v1/public/activities`、`/activities/{id}`、`/activity-categories`；列表統一回 `{ items }`，只含公開內容。活動依 ID 排序，分類依 `order`、ID 排序。草稿／下架活動詳細查詢為 404。另有 `GET /api/v1/public/activity-content` 回 `{ activities, categories }`，於 RepeatableRead 交易中取得同一快照，前台以此統一更新。空資料庫合法回空陣列，所有回應禁止快取。公開分類會省略已失效的精選引用，發布服務仍須按上列規則阻擋不合法變更。

後台介面使用 `/api/v1/admin/activities` 建立、列表及讀取詳情。子路徑為 `draft`、`preview`、`submit`、`withdraw`、`reject`、`publish`、`unpublish`、`restore`、`revisions`。可編輯內容包在 `content`，資源身分、版本鎖及狀態留在外層。預覽重用前台元件。完整 HTTP 方法與資料格式見 [OpenAPI](activity-cms.openapi.json)。

| 能力 | 訪客 | 編輯者 | 管理員 |
|---|---|---|---|
| 公開查詢 | 可 | 可 | 可 |
| 建立活動 | 不可 | 須有目標分類授權 | 可 |
| 讀取／編輯／預覽／送審／撤回／還原 | 不可 | 須有該活動或分類授權 | 可 |
| 變更活動分類 | 不可 | 須能編輯原活動，且有目標分類授權 | 可 |
| 發布／退回／下架 | 不可 | 不可 | 可 |
| 分類設定／精選入口／帳號授權／操作紀錄 | 不可 | 不可 | 可 |
| 聯絡收件匣 | 不可 | 不可 | 可 |

編輯者列表與歷史版本同樣要過濾授權。既有活動授權以目前工作快照（沒有時用公開快照）的分類或指定活動授權判斷；內容變更分類須額外檢查目的分類。還原也須檢查歷史快照的目標分類。建立活動不能靠自行指定 ID 取得權限。

未登入、過期或停用回 401；已登入但角色／範圍不符回 403；不存在回 404；未知分類或內容格式錯誤回 400 並附 `fieldErrors: [{ path, message }]`。後台回應禁止快取，所有寫入需有效 Session 與 `X-CSRF-Token`。`SessionGuard` 接受已啟用的 ADMIN／EDITOR，`AdminGuard` 仍只接受 ADMIN；寫入交易另外重新檢查原活動、目標分類與最新角色。依使用者指示，本次未執行權限測試。

## 驗證與後續任務

- 共用驗證以現有 11 筆 JSON 為相容性資料，另測無日期、跨日、非法日期、分類引用、重複 ID 與欄位錯誤；沿用前端分頁、相簿、行事曆與 ICS 測試。
- `npm test`（backend）執行純驗證與契約檢查。設定 `CMS_TEST_DATABASE_URL` 才執行 migration／版本隔離驗收；資料庫必須命名為 `cms_test`，測試會重設其 `public` schema。既有收件測試使用另一個 `contact_test`。
- migration 驗收先套用前三個舊 migration，寫入帳號、Session、聯絡訊息及限速資料，加入既有活動與公開指標後再升級並核對保存；同時測公開／工作版本獨立保存、跨活動指標拒絕及非法日期拒絕。
- 目前後續工作為完整回歸、角色／範圍與並行寫入驗收，以及正式資料切換。活動列表與編輯頁已分開顯示公開狀態及工作版本標籤，相關瀏覽器驗收併入 H-1。

## G：匯入與前台來源

Docker 在 migration 與 seed 後執行 `content:bootstrap`。僅當活動與分類資料表皆為空時，才自動使用舊 JSON 初始化。既有或部分匯入的環境走下列人工試跑與比對流程。[初始化程式](../backend/src/bootstrap-content.ts)

使用 `npm run content:import -- --dry-run` 試跑，正式匯入執行 `npm run content:import`。工具先驗證 JSON、分類精選及所有圖片，再以 Serializable 單一交易與匯入鎖比對／寫入。相同資料不新增版本；現有內容不同或已有工作版本整批拒絕，不提供覆寫旗標。分類順序使用原陣列順序。

舊 `published` 建立 PUBLISHED 版本及公開指標；`draft` 建立 DRAFT 工作版本；`archived` 建立無公開／工作指標的歷史 DRAFT。既有工作版本會阻擋重跑，因此匯入含 draft 的來源後需先人工確認工作版本，不能拿匯入工具當編輯功能。匯入時間不冒充舊網站的實際發布時間。

本機直接檢查 `frontend/public` 的圖片；Docker 建置先驗證 65 張圖片並產生 SHA-256／大小清單，後端僅攜帶該清單與內容，圖片繼續由前台供應。建置、部署時前後端使用同一版來源。可用 `LEGACY_CONTENT_DIR`、`LEGACY_PUBLIC_DIR` 明確覆寫來源。

前台預設 API；`VITE_ACTIVITY_SOURCE=json` 由建置時共用驗證產生僅含公開內容的模組。API 模式不內嵌舊活動 JSON；服務失敗不偷偷使用 JSON。公開版面共用 Provider，進站、路由、重新取得焦點／可見、手動重試時讀取；同時請求去重、換路由或卸載中止舊請求，15 秒逾時可重試。路由先等待新快照，再決定預設分頁或 404。

活動、相簿、首頁、日曆、ICS、導覽及搜尋以同一快照衍生；其他網站內容保留原資料來源。正式切換需先備份、停止舊 JSON 更新、試跑與逐筆比對；前台 JSON 切回只恢復舊基準，不會包含資料庫後續更新，資料回復應依備份／發布程序處理。


## 2026/11/03 接入說明

ActivityWorkflow 與 CategoryService 提供上述寫入及預覽；MediaService 在版本保存時建立 MediaReference，發布時檢查範圍／檔案並將受管媒體 URL 改為 `/api/v1/public/media/{id}`。工作版本繼續經授權端點讀取；歷史公開圖片不會因下架而刪除。

所有內容圖片只接受實際媒體庫識別值，或既有 JSON 內容使用的公開圖片路徑。媒體引用、可見性、公開指標、資源版本與操作紀錄一起提交；失敗時回滾。永久刪除活動仍不提供。

程式碼已加入並不表示已驗收。本輪未執行測試、建置、migration、服務更新或瀏覽器驗證。


### 後續簡單驗證結果（2026/11/03）

使用者後續同意簡單驗證。前後端編譯、隔離 PostgreSQL 全新 migration 與 47 項主要 HTTP 流程檢查通過；取代本次實作初期的未驗證狀態。未跑完整測試、瀏覽器及實際 Google OAuth，未變更目前網站資料庫或更新容器。細項見 admin-cms-plan.md 第 14 節。
