import { Link } from "react-router-dom";
import { activities } from "../../activities/data/activities";
import { SectionHeading } from "../../../shared/components/index";

function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function RecentActivitiesSection() {
  const today = todayInTaiwan();
  const upcomingActivities = activities
    .filter((activity) => activity.date >= today)
    .sort((first, second) => first.date.localeCompare(second.date) || first.id.localeCompare(second.id))
    .slice(0, 3);

  return (
    <section className="home-section" id="recent-activities" aria-label="首頁近期活動">
      <SectionHeading
        eyebrow="UPCOMING EVENTS"
        title="近期活動"
        action={<Link className="section-more" to="/activities/overview">查看更多活動 <span aria-hidden="true">↗</span></Link>}
      />
      <p className="home-activity-note">活動資訊為示意，正式時間與報名方式請以系所公告為準。</p>
      {upcomingActivities.length > 0 ? (
        <div className="news-grid">
          {upcomingActivities.map((activity) => {
            const image = activity.detail?.heroImages[0];
            return (
              <Link className="news-card" to={`/activities/${activity.id}`} key={activity.id} aria-label={`${activity.title}，查看活動詳細頁`}>
                <span className="news-art">
                  <img src={image?.src ?? "/intro/activities.jpg"} alt={image?.alt ?? "系上活動紀錄"} style={{ objectPosition: image?.objectPosition }} />
                </span>
                <span className="news-body">
                  <time className="news-date" dateTime={activity.date}>{activity.date.replaceAll("-", ".")}</time>
                  <strong>{activity.category}</strong>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="home-activity-empty">目前沒有即將舉行的活動，請至<Link to="/activities/overview">活動總覽</Link>查看其他活動。</p>
      )}
    </section>
  );
}
