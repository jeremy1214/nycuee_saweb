import { Navigate, useParams } from "react-router-dom";
import { PageContainer } from "../../shared/components/index";
import { OfficialLinks, ResourceContentSections, ResourceTabs } from "./components/ResourceSections";
import { defaultResourceSlug, isResourceSlug, resourceCategories } from "./data/resources";
import "./resources.css";

export default function ResourcePage() {
  const { category: slug } = useParams();
  if (!isResourceSlug(slug)) return <Navigate to={`/resources/${defaultResourceSlug}`} replace />;
  const category = resourceCategories[slug];

  return (
    <main className="resources-page">
      <PageContainer>
        <ResourceTabs active={slug} />
        <article id="resource-panel" role="tabpanel" aria-labelledby={`tab-${slug}`}>
          <OfficialLinks category={category} />
          <ResourceContentSections category={category} />
        </article>
      </PageContainer>
    </main>
  );
}
