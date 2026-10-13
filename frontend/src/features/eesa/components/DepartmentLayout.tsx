import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { DepartmentData } from "../eesaTypes";
import { Container, Row, Col } from "./Grid";

type ActiveSection = "intro" | "activities" | "skills" | "experiences";
interface Props {
  department: DepartmentData;
  slug: string;
  active: ActiveSection;
  styles: Record<string, string>;
  children: ReactNode;
  returnLabel?: string;
  showExtras?: boolean;
}

export function DepartmentLayout({ department, slug, active, styles, children, returnLabel = "回上一頁", showExtras = true }: Props) {
  const base = `/eesa/${slug}`;
  const items = [
    { label: "部門介紹", to: base, active: active === "intro" },
    { label: "部門活動", to: `${base}/activities`, active: active === "activities" },
    ...(showExtras ? department.extraSidebarItems.map((item) => ({ ...item, active: (active === "skills" && item.to?.endsWith("/skills")) || (active === "experiences" && item.to?.includes("/experiences/")) })) : []),
  ];
  return <div className={styles.departmentPage ?? styles.page}>
    <div className={styles.banner}><img src={department.bannerImage} alt={`${department.title} Banner`} className={styles.bannerImage} /></div>
    <Container fluid className={styles.contentContainer}>
      <Row>
        <Col md={2} className={styles.sidebarCol}>
          <nav className={styles.sidebar} aria-label={`${department.title}內容導覽`}>
            <div className={styles.sidebarIcon}><img src="/intro/all_inbox.svg" alt="" /></div>
            <Link className={styles.sidebarLabel} to="/eesa">{returnLabel}</Link>
            {items.map((item) => item.to ? <Link key={item.label} className={`${styles.sidebarLabel} ${item.active ? styles.active : ""}`} to={item.to} aria-current={item.active ? "page" : undefined}>{item.label}</Link> : <span key={item.label} className={styles.sidebarLabel}>{item.label}</span>)}
          </nav>
        </Col>
        <Col md={10} className={styles.mainCol}>{children}</Col>
      </Row>
    </Container>
  </div>;
}
