import { Fragment } from "react";
import { Link } from "react-router-dom";

interface BreadcrumbItem { label: string; to?: string; }
export function Breadcrumb({ items, className = "section-breadcrumb" }: { items: BreadcrumbItem[]; className?: string }) {
  return <nav className={className} aria-label="所在位置">
    {items.map((item, index) => <Fragment key={`${item.label}-${index}`}>
      {index > 0 && <span aria-hidden="true">/</span>}
      {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
    </Fragment>)}
  </nav>;
}
