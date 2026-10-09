# Resource Page

學習資源頁的程式、內容、樣式與測試集中在此資料夾，方便分工與共同編輯。

## 檔案分工

- `ResourcePage.tsx`：頁面組裝與路由參數處理。
- `components/ResourceSections.tsx`：頁籤、資訊卡、流程、檢查清單與官方連結元件。
- `data/resources.ts`：四個分類的文字內容與官方網址；一般內容更新優先修改此檔。
- `resourceTypes.ts`：Resource 模組使用的 TypeScript 型別。
- `resources.css`：只影響 Resource Page 的桌面與響應式樣式。
- `ResourcePage.test.tsx`：資源頁路由與分類切換測試。
- `index.ts`：模組對外匯出入口。

## 路由

- `/#/resources/courses`
- `/#/resources/scholarships`
- `/#/resources/exchange`
- `/#/resources/graduate`

共同編輯時，若只更新文字或連結，請修改 `data/resources.ts`；若調整共用頁首或頁尾，才需要修改模組外的 `src/components/SiteChrome.tsx`。
