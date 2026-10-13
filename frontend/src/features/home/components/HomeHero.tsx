import { Link } from "react-router-dom";
import { useCarousel } from "../../../shared/hooks/useCarousel";
import { slides } from "../data/home";

export function HomeHero() {
  const { current, isPaused, handlers } = useCarousel(slides.length, 4800);

  return (
    <section className="home-hero" aria-label="交大電機首頁主視覺" {...handlers}>
      <div className="page-container home-hero-inner">
        <span className="eyebrow">CONNECTING IDEAS. ENGINEERING THE FUTURE.</span>
        <h1>從交大電機出發，<br /><span className="home-hero-changing" key={current} aria-live={isPaused ? "polite" : "off"}>{slides[current].title}</span></h1>
        <p>從一個想法，到改變世界的技術。<br />在交大電機，探索、實作，讓創新發生。</p>
        <Link className="home-button" to="/eesa">探索交大電機 <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="home-waves" aria-hidden="true">
        <svg viewBox="0 0 1440 176" preserveAspectRatio="none">
          <path className="wave wave-one" d="M-80 72 C 160 0, 300 170, 550 90 S 980 -5, 1220 78 S 1510 132, 1600 64" />
          <path className="wave wave-two" d="M-80 104 C 140 176, 332 24, 560 92 S 985 178, 1210 88 S 1470 16, 1600 105" />
          <path className="wave wave-three" d="M-80 118 C 170 34, 337 162, 565 110 S 987 12, 1220 114 S 1480 160, 1600 85" />
        </svg>
      </div>
    </section>
  );
}
