# 聯絡頁

`ContactPage.tsx` 管理表單與傳送狀態，`contact.css` 管理版面。共用聯絡信箱來自 `src/shared/data/site.ts`。
預設以 JSON POST 傳送至本站 `/api/v1/public/contact-messages`，資料儲存在 PostgreSQL，管理員可在 `/#/admin/contact-messages` 查看與標記已讀。

`VITE_CONTACT_FORM_ENDPOINT` 可覆寫收件網址；留白或未設定時使用本站 API。僅部署靜態前端時，需要另外設定可接受 JSON 的外部收件端點。Vite 環境變數在建置時套用，變更後需重新建置。

傳送期間停用欄位及送出按鈕，成功才清空；網路錯誤、伺服器錯誤與 429 限速回應均保留輸入。隱藏的 `website` 欄位一併傳至後端檢查，後端不儲存命中此欄位的訊息。
