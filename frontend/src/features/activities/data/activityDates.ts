import type { ActivityItem } from "../activityTypes";

export type DatedActivity = ActivityItem & { date: string };

export function hasActivityDate(activity: ActivityItem): activity is DatedActivity {
  return activity.date !== undefined;
}

/** Both dates in the content are inclusive; an omitted end date means one day. */
export function activityEndDate(activity: Pick<DatedActivity, "date" | "endDate">) {
  return activity.endDate ?? activity.date;
}

export function activityOccursOn(activity: Pick<DatedActivity, "date" | "endDate">, day: string) {
  return activity.date <= day && activityEndDate(activity) >= day;
}

export function formatActivityDateRange(activity: Pick<DatedActivity, "date" | "endDate">) {
  const start = activity.date.replaceAll("-", ".");
  const end = activityEndDate(activity);
  return end === activity.date ? start : `${start} – ${end.replaceAll("-", ".")}`;
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
