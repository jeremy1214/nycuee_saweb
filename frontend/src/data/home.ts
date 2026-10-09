import type { CalendarEvent, NewsItem, Slide } from "../types";

export const slides: Slide[] = [
  {
    eyebrow: "CONNECTING IDEAS. ENGINEERING THE FUTURE.",
    title: "以電機，連結未來。",
    description: ["從一個想法，到改變世界的技術。", "在交大電機，探索、實作，讓創新發生。"],
  },
  {
    eyebrow: "EXPLORE THE POSSIBILITIES.",
    title: "探索科技的下一步。",
    description: ["讓好奇成為起點，讓研究走向實現。", "從電路、系統到智慧應用，展開你的探索。"],
  },
  {
    eyebrow: "LEARN. BUILD. MAKE AN IMPACT.",
    title: "讓想法，成為實力。",
    description: ["在課堂中理解，在實作中突破。", "與夥伴一起，把創意轉化為真實作品。"],
  },
];

export const newsItems: NewsItem[] = [
  {
    category: "研究交流",
    dateLabel: "探索主題 · 示意內容",
    title: "智慧電機與未來科技研究交流系列",
    summary: "從研究團隊與實驗室出發，探索不同領域的技術問題。",
    artwork: "research",
  },
  {
    category: "課程資訊",
    dateLabel: "學習規劃 · 官方入口",
    title: "從課程地圖找到你的專業方向",
    summary: "整理必修、選修與跨領域學習資源，建立四年的修課節奏。",
    artwork: "campus",
  },
  {
    category: "學生專區",
    dateLabel: "實作成果 · 示意內容",
    title: "從課堂走向實作的專題成果交流",
    summary: "把知識轉化成作品，累積研究、升學與職涯所需的能力。",
    artwork: "student",
  },
];

export const calendarEvents: CalendarEvent[] = [
  { date: "2026-10-06", title: "新生學習資源導覽", type: "department" },
  { date: "2026-10-14", title: "智慧電機專題講座", type: "academic" },
  { date: "2026-10-22", title: "研究交流分享會", type: "academic" },
  { date: "2026-10-28", title: "學生專題成果展", type: "department" },
];

export const searchItems = [
  { label: "系所新訊", description: "首頁的最新焦點與學習資訊", to: "/#news" },
  { label: "關於修課", description: "修業規定、課程地圖與選課入口", to: "/resources/courses" },
  { label: "獎助學金", description: "系級、校級與出國獎助", to: "/resources/scholarships" },
  { label: "交換資訊", description: "交換申請流程與文件準備", to: "/resources/exchange" },
  { label: "研究所", description: "升學路徑、研究方向與準備方式", to: "/resources/graduate" },
  { label: "電機行事曆", description: "近期系所與學術活動", to: "/#calendar" },
];
