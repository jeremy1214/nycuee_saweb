import { Navigate, useParams } from "react-router-dom";
import { PageContainer } from "../../components/SiteChrome";
import { Checklist, InfoCardGrid, OfficialLinks, ProcessTimeline, ResourceOverview, ResourceTabs } from "./components/ResourceSections";
import { isResourceSlug, resourceCategories } from "./data/resources";
import "./resources.css";

export default function ResourcePage() {
  const { category: slug } = useParams();
  if (!isResourceSlug(slug)) return <Navigate to="/resources/courses" replace />;
  const category = resourceCategories[slug];

  return (
    <main className="resources-page">
      <PageContainer>
        <ResourceTabs active={slug} />
        <article id="resource-panel" role="tabpanel" aria-labelledby={`tab-${slug}`}>
          <ResourceOverview category={category} />
          <InfoCardGrid category={category} />
          <ProcessTimeline category={category} />
          <Checklist category={category} />
          <OfficialLinks category={category} />
        </article>
      </PageContainer>
    </main>
  );
}
