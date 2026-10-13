import { Navigate, Route, Routes, useParams } from "react-router-dom";
import AppShell from "./shared/components/layout/AppShell";
import HomePage from "./features/home/index";
import ContactPage from "./features/contact/index";
import ActivitiesPage, { ActivityDetailPage } from "./features/activities/index";
import ResourcePage from "./features/resources/index";
import TeamPage, { TeamDetailPage } from "./features/teams/index";
import EesaLayout, { EesaPage, DepartmentPage, DepartmentActivitiesPage, DepartmentActivityPage, DepartmentSkillsPage, DepartmentExperiencePage } from "./features/eesa/index";
import NotFoundPage from "./shared/pages/NotFoundPage";

function LegacyEesaRedirect() {
  const { "*": path = "" } = useParams();
  return <Navigate to={path === "eesa-intro" || !path ? "/eesa" : `/eesa/${path}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="eesa" element={<EesaLayout />}>
          <Route index element={<EesaPage />} />
          <Route path=":slug" element={<DepartmentPage />} />
          <Route path=":slug/activities" element={<DepartmentActivitiesPage />} />
          <Route path=":slug/activities/:activitySlug" element={<DepartmentActivityPage />} />
          <Route path=":slug/skills" element={<DepartmentSkillsPage />} />
          <Route path=":slug/experiences/:expId" element={<DepartmentExperiencePage />} />
        </Route>
        <Route path="intro/*" element={<LegacyEesaRedirect />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="team/:teamKey" element={<TeamDetailPage />} />
        <Route path="activities" element={<Navigate to="/activities/overview" replace />} />
        <Route path="activities/overview" element={<ActivitiesPage />} />
        <Route path="activities/:activityId" element={<ActivityDetailPage />} />
        <Route path="resources" element={<Navigate to="/resources/courses" replace />} />
        <Route path="resources/:category" element={<ResourcePage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
