import { Link, Navigate, NavLink, useParams } from "react-router-dom";
import { Breadcrumb, PageContainer } from "../../shared/components/index";
import NotFoundPage from "../../shared/pages/NotFoundPage";
import { activities } from "./data/activities";
import "./activities.css";

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ActivityDetailPage() {
  const { activityId, tabId } = useParams();
  const activity = activities.find((item) => item.id === activityId);

  if (!activity || (tabId && !activity.detail)) return <NotFoundPage />;

  if (!activity.detail) {
    return (
      <main className="activity-detail-page">
        <PageContainer>
          <Breadcrumb className="activity-detail-breadcrumb" items={[{ label: "系上活動", to: "/activities/overview" }, { label: activity.category }]} />
          <header className="activity-detail-titlebar">
            <span className="eyebrow">UPCOMING EVENT</span>
            <h1>{activity.category}</h1>
            <p>{activity.title}</p>
          </header>
          <article className="activity-detail-fallback">
            <span className="activity-detail-label">活動資訊</span>
            <h2>{activity.title}</h2>
            <p>{activity.summary}</p>
            <p>{activity.details}</p>
            <dl>
              <div><dt>日期</dt><dd><time dateTime={activity.date}>{activity.date}</time></dd></div>
              <div><dt>地點</dt><dd>{activity.location}</dd></div>
            </dl>
          </article>
        </PageContainer>
      </main>
    );
  }

  const { detail } = activity;
  const sharedIntro = detail.introMode === "shared";
  const selectedTab = detail.tabs?.find((tab) => tab.id === tabId);

  if (detail.tabs && (!tabId || (sharedIntro && tabId === "intro"))) {
    const defaultTabId = sharedIntro ? detail.tabs[0].id : "intro";
    return <Navigate to={`/activities/${activity.id}/${defaultTabId}`} replace />;
  }
  if (tabId && (!detail.tabs || (tabId !== "intro" && !selectedTab))) {
    return <NotFoundPage />;
  }

  const showIntro = sharedIntro || !detail.tabs || tabId === "intro";
  const sections = selectedTab?.sections ?? detail.sections;
  const tabNavigation = detail.tabs && (
    <nav className="activity-detail-section-nav activity-detail-tab-nav" aria-label="活動內容分頁">
      {!sharedIntro && <NavLink to={`/activities/${activity.id}/intro`} end>活動介紹</NavLink>}
      {detail.tabs.map((tab) => (
        <NavLink to={`/activities/${activity.id}/${tab.id}`} key={tab.id} end>
          {tab.navLabel}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <main className={`activity-detail-page${detail.tabs ? " activity-detail-tabbed" : ""}${sharedIntro ? " activity-detail-shared-intro" : ""}`}>
      <PageContainer>
        <Breadcrumb className="activity-detail-breadcrumb" items={[{ label: "系上活動", to: "/activities/overview" }, { label: activity.category }]} />

        <header className="activity-detail-titlebar">
          <span className="eyebrow">{detail.eyebrow}</span>
          <h1>{activity.category}</h1>
          <p>{activity.title}</p>
        </header>

        {!sharedIntro && tabNavigation}

        {showIntro && (
          <section id="activity-intro" className="activity-detail-hero" aria-labelledby="activity-intro-title">
            <div className="activity-detail-collage" aria-label={`${activity.category}活動照片`}>
              {detail.heroImages.map((image, index) => (
                <figure className={`activity-detail-photo activity-detail-photo-${index + 1}`} key={image.src}>
                  <img src={image.src} alt={image.alt} style={{ objectPosition: image.objectPosition }} />
                </figure>
              ))}
            </div>

            <div className="activity-detail-intro">
              <span className="activity-detail-label">活動介紹</span>
              <h2 id="activity-intro-title">從活動認識電機人的另一種日常</h2>
              {detail.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        )}

        {sharedIntro && tabNavigation}

        {!detail.tabs && (
          <nav className="activity-detail-section-nav" aria-label="活動內容章節">
            <button type="button" onClick={() => scrollToSection("activity-intro")}>活動介紹</button>
            {detail.sections.map((section) => (
              <button type="button" key={section.id} onClick={() => scrollToSection(section.id)}>
                {section.navLabel}
              </button>
            ))}
          </nav>
        )}

        {selectedTab && <h2 className="activity-detail-tab-title">{selectedTab.navLabel}</h2>}
        {sections.length > 0 && (
          <div className="activity-detail-sections">
            {sections.map((section, index) => (
              <section id={section.id} className={`activity-detail-section${section.image ? "" : " activity-detail-section-text-only"}`} key={section.id} aria-labelledby={`${section.id}-title`}>
                {section.image && (
                  <figure className="activity-detail-section-image">
                    <img
                      src={section.image.src}
                      alt={section.image.alt}
                      loading={detail.tabs ? "lazy" : undefined}
                      style={{ objectPosition: section.image.objectPosition }}
                    />
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  </figure>
                )}
                <div className="activity-detail-section-copy">
                  <span className="eyebrow">{section.eyebrow}</span>
                  {selectedTab ? (
                    <h3 id={`${section.id}-title`}>{section.title}</h3>
                  ) : (
                    <h2 id={`${section.id}-title`}>{section.title}</h2>
                  )}
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="activity-detail-back">
          <Link to="/activities/overview"><span aria-hidden="true">←</span> 回到活動總覽</Link>
        </div>
      </PageContainer>
    </main>
  );
}
