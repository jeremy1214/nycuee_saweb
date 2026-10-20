import explore from "../../../content/home/explore.json";
import type { CalendarEvent, ExploreContent } from "../homeTypes";

export const exploreContent: ExploreContent = explore;
export const slides = exploreContent.slides;

export const calendarEvents: CalendarEvent[] = [
  { date: "2026-10-06", title: "新生學習資源導覽", type: "department" },
  { date: "2026-10-14", title: "智慧電機專題講座", type: "academic" },
  { date: "2026-10-22", title: "研究交流分享會", type: "academic" },
  { date: "2026-10-28", title: "學生專題成果展", type: "department" },
];
