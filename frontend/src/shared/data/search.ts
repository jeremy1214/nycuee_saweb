import { sectionPages, contactPage } from "./navigation";
import { siteContact, socialLinks } from "./site";
import { exploreContent, calendarEvents } from "../../features/home/data/home";
import { eesaOverview, departments, departmentCards } from "../../features/eesa/data/eesa";
import { teams } from "../../features/teams/data/teams";
import { activities, activityCategories } from "../../features/activities/data/activities";
import { otherActivities } from "../../features/activities/data/otherActivities";
import { resourceCategories, resourceOrder } from "../../features/resources/data/resources";

export interface SearchItem {
  label: string;
  description: string;
  to: string;
  content: string;
}

// Index public content used to render pages, excluding internal IDs and media paths.
const hiddenFields = new Set([
  "id", "key", "slug", "categoryId", "featuredActivityId", "order", "status",
  "type", "src", "href", "to", "imagePosition", "objectPosition", "fit", "introMode",
]);

function visibleText(value: unknown): string[] {
  if (typeof value === "string") return /^https?:\/\/|^\//.test(value) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap(visibleText);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => hiddenFields.has(key) ? [] : visibleText(child));
  }
  return [];
}

function item(label: string, to: string, description: string, ...content: unknown[]): SearchItem {
  return { label, to, description, content: [label, description, ...content.flatMap(visibleText)].join(" ") };
}

export const searchItems: SearchItem[] = [
  item("首頁", "/", "探索交大電機、近期活動與電機行事曆", exploreContent, calendarEvents,
    "從交大電機出發 認識電機系學會 探索交大電機",
    "從系學會、活動與系隊出發，找到你需要的學習資訊。", eesaOverview.introduction,
    "近期活動 活動資訊為示意，正式時間與報名方式請以系所公告為準。",
    "電機行事曆 匯入 Google 日曆 下載活動檔案 活動目前會以全天顯示。"),
  ...sectionPages.map((page) => item(page.title, page.to, page.description)),
  item(contactPage.title, contactPage.to, contactPage.description, siteContact, socialLinks,
    "有問題嗎？讓我們協助你。不論是系學會活動、學習資源或網站內容，都歡迎留下問題。我們會將訊息交給合適的窗口處理。",
    "提交前的小提醒 選擇問題類別 提供完整資訊 留意電子信箱 也可以直接寄信 提交問題 姓名 Email 問題類別 主旨 問題內容 系學會相關 系上活動 系隊相關 學習資料 網站問題或建議"),
  item("系學會介紹", "/eesa", eesaOverview.introduction, eesaOverview, departmentCards,
    siteContact, socialLinks, "聯絡資訊 電子信箱 Facebook Instagram 辦公室"),
  item("系隊介紹", "/team", "點選系隊，認識球場上的夥伴", teams.map((team) => team.name)),
  ...teams.flatMap((team) => [
    item(`系隊｜${team.name}`, `/team/${team.key}`, team.intro.join(" "),
      team.intro, team.schedule, team.contact, "隊伍介紹 練習時間 活動介紹 聯絡資訊與入隊方法"),
    ...team.activities.map((activity) => item(
      `${team.name}｜${activity.name}`,
      `/team/${team.key}?activity=${encodeURIComponent(activity.id)}`,
      activity.description, activity.month,
    )),
  ]),
  ...departmentCards.map((card) => {
    const slug = card.link.split("/").pop()!;
    const department = departments[slug];
    return item(card.name, card.link, card.description, department.introParagraphs,
      department.memberDescription, "部員名單", department.extraSidebarItems);
  }),
  ...Object.entries(departments).flatMap(([slug, department]) => [
    item(`${department.title}｜活動介紹與工作成果`, `/eesa/${slug}/activities`,
      "部門活動與工作成果", department.activities.map((activity) => activity.name)),
    ...department.activities.map((activity) => item(
      `${department.title}｜${activity.name}`, `/eesa/${slug}/activities/${activity.slug}`,
      activity.description.join(" "), activity,
    )),
    ...(department.skills ? [item(`${department.title}｜學習能力`, `/eesa/${slug}/skills`,
      department.skills.mainTitle, department.skills)] : []),
    ...(department.experiences ?? []).map((experience) => item(
      experience.title, `/eesa/${slug}/experiences/${experience.id}`,
      experience.content.join(" "), experience,
    )),
  ]),
  item("活動總覽", "/activities/overview", "系上活動、分類與近期活動", activityCategories,
    "從營隊、展演到系上交流，從不同活動認識電機人的學習與生活。", activities.map((activity) => [activity.title, activity.summary])),
  ...activities.flatMap((activity) => {
    const base = `/activities/${activity.id}`;
    const shared = [activity.title, activity.category, activity.date, activity.location,
      activity.summary, activity.details];
    const intro = activity.detail ? [activity.detail.eyebrow, activity.detail.intro,
      activity.detail.sections] : [];
    const introPath = activity.detail?.tabs && activity.detail.introMode !== "shared"
      ? `${base}/intro` : base;
    return [
      item(activity.title, introPath, activity.summary, shared, intro),
      ...(activity.detail?.tabs ?? []).map((tab) => item(
        `${activity.title}｜${tab.navLabel}`, `${base}/${tab.id}`, tab.navLabel,
        shared, activity.detail?.introMode === "shared" ? activity.detail.intro : [], tab.sections,
      )),
    ];
  }),
  item("其他活動", "/activities/other", "其他活動相簿", otherActivities.map((activity) => [activity.title, activity.summary])),
  ...otherActivities.map((activity) => item(activity.title,
    `/activities/other?activity=${encodeURIComponent(activity.id)}`, activity.summary, activity)),
  ...resourceOrder.map((slug) => {
    const category = resourceCategories[slug];
    return item(category.tabLabel, `/resources/${slug}`, category.searchDescription,
      "官方資訊入口 詳細規定與申請方式請以官方最新公告為準。", category.links, category.sections);
  }),
  item("電機行事曆", "/", "首頁的系上活動與日期", calendarEvents),
];
