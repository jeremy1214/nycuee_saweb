import type { ActivityCategoryOption, ActivityItem } from "../activityTypes";

export const activityCategories: ActivityCategoryOption[] = [
  { label: "電機營", shortLabel: "EE CAMP" },
  { label: "系露營", shortLabel: "CAMPING" },
  { label: "電機週", shortLabel: "EE WEEK" },
  { label: "光舞", shortLabel: "LIGHT DANCE" },
  { label: "其他活動", shortLabel: "MORE" },
];

export const activities: ActivityItem[] = [
  {
    id: "smart-ee-camp",
    title: "智慧電機探索營：從電路到未來應用",
    date: "2026-10-14",
    category: "電機營",
    summary: "透過主題講解與動手實作，認識電機領域如何連結生活中的智慧科技。",
    details: "活動包含系所導覽、基礎電路實作與學長姐交流，讓參與者從觀察、設計到測試，體驗完整的工程思考過程。",
    location: "工程四館 101 講堂",
  },
  {
    id: "department-camping-night",
    title: "秋季系露營：在星光下認識彼此",
    date: "2026-10-18",
    category: "系露營",
    summary: "以小隊合作與戶外體驗拉近同學距離，在課堂之外建立共同回憶。",
    details: "規劃團隊任務、營火交流與戶外體驗，活動內容將依天候與場地狀況調整，完整行前資訊另行通知。",
    location: "校外活動場地",
  },
  {
    id: "ee-week-showcase",
    title: "電機週：把日常好奇變成互動作品",
    date: "2026-10-22",
    category: "電機週",
    summary: "集結學生創作、知識展區與互動體驗，從不同角度看見電機的可能性。",
    details: "現場以主題展區呈現學生作品與電機知識，並安排短講及互動體驗，適合想認識系上學習內容的師生參加。",
    location: "浩然圖書館前廣場",
  },
  {
    id: "light-dance-workshop",
    title: "光舞工作坊：用程式點亮舞台",
    date: "2026-10-28",
    category: "光舞",
    summary: "結合燈光控制、程式設計與舞台表演，共同完成一段可被看見的創作。",
    details: "從燈條控制基礎開始，分組設計燈光節奏並進行舞台整合。無相關經驗也可參加，器材與教學由活動團隊準備。",
    location: "活動中心二樓展演空間",
  },
  {
    id: "student-community-day",
    title: "電機生活交流日：社團、系隊與學習資源",
    date: "2026-11-05",
    category: "其他活動",
    summary: "一次認識系上社群與學生資源，找到課業之外也能投入的活動。",
    details: "由不同學生團隊介紹年度活動、參與方式與可使用的系上資源，現場也保留自由交流與提問時間。",
    location: "工程四館中庭",
  },
];
