import { Link } from "react-router-dom";
import { activities, activityCategories } from "../data/activities";
import type { ActivityCategory, ActivityItem } from "../activityTypes";

interface ActivityOverviewProps {
  selectedCategory: ActivityCategory | null;
  onCategoryChange: (category: ActivityCategory | null) => void;
}

export function ActivityOverview({ selectedCategory, onCategoryChange }: ActivityOverviewProps) {
  return (
    <section className="activity-overview" aria-labelledby="activity-overview-title">
      <div className="activity-overview-copy">
        <span className="eyebrow">CAMPUS LIFE · EE COMMUNITY</span>
        <h1 id="activity-overview-title">活動總覽</h1>
        <p>從營隊、展演到系上交流，從不同活動認識電機人的學習與生活。</p>
        <p className="activity-demo-note"><span aria-hidden="true">●</span> 第一版為版面示意，正式時間與報名方式請以系所公告為準。</p>
        <button
          className="activity-all-button"
          type="button"
          aria-pressed={selectedCategory === null}
          onClick={() => onCategoryChange(null)}
        >
          顯示全部活動 <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="activity-category-cloud" role="group" aria-label="依活動分類篩選">
        {activityCategories.map((category, index) => {
          const isSelected = category.label === selectedCategory;
          const filterLabel = category.label.endsWith("活動")
            ? `篩選${category.label}`
            : `篩選${category.label}活動`;
          const detailActivity = activities.find(
            (activity) => activity.category === category.label && activity.detail,
          );
          const categoryContent = (
            <>
              <span>{category.label}</span>
              <small>{category.shortLabel}</small>
            </>
          );

          return detailActivity ? (
            <Link
              className={`activity-category-bubble activity-category-bubble-${index + 1}`}
              key={category.label}
              to={`/activities/${detailActivity.id}`}
              aria-label={`${category.label}，查看活動詳細頁`}
            >
              {categoryContent}
            </Link>
          ) : (
            <button
              className={`activity-category-bubble activity-category-bubble-${index + 1}`}
              type="button"
              key={category.label}
              aria-label={filterLabel}
              aria-pressed={isSelected}
              onClick={() => onCategoryChange(isSelected ? null : category.label)}
            >
              {categoryContent}
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface RecentActivitiesProps {
  selectedCategory: ActivityCategory | null;
  onActivitySelect: (activity: ActivityItem) => void;
}

export function RecentActivities({ selectedCategory, onActivitySelect }: RecentActivitiesProps) {
  const upcomingActivities = [...activities].sort((first, second) => first.date.localeCompare(second.date));
  const visibleActivities = selectedCategory
    ? upcomingActivities.filter((activity) => activity.category === selectedCategory)
    : upcomingActivities;

  return (
    <section className="recent-activities" aria-labelledby="recent-activities-title">
      <div className="recent-activities-heading">
        <div>
          <span className="eyebrow">UPCOMING EVENTS</span>
          <h2 id="recent-activities-title">近期活動</h2>
        </div>
        <p className="activity-filter-status" aria-live="polite">
          {selectedCategory ? `目前顯示：${selectedCategory}` : "目前顯示：全部活動"}
          <span>{visibleActivities.length} 項</span>
        </p>
      </div>

      <div className="activity-list">
        {visibleActivities.map((activity) => {
          const cardContent = (
            <>
            <time dateTime={activity.date} className="activity-card-date">
              <strong>{activity.date.slice(8, 10)}</strong>
              <span>{activity.date.slice(0, 7).replace("-", ".")}</span>
            </time>
            <span className="activity-card-content">
              <span className="activity-card-category">{activity.category}</span>
              <strong className="activity-card-title">{activity.title}</strong>
              <span className="activity-card-summary">{activity.summary}</span>
            </span>
            <span className="activity-card-arrow" aria-hidden="true">↗</span>
            </>
          );

          return activity.detail ? (
            <Link
              className="activity-card"
              key={activity.id}
              to={`/activities/${activity.id}`}
              aria-label={`${activity.title}，查看活動詳細頁`}
            >
              {cardContent}
            </Link>
          ) : (
            <button
              className="activity-card"
              type="button"
              key={activity.id}
              onClick={() => onActivitySelect(activity)}
              aria-label={`${activity.title}，查看活動詳情`}
            >
              {cardContent}
            </button>
          );
        })}
      </div>
    </section>
  );
}
