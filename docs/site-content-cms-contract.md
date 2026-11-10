# K：首頁、學習資源與全站設定契約

2026/11/10 程式交付，尚未驗證或部署。沿用既有 React／NestJS／PostgreSQL，不引入其他託管平台。[OpenAPI](site-content.openapi.json)記錄端點與工作流要求，完整內容 DTO 與共用驗證以 `shared/site-content.ts` 為準。

## 發布單位與權限

| 識別值 | 一次發布的內容 | 後台入口 | 角色 |
|---|---|---|---|
| home | 探索文案、站內連結、有順序的輪播圖片、替代文字、裁切位置與文字 | `/#/admin/site-content/home` | ADMIN |
| resources | 分類、預設分類及全部頁面、連結、流程／清單區塊 | `/#/admin/site-content/resources` | ADMIN |
| settings | 機構、信箱、辦公室、官方網站／公告與三種社群連結 | `/#/admin/site-content/settings` | ADMIN |

EDITOR 沒有這三組資源及圖片的權限；第一版不擴張編輯者全站權限。ADMIN 可送審及發布，允許同一管理員完成兩個步驟，沒有強制雙人審核。所有寫入要求 Session、CSRF，交易內重讀帳號啟用狀態與 ADMIN 角色。UI、Node 共用 `shared/site-content.ts`；資源沿用抽到 `shared/resource-content.ts` 的原驗證器與型別。

`SiteContent` 的 version 與公開／工作指標獨立。每個指標以複合外鍵限定同一資源，版本序號唯一。草稿儲存不切公開指標，送審凍結，撤回／退回才能再改；發布只接受送審版本，在 Serializable 交易驗證內容與圖片、切換公開指標及寫操作紀錄。下架清空公開指標，歷史保留；還原建立新草稿，有工作版本時拒絕。所有流程帶目前 version，過時回 409。

學習資源以整組發布，內部頁面 status 固定 published；外層版本控制草稿，避免混合兩種狀態。已公開頁面 id 在後續發布必須保留，維持既有 `/resources/<id>`；順序跟隨分類陣列，預設分類必須存在，分類與頁面一一對應。首頁順序跟隨 slides 陣列，至少一張。

## API

| 方法／路徑（均加 `/api/v1`） | 要求／回應 |
|---|---|
| GET `/public/site-content` | 一致快照 `{home, resources, settings}`，各組未匯入／下架回 null，只讀公開且 PUBLISHED 的版本 |
| GET `/admin/site-content/:id` | 資源 version、公開版本、工作版本及最新歷史版本，供下架後繼續編輯 |
| GET `/admin/site-content/:id/revisions` | `{items}`，依序號遞減；僅 ADMIN |
| PUT `/admin/site-content/:id/draft` | `{version, content}`，200 回更新後資源 |
| POST `/admin/site-content/:id/submit`、`withdraw`、`publish`、`unpublish` | `{version}`，200 回更新後資源 |
| POST `/admin/site-content/:id/reject` | `{version, reason}`，原因 1–2000 字 |
| POST `/admin/site-content/:id/restore` | `{version, revisionId}`，只可選同組歷史版本 |

錯誤：400 欄位錯誤（`fieldErrors` 的 content 路徑）、401 未登入、403 權限或 CSRF、404 未匯入／未知資源、409 版本或流程衝突。後台保留失敗時的表單；409 提供明確的放棄修改／重新載入入口。

首頁圖片以 `siteContentId=home` 使用既有媒體上傳／列表／選圖。每個版本保存 `SiteContentMediaReference`，被歷史或工作版本引用時不能刪除。發布檢查歸屬與實體檔案、拒絕已緊急撤回圖片，才改寫公開 URL。舊圖限原首頁 JSON 中的圖片，不接受任意網站檔案。全站設定不含圖片，資源維持原連結與文字版型。

## 匯入與切換

舊首頁、資源分類／頁面與聯絡資料保留於 `frontend/src/content`。聯絡原始常數已移到 `site/settings.json`，既有 TypeScript 入口繼續 re-export。首頁原資料沒有 alt 的項目，以原標題作首次替代文字，可在後台修改。

從 backend 執行 `npm run site:import -- --inventory`、`--dry-run`，再無參數匯入。手動匯入同資料跳過、有差異或工作版本則整批停止，沒有強制覆寫。Docker `content:bootstrap` 只建立缺少的三組資源，已存在者永遠保留後台編輯；初始化仍須先套用本次 migration／重新產生 Prisma Client。來源目錄可由 `SITE_CONTENT_DIR` 指定，Docker 自帶匯入資料。

`VITE_SITE_CONTENT_SOURCE=json` 為導入預設；匯入並取得驗收許可後才設為 api 重建 web。API 模式在路由切換、回到頁面及重試時讀取公開快照，失敗顯示重試，沒有 JSON 自動回退。下架的首頁／資源顯示準備中，設定不再顯示舊聯絡資料；其餘功能仍可使用。頁尾、聯絡頁、系學會聯絡區、首頁入口、資源頁籤及搜尋都使用相同公開內容。既有活動、日曆、ICS 與組織來源設定保持獨立。

## 待驗收

新增 `site-content.test.ts` 與 `workflows.test.ts`，僅撰寫、未執行。尚待確認遷移、前後端建置、完整 API／真實瀏覽器流程、無障礙與來源切換回復；不把後台預覽或測試存在當作驗收通過。正式切換前沿用維運手冊備份資料庫、媒體及環境，保存映像並完成還原演練。
