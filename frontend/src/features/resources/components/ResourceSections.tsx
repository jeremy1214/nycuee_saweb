import { useEffect, useRef, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resourceCategories, resourceOrder } from "../data/resources";
import type { ResourceCategory, ResourceSlug } from "../resourceTypes";
import { ExternalLink, SectionHeading } from "../../../components/SiteChrome";

export function ResourceTabs({ active }: { active: ResourceSlug }) {
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const tabs = tabsRef.current;
    const selected = tabs?.querySelector<HTMLElement>(`#tab-${active}`);
    if (!tabs || !selected) return;
    const target = selected.offsetLeft - (tabs.clientWidth - selected.clientWidth) / 2;
    tabs.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  function handleKeyDown(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + resourceOrder.length) % resourceOrder.length;
    if (event.key === 'ArrowRight') next = (index + 1) % resourceOrder.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = resourceOrder.length - 1;
    const slug = resourceOrder[next];
    navigate(`/resources/${slug}`);
    requestAnimationFrame(() => document.getElementById(`tab-${slug}`)?.focus());
  }

  return (
    <div className="resource-tabs-wrap">
      <nav ref={tabsRef} className="resource-tabs" aria-label="學習資源分類" role="tablist">
        {resourceOrder.map((slug, index) => {
          const category = resourceCategories[slug];
          const selected = slug === active;
          return (
            <Link
              id={`tab-${slug}`}
              key={slug}
              to={`/resources/${slug}`}
              role="tab"
              aria-selected={selected}
              aria-controls="resource-panel"
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {category.tabLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function ResourceOverview({ category }: { category: ResourceCategory }) {
  return (
    <header className="resource-hero">
      <div className="resource-hero-copy">
        <span className="eyebrow">{category.eyebrow}</span>
        <h1>{category.title}</h1>
        <p>{category.intro}</p>
      </div>
      <aside className="resource-focus">
        <span>使用提醒</span>
        <p>{category.focus}</p>
      </aside>
    </header>
  );
}

export function InfoCardGrid({ category }: { category: ResourceCategory }) {
  return (
    <section className="resource-section" aria-labelledby="resource-key-points">
      <SectionHeading eyebrow="KEY POINTS" title="先掌握這三件事" />
      <div className="resource-card-grid" id="resource-key-points">
        {category.cards.map((card) => (
          <article className="resource-card" key={card.title}>
            <span className="card-eyebrow">{card.eyebrow}</span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <ul>{card.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProcessTimeline({ category }: { category: ResourceCategory }) {
  return (
    <section className="resource-section process-section">
      <SectionHeading eyebrow="STEP BY STEP" title={category.stepsTitle} />
      <ol className="process-timeline">
        {category.steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
            <div><h2>{step.title}</h2><p>{step.description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Checklist({ category }: { category: ResourceCategory }) {
  return (
    <section className="checklist-block">
      <div><span className="eyebrow">READY TO GO</span><h2>{category.checklistTitle}</h2></div>
      <ul>{category.checklist.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
    </section>
  );
}

export function OfficialLinks({ category }: { category: ResourceCategory }) {
  return (
    <section className="resource-section official-section">
      <SectionHeading eyebrow="OFFICIAL SOURCES" title="官方資訊入口" action={<span className="verified-date">資料核對：2026.10.10</span>} />
      <div className="official-links">
        {category.links.map((link) => (
          <ExternalLink href={link.href} key={link.label}>
            <span><strong>{link.label}</strong><small>{link.description}</small></span>
          </ExternalLink>
        ))}
      </div>
      <p className="official-note">本頁提供學習規劃摘要；資格、學分、名額及申請方式請以連結中的官方最新公告為準。</p>
    </section>
  );
}
