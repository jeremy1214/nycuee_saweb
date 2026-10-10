# 系學會內容

內容搬自 `/home/yoei/workspace/eesa-web/frontend/src/page/intro`。

- `EesaIntro.tsx`：系學會介紹、四部門入口、會長的話與聯絡資訊。
- `Department.tsx`：部門介紹、合照與部員名單。
- `DepartmentActivities.tsx`／`Activity.tsx`：部門活動列表、詳情、圖片輪播與上一則／下一則。
- `DepartmentSkills.tsx`：人力部與行銷部的學習能力。
- `DepartmentExperiences.tsx`：人力部五篇體驗談與導覽。
- `departments.json`：原部門資料，內部連結改為 `/eesa/…`。
- `departmentCards.json`：從原 `backend/server.js` 搬入的四部門入口資料。
- `public/intro`：原前端與後端提供的系學會圖片。

入口為 `/#/eesa`；部門路徑為 `/#/eesa/{slug}`。原本 `/intro/…` 網址會轉到新路徑。

保留原 CSS 模組；以 `Layout.tsx` 的局部格線取代 React Bootstrap 容器，避免影響新網站的首頁樣式。部門入口使用本機資料，不再依賴原 5588 埠的 API。

原專案未提供活企部詳細內容，以及人力部、行銷部與學術部的合照檔案。活企部沿用原入口文字，合照顯示圖片預留區；未捏造缺少的內容。

本次依使用者指示未執行測試、建置或瀏覽器驗證。
