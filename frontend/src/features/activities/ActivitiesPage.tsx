import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal, PageContainer } from "../../shared/components/index";
import type { ActivityItem } from "./activityTypes";
import { ActivityOverview, RecentActivities } from "./components/ActivitySections";
import { ActivityLinks } from "./components/ActivityLinks";
import { ActivityDate } from "./components/ActivityDate";
import { useActivityContent, ActivityContentStatus } from "./data/ActivityContentProvider";
import "./activities.css";

export default function ActivitiesPage() {
  const { activityCategories, status, data } = useActivityContent();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const selectedCategory = activityCategories.find(
    (category) => category.id === categoryParam || category.label === categoryParam,
  )?.id ?? null;
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  useEffect(() => setSelectedActivity(null), [data]);

  if (status !== "ready") return <main className="activities-page"><PageContainer><ActivityContentStatus /></PageContainer></main>;

  function setSelectedCategory(categoryId: string | null) {
    setSearchParams(categoryId ? { category: categoryId } : {});
  }

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
              {selectedActivity.date && <ActivityDate activity={selectedActivity} />}
              {selectedActivity.location && <span>{selectedActivity.location}</span>}
            </div>
            <p>{selectedActivity.details}</p>
            <ActivityLinks links={selectedActivity.links} />
          </div>
        )}
      </Modal>
    </>
  );
}
