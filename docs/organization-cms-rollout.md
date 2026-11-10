# 系學會與系隊：遠端切換與回復

2026/11/03 已依使用者要求在本機既有 Compose 完成 migration、14 份內容匯入、API 來源切換與資料核對。未跑測試或瀏覽器驗收。遠端網址、連線方式及部署目錄目前未提供，尚未遠端切換。

## 執行前資料

在既有遠端部署目錄操作，沿用該站 `.env`、Compose project 名稱、PostgreSQL 和媒體 volume。需要 Docker Compose（支援 `up --wait`）、足夠的備份空間及可寫入的站外備份目錄。`APP_ORIGIN`、`SITE_ADDRESS` 必須指向正式站。若原部署使用 `COMPOSE_PROJECT_NAME`，執行時沿用相同設定，避免建立另一套空 volume。

先將對應版本送達遠端，保留正式 `.env` 及站點現有 Caddy 設定，並凍結這 14 份來源 JSON 的更新。切換期間腳本會暫停 backend，完成或回復後再啟動。

正式環境先確認[正式 Compose 與安全前置條件](security-review.md#部署與回復操作)。腳本會從現有 backend 容器的 Compose 標籤辨識 `compose.production.yaml`，並在備份、切換及回復時沿用該覆寫。11/10 已有腳本語法檢查紀錄，使用正式覆寫的實際切換／回復演練仍待辦。

Docker 啟動時的 `content:bootstrap` 僅在組織三張資料表皆空時匯入初始內容。既有站點切換仍依下列備份、試跑、比對與來源設定流程處理。[初始化程式](../backend/src/bootstrap-content.ts)

## 一次切換

以下 `/srv/nycuee` 和備份路徑為範例；使用實際遠端目錄，備份目錄須為新的空目錄：

```bash
cd /srv/nycuee
bash deploy/organization-cutover.sh switch /srv/backups/nycuee/organization-20261103
```

腳本依序執行：

1. 保存原 `.env`、目前 backend／web 映像與回復用 Compose override。
2. 建立新 backend 映像，盤點 14 份來源及圖片 manifest。
3. 停止 backend，備份 PostgreSQL（custom dump）與媒體 tar，記錄 SHA-256。
4. 套用已提交 migration；試跑匯入，有任何差異整批停止；相同內容跳過。
5. 匯入新資源，以 `--compare` 比對資料庫公開內容。活動、帳號、Session 及收件資料不在匯入寫入範圍。
6. 將 `.env` 的 `VITE_EESA_SOURCE`、`VITE_TEAM_SOURCE` 設為 api，建立 web 映像並更新 backend／web。
7. 等服務就緒，再透過 APP_ORIGIN 比對兩個公開 API 是否與 14 份來源一致；保存報告。若本機 APP_ORIGIN 是 localhost，可在腳本前設定 `ORGANIZATION_PUBLIC_ORIGIN=http://web`，比對會透過 Compose 內網連到 Caddy 並保留原 Host 標頭。

備份包含 `database.dump`、`media.tgz`、`environment`、`compose.rollback.yaml` 及核對報告。`environment` 含正式機密，目錄權限由 umask 077 限制，請以原有安全管道備份到異機並保留 30 天。映像標籤為 `nycuee-org-rollback-backend:{timestamp}` 與 `nycuee-org-rollback-web:{timestamp}`；回復期間勿清除這些映像。

若步驟失敗，腳本會恢復原環境設定及應用映像。已新增的資料表及匯入內容保留，原版本仍使用原來源；此回復不刪除資料庫內容。若自動回復也失敗，使用下一節的手動命令。

## 匯入與資料核對指令

本機在 backend 目錄，Docker 使用 `docker compose run --rm --no-deps --entrypoint npm backend` 代替下列 npm 前綴。資料庫模式需先套用 migration；inventory 不連資料庫。

```bash
npm run organization:import -- --inventory
npm run organization:import -- --dry-run
npm run organization:import
npm run organization:import -- --compare
npm run organization:import -- --compare-public
```

inventory 列出來源數量、圖片及缺圖；dry-run 不寫資料；一般匯入只建立不存在的固定資源，與既有公開內容不一致、存在工作版本或曾下架都視為衝突。compare 要求全部來源存在且內容相同。compare-public 透過 APP_ORIGIN 讀取公開快照進行逐項比對。這些比對適用初次切換；後台開始更新後，與原 JSON 有差異是預期行為，不再重跑初次匯入覆寫內容。

## 應用回復

```bash
cd /srv/nycuee
bash deploy/organization-cutover.sh rollback /srv/backups/nycuee/organization-20261103
```

此命令恢復原映像及環境設定，保留現有資料庫與媒體。只切回 JSON 會顯示匯入前的基準，不包含其後的 CMS 修改。若需回復資料，優先使用版本還原與重新發布；整庫還原會影響備份後的所有站務資料，應在停止寫入並保存當前資料後，由維運依既有 PostgreSQL／媒體災難復原流程處理。

僅先備份可執行：

```bash
bash deploy/organization-cutover.sh backup /srv/backups/nycuee/before-organization
```

## 交付狀態

- I-1 至 I-6：程式已接入，已更新本機容器、套用 migration、匯入並切換 API；資料核對一致，未跑測試或瀏覽器驗收。
- I-7：本機切換與失敗時應用回復已實際執行；遠端部署資訊未定，尚未遠端部署。
- 完整回歸、瀏覽器、權限整合、備份還原演練與 H 的維運告警仍未驗收。
