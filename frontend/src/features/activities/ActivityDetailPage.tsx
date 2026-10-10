import { Link, useParams } from "react-router-dom";
import { PageContainer } from "../../components/SiteChrome";
import NotFoundPage from "../../pages/NotFoundPage";
import { activities } from "./data/activities";
import "./activities.css";

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ActivityDetailPage() {
  const { activityId } = useParams();
  const activity = activities.find((item) => item.id === activityId && item.detail);

  if (!activity?.detail) return <NotFoundPage />;

  const { detail } = activity;

  return (
    <main className="activity-detail-page">
      <PageContainer>
        <nav className="activity-detail-breadcrumb" aria-label="麵包屑">
          <Link to="/activities/overview">系上活動</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{activity.category}</span>
        </nav>

        <header className="activity-detail-titlebar">
          <span className="eyebrow">{detail.eyebrow}</span>
          <h1>{activity.category}</h1>
          <p>{activity.title}</p>
        </header>

        <section id="activity-intro" className="activity-detail-hero" aria-labelledby="activity-intro-title">
          <div className="activity-detail-collage" aria-label={`${activity.category}活動照片`}>
            {detail.heroImages.map((image, index) => (
              <figure className={`activity-detail-photo activity-detail-photo-${index + 1}`} key={image.src}>
                <img src={image.src} alt={image.alt} />
              </figure>
            ))}
          </div>

          <div className="activity-detail-intro">
            <span className="activity-detail-label">活動介紹</span>
            <h2 id="activity-intro-title">從活動認識電機人的另一種日常</h2>
            {detail.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p className="activity-detail-draft-note">
              <span aria-hidden="true">●</span>
              本頁為第一版內容草稿，正式時間、地點、流程與照片說明請以系學會公告為準。
            </p>
          </div>
        </section>

        <nav className="activity-detail-section-nav" aria-label="活動內容章節">
          <button type="button" onClick={() => scrollToSection("activity-intro")}>活動介紹</button>
          {detail.sections.map((section) => (
            <button type="button" key={section.id} onClick={() => scrollToSection(section.id)}>
              {section.navLabel}
            </button>
          ))}
        </nav>

        <div className="activity-detail-sections">
          {detail.sections.map((section, index) => (
            <section id={section.id} className="activity-detail-section" key={section.id} aria-labelledby={`${section.id}-title`}>
              <figure className="activity-detail-section-image">
                <img src={section.image.src} alt={section.image.alt} />
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              </figure>
              <div className="activity-detail-section-copy">
                <span className="eyebrow">{section.eyebrow}</span>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <div className="activity-detail-back">
          <Link to="/activities/overview"><span aria-hidden="true">←</span> 回到活動總覽</Link>
        </div>
      </PageContainer>
    </main>
  );
}
