# 前端原始碼分工

`App.tsx` 定義網址；`shared/components/layout/AppShell.tsx` 管理頁首、頁尾、搜尋、全站提示視窗及切換頁面時的捲動。

```text
src/
├─ shared/                     # 所有跨功能共用程式集中於此
│  ├─ components/              # 全站共用元件
│  │  ├─ layout/               # AppShell、Brand、Header、Footer、PageContainer
│  │  ├─ ui/                   # Modal、SectionHeading、Breadcrumb、ExternalLink、SocialIcon
│  │  ├─ SearchDialog.tsx       # 全站搜尋介面
│  │  └─ index.ts              # 共用元件出口
│  ├─ data/                    # 全站導覽、搜尋、聯絡與社群資料
│  ├─ pages/NotFoundPage.tsx    # 全站 404 頁面
│  └─ hooks/useCarousel.ts     # 共用輪播互動
├─ content/                    # 可單獨編輯的內容 JSON
│  ├─ activities/              # 活動分類與每筆活動
│  ├─ eesa/                    # 系學會總覽及每個部門
│  └─ teams/                   # 每支系隊
├─ features/
│  ├─ home/                    # 首頁入口、首頁區塊、資料、型別、日曆匯出與樣式
│  ├─ contact/                 # 聯絡頁與樣式
│  ├─ activities/              # 活動總覽與詳情、components、data、型別與樣式
│  ├─ eesa/                    # 系學會及部門頁、components、data、型別與樣式
│  ├─ teams/                   # 系隊總覽及詳情、components、data、型別與樣式
│  └─ resources/               # 學習資料頁、components、data、型別與樣式
└─ styles.css                  # 全站變數、基礎、共用元件及響應式樣式
```

## 放檔案的原則

- 跨功能共用的顯示元件放 `shared/components`；只服務某個功能的元件放該功能的 `components`。
- 功能頁入口放在 `features/<功能>/` 根目錄，透過 `index.ts` 匯出。
- 編輯內容放 `content`；載入與整理資料放 `features/<功能>/data`；型別放功能根目錄。
- `shared/data` 只匯整全站導覽、搜尋與聯絡資訊，不複製功能資料。
- `styles.css` 只管理全站樣式；首頁样式集中在 `features/home/home.css`，其他功能保留自身樣式。

原本未使用的 `SectionPage` 已移除。頁面網址、既有內容與圖片位置維持原設定。
目前已完成 24 項測試與 TypeScript／Vite 正式建置，並檢查首頁、系學會部門及系隊頁面的瀏覽器操作。
