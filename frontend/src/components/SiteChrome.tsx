import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

interface SiteHeaderProps {
  onSearch: () => void;
  onPlaceholder: (title: string) => void;
}

export function SiteHeader({ onSearch, onPlaceholder }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <PageContainer className="header-inner">
        <Brand />
        <nav className="primary-nav" aria-label="主要導覽">
          <NavLink to="/" end>首頁</NavLink>
          <button type="button" onClick={() => onPlaceholder("關於本系")}>關於本系</button>
          <button type="button" onClick={() => onPlaceholder("師資與研究")}>師資與研究</button>
          <NavLink to="/resources/courses">學習資源</NavLink>
          <a href="#contact">聯絡我們</a>
        </nav>
        <div className="header-tools">
          <button className="icon-button" type="button" onClick={onSearch} aria-label="搜尋網站">
            <span aria-hidden="true">⌕</span>
          </button>
          <button className="sign-in-button" type="button" onClick={() => onPlaceholder("系統登入")}>
            Sign in <span aria-hidden="true">↗</span>
          </button>
        </div>
      </PageContainer>
    </header>
  );
}

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="交大電機首頁">
      <span className="brand-mark" aria-hidden="true">EE</span>
      <span>
        <strong>交大電機</strong>
        <small>ELECTRICAL ENGINEERING · NYCU</small>
      </span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <PageContainer>
        <div className="footer-main">
          <Brand />
          <div className="footer-column">
            <h2>聯絡資訊</h2>
            <p>國立陽明交通大學電機工程學系</p>
            <a href="https://dee.nycu.edu.tw/" target="_blank" rel="noreferrer">前往系所官方網站 ↗</a>
          </div>
          <div className="footer-column">
            <h2>學習資源</h2>
            <Link to="/resources/courses">修課規劃</Link>
            <Link to="/resources/exchange">交換資訊</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>交大電機系網站 · React 視覺實作</span>
          <span>資訊摘要僅供導覽，正式規定以官方公告為準</span>
        </div>
      </PageContainer>
    </footer>
  );
}

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-container ${className}`.trim()}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}<span className="external-arrow" aria-hidden="true">↗</span>
    </a>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="site-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-panel">
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="dialog-x" onClick={onClose} aria-label="關閉視窗">×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
