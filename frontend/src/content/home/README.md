# 首頁探索輪播

編輯 `explore.json` 即可更新「一起探索電機生活」區塊，不需要修改 React 元件。

## 區塊欄位

| 欄位 | 用途 |
| --- | --- |
| `eyebrow` | 區塊上方的英文標語 |
| `title` | 區塊標題 |
| `description` | 區塊副標題 |
| `link.label` | 所有輪播共用的連結文字 |
| `link.to` | 所有輪播共用的站內路徑，例如 `/eesa`；不需加 `/#` |
| `slides` | 輪播資料，依陣列順序播放，請至少保留一筆 |

## 輪播欄位

| 欄位 | 用途 |
| --- | --- |
| `id` | 唯一且固定的識別碼，新增時請使用不同值 |
| `image` | 圖片公開路徑，例如 `/home/one-day-camp.png` 對應 `frontend/public/home/one-day-camp.png` |
| `imagePosition` | CSS `object-position`，控制裁切焦點，例如 `center 43%` |
| `eyebrow` | 該張輪播的英文標語 |
| `title` | 該張輪播的標題，也用於圖片替代文字 |
| `description` | 說明文字陣列，每個字串顯示為一行 |

新增輪播時，將圖片放進 `frontend/public/home/`，複製一筆 `slides` 物件並填入新的內容。調整陣列順序即可排序，刪除物件即可移除輪播；圓點與總張數會自動更新。

頁首主視覺的動態標題與全站搜尋也會使用這份輪播資料。修改 `slides[].title` 時，頁首的動態標題會同步更新。

請使用合法 JSON（雙引號、無註解、無結尾多餘逗號）。欄位結構由 `frontend/src/features/home/homeTypes.ts` 定義，執行 `cd frontend`、`npm run build` 可檢查型別並建置網站；正式站更新內容後需要重新建置部署。
