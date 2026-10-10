import type { CalendarEvent, NewsItem, Slide } from "../types";
import { sectionPages } from "./navigation";
import { teams } from "../features/teams/data";
import { departments, departmentCards } from "../features/eesa/data";

export const slides: Slide[] = [
  {
    image: "/home/one-day-camp.png",
    imagePosition: "center 43%",
    eyebrow: "CONNECTING IDEAS. ENGINEERING THE FUTURE.",
    title: "以電機，連結未來。",
    description: ["從一個想法，到改變世界的技術。", "在交大電機，探索、實作，讓創新發生。"],
  },
  {
    image: "/home/electronics-lab-visit.png",
    imagePosition: "center 45%",
    eyebrow: "EXPLORE THE POSSIBILITIES.",
    title: "探索科技的下一步。",
    description: ["讓好奇成為起點，讓研究走向實現。", "從電路、系統到智慧應用，展開你的探索。"],
  },
  {
    image: "/home/hardware-course.jpg",
    imagePosition: "center 53%",
    eyebrow: "LEARN. BUILD. MAKE AN IMPACT.",
    title: "讓想法，成為實力。",
    description: ["在課堂中理解，在實作中突破。", "與夥伴一起，把創意轉化為真實作品。"],
  },
  {
    image: "/home/software-course.jpg",
    imagePosition: "center 45%",
    eyebrow: "SHARE IDEAS. GROW TOGETHER.",
    title: "在分享中，學會更多。",
    description: ["把程式與創意帶進課堂。", "與同學交流，讓每一次嘗試都有新的收穫。"],
  },
  {
    image: "/home/group-interview.png",
    imagePosition: "center 47%",
    eyebrow: "MEET. CONNECT. DISCOVER.",
    title: "與夥伴，一起找到方向。",
    description: ["在活動中認識不同的想法與經驗。", "從交流開始，找到屬於自己的學習路徑。"],
  },
  {
    image: "/home/graduation.png",
    imagePosition: "center 43%",
    eyebrow: "EVERY STEP LEADS FORWARD.",
    title: "讓每一步，走向下一程。",
    description: ["帶著課堂與實作累積的力量。", "從交大電機出發，迎接更寬廣的未來。"],
  },
];

export const newsItems: NewsItem[] = [
  {
    category: "研究交流",
    date: "2026-10-06",
    title: "智慧電機與未來科技 研究交流系列活動",
    summary: "探索研究的更多可能",
    artwork: "research",
  },
  {
    category: "招生資訊",
    date: "2026-10-03",
    title: "走進交大電機 開啟你的工程探索之旅",
    summary: "認識課程與學習環境",
    artwork: "campus",
  },
  {
    category: "學生活動",
    date: "2026-09-28",
    title: "從課堂走向實作 電機專題成果交流展",
    summary: "看見學生的創意與實力",
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
  ...sectionPages.map((page) => ({ label: page.title, description: page.description, to: page.to })),
  ...teams.map((team) => ({ label: `系隊｜${team.name}`, description: team.intro.join(" "), to: `/team/${team.key}` })),
  ...departmentCards.map((card) => ({ label: card.name, description: card.description, to: card.link })),
  ...Object.entries(departments).flatMap(([slug, department]) => [
    ...department.activities.map((activity) => ({ label: `${department.title}｜${activity.name}`, description: activity.description.join(" "), to: `/eesa/${slug}/activities/${activity.slug}` })),
    ...(department.skills ? [{ label: `${department.title}｜學習能力`, description: department.skills.mainTitle, to: `/eesa/${slug}/skills` }] : []),
    ...(department.experiences ?? []).map((experience) => ({ label: experience.title, description: experience.content.join(" "), to: `/eesa/${slug}/experiences/${experience.id}` })),
  ]),
  { label: "系所新訊", description: "首頁的最新焦點與學習資訊", to: "/#news" },
  { label: "關於修課", description: "修業規定、課程地圖與選課入口", to: "/resources/courses" },
  { label: "獎助學金", description: "系級、校級與出國獎助", to: "/resources/scholarships" },
  { label: "交換資訊", description: "交換申請流程與文件準備", to: "/resources/exchange" },
  { label: "研究所", description: "升學路徑、研究方向與準備方式", to: "/resources/graduate" },
  { label: "電機行事曆", description: "近期系所與學術活動", to: "/#calendar" },
];
