# A：帳號、授權、媒體與紀錄契約

> 2026/10/29：此文件、OpenAPI、共用 DTO 及 Prisma 模型為 A 的交付。帳號管理／Google／媒體服務尚未啟用，由 C、E、F 實作。G 僅啟用公開活動查詢；`EDITOR` 仍不能登入。介面完整定義見 [OpenAPI](activity-cms.openapi.json)，活動工作流程見[活動契約](activity-cms-contract.md)。

## 資料模型與邊界

| 模型 | 意義與約束 |
|---|---|
| User | 保留使用者名稱、角色與啟用狀態；新增正整數 `version` 作帳號／授權樂觀鎖。`passwordHash` 可為空，讓未啟用或僅 Google 身分的帳號存在；空值不能以帳密登入 |
| GoogleIdentity | 每個使用者最多一個綁定，Google `subject` 全站唯一；email 僅作資訊，不能自動合併或作為登入主鍵 |
| PasswordToken | `ACTIVATE`／`RESET`、SHA-256 Token 雜湊、有效期限及 `usedAt`；不保存明文 Token |
| CategoryGrant／ActivityGrant | 使用者與分類／活動的唯一配對；一份授權提供該範圍的閱讀、編輯、預覽、送審、撤回與還原能力，不能發布 |
| ActivityCategory | 新增 `version`；管理員修改標籤、順序與精選入口時比對版本 |
| Media | 唯一儲存鍵、原檔名、實際 MIME、大小、尺寸、SHA-256、上傳者及 `PRIVATE`／`PUBLIC`；恰好指定一個活動或分類範圍 |
| MediaReference | 版本 ID＋內容欄位路徑唯一，連到媒體 ID；被引用的媒體不可刪除 |
| AuditEntry | 操作者、動作、目標類型／ID、時間及去除敏感值的 JSON 摘要；使用者移除時保留紀錄並清空操作者關聯 |

這些新增結構不變更既有登入者的角色或啟用狀態。migration 保留帳號、Session、聯絡訊息及限速資料，不自動設定授權或綁定。現有 65 張公開圖片沿用靜態路徑，不建立虛假的媒體記錄；E 之後才處理上傳、磁碟持久化及舊媒體搬移。

## 帳號與 Google 流程（待 C）

- 不開放公開註冊。管理員透過 `POST /admin/users` 建立使用者名稱及角色，回傳帳號與一次顯示的啟用連結。未設定密碼時，既有帳密登入驗證使用 dummy hash，不能登入。
- 啟用／重設 Token 使用 32 bytes 安全亂數，明文為 64 個十六進位字元；只保存 SHA-256 雜湊，預設 30 分鐘有效。發行新 Token 時作廢同帳號同用途的舊 Token。連結使用同來源 `/#/admin/set-password?token=...`，經既有聯絡方式交付。
- `POST /auth/password/consume` 在單一交易確認未使用、未過期及帳號啟用，設定 Argon2id 密碼（12–1024 字元）、標記使用、撤銷該帳號全部 Session；並行使用只能成功一次。未知、過期或重複使用統一回 400，不洩露帳號存在性。
- `PATCH /admin/users/{userId}` 與 `PUT /admin/users/{userId}/grants` 必須攜帶目前帳號 `version`；成功遞增，過時為 409。管理員停用或降級最後一位啟用中的 ADMIN 回 409，透過 Serializable 交易防止兩位管理員同時繞過檢查。
- `GET /auth/google/start` 發起 OIDC；callback 必須驗證一次性 state、nonce、issuer、audience、授權碼及 PKCE，暫存流程 10 分鐘到期並綁定發起 Session。登入只接受已對應的 `sub`，未知身分不自動建立帳號。
- 綁定從已登入的 `POST /auth/google/link` 主動發起，callback 綁到同一個內部 User；`sub` 已被其他帳號使用回 409。不能因 email 一樣自動合併。回跳網址使用設定的同來源，不接收任意外部 return URL。
- 目前 `GET /auth/me` 及後台仍只支援 ADMIN；C 完成已登入／管理員／內容範圍 Guard 與測試後才開放 EDITOR，不能只移除現有的角色檢查。

## 授權矩陣與狀態檢查

| 能力 | 訪客 | 範圍內 EDITOR（待 C） | ADMIN |
|---|---|---|---|
| 公開活動查詢 | 可 | 可 | 可 |
| 建立活動 | 不可 | 需目標分類授權 | 可 |
| 工作內容、預覽、歷史版本、送審／撤回／還原 | 不可 | 需活動授權或目前工作／公開快照的分類授權 | 可 |
| 變更分類／還原到不同分類 | 不可 | 能編輯原活動，且具有目的分類授權 | 可 |
| 發布、退回、下架、分類設定／精選入口 | 不可 | 不可 | 可 |
| 帳號、授權、收件匣與操作紀錄 | 不可 | 不可 | 可 |
| 私有媒體上傳／讀取 | 不可 | 需媒體所屬活動／分類授權 | 可 |
| 刪除媒體 | 不可 | 同時滿足範圍、上傳者、未公開且無引用 | 只限未公開且無引用 |

每次受保護請求重新讀取 User 與範圍授權，停用、改角色或撤銷範圍於下一次請求生效。列表、歷史、預覽與檔案串流也要檢查，不能只限制寫入。新建活動沒有指定活動授權，必須有分類授權。

## 媒體與操作紀錄（待 E／D）

- `POST /admin/media` 使用 multipart，`file` 與 `activityId`／`categoryId` 二擇一；伺服器檢查實際 JPEG、PNG、WebP 格式，原檔最多 10 MiB，拒絕超過 40MP 的解碼尺寸，重新編碼並將長邊縮到最多 4096px。儲存鍵由伺服器產生，不能使用訪客檔名作磁碟路徑。
- 上傳先為 PRIVATE。私有列表需指定一個活動或分類範圍，讀取檔案走 `/admin/media/{mediaId}/file`；公開檔案走 `/public/media/{mediaId}`，私有或不存在回 404。檔案回應設定正確 MIME 與 `nosniff`；私有回應禁止快取。
- 發布交易驗證所有媒體引用與範圍、建立版本引用並公開對應媒體，再切換公開版本；資料庫與檔案失敗要清理暫存。PUBLIC 媒體不允許刪除，避免破壞歷史公開連結；下架也不能撤回訪客已下載的副本。
- 媒體 `storageKey`、SHA-256 及內部磁碟位置不放入公開 DTO。操作紀錄與業務寫入同一交易建立，涵蓋帳號、授權、送審、發布、下架、還原及媒體操作。紀錄不包含密碼、密碼雜湊、Session、CSRF、OAuth code、Token 或啟用連結。
- `GET /admin/audit-entries` 僅 ADMIN，可用目標類型／ID 篩選，每頁 20 筆，依時間及 ID 最新優先；回傳 `{ items, page, pageSize, total }`。

## 共用介面與驗收責任

共用 DTO 在 `shared/cms-contract.ts`；公開活動型別與實際驗證在 `shared/activity-content.ts`。OpenAPI 是線上介面的來源，DTO 不包含 Prisma 物件、內部儲存鍵或憑證。錯誤為 `{ message, fieldErrors?: [{ path, message }], statusCode?, error? }`；內容驗證 400、未登入／停用 401、角色／範圍／CSRF 不符 403、不存在 404、版本／唯一身分／引用／最後管理員衝突 409、限速 429。

所有第一方寫入使用 Session 與 CSRF，包括匿名啟用／重設表單先取得匿名 CSRF；公開聯絡收件沿用既有限速流程。Token 設密碼另須有效 Token，Google callback 使用 OIDC state 保護。所有 JSON 管理回應禁止快取。

A 驗收模型、migration、唯一性／引用約束與契約完整性；C 驗收 Token 競爭、Google 綁定及即時授權；D 驗收審核交易與紀錄；E 驗收實際影像解碼、檔案存取及引用清理。未完成服務不能僅因模型／契約存在就標為可用。
