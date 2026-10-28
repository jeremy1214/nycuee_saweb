import { Link } from "react-router-dom";
import { useActivityContent } from "../data/ActivityContentProvider";
import { compareActivityDates, hasActivityDate } from "../data/activityDates";
import type { ActivityItem } from "../activityTypes";
import { ActivityDate } from "./ActivityDate";

interface ActivityOverviewProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function ActivityOverview({ selectedCategory, onCategoryChange }: ActivityOverviewProps) {
  const { activities, activityCategories } = useActivityContent();
  return (
    <section className="activity-overview" aria-labelledby="activity-overview-title">
      <div className="activity-overview-copy">
        <span className="eyebrow">CAMPUS LIFE · EE COMMUNITY</span>
        <h1 id="activity-overview-title">活動總覽</h1>
        <p>從營隊、展演到系上交流，從不同活動認識電機人的學習與生活。</p>
      </div>

      <div className="activity-category-cloud" role="group" aria-label="依活動分類篩選">
        {activityCategories.map((category, index) => {
          const isSelected = category.id === selectedCategory;
          const filterLabel = category.label.endsWith("活動")
            ? `篩選${category.label}`
            : `篩選${category.label}活動`;
          const detailActivity = category.featuredActivityId
            ? activities.find((activity) => activity.id === category.featuredActivityId)
            : undefined;
          const categoryContent = (
            <>
              <span>{category.label}</span>
              <small>{category.shortLabel}</small>
            </>
          );

          return category.id === "other" ? (
            <Link
              className={`activity-category-bubble activity-category-bubble-${index + 1}`}
              key={category.id}
              to="/activities/other"
              aria-label="其他活動，查看活動相簿"
            >
              {categoryContent}
            </Link>
          ) : detailActivity ? (
            <Link
              className={`activity-category-bubble activity-category-bubble-${index + 1}`}
              key={category.id}
              to={`/activities/${detailActivity.id}`}
              aria-label={`${category.label}，查看活動詳細頁`}
            >
              {categoryContent}
            </Link>
          ) : (
            <button
              className={`activity-category-bubble activity-category-bubble-${index + 1}`}
              type="button"
              key={category.id}
              aria-label={filterLabel}
              aria-pressed={isSelected}
              onClick={() => onCategoryChange(isSelected ? null : category.id)}
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
  selectedCategory: string | null;
  onActivitySelect: (activity: ActivityItem) => void;
}

export function RecentActivities({ selectedCategory, onActivitySelect }: RecentActivitiesProps) {
  const { activities, activityCategories } = useActivityContent();
  const upcomingActivities = activities.filter(hasActivityDate).sort(compareActivityDates);
  const visibleActivities = selectedCategory
    ? upcomingActivities.filter((activity) => activity.categoryId === selectedCategory)
    : upcomingActivities;
  const selectedCategoryLabel = activityCategories.find((category) => category.id === selectedCategory)?.label;

  return (
    <section className="recent-activities" aria-labelledby="recent-activities-title">
      <div className="recent-activities-heading">
        <div>
          <span className="eyebrow">UPCOMING EVENTS</span>
          <h2 id="recent-activities-title">近期活動</h2>
        </div>
      </div>

      {visibleActivities.length === 0 && <p>目前沒有符合條件的活動。</p>}
      <div className="activity-list">
        {visibleActivities.map((activity) => {
          const cardContent = (
            <>
            <time dateTime={activity.date} className="activity-card-date">
              <strong>{activity.date.slice(8, 10)}</strong>
              <span>{activity.date.slice(0, 7).replace("-", ".")}</span>
            </time>
            <span className="activity-card-content">
              <strong className="activity-card-title">{activity.title}</strong>
              {activity.endDate && activity.endDate !== activity.date && (
                <span className="activity-card-range"><ActivityDate activity={activity} /></span>
              )}
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
