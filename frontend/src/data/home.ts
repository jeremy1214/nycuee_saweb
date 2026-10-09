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
    category: "成果展示",
    date: "2026-10-28",
    title: "學生專題成果展：讓創意走進真實世界",
    summary: "集結學生專題與實作成果，分享從問題發現到作品完成的歷程。",
    artwork: "student",
  },
  {
    category: "學術交流",
    date: "2026-10-22",
    title: "研究交流分享會：跨域合作的新可能",
    summary: "由研究團隊分享近期成果，從不同領域的觀點展開技術交流。",
    artwork: "research",
  },
  {
    category: "專題講座",
    date: "2026-10-14",
    title: "智慧電機專題講座：從研究走向應用",
    summary: "邀請專家分享智慧系統發展趨勢，帶你掌握技術與產業脈動。",
    artwork: "campus",
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
