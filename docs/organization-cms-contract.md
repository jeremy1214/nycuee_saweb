# 系學會與系隊 CMS 契約及匯入對照

2026/11/03 加入程式實作，未執行測試、型別／建置驗證、Prisma generate、migration、HTTP 或瀏覽器驗收。完整介面見 [OpenAPI](organization-cms.openapi.json)，切換流程見[遠端切換手冊](organization-cms-rollout.md)。

## 資料與既有網址

| 種類 | 固定識別值／來源 | 公開路由 |
|---|---|---|
| 總覽 | `overview`／`frontend/src/content/eesa/overview.json` | `/#/eesa` |
| 部門 | `activities`、`technical`、`publicity`、`operation`／`frontend/src/content/eesa/departments/{id}.json` | `/#/eesa/{id}`、`activities`、`activities/{slug}`、`skills`、`experiences/{id}` |
| 系隊 | `basketball-men`、`basketball-women`、`volleyball-men`、`volleyball-women`、`badminton`、`table-tennis`、`baseball`、`tennis`、`soccer`／`frontend/src/content/teams/{id}.json` | `/#/team`、`/#/team/{id}`、`?activity={id}` |

這 14 份既有 JSON 同時作為共同 fixtures 與匯入基準，由 `readOrganizationLegacy` 讀取並轉成共用 DTO。來源檔不隨 migration 自動匯入。`/intro/*` 既有轉址保留。頂層 id 固定；子項 id／slug 在各自資源內唯一。已發布子項的識別欄在表單中鎖定，移除子項會停止公開；保留識別值即可修改標題。

總覽包含橫幅與文案；部門以整份資源保存卡片、排序、介紹、活動、能力、體驗談與側欄；系隊以整份資源保存排序、介紹、練習時間、活動與聯絡資訊。練習時間保留 paragraph、subheader、list；month 保留自由文字。空字串、待填、null、空陣列與未啟用選填區塊不自行補寫內容。

## 圖片轉換與預留值

原字串圖片正規化為 `{ src, alt, missing? }`。alt 依既有內容名稱與欄位標籤建立，表單可調整。系隊相對路徑只在轉換時補 `/team/`；既有網站絕對路徑和媒體 API 路徑直接使用。

來源盤點有以下既有缺圖，保留為 `missing: true`，公開頁使用圖片預留區：

- `/eesa.jpg`
- `/intro/operations-group-photo.jpg`
- `/intro/publicity-group-photo.jpg`
- `/intro/technical-group-photo.jpg`
- 活企部原本為空字串的合照欄位。

只有此資源原有的缺圖網址可標為 missing。新圖片須由所屬資源媒體庫選取，私有／公開圖片都必須屬於同一總覽、部門或系隊。Docker 建立來源圖片 SHA-256／大小 manifest；匯入時核對實體圖檔或 manifest。原網站圖片維持原網址，不重複搬入媒體庫。

## 版本與授權

| 身分 | 總覽 | 部門／系隊 | 發布、退回、下架、排序、帳號授權 |
|---|---|---|---|
| 匿名 | 僅公開 API | 僅公開 API | 不允許 |
| EDITOR | 不允許 | 僅獲授權資源的列表、內容、歷史、預覽、草稿、送審、撤回、還原、私有媒體 | 不允許 |
| ADMIN | 全部內容與版本 | 全部內容與版本 | 允許 |

帳號授權增加 `departmentIds`、`teamIds`。GET 一律提供陣列；PUT 的舊客戶端若省略新欄位，保留原授權。帳號版本仍需攜帶，操作在同一 Serializable 交易中重讀操作者權限。停用或撤銷授權後，下個請求即生效。

總覽／部門／系隊各有獨立內容、版本、媒體引用模型。所有寫入需 `version`、Session 與 CSRF。草稿不更動公開指標；送審凍結；發布只切換送審版本；還原新增草稿且不覆寫現有工作版本；下架保留歷史。EDITOR 還原時保留目前排序。媒體公開、版本切換、引用及操作紀錄在同一交易完成。

部門側欄只接受既有部門站內路由。送審／發布會檢查側欄目標，下架時也檢查其他公開部門是否仍引用此內容；無效引用回 409。被移除的子頁顯示內容不存在；系隊失效 activity 參數回第一個活動，空活動顯示空狀態。

## API 與錯誤

公開快照：`GET /api/v1/public/eesa/content` 回 `{ overview, departments }`；`GET /api/v1/public/teams/content` 回 `{ teams }`。總覽未公開為 null，其餘只包含公開資源，依 order、id 排序。

後台路徑為 `/api/v1/admin/eesa/overview`、`/api/v1/admin/eesa/departments/{id}`、`/api/v1/admin/teams/{id}`。GET 讀取資源封套，GET `revisions`／`preview` 讀取版本；PUT `draft` 保存 `{ version, content }`；POST `submit`、`withdraw`、`reject`、`publish`、`unpublish`、`restore` 執行版本命令。reject 加 reason；restore 加 revisionId。固定資源不提供公開建立或永久刪除 API。

媒體上傳／列表新增 overviewId、departmentId、teamId；與活動／分類合計五種 scope，恰好選一種。`GET /api/v1/admin/media/{id}/references` 回傳可讀版本的引用及後台網址，刪除保護涵蓋全部四類版本引用表。

欄位錯誤回 400 `{ message, fieldErrors: [{ path, message }] }`，例如 `content.activities.0.slug`、`content.photo.src`、`content.schedule.0`。未登入 401，無權限 403，內容不存在 404，版本過時／狀態不符／公開引用失效 409。前台 API 失敗顯示錯誤與重試，不自動使用舊 JSON。

## 來源與預覽

`VITE_EESA_SOURCE`、`VITE_TEAM_SOURCE` 各接受 json／api，導入預設 json。同一公開 Provider 供入口、詳情、首頁、輪播、上下項目、導覽及搜尋使用；換頁、視窗重獲焦點或手動重試時重新讀取。API 模式不從靜態 repository 取得內容。

後台新增 `/admin/eesa`、`/admin/eesa/overview`、`/admin/eesa/departments/{id}`、`/admin/teams`、`/admin/teams/{id}`。預覽重用公開呈現元件，連結與活動／能力／體驗談切換保留在後台。`VITE_ADMIN_SOURCE=mock` 使用獨立記憶體資料；EDITOR 範例授權 technical 部門與 basketball-men 系隊，重設示範會重建所有範例狀態。
