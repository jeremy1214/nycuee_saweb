import { Link, NavLink } from "react-router-dom";
import { PageContainer } from "../components/SiteChrome";
import { sectionPages, type SectionPage as SectionPageInfo } from "../data/navigation";

export default function SectionPage({ section }: { section: SectionPageInfo }) {
  return (
    <main className="section-page">
      <PageContainer>
        <nav className="section-breadcrumb" aria-label="所在位置">
          <Link to="/">首頁</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{section.title}</span>
        </nav>
        <section className="section-placeholder" aria-labelledby="section-page-title">
          <span className="section-placeholder-icon" aria-hidden="true">{section.icon}</span>
          <span className="eyebrow">{section.eyebrow}</span>
          <h1 id="section-page-title">{section.title}</h1>
          <p>{section.description}</p>
          <span className="section-status">內容準備中</span>
          <Link className="primary-button" to="/">返回首頁 <span aria-hidden="true">↗</span></Link>
        </section>
        <nav className="section-switcher" aria-label="切換頁面">
          {sectionPages.map((page) => (
            <NavLink key={page.to} to={page.to} end>
              <span className="quick-icon" aria-hidden="true">{page.icon}</span>
              {page.title}
              <span className="section-switch-arrow" aria-hidden="true">↗</span>
            </NavLink>
          ))}
        </nav>
      </PageContainer>
    </main>
  );
}
