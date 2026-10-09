import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Modal, SiteFooter, SiteHeader } from "./components/SiteChrome";
import { SearchDialog } from "./components/SearchDialog";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ResourcePage from "./pages/ResourcePage";

export interface AppOutletContext {
  openPlaceholder: (title: string) => void;
}

function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [placeholderTitle, setPlaceholderTitle] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳至主要內容</a>
      <SiteHeader onSearch={() => setSearchOpen(true)} onPlaceholder={setPlaceholderTitle} />
      <div id="main-content"><Outlet context={{ openPlaceholder: setPlaceholderTitle } satisfies AppOutletContext} /></div>
      <SiteFooter />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Modal open={placeholderTitle !== null} title={placeholderTitle ?? "建置中"} onClose={() => setPlaceholderTitle(null)}>
        <p className="dialog-copy">這個入口已保留在網站架構中，正式內容完成後即可接入。目前可先使用「學習資源」查看修課、獎助、交換與研究所資訊。</p>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="resources" element={<Navigate to="/resources/courses" replace />} />
        <Route path="resources/:category" element={<ResourcePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
