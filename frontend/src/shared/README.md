# 全站共用程式

`components`、`data`、`pages`、`hooks` 統一放在 `src/shared`。

- `components/layout`：全站外框、頁首、頁尾、品牌、頁面容器。
- `components/ui`：共用視窗、標題、麵包屑、外部連結與社群圖示。
- `components/SearchDialog.tsx`：全站搜尋介面。
- `data`：導覽、搜尋、聯絡與社群資料。
- `pages`：全站 404 頁面。
- `hooks`：首頁與系隊共用的輪播互動。

功能專用元件與資料仍放在各自的 `features`。使用共用介面元件時，從 `shared/components` 匯入。
