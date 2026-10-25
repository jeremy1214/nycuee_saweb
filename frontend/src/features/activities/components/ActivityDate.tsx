import { activityEndDate } from "../data/activityDates";
import "./activityDate.css";

export function ActivityDate({ activity, className = "" }: {
  activity: { date?: string; endDate?: string };
  className?: string;
}) {
  if (!activity.date) return null;
  const endDate = activityEndDate({ date: activity.date, endDate: activity.endDate });
  return (
    <span className={`activity-date ${className}`.trim()}>
      <time dateTime={activity.date}>{activity.date.replaceAll("-", ".")}</time>
      {endDate !== activity.date && <>
        <span aria-label="至">{" – "}</span>
        <time dateTime={endDate}>{endDate.replaceAll("-", ".")}</time>
      </>}
    </span>
  );
}
