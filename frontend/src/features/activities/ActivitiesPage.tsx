import { useState } from "react";
import { Modal, PageContainer } from "../../components/SiteChrome";
import type { ActivityCategory, ActivityItem } from "./activityTypes";
import { ActivityOverview, RecentActivities } from "./components/ActivitySections";
import "./activities.css";

export default function ActivitiesPage() {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  return (
    <>
      <main className="activities-page">
        <PageContainer>
          <ActivityOverview selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
          <RecentActivities selectedCategory={selectedCategory} onActivitySelect={setSelectedActivity} />
        </PageContainer>
      </main>

      <Modal
        open={selectedActivity !== null}
        title={selectedActivity?.title ?? "活動資訊"}
        onClose={() => setSelectedActivity(null)}
      >
        {selectedActivity && (
          <div className="activity-dialog-content">
            <div className="activity-dialog-meta">
              <span>{selectedActivity.category}</span>
              <time dateTime={selectedActivity.date}>{selectedActivity.date.replaceAll("-", ".")}</time>
              <span>{selectedActivity.location}</span>
            </div>
            <p>{selectedActivity.details}</p>
            <p className="activity-dialog-note">此活動為網站版面示意，正式時間、地點與報名方式請以系所公告為準。</p>
          </div>
        )}
      </Modal>
    </>
  );
}
