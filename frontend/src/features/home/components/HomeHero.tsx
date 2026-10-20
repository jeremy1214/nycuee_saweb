import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useCarousel } from "../../../shared/hooks/useCarousel";
import { slides } from "../data/home";

export function HomeHero() {
  const heroRef = useRef<HTMLElement>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const { current, isPaused, handlers } = useCarousel(slides.length, 4800, { pauseOnHover: false, autoplayEnabled });
  const title = slides[current].title;
  const characters = Array.from(title);

  useEffect(() => {
    let inViewport = !window.IntersectionObserver;
    const update = () => setAutoplayEnabled(inViewport && document.visibilityState !== "hidden");
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      update();
    }) : null;
    if (heroRef.current) observer?.observe(heroRef.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <section ref={heroRef} className="home-hero" data-motion-paused={!autoplayEnabled} aria-label="交大電機首頁主視覺" {...handlers}>
      <div className="page-container home-hero-inner">
        <span className="eyebrow">CONNECTING IDEAS. ENGINEERING THE FUTURE.</span>
        <h1>從交大電機出發，<br />
          <span className="home-hero-title-stack">
            {/* Every title participates in sizing, so even wrapped mobile titles reserve the same space. */}
            {slides.map((slide) => <span className="home-hero-title-sizer" aria-hidden="true" key={slide.title}>{slide.title}</span>)}
            <span className="home-hero-changing" key={current} aria-live={isPaused ? "polite" : "off"}>
              <span className="home-hero-accessible-text">{title}</span>
              <span aria-hidden="true">
                {characters.map((character, index) => <span
                  className="home-hero-character"
                  key={index}
                  style={{ "--character-delay": `${((index + 1) / characters.length) * 1.1}s` } as CSSProperties}
                >{character}</span>)}
              </span>
            </span>
          </span>
        </h1>
        <p>從一個想法，到改變世界的技術。<br />在交大電機，探索、實作，讓創新發生。</p>
        <Link className="home-button" to="https://dee.nycu.edu.tw/">探索交大電機 <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="home-waves" aria-hidden="true">
        <div className="home-wave-layer wave-one"><svg viewBox="0 0 1440 176" preserveAspectRatio="none">
          <path className="wave" d="M-80 72 C 160 0, 300 170, 550 90 S 980 -5, 1220 78 S 1510 132, 1600 64" />
        </svg></div>
        <div className="home-wave-layer wave-two"><svg viewBox="0 0 1440 176" preserveAspectRatio="none">
          <path className="wave" d="M-80 104 C 140 176, 332 24, 560 92 S 985 178, 1210 88 S 1470 16, 1600 105" />
        </svg></div>
        <div className="home-wave-layer wave-three"><svg viewBox="0 0 1440 176" preserveAspectRatio="none">
          <path className="wave" d="M-80 118 C 170 34, 337 162, 565 110 S 987 12, 1220 114 S 1480 160, 1600 85" />
        </svg></div>
      </div>
    </section>
  );
}
