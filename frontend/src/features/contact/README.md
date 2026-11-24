# 聯絡頁

`ContactPage.tsx` 管理表單與傳送狀態，`contact.css` 管理版面。共用聯絡信箱來自 `src/shared/data/site.ts`。
聯絡表單以匿名方式向本站 `/api/v1/public/contact-messages` 提交。純文字使用 JSON，附圖使用 multipart。每則可附一張 10 MiB 以內的 JPEG、PNG 或 WebP 圖片。訊息及附件儲存在 PostgreSQL，管理員可在 `/#/admin/contact-messages` 查看與標記已讀。

`VITE_CONTACT_FORM_ENDPOINT` 可覆寫收件網址，留白時使用本站 API。靜態部署的外部收件端點須支援 JSON 及附件使用的 multipart。Vite 環境變數在建置時套用。

傳送期間停用欄位及送出按鈕，成功才清空；網路錯誤、伺服器錯誤與 429 限速回應均保留輸入。隱藏的 `website` 欄位一併傳至後端檢查，後端不儲存命中此欄位的訊息。
