import type { ReactNode } from "react";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className = "", fluid = false }: LayoutProps & { fluid?: boolean }) {
  return <div className={`${styles.container} ${fluid ? styles.fluid : ""} ${className}`}>{children}</div>;
}

export function Row({ children, className = "" }: LayoutProps) {
  return <div className={`${styles.row} ${className}`}>{children}</div>;
}

export function Col({ children, className = "", md }: LayoutProps & { md?: 2 | 10 }) {
  return <div className={`${styles.col} ${md === 2 ? styles.sidebarColumn : md === 10 ? styles.mainColumn : ""} ${className}`}>{children}</div>;
}

export function EesaLayout({ children }: LayoutProps) {
  return <main className={styles.scope}>{children}</main>;
}
