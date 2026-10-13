import { Link } from "react-router-dom";
import { useCarousel } from "../../../shared/hooks/useCarousel";
import { slides } from "../data/home";

export function HeroCarousel() {
  const { current, isPaused, goTo: showSlide, handlers } = useCarousel(slides.length);
  const slide = slides[current];

  return (
    <section className="home-photo-section home-section" id="explore" data-home-reveal aria-labelledby="home-photo-heading">
      <div className="home-section-intro">
        <span className="eyebrow">EXPLORE NYCU EE</span>
        <h2 id="home-photo-heading">一起探索電機生活</h2>
        <p>從課程、實作到交流，看看交大電機的不同面貌。</p>
      </div>
      <div className="hero" aria-label="首頁焦點輪播" aria-roledescription="carousel" {...handlers}>
        <img className="hero-art" key={slide.image} src={slide.image} alt={slide.title} style={{ objectPosition: slide.imagePosition }} />
        <div className="hero-copy" key={current} aria-live={isPaused ? "polite" : "off"}>
          <span className="eyebrow">{slide.eyebrow}</span>
          <h3>{slide.title}</h3>
          <p>{slide.description.map((line) => <span key={line}>{line}<br /></span>)}</p>
          <Link className="hero-link" to="/eesa">探索交大電機 <span aria-hidden="true">↗</span></Link>
        </div>
        <button className="hero-arrow hero-prev" type="button" onClick={() => showSlide(current - 1)} aria-label="上一張">‹</button>
        <button className="hero-arrow hero-next" type="button" onClick={() => showSlide(current + 1)} aria-label="下一張">›</button>
        <div className="hero-bottom">
        <div className="hero-dots" aria-label="選擇輪播項目">
          {slides.map((item, index) => (
            <button
              key={item.title}
              className={`hero-dot ${index === current ? "is-active" : ""}`}
              type="button"
              onClick={() => showSlide(index)}
              aria-label={`第 ${index + 1} 張`}
              aria-pressed={index === current}
              aria-current={index === current ? "true" : undefined}
            />
          ))}
        </div>
        <span className="hero-counter">{String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
        </div>
      </div>
    </section>
  );
}
