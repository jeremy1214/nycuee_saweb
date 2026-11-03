import { Link } from "react-router-dom";
import { useEesaContent, OrganizationContentStatus } from "../../organization/OrganizationContentProvider";

export function HomeAbout() {
  const { departmentCards, eesaOverview, status } = useEesaContent();
  if (status !== "ready") return <OrganizationContentStatus kind="eesa" />;
  if (!eesaOverview && !departmentCards.length) return null;
  return (
    <section className="home-about home-section" id="home-about" data-home-reveal aria-labelledby="home-about-title">
      <div className="home-about-copy">
        <span className="eyebrow">ABOUT EESA</span>
        <h2 id="home-about-title">認識電機系學會</h2>
        <p>{eesaOverview?.introduction}</p>
        <Link className="home-button" to="/eesa">了解更多 <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="home-about-departments" aria-label="系學會四大部門">
        {departmentCards.map((department, index) => (
          <Link className="home-department-card" to={department.link} key={department.link}>
            <strong>{department.name}</strong>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
