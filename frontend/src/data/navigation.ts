export const sectionPages = [
  { title: "系學會", to: "/eesa", icon: "◎", eyebrow: "STUDENT ASSOCIATION", description: "認識電機系學會、四大部門、活動成果、學習能力與前輩體驗談。" },
  { title: "系上活動", to: "/activities", icon: "⌘", eyebrow: "DEPARTMENT ACTIVITIES", description: "系上活動與參與資訊將在這裡與你見面。" },
  { title: "系隊", to: "/team", icon: "▤", eyebrow: "DEPARTMENT TEAMS", description: "認識九支電機系隊，查看隊伍介紹、練習時間、活動與入隊資訊。" },
  { title: "學習資料", to: "/resources", icon: "↗", eyebrow: "LEARNING RESOURCES", description: "課程與學習相關資料將在這裡與你見面。" },
] as const;

export type SectionPage = (typeof sectionPages)[number];
