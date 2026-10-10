import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { sectionPages } from "../data/navigation";

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
          {sectionPages.map((page) => (
            <NavLink key={page.to} to={page.to}>{page.title}</NavLink>
          ))}
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
            <div className="footer-social-links" aria-label="交大電機社群平台">
              <a href="https://www.instagram.com/nycu_eesa/" target="_blank" rel="noreferrer">
                <svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                <span className="footer-social-label">系學會 Instagram</span><span className="footer-social-arrow" aria-hidden="true">↗</span>
              </a>
              <a href="https://www.facebook.com/nycuEEStudentAssociation" target="_blank" rel="noreferrer">
                <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M14.5 8H16V5.5h-2.2c-2.4 0-3.5 1.3-3.5 3.6V11H8v2.7h2.3V20h2.9v-6.3h2.4L16 11h-2.8V9.3c0-.8.2-1.3 1.3-1.3Z" />
                </svg>
                <span className="footer-social-label">系學會 Facebook</span><span className="footer-social-arrow" aria-hidden="true">↗</span>
              </a>
              <a href="https://www.youtube.com/channel/UCXoZlWJ63YQ6-ifXSxuC2wA" target="_blank" rel="noreferrer">
                <svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="2.5" y="5" width="19" height="14" rx="4" />
                  <path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" />
                </svg>
                <span className="footer-social-label">電機系 YouTube</span><span className="footer-social-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="footer-column">
            <h2>網站導覽</h2>
            {sectionPages.map((page) => <Link key={page.to} to={page.to}>{page.title}</Link>)}
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
  const titleId = useId();

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
      aria-labelledby={titleId}
    >
      <div className="dialog-panel">
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="dialog-x" onClick={onClose} aria-label="關閉視窗">×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
