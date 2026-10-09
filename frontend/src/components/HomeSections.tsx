import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calendarEvents, newsItems, slides } from "../data/home";
import type { CalendarEvent, NewsItem } from "../types";
import { SectionHeading } from "./SiteChrome";

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
      <HeroArtwork />
      <div className="hero-copy" key={current} aria-live={isPaused ? "polite" : "off"}>
        <span className="eyebrow">{slide.eyebrow}</span>
        <h1>{slide.title}</h1>
        <p>{slide.description.map((line) => <span key={line}>{line}<br /></span>)}</p>
        <Link className="hero-link" to="/resources/courses">探索學習資源 <span aria-hidden="true">↗</span></Link>
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

function HeroArtwork() {
  return (
    <svg className="hero-art" viewBox="0 0 1160 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#102c43" /><stop offset="1" stopColor="#125963" /></linearGradient>
        <linearGradient id="hero-chip" x1="0" x2="1" y2="1"><stop stopColor="#155e6c" /><stop offset="1" stopColor="#092a41" /></linearGradient>
        <pattern id="hero-grid" width="27" height="27" patternUnits="userSpaceOnUse"><path d="M27 0H0V27" fill="none" stroke="#94d8cc" strokeOpacity=".1" /></pattern>
        <filter id="hero-glow"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <rect width="1160" height="330" fill="url(#hero-bg)" />
      <rect width="1160" height="330" fill="url(#hero-grid)" />
      <circle cx="875" cy="170" r="145" fill="#62e4cf" opacity=".04" />
      <circle cx="875" cy="170" r="115" fill="none" stroke="#79dcca" opacity=".17" />
      <g fill="none" stroke="#75d9c6" strokeWidth="1.3" opacity=".5">
        <path d="M680 90H755L785 120H820M650 165H770L805 145H820" />
        <path d="M715 245H760L807 198H820M882 105V62L925 19" />
        <path d="M935 132H992L1044 80H1160M935 160H1080L1120 120H1160" />
        <path d="M935 187H1020L1080 247H1160M880 220V270L923 313" />
        <path d="M855 105V82L824 51H732M855 220V248L814 289H703" />
      </g>
      <g fill="#a7ead5"><circle cx="680" cy="90" r="3" /><circle cx="650" cy="165" r="3" /><circle cx="715" cy="245" r="3" /><circle cx="732" cy="51" r="3" /><circle cx="1044" cy="80" r="3" /><circle cx="1080" cy="247" r="3" /></g>
      <rect x="818" y="104" width="120" height="120" rx="7" fill="#0a2437" stroke="#85daca" strokeWidth="2" />
      <rect x="829" y="115" width="98" height="98" rx="3" fill="url(#hero-chip)" stroke="#8ed8ca" strokeOpacity=".35" />
      <path d="M846 185V144H862V163H891V144H907V185H891V173H862V185Z" fill="#bcebdc" opacity=".85" />
      <g stroke="#a2dccb" strokeWidth="3" opacity=".5">
        <path d="M838 97V104M853 97V104M868 97V104M883 97V104M898 97V104M913 97V104" />
        <path d="M838 224V231M853 224V231M868 224V231M883 224V231M898 224V231M913 224V231" />
        <path d="M811 124H818M811 139H818M811 154H818M811 169H818M811 184H818M811 199H818" />
        <path d="M938 124H945M938 139H945M938 154H945M938 169H945M938 184H945M938 199H945" />
      </g>
      <path d="M935 132H992L1044 80H1120" fill="none" stroke="#b4ffe1" strokeWidth="3" filter="url(#hero-glow)" opacity=".45" />
      <text x="1015" y="292" fill="#bcebdc" opacity=".28" fontSize="11" fontFamily="monospace" letterSpacing="4">IDEAS → IMPACT</text>
    </svg>
  );
}

export function NewsSection({ onPlaceholder }: { onPlaceholder: (title: string) => void }) {
  return (
    <section className="home-section" id="news">
      <SectionHeading
        eyebrow="WHAT'S NEW"
        title="系上活動"
        action={<a className="section-more" href="https://dee.nycu.edu.tw/news.php?locale=tw" target="_blank" rel="noreferrer">查看最新消息 <span aria-hidden="true">↗</span></a>}
      />
      <div className="news-grid">
        {newsItems.map((item) => (
          <button className="news-card" type="button" key={item.title} onClick={() => onPlaceholder(item.title)}>
            <NewsArtwork item={item} />
            <span className="news-body">
              <time className="news-date" dateTime={item.date}>{item.date.replaceAll("-", ".")}</time>
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
  const artworkLabel = {
    research: "EXCHANGE",
    campus: "SEMINAR",
    student: "SHOWCASE",
  }[item.artwork];

  return (
    <span className={`news-art news-art-${item.artwork}`}>
      <span className="art-label" aria-hidden="true">{artworkLabel}</span>
      {item.artwork === "research" && <span className="circuit-orbit" aria-hidden="true"><i /><i /><i /></span>}
      {item.artwork === "campus" && <span className="campus-building" aria-hidden="true"><i /><i /><i /><i /></span>}
      {item.artwork === "student" && <span className="student-screen" aria-hidden="true"><i /></span>}
      <span className="news-badge">{item.category}</span>
    </span>
  );
}

interface QuickGroup {
  icon: string;
  title: string;
  items: { label: string; to?: string; href?: string; external?: boolean }[];
}

const quickGroups: QuickGroup[] = [
  { icon: "◎", title: "系上活動", items: [{ label: "活動首頁", to: "/activities" }, { label: "活動日曆", href: "#calendar" }, { label: "最新消息", href: "https://dee.nycu.edu.tw/news.php?locale=tw", external: true }] },
  { icon: "⌘", title: "系隊", items: [{ label: "系隊介紹" }, { label: "招募資訊" }, { label: "聯絡方式" }] },
  { icon: "▤", title: "系學會", items: [{ label: "系學會介紹" }, { label: "學生消息" }, { label: "活動資訊" }] },
  { icon: "↗", title: "學習資料", items: [{ label: "關於修課", to: "/resources/courses" }, { label: "獎助學金", to: "/resources/scholarships" }, { label: "交換資訊", to: "/resources/exchange" }, { label: "研究所", to: "/resources/graduate" }] },
];

export function QuickLinks({ onPlaceholder }: { onPlaceholder: (title: string) => void }) {
  return (
    <section className="quick-grid" aria-label="常用資訊">
      {quickGroups.map((group) => (
        <details className="quick-item" key={group.title}>
          <summary><span className="quick-icon" aria-hidden="true">{group.icon}</span>{group.title}<span className="quick-plus" aria-hidden="true">＋</span></summary>
          <div className="quick-panel">
            {group.items.map((item) => item.to ? (
              <Link key={item.label} to={item.to}>{item.label}<span aria-hidden="true">↗</span></Link>
            ) : item.href ? (
              <a key={item.label} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined}>{item.label}<span aria-hidden="true">↗</span></a>
            ) : (
              <button key={item.label} type="button" onClick={() => onPlaceholder(item.label)}>{item.label}<span aria-hidden="true">↗</span></button>
            ))}
          </div>
        </details>
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
      <SectionHeading eyebrow="UPCOMING EVENTS" title="電機行事曆" action={<span className="calendar-note">示意活動 · 正式資訊請見系網</span>} />
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
