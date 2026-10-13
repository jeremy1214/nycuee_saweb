# 系學會模組

採用和活動模組一致的「內容 JSON → 資料載入 → 頁面元件」分工。

```text
features/eesa/
├─ EesaLayout.tsx                      # 共用路由外框
├─ EesaPage.tsx                        # 系學會總覽
├─ DepartmentPage.tsx                  # 部門介紹
├─ DepartmentActivitiesPage.tsx        # 部門活動列表
├─ DepartmentActivityPage.tsx          # 活動詳情
├─ DepartmentSkillsPage.tsx            # 學習能力
├─ DepartmentExperiencePage.tsx        # 體驗談
├─ components/
│  ├─ DepartmentLayout.tsx             # 共用橫幅、格線、側邊導覽
│  ├─ DepartmentLayout.module.css      # 共用部門版型
│  ├─ EesaSections.tsx                  # 总覽介紹、部門卡片、會長訊息、聯絡區塊
│  ├─ EesaImage.tsx                     # 缺少圖片時的預留區
│  ├─ Grid.tsx                         # 系學會局部格線
│  └─ Grid.module.css
├─ data/
│  ├─ eesaRepository.ts                # 自動載入部門 JSON、產生卡片與資料索引
│  └─ eesa.ts                          # 穩定的資料出口
├─ eesaTypes.ts                        # 資料型別
├─ *.module.css                       # 各頁內容樣式
└─ index.ts                           # 模組出口
```

修改總覽文字：`src/content/eesa/overview.json`。
修改部門內容：`src/content/eesa/departments/<id>.json`。每個檔案包含部門介紹、卡片資料、活動、能力、體驗談與顯示順序。
`id` 控制 `/eesa/<id>` 網址；`order` 控制部門卡片排列。卡片標題取用同一份 `title`，連結由 `id` 產生，不需另維護一份部門入口 JSON。

原始內容、輪播、上一則／下一則與舊 `/intro/…` 轉址保留。圖片仍放在 `public/intro/`。活企部詳細內容及三個部門合照仍是原專案的預留內容。
編輯欄位說明請看 [INTRO_DATA_GUIDE.md](INTRO_DATA_GUIDE.md)。
