import { useParams } from "react-router-dom";
import NotFoundPage from "../../shared/pages/NotFoundPage";
import { TeamDetails } from "./components/TeamDetailSections";
import { teamsData } from "./data/teams";
import "./teams.css";

export default function TeamDetailPage() {
  const { teamKey = "" } = useParams();
  const team = teamsData[teamKey];
  if (!team) return <NotFoundPage />;
  return <TeamDetails key={teamKey} team={team} teamKey={teamKey} />;
}
