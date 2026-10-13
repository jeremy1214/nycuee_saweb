# 首頁模組

- `HomePage.tsx`：組合首頁區塊，管理單一活動視窗。
- `components/`：焦點輪播、消息、快捷選單、行事曆、Google 日曆匯入。
- `data/home.ts`：首頁輪播、消息與月曆活動的單一資料來源。
- `homeTypes.ts`：首頁資料型別。
- `utils/calendarExport.ts`：ICS 下載及 Google 日曆連結。
- `home.css`：首頁區塊樣式，匯入視窗另使用 CSS Module。

全站搜尋由 `src/shared/data/search.ts` 匯整，快捷選單由 `src/shared/data/navigation.ts` 產生，首頁不再複製部門、隊伍或學習資源資料。
首頁與系隊輪播共用 `src/shared/hooks/useCarousel.ts`。
