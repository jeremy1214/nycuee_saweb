# 系隊模組

採用和活動模組一致的「內容 JSON → 資料載入 → 頁面元件」分工。

```text
features/teams/
├─ TeamPage.tsx                        # 總覽入口
├─ TeamDetailPage.tsx                  # 依網址選擇隊伍
├─ components/
│  ├─ TeamSections.tsx                 # 系隊照片輪播、九隊入口
│  └─ TeamDetailSections.tsx           # 介紹、練習、活動、聯絡、上一隊／下一隊
├─ data/
│  ├─ teamRepository.ts                # 自動收集 JSON 並按 order 排序
│  └─ teams.ts                         # 資料出口、圖片網址、輪播項目
├─ teamTypes.ts                        # 資料型別
├─ teams.css                           # 總覽與詳情樣式
└─ index.ts                            # 模組出口
```

內容放在 `src/content/teams/<id>.json`，一支隊伍一個檔案。`id` 控制 `/team/<id>` 網址；`order` 控制入口、輪播及上一支／下一支順序。其餘 `name`、`intro`、`schedule`、`activities`、`contact` 與圖片欄位沿用原專案資料。
照片位置維持 `public/team/`，JSON 的圖片路徑仍相對於該目錄。

輪播互動使用全站 `shared/hooks/useCarousel.ts`，與首頁共用自動播放、暫停、鍵盤、觸控及減少動態偏好；不同頁面的照片與版面各自管理。
羽球、桌球、棒球、網球及足球的「待填」內容照原資料保留。
