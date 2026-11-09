# 網站與 CMS 資安檢視

檢視日期為 2026/11/10（台灣時間），原始碼基準為 `a834118`。**僅靜態檢視，未執行動態安全驗證。** 本文件交付 [任務 J](admin-cms-plan.md#18-j資安與網站安全檢查任務規格僅撰寫-markdown) 的風險登錄及修補計畫。表列修補與驗證皆待辦。歷史測試與本機切換結果以[計畫第 14、16 節](admin-cms-plan.md)為準。

## J-1　資料流與信任邊界

| 邊界 | 資料流、存放與存取者 | 檢視依據與限制 |
|---|---|---|
| 瀏覽器 → Caddy → API | Caddy 提供公開前台與同源後台，並把 `/api/*` 交給 NestJS。訪客可讀已發布內容及提交聯絡表單。管理端使用 Session Cookie，寫入還須通過後端 CSRF 與角色檢查 | [Compose](../compose.yaml)、[Caddyfile](../deploy/Caddyfile)、[app.ts](../backend/src/app.ts)。正式網域、TLS 終止點、CDN 與代理跳數待確認 |
| API → PostgreSQL／媒體 volume | PostgreSQL 存帳號、授權、Session 摘要、密碼票券摘要、內容版本、聯絡收件及稽核資料。圖片檔存獨立 volume，資料庫記錄可見性與引用。EDITOR 只可存取授權內容，ADMIN 可管理帳號、發布、查稽核及收件 | [Prisma schema](../backend/prisma/schema.prisma)、[平台契約](cms-platform-contract.md)。主機、資料庫及 volume 的實際操作權限待確認 |
| 瀏覽器／API ↔ Google | 瀏覽器前往 Google 授權後回到本站 callback，API 向 Google 換取及驗證身分。Google 身分映射至本地帳號，角色由本地資料庫決定 | [google-auth.ts](../backend/src/google-auth.ts)。正式 client、callback 與實際授權未驗證 |
| 服務 → 備份 | 維運者執行切換腳本，快照含資料庫、媒體、回復設定與含機密的環境設定副本。維運與備份存取屬獨立信任邊界 | [切換腳本](../deploy/organization-cutover.sh)、[回復手冊](organization-cms-rollout.md)。異機副本、金鑰管理、存取者及還原紀錄待確認 |

檢視來源限工作區原始碼、契約、公開設定範本、依賴清單及鎖檔、部署設定與歷史文件。正式與本機的實際環境設定、資料庫記錄、媒體與備份內容、OAuth 憑證、容器狀態及外部流量均未查閱。

## J-2 至 J-6　已見防護、證據及限制

| 範圍 | 靜態觀察 | 證據限制 |
|---|---|---|
| J-2 帳密與 Session | seed 與改密碼採 Argon2id。密碼票券有期限，兌換時在交易中標記使用並撤銷 Session。登入輪替 Session，Cookie 有 HttpOnly、SameSite=Lax，Secure 由設定控制。Session 最長 8 小時，匿名 Session 30 分鐘，程式定時清理到期資料。登入及密碼端點有限速，直接寫入後台須通過 CSRF。見 [seed.ts](../backend/prisma/seed.ts)、[auth.ts](../backend/src/auth.ts)、[accounts.ts](../backend/src/accounts.ts)、[main.ts](../backend/src/main.ts) | 正式 Cookie、舊管理員密碼、併發兌換及限速效果待驗證。匿名 CSRF 發行另見 SEC-003 |
| J-2 Google 與權限 | OAuth 有 Session 綁定的單次 state、nonce 與 PKCE S256，驗證 ID Token 並以 Google `sub` 查找已綁定帳號。綁定須已登入並通過 CSRF。帳號更新限制停用或降級最後可登入的管理員。後端逐請求讀取帳號狀態，內容操作按資源範圍授權。見 [google-auth.ts](../backend/src/google-auth.ts)、[accounts.ts](../backend/src/accounts.ts)、[content-access.ts](../backend/src/content-access.ts) | Google 實際 callback、登入／綁定拒絕路徑與跨資源矩陣待 H-1、H-2、I-7a 驗證 |
| J-3 工作流與輸入 | 活動、總覽、部門與系隊分開保存工作及公開版本，透過後端授權、版本號與 Serializable 交易處理草稿、凍結、審核與發布。JSON 有 1 MiB 限制。共用驗證限制活動外連為 HTTP(S)、組織側欄為符合格式的站內路由，媒體引用另由後端驗證。檢視路徑以 Prisma 查詢及 React 文字呈現為主，收件正文作文字呈現。見 [活動工作流](../backend/src/activity-workflow.ts)、[組織工作流](../backend/src/organization.ts)、[交易與錯誤處理](../backend/src/account-utils.ts)、[活動驗證](../shared/activity-content.ts)、[組織驗證](../shared/organization-content.ts)、[收件介面](../frontend/src/features/admin/ContactInbox.tsx) | 尚需驗證各呈現面對惡意字串的處理、錯誤回應去敏感資訊、越權與併發寫入 |
| J-4 媒體與公開資料 | 上傳限制 10 MiB／40MP，只收可解碼 JPEG、PNG、WebP 且拒絕動畫，轉成最長邊 4096px 的 WebP。磁碟檔名由伺服器產生，讀取會驗證檔名格式。私有媒體按範圍授權並標 `no-store`。公開 API 依公開版本指標與狀態讀取，公開媒體才可匿名讀取，且允許長期快取。被引用或已公開的媒體受刪除保護，寫入失敗有清理路徑。見 [media.ts](../backend/src/media.ts)、[public-activities.ts](../backend/src/public-activities.ts)、[organization.ts](../backend/src/organization.ts) | 仍須驗證快取隔離、發行與下架、清理失敗和資源上限。已公開媒體持續可讀屬既有設計，緊急移除須另有程序 |
| J-5 部署與供應鏈 | API 啟用 Helmet，檢視的啟動設定未開放跨來源 CORS，正式部署設計為同源。Compose 只對外發布 Caddy 埠，資料庫埠綁 localhost，API 無主機映射。後端以 `node` 使用者執行，容器使用持久 volume。正式模式會檢查 HTTPS origin 及 Secure Cookie。兩端用 `npm ci` 依鎖檔安裝。見 [app.ts](../backend/src/app.ts)、[Compose](../compose.yaml)、[Caddyfile](../deploy/Caddyfile)、[後端映像](../backend/Dockerfile)、[前台映像](../deploy/Dockerfile.web)、[公開設定範本](../.env.example) | 正式代理鏈、CORS 回應、容器權限、秘密輪替與已部署映像摘要待查。正式模式與前台標頭見 SEC-001／002 |
| J-6 個資、稽核與復原 | 公開收件有欄位長度限制、honeypot 與 IP 限速。收件及操作紀錄讀取使用 AdminGuard，管理寫入多在交易中寫稽核事件。所讀密碼事件記錄用途或動作，無原始票券欄位。切換備份用 `umask 077` 並保存資料庫與媒體快照。見 [contact.ts](../backend/src/contact.ts)、[accounts.ts](../backend/src/accounts.ts)、[Prisma schema](../backend/prisma/schema.prisma)、[切換手冊](organization-cms-rollout.md) | 保存／刪除規則、正式日誌遮罩、異機加密、事件處置及還原成效待確認 |

供應鏈後續查核基準如下。版本來自兩端 package manifest、鎖檔及映像宣告，實際部署版本與漏洞適用性需獨立查證。

- 後端鎖檔：NestJS Core 11.2.8、Express 5.3.0、Multer 2.5.0、Sharp 0.34.5、Argon2 0.41.1、Google Auth Library 10.9.1、Helmet 8.3.0、Prisma Client 6.19.3。[後端清單](../backend/package.json) · [後端鎖檔](../backend/package-lock.json)
- 前端鎖檔：React／React DOM 19.3.0、React Router DOM 7.18.4、Vite 7.3.7。[前端清單](../frontend/package.json) · [前端鎖檔](../frontend/package-lock.json)
- 映像標籤：`node:22-bookworm-slim`、`caddy:2-alpine`、`postgres:16-alpine`。標籤會隨上游更新，另需記錄映像摘要與原生元件版本，例如 libvips、OpenSSL。

## J-7　風險登錄

「靜態事實」指可直接從版本庫確認的設定或行為。「待驗證」指有程式證據，但實際效果須另測。「資訊不足」指需要正式環境或維運證據。等級按影響及成立前提評估，優先序可隨驗收證據更新。

| 編號 | 類別／項目 | 證據位置與觀察 | 判定狀態 | 風險等級與理由 | 影響範圍／成立前提 | 修補建議 | 後續驗證方法 | 對應任務／負責人 |
|---|---|---|---|---|---|---|---|---|
| SEC-001 | 正式設定及初始管理員 | [Compose](../compose.yaml) 預設 development、HTTP、非 Secure Cookie。[createApp](../backend/src/app.ts) 與 [appOrigin](../backend/src/account-utils.ts) 只在 production 強制安全設定。[seed](../backend/prisma/seed.ts) 會保留既有管理員 | 靜態事實，正式設定未知 | 高：錯誤部署或保留舊弱密碼可影響管理帳號 | 正式部署沿用開發預設，或沿用曾用開發預設密碼的資料庫 | 正式部署須明確選用 production 設定，拒絕 HTTP origin、不一致的站址或非 Secure Cookie。正式管理員走受控初始化，舊帳號先輪替密碼並撤銷 Session，移除一次性初始化機密 | 在隔離環境逐項缺填或錯配並確認啟動被拒。合法設定驗證 HTTPS、Cookie、登入登出、OAuth 及舊密碼失效 | H-2／H-3，未指派 |
| SEC-002 | 前台安全標頭 | [Caddyfile](../deploy/Caddyfile) 的靜態 HTML 分支只明訂入口快取策略。[Helmet](../backend/src/app.ts) 在 API | 靜態事實，外層代理未知 | 中：缺少瀏覽器防禦層會增加嵌框誘導或注入的影響 | 正式前台未由其他代理補標頭 | 前台加防嵌框、nosniff、Referrer-Policy。CSP 先在測試站採 Report-Only，盤點字型、預覽、樣式後再啟用。HSTS 隨已驗收的 HTTPS 設定部署 | 比對前台與 API 標頭。以瀏覽器驗證 Google Fonts、前台樣式、圖片預覽、OAuth 導向及嵌框拒絕 | H-3／後續修補，未指派 |
| SEC-003 | 匿名 Session 與代理信任 | [AuthService.csrf／limitLogin](../backend/src/auth.ts) 在無有效 Session 時建資料，該端點未見限速。[app.ts](../backend/src/app.ts) 可設定信任一跳 | 靜態事實，耗用程度與代理行為待驗證 | 中：可反覆觸發資料庫寫入，並可能受代理 IP 辨識影響 | 外部可大量重送無有效 Cookie 的請求，或代理拓撲與信任跳數不符 | 在匿名 Session 建立前以可信來源 IP 限速，設定總體保護，重用有效 Session。限制後端入口並核對 Caddy 轉送標頭，保留原端點限速 | 使用隔離服務驗證重用不新增 Session、超限回 429、偽造轉送標頭無法繞過及登入／收件流程仍可用 | H-3／後續修補，未指派 |
| SEC-004 | 媒體記憶體、CPU 與磁碟容量 | [AdminMediaController／MediaService.upload](../backend/src/media.ts) 有單檔及像素限制，未見帳號頻率、整體併發與容量限制 | 靜態事實，實際容量待驗證 | 中：合法尺寸的並行上傳仍可能消耗資源 | 授權帳號大量送檔，或尖峰流量超過主機及 volume 容量 | 在接收 multipart 前限制頻率與接收併發，解碼另設上限。容量不足拒絕新上傳並告警，明定配額、保留空間及孤兒檔處理 | 以隔離環境驗證超額拒絕、槽位釋放、異常解碼、併發及磁碟不足時無錯誤資料或未登錄檔案 | H-5／後續修補，未指派 |
| SEC-005 | 權限、並行及公開隔離 | [ContentAccess](../backend/src/content-access.ts)、[活動工作流](../backend/src/activity-workflow.ts)、[組織工作流](../backend/src/organization.ts)、[媒體](../backend/src/media.ts) 已有範圍、版本及可見性檢查 | 待驗證，已見防護 | 待定：若授權或快取有缺口，草稿、歷史及私有圖片可能外洩 | 特定路由、角色組合、交易競態或代理快取實際行為偏離契約 | 先補 H／I 直接 API 矩陣，依失敗案例修補最小缺口，沿用既有公開／後台介面 | 以互不相交授權帳號測列表、詳情、歷史、預覽、圖片、寫入與撤權。比對公開 API／搜尋，檢查 CSRF、錯誤碼、快取及版本衝突 | H-1／I-7a，未指派 |
| SEC-006 | 備份機密、異機與告警 | [切換腳本](../deploy/organization-cutover.sh) 複製環境設定，用本機權限保護。現有文件缺完整異機還原、告警紀錄 | 靜態事實，正式保護資訊不足 | 高：快照外洩可暴露資料與機密，故障可同時失去主機與本機副本 | 未加密副本被取得，或主機損毀且無可還原的異機副本 | 每日加密異機備份，保留 30 天，金鑰與備份分離。限制讀取與刪除權限，另訂事件處理及機密輪替程序 | 用隔離環境驗證金鑰權限、資料庫與媒體一致還原、實測 RPO／RTO、服務／備份／容量告警送達指定人員 | H-4／H-5，未指派 |
| SEC-007 | 聯絡個資與稽核保存 | [ContactService／AdminContactController](../backend/src/contact.ts)、[AuditController](../backend/src/accounts.ts) 有管理員限制，已閱程式與文件未見收件／稽核保存與刪除政策 | 資訊不足 | 中：累積個資會擴大誤用或外洩影響 | 長期保存、權限過寬或日誌蒐集敏感欄位 | 由站務訂定目的、保存期限、受控刪除、備份期限及存取檢討，限制日誌欄位及事件處理者 | 以合成收件驗證存取、保存與刪除範圍，核對 API／代理／備份作業日誌沒有敏感內容 | H-5／後續維運，未指派 |
| SEC-008 | 依賴與映像更新 | [後端鎖檔](../backend/package-lock.json)與[前端鎖檔](../frontend/package-lock.json) 可追查 npm 版本，基礎映像用可變標籤 | 資訊不足，未查公告及實際映像 | 待定：取決於實際版本、漏洞條件與可達性 | 部署版本受影響且使用路徑可觸發 | H-3 記錄實際映像摘要與依賴清單，建立可審查的更新週期，後續檢查公告並針對適用項目修補 | 比對部署摘要，按可達性評估公告；更新後驗證編譯、API、圖片與 OAuth | H-3／後續供應鏈查核，未指派 |
| SEC-009 | 曾公開媒體的緊急撤回 | [MediaService.file／remove](../backend/src/media.ts) 提供一年 immutable 快取，禁止刪除已公開媒體；內容下架不會撤回原媒體 | 靜態事實 | 中：誤公開後原連結及快取可繼續提供圖片 | 誤發布含敏感內容的媒體，或第三方已保存副本 | 明定緊急事件處理流程，涵蓋停止源站存取及清除受控代理快取。保留版本追蹤，記錄既有瀏覽器與第三方副本的限制 | 用合成圖片驗證下架及緊急處置後的源站、受控快取和版本還原行為 | H-5／I-7a，未指派 |

安全標頭與限額設計參考 [OWASP HTTP Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) 與 [DoS 防護指引](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)。

### 修補順序與交付條件

| 順序 | 工作與影響介面 | 相依工作與驗收門檻 | 回復或停止條件 |
|---|---|---|---|
| 1．正式部署門檻 | SEC-001／002。影響 Compose 啟動、Caddy 前台標頭與管理員初始化程序 | H-2／H-3 先取得正式網域與代理拓撲，依風險表完成隔離驗收，再上線 | 若登入、OAuth、字型或預覽回歸，停止切換。CSP 回到 Report-Only 或恢復上一版已驗收的 HTTPS 設定。保留已完成的憑證輪替 |
| 2．資源保護 | SEC-003／004。影響 CSRF Session 發行、代理來源判定及 multipart 上傳的超限回應。維持正常請求格式，明訂 429、容量拒絕與重試行為 | 依實際代理、主機資源與校園共用 IP 測量門檻。H-5 先有監測。以尖峰、正常流程和清理結果驗收 | 誤擋或錯誤率明顯上升時，在測試環境調整門檻或恢復上一組已驗收限額，並確認容量仍有保護 |
| 3．權限與公開隔離 | SEC-005／009。影響受保護 API、發布／下架、搜尋及媒體讀取。以既有契約為驗收基準 | 合併 H-1／I-7a 驗證；使用有重疊與無重疊授權的測試帳號，確認 401／403／404 按契約處理、衝突回 409、公開層只取得公開資料。確認票券重用、停用後存取及舊 Session 均被拒 | 有越權或私有資料流入公開層時暫停切換，必要時停用受影響路徑或回到上一個已驗收版本，再重驗 |
| 4．維運與供應鏈 | SEC-006／007／008。影響快照、金鑰、日誌、告警及映像更新程序 | 異機加密及還原演練在正式遷移前完成，與 H-4／H-5 並行。由維運確認可接受 RPO／RTO、收件及紀錄期限，指定備份、告警、事件與依賴更新負責人 | 新備份無法還原或告警未送達時，保留上一套可還原備份及金鑰並停止正式資料切換。映像更新遇相容性回歸時，保留已驗收摘要並記錄待修風險 |

上述測試先使用隔離環境、合成資料及獨立 Google 測試設定。正式主機、網域、代理拓撲、憑證設定、容量門檻、保存期限與負責人仍待 H／I 取得。未執行建置、依賴或映像掃描、HTTP／瀏覽器檢查、壓力測試、還原演練及部署。
