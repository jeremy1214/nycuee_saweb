import { sectionPages, contactPage } from "./navigation";
import { departments, departmentCards } from "../../features/eesa/data/eesa";
import { teams } from "../../features/teams/data/teams";
import { resourceCategories, resourceOrder } from "../../features/resources/data/resources";

export const searchItems = [
  ...sectionPages.map((page) => ({ label: page.title, description: page.description, to: page.to })),
  { label: contactPage.title, description: contactPage.description, to: contactPage.to },
  ...teams.map((team) => ({ label: `系隊｜${team.name}`, description: team.intro.join(" "), to: `/team/${team.key}` })),
  ...departmentCards.map((card) => ({ label: card.name, description: card.description, to: card.link })),
  ...Object.entries(departments).flatMap(([slug, department]) => [
    ...department.activities.map((activity) => ({ label: `${department.title}｜${activity.name}`, description: activity.description.join(" "), to: `/eesa/${slug}/activities/${activity.slug}` })),
    ...(department.skills ? [{ label: `${department.title}｜學習能力`, description: department.skills.mainTitle, to: `/eesa/${slug}/skills` }] : []),
    ...(department.experiences ?? []).map((experience) => ({ label: experience.title, description: experience.content.join(" "), to: `/eesa/${slug}/experiences/${experience.id}` })),
  ]),
  { label: "系所新訊", description: "首頁的最新焦點與學習資訊", to: "/#news" },
  ...resourceOrder.map((slug) => ({ label: resourceCategories[slug].tabLabel, description: resourceCategories[slug].searchDescription, to: `/resources/${slug}` })),
  { label: "電機行事曆", description: "近期系所與學術活動", to: "/#calendar" },
];
