import { useEffect, useState, type KeyboardEvent, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { PageContainer, SectionHeading } from "../../components/SiteChrome";
import { teams, teamSlides } from "./data";
import "./teams.css";

function TeamCarousel() {
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const slide = teamSlides[current];
  const paused = hovered || focused || reducedMotion;

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setCurrent((index) => (index + 1) % teamSlides.length), 5000);
    return () => window.clearTimeout(timer);
  }, [current, paused]);

  function showSlide(offset: number) {
    setCurrent((index) => (index + offset + teamSlides.length) % teamSlides.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 50) showSlide(distance < 0 ? 1 : -1);
    setTouchStart(null);
  }

  return (
    <section
      className="teams-carousel"
      aria-label="系隊照片輪播"
      aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={onKeyDown}
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => setTouchStart(null)}
    >
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
            <button key={item.image} className={index === current ? "is-active" : ""} type="button" onClick={() => setCurrent(index)} aria-label={`第 ${index + 1} 張：${item.title}`} aria-pressed={index === current} />
          ))}
        </div>
        <span className="teams-carousel-counter">{String(current + 1).padStart(2, "0")} / {String(teamSlides.length).padStart(2, "0")}</span>
      </div>
    </section>
  );
}

export default function TeamPage() {
  return (
    <main className="teams-page">
      <PageContainer>
        <TeamCarousel />
        <section className="teams-directory" aria-labelledby="teams-directory-title">
          <div className="teams-directory-heading">
            <SectionHeading eyebrow="DEPARTMENT TEAMS" title="系隊介紹" />
            <span className="teams-directory-note" id="teams-directory-title">點選系隊，認識球場上的夥伴</span>
          </div>
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
      </PageContainer>
    </main>
  );
}
