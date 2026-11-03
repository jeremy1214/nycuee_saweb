import { Link } from "react-router-dom";
import { SectionHeading } from "../../../shared/components/index";
import { useCarousel } from "../../../shared/hooks/useCarousel";
import { useTeamContent, OrganizationContentStatus } from "../../organization/OrganizationContentProvider";

export function TeamCarousel() {
  const { teamSlides, status } = useTeamContent();
  const { current, isPaused: paused, goTo, handlers } = useCarousel(teamSlides.length);
  const slideIndex = teamSlides.length ? current % teamSlides.length : 0;
  const slide = teamSlides[slideIndex];
  const showSlide = (offset: number) => goTo(slideIndex + offset);

  if (status !== "ready") return <OrganizationContentStatus kind="team" />;
  if (!slide) return null;
  return (
    <section className="teams-carousel" aria-label="系隊照片輪播" aria-roledescription="carousel" {...handlers}>
      <img className="teams-carousel-image" src={slide.image} alt={slide.alt} key={slide.image} />
      <div className="teams-carousel-shade" aria-hidden="true" />
      <button className="teams-carousel-arrow teams-carousel-prev" type="button" onClick={() => showSlide(-1)} aria-label="上一張系隊照片">‹</button>
      <button className="teams-carousel-arrow teams-carousel-next" type="button" onClick={() => showSlide(1)} aria-label="下一張系隊照片">›</button>
      <div className="teams-carousel-caption" aria-live={paused ? "polite" : "off"}>
        <span className="eyebrow">NYCU EE · TOGETHER ON THE COURT</span>
        {slide.to ? <Link to={slide.to}>{slide.title}<span aria-hidden="true">↗</span></Link> : <strong>{slide.title}</strong>}
      </div>
      <div className="teams-carousel-bottom">
        <div className="teams-carousel-dots" aria-label="選擇系隊照片">
          {teamSlides.map((item, index) => (
            <button key={item.image} className={index === slideIndex ? "is-active" : ""} type="button" onClick={() => goTo(index)} aria-label={`第 ${index + 1} 張：${item.title}`} aria-pressed={index === slideIndex} />
          ))}
        </div>
        <span className="teams-carousel-counter">{String(slideIndex + 1).padStart(2, "0")} / {String(teamSlides.length).padStart(2, "0")}</span>
      </div>
    </section>
  );
}


export function TeamDirectory() {
  const { teams, status } = useTeamContent();
  if (status !== "ready") return null;
  return (
        <section className="teams-directory" aria-labelledby="teams-directory-title">
          <div className="teams-directory-heading">
            <SectionHeading eyebrow="DEPARTMENT TEAMS" title="系隊介紹" />
            <span className="teams-directory-note" id="teams-directory-title">點選系隊，認識球場上的夥伴</span>
          </div>
          {!teams.length && <p>目前沒有公開系隊。</p>}
          <div className="teams-link-grid">
            {teams.map((team, index) => (
              <Link className="teams-link-card" key={team.key} to={`/team/${team.key}`}>
                <span className="teams-link-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="teams-link-name">{team.name}</span>
                <span className="teams-link-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>
  );
}
