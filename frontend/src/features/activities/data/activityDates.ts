import type { ActivityItem } from "../activityTypes";

export type DatedActivity = ActivityItem & { date: string };

export function hasActivityDate(activity: ActivityItem): activity is DatedActivity {
  return activity.date !== undefined;
}

export function compareActivityDates(first: DatedActivity, second: DatedActivity) {
  return first.date.localeCompare(second.date) || first.id.localeCompare(second.id);
}

export function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
