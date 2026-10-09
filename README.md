# 陽明交大電機系網站

以 Vite、React 與 TypeScript 製作的電機系網站前端。首頁延續深藍、青綠的視覺風格，並提供修課、獎助學金、交換資訊與研究所等學習資源頁面。

## 技術架構

- React 19
- TypeScript
- Vite
- React Router（Hash Router）
- Vitest、React Testing Library
- 純 CSS 響應式版面，沒有使用 UI framework

網站是純前端單頁應用程式，不需要資料庫或後端服務。Hash Router 讓建置結果可以部署到一般靜態網站空間。

## 在本機開啟網站

### 環境需求

- Node.js 20 以上版本
- npm

### 第一次執行

在專案根目錄開啟 PowerShell 或終端機：

```powershell
cd frontend
npm install
npm run dev
```

Vite 啟動後會顯示本機網址，預設通常是：

```text
http://127.0.0.1:5173/
```

若 5173 port 已被使用，Vite 會自動選擇其他 port，請以終端機顯示的網址為準。按 `Ctrl+C` 可以停止開發伺服器。

### 常用頁面

- 首頁：`http://127.0.0.1:5173/#/`
- 系上活動：`http://127.0.0.1:5173/#/activities`
- 關於修課：`http://127.0.0.1:5173/#/resources/courses`
- 獎助學金：`http://127.0.0.1:5173/#/resources/scholarships`
- 交換資訊：`http://127.0.0.1:5173/#/resources/exchange`
- 研究所：`http://127.0.0.1:5173/#/resources/graduate`

## 測試與正式建置

請先進入 `frontend` 資料夾：

```powershell
cd frontend
```

執行全部測試：

```powershell
npm test
```

執行 TypeScript 檢查並產生正式版本：

```powershell
npm run build
```

建置結果會產生在 `frontend/dist/`。如要預覽建置結果，可執行：

```powershell
npx vite preview
```

## 專案目錄

```text
nycuee_saweb/
├─ frontend/                       # React 前端專案
│  ├─ src/
│  │  ├─ components/              # 全站共用與首頁區塊元件
│  │  │  ├─ HomeSections.tsx
│  │  │  ├─ SearchDialog.tsx
│  │  │  └─ SiteChrome.tsx        # Header、Footer、Modal 等共用元件
│  │  ├─ data/
│  │  │  └─ home.ts               # 首頁輪播、焦點與月曆資料
│  │  ├─ features/
│  │  │  ├─ activities/           # 系上活動總覽、分類篩選與活動資料
│  │  │  └─ resources/            # 完整的學習資源功能模組
│  │  │     ├─ components/        # 資源頁區塊元件
│  │  │     ├─ data/              # 四類資源內容與官方連結
│  │  │     ├─ ResourcePage.tsx   # 資源頁入口
│  │  │     ├─ resources.css      # 資源頁專屬樣式
│  │  │     ├─ resourceTypes.ts   # 資源頁型別
│  │  │     └─ README.md          # Resource 模組共編說明
│  │  ├─ pages/                   # 首頁與 404 頁面
│  │  ├─ test/                    # 全站測試設定與整合測試
│  │  ├─ App.tsx                  # 路由及全站外框
│  │  ├─ main.tsx                 # React 啟動入口
│  │  └─ styles.css               # 全站及首頁共用樣式
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
├─ scratch.html                    # 最初的純 HTML 視覺參考稿
└─ README.md
```

## 網站運作方式

1. `main.tsx` 建立 React 應用程式並啟用 Hash Router。
2. `App.tsx` 根據網址載入首頁、Resource Page 或 404 頁面。
3. 首頁內容由 `data/home.ts` 提供，再交給 `HomeSections.tsx` 呈現。
4. Activities Page 使用本地示意資料提供活動分類篩選與詳情視窗。
5. Resource Page 從網址取得目前分類，讀取 `features/resources/data/resources.ts` 的對應資料。
6. 共用 Header、Footer、搜尋及 Modal 由 `SiteChrome.tsx` 等共用元件負責。

## 共編指南

- 修改首頁文字、輪播或月曆資料：`frontend/src/data/home.ts`
- 修改首頁區塊與快捷連結：`frontend/src/components/HomeSections.tsx`
- 修改活動內容與分類：`frontend/src/features/activities/data/activities.ts`
- 修改活動頁版面：`frontend/src/features/activities/components/ActivitySections.tsx`
- 修改學習資源文字與官方連結：`frontend/src/features/resources/data/resources.ts`
- 修改學習資源版面：`frontend/src/features/resources/components/ResourceSections.tsx`
- 修改學習資源樣式：`frontend/src/features/resources/resources.css`
- 修改全站 Header、Footer 或 Modal：`frontend/src/components/SiteChrome.tsx`
- 修改全站或首頁樣式：`frontend/src/styles.css`

Resource Page 的詳細分工請參考 [`frontend/src/features/resources/README.md`](frontend/src/features/resources/README.md)。

共同編輯完成後，提交前至少執行：

```powershell
cd frontend
npm test
npm run build
```

請勿提交 `node_modules/` 或 `dist/`；這些資料夾會由安裝與建置指令重新產生。
