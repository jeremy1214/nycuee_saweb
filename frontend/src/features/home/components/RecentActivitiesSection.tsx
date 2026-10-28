import { Link } from "react-router-dom";
import { useActivityContent, ActivityContentStatus } from "../../activities/data/ActivityContentProvider";
import { activityEndDate, compareActivityDates, hasActivityDate, todayInTaiwan } from "../../activities/data/activityDates";
import { ActivityDate } from "../../activities/components/ActivityDate";
import { SectionHeading } from "../../../shared/components/index";

export function RecentActivitiesSection() {
  const { activities, status } = useActivityContent();
  const today = todayInTaiwan();
  const upcomingActivities = activities
    .filter(hasActivityDate)
    .filter((activity) => activityEndDate(activity) >= today)
    .sort(compareActivityDates)
    .slice(0, 3);

  return (
    <section className="home-section home-activities-section" id="recent-activities" data-home-reveal aria-label="首頁近期活動">
      <SectionHeading
        eyebrow="UPCOMING EVENTS"
        title="最新消息"
        action={<Link className="section-more" to="/activities/overview">查看更多活動 <span aria-hidden="true">↗</span></Link>}
      />
      {status !== "ready" ? <ActivityContentStatus /> : upcomingActivities.length > 0 ? (
        <div className="news-grid">
          {upcomingActivities.map((activity) => {
            const image = activity.album?.cover ?? activity.detail?.heroImages[0];
            return (
              <Link className="news-card" to={`/activities/${activity.id}`} key={activity.id} aria-label={`${activity.title}，查看活動詳細頁`}>
                <span className="news-art">
                  <img src={image?.src ?? "/intro/activities.jpg"} alt={image?.alt ?? "系上活動紀錄"} style={{ objectPosition: image?.objectPosition, objectFit: image?.fit }} />
                </span>
                <span className="news-body">
                  <ActivityDate className="news-date" activity={activity} />
                  <strong>{activity.categoryId === "other" ? activity.title : activity.category}</strong>
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
