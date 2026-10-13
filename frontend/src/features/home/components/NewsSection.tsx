import { siteContact } from "../../../shared/data/site";
import { SectionHeading } from "../../../shared/components/index";
import type { NewsItem } from "../homeTypes";
import { newsItems } from "../data/home";

export function NewsSection({ onPlaceholder }: { onPlaceholder: (title: string) => void }) {
  return (
    <section className="home-section" id="news">
      <SectionHeading
        eyebrow="WHAT'S NEW"
        title="系所新訊"
        action={<a className="section-more" href={siteContact.newsUrl} target="_blank" rel="noreferrer">查看最新消息 <span aria-hidden="true">↗</span></a>}
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

