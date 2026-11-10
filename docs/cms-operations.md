# H／I：部署、備份、事件與站務交接

2026/11/10 新增工具與操作稿，未執行、未安裝排程、未連接正式主機，未讀取實際環境或憑證。本文的路徑與責任人均須由維運填入。工具存在不代表正式部署、備份、告警或還原驗收完成。

## 上線前交接表（H-2／H-3）

| 項目 | 待維運填寫／交付 |
|---|---|
| 正式站及測試站 | HTTPS 網域、DNS 管理人、Caddy 是否直接對外、是否另有 CDN／代理 |
| Linux 主機 | 連線方式、受限部署帳號、Docker 使用權、部署目錄、磁碟／volume 掛載點、維運窗口 |
| 責任分工 | 站務負責人、審核管理員、部署／備份／事件負責人、告警接收者及替代人 |
| 初始管理員 | 首次建立所需一次性密碼透過受控通道交接；已存在帳號先改密碼／重設，不能靠 seed 覆寫 |
| Google | 測試與正式 Web client 分開；client secret 僅放受限環境，callback 為 origin 加 `/api/v1/auth/google/callback` |
| 故障目標 | 建議 RPO 24 小時、RTO 4 小時，正式值由站務確認；演練前均未承諾達成 |
| 保存政策 | 收件及稽核的使用目的、期限、受控刪除與備份到期處理；不得在未確認前啟用刪除 |

帳號不開放註冊，管理員建立 EDITOR 並指定分類、活動、部門或系隊。啟用／重設連結只交付本人，不貼在議題、Git 或公開日誌。對現有管理員改密碼會撤銷全部 Session。production seed 拒絕已知開發預設密碼，但不能從其他密碼雜湊得知強度；需由負責人確認輪替。首次建立後移除 `ADMIN_INITIAL_PASSWORD` 並重建 backend。

Google 以本地帳號登入後主動綁定，確認顯示成功，再使用 Google 登入。驗收包括授權取消、未知 Google 帳號、相同 email 不自動合併、不同 Session 的 callback、過期／重放、nonce、既有其他綁定、停用及角色變更。保留結果與版本，不保存 code、Token、Cookie 或 secret。沒有憑證時保持待驗收。

正式部署沿用 `compose.yaml` 加 `compose.production.yaml`。各模組來源是建置參數；活動預設 api，組織與 K 預設 json。先在測試站完成本文驗收，再備份及切正式。記錄 source commit、Docker 映像 ID／registry digest、兩端 lockfile、PostgreSQL 版本、部署時間、執行者及回復映像。可變映像標籤不代表已審查的固定發行版；每月至少安排一次依賴／映像公告評估，緊急修補另行排程。SEC-008 的既有 audit 告警尚未逐項判定適用性。

## 每日異機備份（H-4／SEC-006）

交付 `deploy/backup.sh`、`operations.env.example` 及 systemd 範本。正式機需預先安裝 Docker Compose、restic、flock，建立 private staging／state 目錄及初始化遠端 restic repository；本輪未安裝任何依賴。repository 限遠端 SFTP、S3、B2、Azure、GS、rclone 或 HTTPS REST，備份由 restic 加密；不得把密碼直接放 repository URL。

實際 `operations.env` 存在 `/etc/nycuee`、0600，指定 off-host repository、獨立密碼檔、SSH known_hosts／受限帳號，以及真正的資料庫與媒體所在檔案系統。金鑰另行保管並保留第二管理者的緊急復原副本，不能只放被備份的主機或同一遠端目錄。遠端帳號限制讀寫／刪除能力，能使用不可變儲存時另由維運設定。

腳本取得互斥鎖、短暫停止 backend，取得 PostgreSQL custom dump 與媒體 tar 的同時段快照，複製環境及 Compose／版本資料，再啟動 backend。後續加密上傳在服務恢復後進行；中途錯誤會嘗試重啟原 backend、清除私有暫存並標記失敗。須把每日短暫停寫納入維護公告，其他資料庫寫入者也必須停止。腳本不停止資料庫，備份期間不得由外部管理工具修改內容或媒體。

同 host/tag 保存最近 30 天內全部成功快照；`forget --prune` 只針對 `nycuee-cms` 標籤及指定 host。遠端桶版本、不可變保留與提供者副本可能另外保留資料，由維運記錄；備份成功時間只在上傳及保留操作都成功後更新。restic 的上傳完整性不等於還原演練。

systemd 路徑預設 `/srv/nycuee`，套用前修改為實際位置。backup timer 為 UTC 19:00（台灣次日 03:00），最多隨機延後 15 分鐘；monitor 每五分鐘執行。模板未啟用。Docker 權限等同主機管理權，執行帳號須列入交接；保護 journal 存取，禁止在日誌輸出展開環境、dump、媒體、請求正文或 restic password。

## 成對還原（H-4／I-7c）

1. 用獨立主機或不對外的 Compose project 演練；禁止與正式 project 共用 volumes、網域及對外連接埠。準備相容映像、原生相同 PostgreSQL 大版本、空資料庫及獨立媒體 volume。Compose 的固定主機埠須以演練覆寫檔移除，或使用另一台主機，避免連到正式站。
2. 從已選定的 restic snapshot 解密至私有隔離目錄。`restic restore <snapshot-id> --target <private-directory>` 會保留原 staging 絕對路徑；找出包含 `database.dump`、`media.tgz`、`SHA256SUMS` 的同一目錄，記錄 snapshot ID 與捕獲時間。勿挑選不同快照的資料庫與媒體。不要把解密的 environment 輸出到日誌。
3. 備份復原目標目前的資料；核對 project／volume。設定 `CMS_RESTORE_PROJECT=<target>` 及 `CMS_RESTORE_CONFIRM=replace:<target>`，再執行 `bash deploy/restore.sh /absolute/snapshot-directory`。這是明確覆寫操作；腳本會停止目標 backend/web，交易式還原資料庫，移除並重建媒體內容，完成後保持應用停止。資料庫失敗不繼續改媒體；媒體失敗需保持停機，從同一備份重做，不能只重啟應用。
4. 先在私有環境檢查 schema、帳號、內容數量、公開指標、媒體引用與檔案、私有圖片保護、聯絡收件及稽核；不可把正式個資散布到開發電腦。還原環境必須限制網路、收件與 Google credentials。先啟動相符應用版本，再依已審查程序升級，避免啟動時自動 migration 引入未知變更。
5. 記錄開始／結束時間、資料捕獲時間、實際 RPO／RTO、版本、核對結果、失敗及處理，經負責人認定後才能恢復正式服務。演練完畢清除解密資料與測試 volumes，保留去敏感化證據。

`organization-cutover.sh rollback` 及新 `content-cutover.sh` 的自動回復只恢復應用映像／環境，不撤銷資料庫 migration／匯入，不是災難還原。CMS「歷史還原」只產生內容草稿。三種復原各自記錄，不能互相替代。

## 告警與事件（H-5／SEC-004、007、009）

`deploy/monitor.py` 以 HTTPS 探測健康端點、檢查備份失敗及最近成功時間（預設超過 26 小時告警）、檢查媒體／資料庫檔案系統可用容量（低於 2 GiB 或 10%）。只在問題集合改變／恢復時 POST JSON 至受限 HTTPS webhook；失敗不更新狀態，下輪重試，payload 只含服務名稱、時間、狀態及問題代碼。接收端須由維運配置轉送、接收者及值班升級。腳本寫入 state 目錄，部署前限制權限。若主機或排程本身停機，本機監控也無法通知，仍須外部 uptime／dead-man 監測及備份端巡檢；此項尚待接入。

收到告警後先紀錄事件時間、影響、負責人及最近變更，檢查私有服務紀錄；不可貼出機密。服務故障依原因選擇恢復資料庫、重啟或回復已驗收映像；磁碟不足優先停止新增圖片、擴充容量或移除已確認可清理的暫存，不能直接刪除媒體 volume。備份失敗需在下一個備份時點前處理，保留既有可還原快照與金鑰。

上傳保護在 multipart buffering 前執行，每帳號每分鐘預設 10 次、每 backend process 同時 2 個請求；空間預留預設 1 GiB，加上各槽 64 MiB 的輸出預算。頻率計數保存在資料庫，槽位在成功／失敗時釋放；多副本併發上限是每個 process，不能視為全站硬配額。變數為 `MEDIA_UPLOADS_PER_MINUTE`、`MEDIA_UPLOAD_CONCURRENCY`、`MEDIA_MIN_FREE_BYTES`。容器／代理仍須依正式容量另設限制及量測；SEC-004 完整容量與孤兒檔處理尚待驗收。

誤發布圖片可由管理員呼叫 `POST /api/v1/admin/media/:id/revoke`，含 Session、CSRF 與 `{reason}`。該操作保留檔案、版本及稽核，阻止新的匿名源站讀取，後續發布也拒絕引用；管理員仍可受保護地查閱。公開媒體的新回應改為 5 分鐘再驗證，原本一年快取的副本不能遠端強制撤銷。事件還須下架／修正引用、清除可控 CDN 快取、輪替相關機密，並通知資料負責人處理已下載或第三方副本。不可宣稱圖片下架即可完全回收。

收件／稽核保存由資料負責人設定 `CONTACT_RETENTION_DAYS`、`AUDIT_RETENTION_DAYS`（至少 30 天）。`npm run operations:retention` 只列數量；明確加 `--apply` 才刪除到期的已讀收件及舊稽核，保留未讀收件並登錄本次刪除數量。未設定不執行、沒有自動排程。此工具無法代替個別事件或法律保留需求；有保留案件時暫停整批清理。備份內資料依 30 天政策到期，事件應記錄此延遲。工具尚未執行。

## 正式內容切換與站務（H-6／I-7b／K）

凍結舊 JSON 修改，先備份並留存舊映像。原組織切換仍使用 `organization-cutover.sh`；首次全站切換交付 `content-cutover.sh /absolute/new-backup-directory`，明確使用正式覆寫，依序 migration、三組匯入 dry-run／匯入、設四個來源為 api 並重建 web。已有後台編輯時匯入工具會停止，不提供強制覆寫；此時應由維運分模組處理，不能重跑首次遷移工具覆蓋正式內容。腳本會短暫恢復服務後再停寫執行遷移，需在凍結公告期間操作。

腳本不代替正式逐筆比對：活動 11 筆／分類 5 筆／舊圖片、總覽 1／部門 4／系隊 9、首頁 6 輪播／資源 4 頁及設定都要比對，並確認既有網址、空值與預留圖片、行事曆、ICS、搜尋。正式資料一旦編輯，不再用舊 fixture 當唯一真值。取得驗證許可後依 [驗收清單](cms-acceptance.md)執行，結果不符則停止宣告上線並依回復計畫處理。

交接給編輯者的操作：登入 → 選授權內容 → 修改並預覽 → 手動儲存 → 送審；送審凍結，要修改先撤回。管理員檢視送審版本並發布或填原因退回。看到 409 保留表單，與另一位編輯者協調後再載入最新版本；不要重複送出覆蓋。歷史還原會產生草稿，仍須送審發布。K 三組管理員表單可上下排序、增刪項目、選圖、預覽與查歷史。

正式交接表至少記錄部署／切換版本、四種來源設定、內容負責人、日常審核人、告警聯絡方式、備份位置及金鑰管理人、最近一次還原證據、可接受 RPO／RTO、回復步驟及未解問題。這些尚未填寫或演練，不得勾選 H／I 正式完成。
