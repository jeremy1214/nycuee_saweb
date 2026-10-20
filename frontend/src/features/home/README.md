# 首頁模組

- `HomePage.tsx`：組合首頁區塊，管理單一活動視窗。
- `components/`：焦點輪播、近期活動、快捷選單、行事曆、Google 日曆匯入。
- `data/home.ts`：首頁輪播與月曆活動資料。
- `homeTypes.ts`：首頁資料型別。
- `utils/calendarExport.ts`：ICS 下載及 Google 日曆連結。
- `home.css`：首頁區塊樣式，匯入視窗另使用 CSS Module。

全站搜尋由 `src/shared/data/search.ts` 匯整，快捷選單由 `src/shared/data/navigation.ts` 產生，首頁不再複製部門、隊伍或學習資源資料。
最新消息使用共用的已發布活動 JSON，只讀取有日期的活動，以台灣日期篩選今天起最近三筆，同日依 ID 排序。一般卡片顯示照片、日期與活動分類，其他活動顯示實際活動名稱；有 `album` 時使用相簿封面並保留圖片 fit。無日期活動仍能瀏覽介紹；填入實際日期後重新建置部署，即自動參與最新消息排序。沒有詳情內容的活動會在活動頁顯示已填寫的日期、地點與簡介。
首頁與系隊輪播共用 `src/shared/hooks/useCarousel.ts`。
首頁頂部主視覺每 4.8 秒換句，滑鼠停留時持續播放，鍵盤焦點進入時暫停換句；打字使用逐字 CSS 顯示，並預留所有句子的空間以避免手機換句時版面跳動。三條波浪由各自的 HTML 層執行位移。主視覺離開畫面或分頁隱藏時暫停動畫及換句，恢復後重新計時；減少動態效果設定會停止自動換句並直接顯示全文。
共用輪播的第三個參數可設定 `pauseOnHover`（預設 `true`）與 `autoplayEnabled`（預設 `true`），其他輪播維持原本行為。
