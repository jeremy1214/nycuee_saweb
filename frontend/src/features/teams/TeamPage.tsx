import { PageContainer } from "../../shared/components/index";
import { TeamCarousel, TeamDirectory } from "./components/TeamSections";
import "./teams.css";

export default function TeamPage() {
  return <main className="teams-page">
    <PageContainer><TeamCarousel /><TeamDirectory /></PageContainer>
  </main>;
}
