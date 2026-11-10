# 網站與 CMS 資安檢視

初始檢視日期為 2026/11/10（台灣時間），原始碼基準為 `a834118`。本文件交付[任務 J](admin-cms-plan.md#18-j資安與網站安全檢查任務規格僅撰寫-markdown)的風險登錄及修補計畫。前半部保留初始靜態觀察，SEC-001 至 SEC-003 的程式修補與隔離驗收以末節為準。既有回歸失敗由[總計畫第 17 節](admin-cms-plan.md#17-未完成任務盤點與後續交辦20261110) H-1 追蹤。

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

## 第一批修補與隔離驗收（2026/11/10）

本節為 SEC-001 至 SEC-003 的後續實作紀錄，前述 J-1 至 J-7 保留初始靜態盤點。使用者已授權程式修補、建置與隔離動態驗證。

| 項目 | 程式交付 | 本機隔離驗收 | 正式環境待辦 |
|---|---|---|---|
| SEC-001 | [正式 Compose](../compose.production.yaml) 固定 production 與 Secure Cookie，API／Caddy 共用必填 APP_ORIGIN。[origin 檢查](../backend/src/account-utils.ts) 回傳去敏感資訊錯誤。[seed](../backend/prisma/seed.ts) 檢查所有啟用 ADMIN 是否仍使用已知開發預設密碼 | 正式覆寫及缺少 origin 拒絕通過。以隔離 CA 驗證正式模式的 HTTPS 登入、登出、Session 撤銷及 Secure／HttpOnly／SameSite=Lax Cookie。新帳號初始化、重跑保留安全密碼、其他啟用管理員的預設密碼拒絕、停用／EDITOR 排除均通過 | 既有管理員實際輪替、正式 origin／憑證與 Google callback、遠端切換待 H-2／H-3 |
| SEC-002 | [Caddyfile](../deploy/Caddyfile) 對前台及靜態錯誤回應設定 nosniff、防嵌框、Referrer-Policy、強制 frame-ancestors 與完整 Report-Only CSP。HTTPS 正常／錯誤回應設定一年 HSTS，後端停用重複 HSTS | HTTP／HTTPS 各五種路徑通過，涵蓋首頁、靜態 404、健康端點、401、API 404。HTTPS 憑證由隔離 Caddy CA 驗證，HSTS 單一且 HTTP 無 HSTS。瀏覽器確認登入、編輯、預覽、圖片載入、字型設定與嵌框拒絕 | 正式 TLS 及完整 Google OAuth 待驗證。完整 CSP 保留 Report-Only，待完整站點流程覆蓋再升級 |
| SEC-003 | [匿名 Session 限額](../backend/src/auth.ts) 在新建前依序檢查 IP 與全站資料庫原子計數，429 帶 Retry-After。有效 Session 重用，Google start 共用限制，到期計數器納入清理 | 第 31／301 次拒絕、多 service instance 併發、API 重建保留額度、分鐘切換、無效／到期 Cookie、資料庫失敗拒絕、改密碼與登出通過。經 Caddy 使用不同偽造 X-Forwarded-For 仍於第 31 次被拒 | 校園 NAT 的真實流量門檻、正式代理鏈與流量監控待 H-3／H-5 |

初始門檻由 `ANONYMOUS_SESSION_IP_LIMIT=30` 與 `ANONYMOUS_SESSION_GLOBAL_LIMIT=300` 控制，以固定一分鐘計數。兩者必須為正安全整數，且全站不得小於單 IP。有效 Session 取得 CSRF Token 不計入新建額度。限額限制新增 Session 數量，請求仍會抵達 API 並存取計數資料庫，外部大量流量保護仍屬維運容量工作。

已知預設密碼檢查只辨識專案開發預設值。其他既有密碼的長度與強度無法從雜湊還原，仍須完成正式密碼輪替。任何啟用 ADMIN 命中檢查時，seed 以固定訊息拒絕啟動，既有資料保持可供受控管理流程處理。

### 部署與回復操作

1. 正式切換前，在既有受控環境透過「我的帳號」改密碼或管理員重設流程輪替既有管理員密碼。這兩條流程會撤銷舊 Session。已有安全帳號時，重跑 seed 保留其雜湊。
2. 將正式值放入已被 Git 與 Docker build context 忽略的 `.env`，包含資料庫密碼、明確的 `APP_ORIGIN=https://正式網域` 與所需 Google 設定。首次建立 admin 才需要 `ADMIN_INITIAL_PASSWORD`，完成後移除並重建 backend 容器以移除其環境值。
3. 由維運完成備份及 H-3 設定確認後，使用下列正式命令。先以 `config --quiet` 驗證組合設定，避免把含機密的展開設定輸出到紀錄。

```sh
docker compose --env-file .env -f compose.yaml -f compose.production.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.production.yaml up -d --build --wait
```

4. 正式 Compose 固定安全模式，並用 APP_ORIGIN 作為 Caddy SITE_ADDRESS。API 維持無主機映射。此設定以 Caddy 直接接收訪客請求的一跳拓撲為基準，加入 CDN／上游代理時應重新設定及驗證來源識別。
5. 正式維運及回復指令應保留兩個 Compose 檔案。既有 [organization-cutover.sh](../deploy/organization-cutover.sh) 已增加從現有 backend 的 Compose 標籤辨識正式覆寫，備份、切換及自動回復均沿用它。此變更已檢查 shell 語法，實際切換／回復演練仍列 H／I 待辦。
6. 回復使用上一版已驗收的映像及 HTTPS 安全設定，保留已輪替的密碼。CSP 若有相容性問題，先調整 Report-Only 規則並重驗，正式切換遇安全驗收失敗即停止。

### 測試紀錄與重跑入口

- 兩端 TypeScript／Vite 建置通過。後端缺少的套件已依既有 lockfile 以 npm ci 補齊，Prisma Client 已依既有 schema 重新產生。
- [security.test.ts](../backend/test/security.test.ts) 共 10 項通過，含 8 項 PostgreSQL 子案例、設定案例與整合父案例。測試使用獨立 `security_test`，會清理其中的合成使用者、票券、Session、流程及稽核資料。
- 既有聯絡收件、活動模型及公開內容整合另用 `contact_test`、`cms_test`、`content_test`，共 17 項通過。測試資料庫位於專用容器，與既有站台資料庫分離。
- 後端無資料庫環境的完整測試輪次為 8 通過、2 失敗、4 跳過。失敗分別是 activity-content 的舊欄位路徑 `activity.categoryId` 與實作 `content.categoryId` 不符，以及 activity-contract 仍預期帳號／媒體狀態為 planned。相關程式與契約在本批未修改，列 H-1 同步。
- 前端完整回歸為 216 通過、8 失敗。相關後台三個測試檔以單 worker 重跑為 22 通過、1 失敗，仍為 AdminCms 新增活動案例在非同步畫面就緒前查詢欄位。首頁系隊選單等完整回歸失敗仍列 H-1，整套回歸保持未全數通過。
- 瀏覽器使用合成帳號操作 HTTP 隔離站，確認登入、活動文字編輯與預覽、首頁圖片載入、Noto Sans TC 字型設定及 iframe 被拒絕。該操作範圍的控制台未觀察到 CSP 違規。HTTPS 回應另外以信任隔離 CA 的 HTTP client 驗證，正式瀏覽器 TLS 與完整 Google OAuth 待 H-2／H-3。
- npm ci 的自動 audit 摘要回報 6 項 high 級依賴告警。本批依賴版本維持鎖檔內容，漏洞適用性與修補追蹤併入 SEC-008。
- 暫存測試紀錄位於 Git 忽略的 `backend/node_modules/.tmp/security-batch`，其中包含合成資料設定及隔離驗證腳本。這些紀錄僅供本機追查。

在獨立資料庫套用既有 migrations 後，從 backend 目錄設定 `SECURITY_TEST_DATABASE_URL` 指向資料庫名稱 `security_test` 並執行下列命令。測試會檢查名稱，正式資料庫不得使用此名稱或傳入此測試入口。

```sh
node --import tsx --test test/security.test.ts
```

本批驗收使用專用 `nycuee-security-batch` Compose project、暫存資料庫、HTTP／HTTPS 測試埠及合成帳號。驗收後已關閉隔離 API 並移除測試容器、網路及暫存資料庫。正式密碼輪替、遠端部署、全面 CSP、SEC-004 至 SEC-009 的後續修補與 H／I 完整驗收繼續列待辦。

## 第二批程式與維運交付（2026/11/10，未驗證）

本節記錄後續「H 到 K」程式交付，不改寫前述歷史結果。依目前「不要驗證」指示，未執行任何測試、建置、migration、服務／瀏覽器／容量探測、備份還原或部署；以下均不能標為安全驗收通過。

| 項目 | 新增程式與文件 | 限制與待驗收 |
|---|---|---|
| SEC-004 | `UploadProtection` 在 multipart interceptor 前執行帳號頻率（資料庫計數）、process 槽位與磁碟預留檢查；預設每分鐘 10 次、併發 2、預留 1 GiB 加輸出預算 | 多副本併發是每 process，未設定帳號累積容量配額。仍待解碼異常、取消／失敗清理、尖峰、實際磁碟容量、孤兒檔及代理限制驗收 |
| SEC-005 | 新增真實服務活動、14 份組織與 K 的授權／版本／隔離／撤權測試準備；K 全站資源及其媒體限 ADMIN，交易內重讀權限 | 未執行，尚不能排除完整負向／並行矩陣的缺口，真實瀏覽器與快取亦待驗收 |
| SEC-006 | `deploy/backup.sh` 取得成對資料庫／媒體快照，再用 restic 加密異機上傳、保留 30 天；交付 restore、monitor、systemd 與金鑰／權限手冊 | 遠端 repository、金鑰、負責人與 webhook 未配置，工具未啟用；未演練 RPO／RTO 或告警送達，主機故障仍須外部 dead-man 監測 |
| SEC-007 | `operations:retention` 要求資料負責人指定期限，預設只列數量，明確 `--apply` 才刪除到期已讀收件及舊稽核，保存執行數量紀錄 | 沒有自動排程；正式目的、期限、個案保留及備份到期程序未確認。未執行或接觸真實收件資料 |
| SEC-009 | `Media.revokedAt`、ADMIN 的撤回 API／媒體庫操作、稽核原因與公開源站拒絕；所有內容再次發布時拒絕已撤回圖。新公開回應改為 5 分鐘且 must-revalidate | 歷史一年快取、已下載及第三方副本無法遠端強制收回；仍需內容修正、受控快取清除及事件處理。未驗證源站、代理或歷史還原行為 |

SEC-008 仍未查明既有依賴告警適用性，也未更動依賴或映像版本。完整 CSP 仍為 Report-Only，正式 HTTPS／Google／代理／密碼輪替仍待 H-2／H-3。詳見 [維運與事件手冊](cms-operations.md)、[待執行驗收](cms-acceptance.md)及 [K 契約](site-content-cms-contract.md)。
