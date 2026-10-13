import { useState } from "react";
import { Link } from "react-router-dom";
import { sectionPages, sectionMenus } from "../../../shared/data/navigation";

export function QuickLinks() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);


  return (
    <section className="quick-grid" aria-label="網站導覽">
      {sectionPages.map((page) => (
        <div
          className={`quick-item${openMenu === page.to ? " is-open" : ""}`}
          key={page.to}
          onMouseLeave={() => {
            setOpenMenu(null);
            setShowAllTeams(false);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
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
              <span>{page.title}</span>
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
          <nav className="quick-menu" aria-label={`${page.title}內容連結`}>
            {(page.to === "/team" && !showAllTeams ? sectionMenus[page.to].slice(0, 5) : sectionMenus[page.to]).map((item) => (
              <Link key={item.to} to={item.to} onClick={() => {
                setOpenMenu(null);
                setShowAllTeams(false);
              }}>
                {item.label}<span aria-hidden="true">↗</span>
              </Link>
            ))}
            {page.to === "/team" && !showAllTeams && sectionMenus[page.to].length > 5 && (
              <button
                className="quick-menu-more"
                type="button"
                onClick={() => setShowAllTeams(true)}
              >
                顯示更多系隊 <span className="quick-menu-more-icon" aria-hidden="true">⌄</span>
              </button>
            )}
          </nav>
        </div>
      ))}
    </section>
  );
}

