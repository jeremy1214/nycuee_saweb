import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calendarEvents, newsItems, slides } from "../data/home";
import { sectionPages } from "../data/navigation";
import { departmentCards } from "../features/eesa/data";
import { activityCategories } from "../features/activities/data/activities";
import { resourceCategories, resourceOrder } from "../features/resources/data/resources";
import { teams } from "../features/teams/data";
import type { CalendarEvent, NewsItem } from "../types";
import { SectionHeading } from "./SiteChrome";
import CalendarImport from "./CalendarImport";

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const touchStartX = useRef<number | null>(null);
  const slide = slides[current];
  const isPaused = isHovered || hasFocus || prefersReducedMotion;

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isPaused || slides.length < 2) return;

    const timer = window.setTimeout(() => {
      setCurrent((index) => (index + 1) % slides.length);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [current, isPaused]);

  function showSlide(index: number) {
    setCurrent((index + slides.length) % slides.length);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(current - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(current + 1);
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (touchStartX.current === null) return;

    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 50) return;
    showSlide(current + (distance < 0 ? 1 : -1));
  }

  return (
    <section
      className="hero"
      aria-label="首頁焦點輪播"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartX.current = null; }}
    >
      <img className="hero-art" src={slide.image} alt="" style={{ objectPosition: slide.imagePosition }} />
      <div className="hero-copy" key={current} aria-live={isPaused ? "polite" : "off"}>
        <span className="eyebrow">{slide.eyebrow}</span>
        <h1>{slide.title}</h1>
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
    </section>
  );
}

export function NewsSection({ onPlaceholder }: { onPlaceholder: (title: string) => void }) {
  return (
    <section className="home-section" id="news">
      <SectionHeading
        eyebrow="WHAT'S NEW"
        title="系所新訊"
        action={<a className="section-more" href="https://dee.nycu.edu.tw/news.php?locale=tw" target="_blank" rel="noreferrer">查看最新消息 <span aria-hidden="true">↗</span></a>}
      />
      <div className="news-grid">
        {newsItems.map((item) => (
          <button className="news-card" type="button" key={item.title} onClick={() => onPlaceholder(item.title)}>
            <NewsArtwork item={item} />
            <span className="news-body">
              <time className="news-date" dateTime={item.date}>{item.date.replaceAll("-", ".")} · 示意消息</time>
              <strong>{item.title}</strong>
              <span className="news-summary">{item.summary}</span>
              <span className="news-card-bottom">了解更多 <b aria-hidden="true">↗</b></span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function NewsArtwork({ item }: { item: NewsItem }) {
  const artwork = {
    research: (<svg viewBox="0 0 360 145" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="360" height="145" fill="#e2eeea"/>
            <g fill="none" stroke="#79a99b">
              <circle cx="245" cy="78" r="62"/><circle cx="245" cy="78" r="43"/>
              <circle cx="245" cy="78" r="23"/>
              <path d="M0 28H143L177 62H222M0 94H150L180 78H222M270 78H360"/>
            </g>
            <g fill="#087f80"><circle cx="245" cy="78" r="8"/>
              <circle cx="143" cy="28" r="3"/><circle cx="150" cy="94" r="3"/></g>
            <text x="24" y="38" fill="#437e70" fontSize="11"
              fontFamily="monospace" letterSpacing="3">RESEARCH</text>
          </svg>),
    campus: (<svg viewBox="0 0 360 145" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="360" height="145" fill="#e5ecf1"/>
            <path d="M68 145V68L179 25L294 68V145" fill="#b5c7d3"/>
            <path d="M91 145V77H271V145" fill="#d7e1e7"/>
            <path d="M165 145V98H199V145" fill="#5b7a91"/>
            <g fill="#7392a6">
              <path d="M107 88H124V106H107ZM139 88H156V106H139ZM209 88H226V106H209ZM241 88H258V106H241Z"/>
              <path d="M107 117H124V135H107ZM139 117H156V135H139ZM209 117H226V135H209ZM241 117H258V135H241Z"/>
            </g>
            <path d="M50 69L179 18L313 69" fill="none" stroke="#638399" strokeWidth="3"/>
            <text x="24" y="30" fill="#59798d" fontSize="11"
              fontFamily="monospace" letterSpacing="3">ADMISSIONS</text>
          </svg>),
    student: (<svg viewBox="0 0 360 145" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="360" height="145" fill="#f0eadb"/>
            <g transform="translate(187 17)">
              <rect width="99" height="85" rx="4" fill="#cbbb98"/>
              <rect x="7" y="7" width="85" height="63" rx="2" fill="#f8f5ec"/>
              <path d="M18 46L32 46L40 23L49 56L59 36L69 46H81"
                stroke="#91805a" strokeWidth="2" fill="none"/>
              <path d="M43 85V106M24 106H75" stroke="#9e8c66" strokeWidth="5"/>
            </g>
            <circle cx="147" cy="103" r="13" fill="#dfcfaa"/>
            <path d="M128 145V126Q147 110 167 126V145" fill="#af9972"/>
            <text x="24" y="30" fill="#9c8660" fontSize="11"
              fontFamily="monospace" letterSpacing="3">STUDENT LIFE</text>
          </svg>),
  };

  return (
    <span className={`news-art news-art-${item.artwork}`}>
      {artwork[item.artwork]}
      <span className="news-badge">{item.category}</span>
    </span>
  );
}

export function QuickLinks() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const menus: Record<string, { label: string; to: string }[]> = {
    "/eesa": [
      { label: "系學會介紹", to: "/eesa" },
      ...departmentCards.filter((department) => department.link).map((department) => ({
        label: department.name,
        to: department.link,
      })),
    ],
    "/activities": [
      { label: "活動總覽", to: "/activities/overview" },
      ...activityCategories.map((category) => ({
        label: category.label,
        to: `/activities/overview?category=${encodeURIComponent(category.label)}`,
      })),
    ],
    "/team": teams.map((team) => ({ label: team.name, to: `/team/${team.key}` })),
    "/resources": resourceOrder.map((slug) => ({
      label: resourceCategories[slug].tabLabel,
      to: `/resources/${slug}`,
    })),
  };

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
            {(page.to === "/team" && !showAllTeams ? menus[page.to].slice(0, 5) : menus[page.to]).map((item) => (
              <Link key={item.to} to={item.to} onClick={() => {
                setOpenMenu(null);
                setShowAllTeams(false);
              }}>
                {item.label}<span aria-hidden="true">↗</span>
              </Link>
            ))}
            {page.to === "/team" && !showAllTeams && menus[page.to].length > 5 && (
              <button
                className="quick-menu-more"
                type="button"
                style={{ appearance: "none", display: "flex", width: "100%", border: 0, borderRadius: 3, background: "#eef7f5", color: "#096869", padding: "11px 13px", alignItems: "center", justifyContent: "space-between", font: "inherit", fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}
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

export function EventCalendar({ onEvent }: { onEvent: (event: CalendarEvent) => void }) {
  const today = new Date(2026, 9, 10);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const formatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" });

  function changeMonth(offset: number) {
    setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  }

  return (
    <section className="calendar-section" id="calendar">
      <SectionHeading eyebrow="UPCOMING EVENTS" title="電機行事曆" action={
        <div className="calendar-header-actions">
          <span className="calendar-note">示意活動 · 正式資訊請見系網</span>
          <CalendarImport events={calendarEvents} />
        </div>
      } />
      <div className="calendar">
        <div className="calendar-toolbar">
          <div className="month-controls">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="上一個月">‹</button>
            <strong aria-live="polite">{formatter.format(viewDate)}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="下一個月">›</button>
            <button className="today-button" type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}>本月</button>
          </div>
          <div className="calendar-legend"><span>系所活動</span><span>學術交流</span></div>
        </div>
        <div className="weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-days">
          {cells.map(({ date, key, outside }) => {
            const event = calendarEvents.find((item) => item.date === key);
            return (
              <div className={`calendar-day ${outside ? "is-outside" : ""} ${key === "2026-10-10" ? "is-today" : ""}`} key={key}>
                <span className="day-number">{date.getDate()}</span>
                {event && <button className={`calendar-event ${event.type}`} type="button" onClick={() => onEvent(event)}>{event.title}</button>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function buildCalendarCells(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const start = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((start + count) / 7);
  return Array.from({ length: rows * 7 }, (_, index) => {
    const date = new Date(year, month, 1 - start + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key, outside: date.getMonth() !== month };
  });
}
