import { Navigate, useParams } from "react-router-dom";
import { PageContainer } from "../../shared/components/index";
import { OfficialLinks, ResourceContentSections, ResourceTabs } from "./components/ResourceSections";
import { useResourceContent } from "../../shared/data/SiteContentProvider";
import "./resources.css";

export default function ResourcePage() {
  const { category: slug } = useParams();
  const { resourceCategories, resourceOrder, defaultResourceSlug } = useResourceContent();
  if (!resourceOrder.length) return <p className="page-container">學習資源準備中。</p>;
  if (!slug || !resourceOrder.includes(slug)) return <Navigate to={`/resources/${defaultResourceSlug}`} replace />;
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
