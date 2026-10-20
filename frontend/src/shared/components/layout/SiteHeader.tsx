import { Link, NavLink } from "react-router-dom";
import { primaryNavigation } from "../../data/navigation";
import { Brand } from "./Brand";
import { PageContainer } from "./PageContainer";

interface SiteHeaderProps {
  onSearch: () => void;
  onPlaceholder: (title: string) => void;
}

export function SiteHeader({ onSearch }: SiteHeaderProps) {
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
          <Link className="sign-in-button" to="/admin/login">
            Sign in <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </PageContainer>
    </header>
  );
}
