import { useState } from "react";
import { Link } from "react-router-dom";
import { sectionPages, sectionMenus } from "../../../shared/data/navigation";
import { useCarousel } from "../../../shared/hooks/useCarousel";

export function QuickLinks() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const { current, goTo, handlers } = useCarousel(sectionPages.length, 6500);


  return (
    <section className="home-links-section home-section" id="home-links" data-home-reveal aria-labelledby="home-links-title" {...handlers}>
      <div className="home-section-intro">
        <span className="eyebrow">EXPLORE MORE</span>
        <h2 id="home-links-title">探索交大電機</h2>
        <p>從系學會、活動與系隊出發，找到你需要的學習資訊。</p>
      </div>
      <div className="quick-grid" aria-label="網站導覽">
      {sectionPages.map((page) => (
        <div
          className={`quick-item${openMenu === page.to ? " is-open" : ""}${sectionPages[current].to === page.to ? " is-featured" : ""}`}
          key={page.to}
          onMouseEnter={() => goTo(sectionPages.findIndex((item) => item.to === page.to))}
          onMouseLeave={(event) => {
            if (openMenu === page.to && !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
              // A clicked button keeps :focus-within active after the pointer leaves.
              const focusedElement = document.activeElement;
              if (focusedElement instanceof HTMLElement && event.currentTarget.contains(focusedElement)) {
                focusedElement.blur();
              }
              setOpenMenu(null);
              setShowAllTeams(false);
            }
          }}
          onBlur={(event) => {
            if (openMenu === page.to && !event.currentTarget.contains(event.relatedTarget)) {
              setOpenMenu(null);
              setShowAllTeams(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpenMenu(null);
              setShowAllTeams(false);
            }
          }}
        >
          <div className="quick-link">
            <Link className="quick-main-link" to={page.to}>
              <span className="quick-icon" aria-hidden="true">{page.icon}</span>
              <span className="quick-text"><small>{page.eyebrow}</small><strong>{page.title}</strong><span>{page.description}</span></span>
              <span className="quick-arrow" aria-hidden="true">↗</span>
            </Link>
            <button
              className="quick-plus"
              type="button"
              aria-label={`展開${page.title}選單`}
              aria-expanded={openMenu === page.to}
              onClick={() => setOpenMenu(openMenu === page.to ? null : page.to)}
            >
              <span aria-hidden="true">＋</span>
            </button>
          </div>
          <nav className="quick-menu" id={`quick-menu-${page.to.slice(1)}`} aria-label={`${page.title}內容連結`}>
            {(page.to === "/team" && !showAllTeams ? sectionMenus[page.to].slice(0, 5) : sectionMenus[page.to]).map((item) => (
              <Link key={item.to} to={item.to} onClick={() => {
                setOpenMenu(null);
                setShowAllTeams(false);
              }}>
                {item.label}<span aria-hidden="true">↗</span>
              </Link>
            ))}
            {page.to === "/team" && sectionMenus[page.to].length > 5 && (
              <button
                className="quick-menu-more"
                type="button"
                aria-expanded={showAllTeams}
                aria-controls="quick-menu-team"
                onClick={() => {
                  setOpenMenu(page.to);
                  setShowAllTeams((expanded) => !expanded);
                }}
              >
                {showAllTeams ? "收合系隊" : "顯示更多系隊"} <span className="quick-menu-more-icon" aria-hidden="true">{showAllTeams ? "⌃" : "⌄"}</span>
              </button>
            )}
          </nav>
        </div>
      ))}
      </div>
      <div className="quick-controls" aria-label="選擇網站導覽卡片">
        <button type="button" onClick={() => goTo(current - 1)} aria-label="上一個入口">‹</button>
        {sectionPages.map((page, index) => <button type="button" className={`quick-control-dot${index === current ? " is-active" : ""}`} key={page.to} onClick={() => goTo(index)} aria-label={`顯示${page.title}`} aria-pressed={index === current} />)}
        <button type="button" onClick={() => goTo(current + 1)} aria-label="下一個入口">›</button>
      </div>
    </section>
  );
}
