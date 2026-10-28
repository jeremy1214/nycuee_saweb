import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { Modal } from "../ui/Modal";
import { SearchDialog } from "../SearchDialog";
import { ActivityContentProvider } from "../../../features/activities/data/ActivityContentProvider";

export interface AppOutletContext {
  openPlaceholder: (title: string) => void;
}

export default function AppShell() {
  return <ActivityContentProvider><PublicShell /></ActivityContentProvider>;
}

function PublicShell() {
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
        <p className="dialog-copy">相關資訊準備中，歡迎透過導覽列探索系學會、系上活動、系隊與學習資料。</p>
      </Modal>
    </div>
  );
}

