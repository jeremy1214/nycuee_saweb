import { NavLink } from "react-router-dom";
import { primaryNavigation } from "../../data/navigation";
import { Brand } from "./Brand";
import { PageContainer } from "./PageContainer";

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
          {primaryNavigation.map((page) => (
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
