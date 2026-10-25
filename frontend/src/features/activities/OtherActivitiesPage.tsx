import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Breadcrumb, PageContainer } from "../../shared/components/index";
import { otherActivities } from "./data/otherActivities";
import { ActivityLinks } from "./components/ActivityLinks";
import { ActivityDate } from "./components/ActivityDate";
import { useActivityAlbum } from "./hooks/useActivityAlbum";
import "./activities.css";
import "./otherActivities.css";

export default function OtherActivitiesPage() {
  const [searchParams] = useSearchParams();
  const requestedIndex = otherActivities.findIndex((item) => item.id === searchParams.get("activity"));
  const album = useActivityAlbum(otherActivities.length, Math.max(0, requestedIndex));
  const activity = otherActivities[album.current];

  if (!activity) {
    return (
      <main className="other-activities-page">
        <PageContainer>
          <Breadcrumb className="activity-detail-breadcrumb" items={[{ label: "系上活動", to: "/activities/overview" }, { label: "其他活動" }]} />
          <header className="other-activities-heading"><h1>其他活動</h1></header>
          <p>目前沒有已發布的活動相簿。</p>
          <div className="activity-detail-back"><Link to="/activities/overview">回到活動總覽</Link></div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="other-activities-page">
      <PageContainer>
        <Breadcrumb className="activity-detail-breadcrumb" items={[{ label: "系上活動", to: "/activities/overview" }, { label: "其他活動" }]} />
        <header className="other-activities-heading">
          <div>
            <span className="eyebrow">MORE MOMENTS · EE LIFE</span>
            <h1>其他活動</h1>
          </div>
        </header>

        <section className="activity-album" aria-label="其他活動相簿" aria-roledescription="輪播" onKeyDown={album.onKeyDown}
          onFocusCapture={(event) => { if (!(event.target instanceof HTMLElement && event.target.closest(".activity-album-play"))) album.pause(); }}>
          <div className="activity-album-stage" role="group" aria-label="活動照片，使用左右方向鍵切換" tabIndex={0} {...album.hoverHandlers} {...album.touchHandlers}>
            <span className="activity-album-watermark" aria-hidden="true">OUR DAYS</span>
            {otherActivities.map((item, index) => {
              let offset = (index - album.current + otherActivities.length) % otherActivities.length;
              if (offset > otherActivities.length / 2) offset -= otherActivities.length;
              const visible = Math.abs(offset) <= 2;
              const selected = offset === 0;
              return (
                <button
                  type="button"
                  className={`activity-album-card${selected ? " is-current" : ""}${visible ? "" : " is-hidden"}${Math.abs(offset) === 2 ? " is-outer" : ""}${offset > 0 ? " is-right" : ""}`}
                  style={{ "--offset": offset, "--depth": Math.abs(offset) } as CSSProperties}
                  key={item.id}
                  aria-label={`選擇${item.title}`}
                  aria-pressed={selected}
                  aria-hidden={!visible}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => album.select(index)}
                >
                  <img src={item.cover.src} alt={item.cover.alt} style={{ objectFit: item.cover.fit ?? "cover", objectPosition: item.cover.objectPosition }} draggable={false} />
                  <span className="activity-album-card-caption">
                    <span><strong>{item.title}</strong><small>{item.summary}</small></span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="activity-album-controls">
            <span className="activity-album-counter" aria-live={album.rotating ? "off" : "polite"} aria-atomic="true">
              <span className="activity-album-current-name">{activity.title}</span>
            </span>
            <div className="activity-album-buttons">
              <button type="button" aria-label="上一個活動" onClick={() => album.select(album.current - 1)}>←</button>
              <button type="button" className="activity-album-play" aria-label={album.playing ? "暫停自動播放" : "播放活動相簿"} onClick={album.togglePlaying} disabled={album.reducedMotion}>
                <span aria-hidden="true">{album.playing ? "Ⅱ" : "▷"}</span>
                {album.reducedMotion ? "手動瀏覽" : album.playing ? "暫停" : "播放"}
              </button>
              <button type="button" aria-label="下一個活動" onClick={() => album.select(album.current + 1)}>→</button>
            </div>
          </div>
          <nav className="activity-album-picker" aria-label="選擇其他活動">
            {otherActivities.map((item, index) => (
              <button type="button" key={item.id} aria-pressed={index === album.current} aria-controls="other-activity-introduction" onClick={() => album.select(index)}>
                <span aria-hidden="true"></span>{item.title}
              </button>
            ))}
          </nav>
        </section>

        <article id="other-activity-introduction" className="other-activity-introduction" aria-labelledby="other-activity-title" tabIndex={0} {...album.readingHandlers}>
          <div className="other-activity-content" key={activity.id}>
            <div className="other-activity-story">
              <div className="other-activity-title">
                <span className="eyebrow">THE STORY · {String(album.current + 1).padStart(2, "0")}</span>
                <h2 id="other-activity-title">{activity.title}</h2>
                <p>{activity.summary}</p>
                <ActivityDate activity={activity} />
              </div>
              <div className="other-activity-copy">
                <span className="activity-detail-label">活動介紹</span>
                {activity.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                <ActivityLinks links={activity.links} />
                <Link className="section-more" to={`/activities/${activity.id}`} aria-label={`${activity.title}，查看活動詳細頁`}>查看活動詳細頁 <span aria-hidden="true">↗</span></Link>
              </div>
            </div>
            <section className="other-activity-memories" aria-label={`${activity.title}活動照片`}>
              <div className="other-activity-section-heading"><h3>活動回顧</h3><span>{activity.photos.length} PHOTOS</span></div>
              <div className="other-activity-photo-grid">
                {activity.photos.map((photo, index) => (
                  <figure key={photo.src}>
                    <img src={photo.src} alt={photo.alt} loading="lazy" style={{ objectFit: photo.fit ?? "cover", objectPosition: photo.objectPosition }} />
                  </figure>
                ))}
              </div>
            </section>
            {activity.groups && activity.groups.length > 0 && (
              <section className="other-activity-groups" aria-labelledby="other-activity-groups-title">
                <div className="other-activity-section-heading"><h3 id="other-activity-groups-title">一起把活動做出來的人</h3><span>THE TEAM</span></div>
                <div className="other-activity-group-grid">
                  {activity.groups.map((group) => (
                    <section className="other-activity-group" key={group.id} aria-labelledby={`other-group-${group.id}`}>
                      <img src={group.image.src} alt={group.image.alt} loading="lazy" style={{ objectPosition: group.image.objectPosition, objectFit: group.image.fit }} />
                      <div><h4 id={`other-group-${group.id}`}>{group.title}</h4>{group.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                    </section>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>
        <div className="activity-detail-back"><Link to="/activities/overview"><span aria-hidden="true">←</span> 回到活動總覽</Link></div>
      </PageContainer>
    </main>
  );
}
