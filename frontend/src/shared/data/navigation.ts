import { departmentCards } from "../../features/eesa/data/eesa";
import { activityCategories } from "../../features/activities/data/activities";
import { resourceCategories, resourceOrder } from "../../features/resources/data/resources";
import { teams } from "../../features/teams/data/teams";

export const sectionPages = [
  { title: "系學會", to: "/eesa", icon: "◎", eyebrow: "STUDENT ASSOCIATION", description: "認識電機系學會、四大部門、活動成果、學習能力與前輩體驗談。" },
  { title: "系上活動", to: "/activities", icon: "⌘", eyebrow: "DEPARTMENT ACTIVITIES", description: "系上活動與參與資訊將在這裡與你見面。" },
  { title: "系隊", to: "/team", icon: "▤", eyebrow: "DEPARTMENT TEAMS", description: "認識九支電機系隊，查看隊伍介紹、練習時間、活動與入隊資訊。" },
  { title: "學習資料", to: "/resources", icon: "↗", eyebrow: "LEARNING RESOURCES", description: "課程與學習相關資料將在這裡與你見面。" },
] as const;

export const contactPage = {
  title: "聯絡我們",
  to: "/contact",
  eyebrow: "CONTACT US",
  description: "提交問題或建議，讓系學會協助你找到合適的資訊與窗口。",
} as const;

export const primaryNavigation = [...sectionPages, contactPage] as const;


export const sectionMenus: Record<string, { label: string; to: string }[]> = {
    "/eesa": [
      { label: "系學會介紹", to: "/eesa" },
      ...departmentCards.filter((department) => department.link).map((department) => ({
        label: department.name,
        to: department.link,
      })),
    ],
    "/activities": [
      { label: "活動總覽", to: "/activities/overview" },
      ...activityCategories.map((category) => ({
        label: category.label,
        to: category.id === "other"
          ? "/activities/other"
          : category.featuredActivityId
            ? `/activities/${category.featuredActivityId}`
            : `/activities/overview?category=${encodeURIComponent(category.id)}`,
      })),
    ],
    "/team": teams.map((team) => ({ label: team.name, to: `/team/${team.key}` })),
    "/resources": resourceOrder.map((slug) => ({
      label: resourceCategories[slug].tabLabel,
      to: `/resources/${slug}`,
    })),
  };
