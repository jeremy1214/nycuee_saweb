
import NotFoundPage from "../../shared/pages/NotFoundPage";
import { TeamDetails } from "./components/TeamDetailSections";
import { useTeamContent, OrganizationContentStatus, useOrganizationParams } from "../organization/OrganizationContentProvider";
import "./teams.css";

export default function TeamDetailPage() {
  const { teamKey = "" } = useOrganizationParams();
  const { teamsData, status } = useTeamContent();
  if (status !== "ready") return <OrganizationContentStatus kind="team" />;
  const team = teamsData[teamKey];
  if (!team) return <NotFoundPage />;
  return <TeamDetails key={teamKey} team={team} teamKey={teamKey} />;
}
