import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Modal, SiteFooter, SiteHeader } from "./components/SiteChrome";
import { SearchDialog } from "./components/SearchDialog";
import ActivitiesPage from "./features/activities";
import ResourcePage from "./features/resources";
import TeamPage, { TeamDetailPage } from "./features/teams";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import EesaSection, { EesaIntro, Department, DepartmentActivities, Activity, DepartmentSkills, DepartmentExperiences } from "./features/eesa";

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
        <p className="dialog-copy">相關資訊準備中，歡迎透過導覽列探索系學會、系上活動、系隊與學習資料。</p>
      </Modal>
    </div>
  );
}

function LegacyEesaRedirect() {
  const { "*": path = "" } = useParams();
  return <Navigate to={path === "eesa-intro" || !path ? "/eesa" : `/eesa/${path}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="eesa" element={<EesaSection />}>
          <Route index element={<EesaIntro />} />
          <Route path=":slug" element={<Department />} />
          <Route path=":slug/activities" element={<DepartmentActivities />} />
          <Route path=":slug/activities/:activitySlug" element={<Activity />} />
          <Route path=":slug/skills" element={<DepartmentSkills />} />
          <Route path=":slug/experiences/:expId" element={<DepartmentExperiences />} />
        </Route>
        <Route path="intro/*" element={<LegacyEesaRedirect />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="team/:teamKey" element={<TeamDetailPage />} />
        <Route path="activities" element={<Navigate to="/activities/overview" replace />} />
        <Route path="activities/overview" element={<ActivitiesPage />} />
        <Route path="resources" element={<Navigate to="/resources/courses" replace />} />
        <Route path="resources/:category" element={<ResourcePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
