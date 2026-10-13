import { teams } from "./teamRepository";
export { teams, teamsData } from "./teamRepository";

export const getTeamImage = (path: string | null) => path ? `/team/${path}` : undefined;
export const teamSlides = teams.map((team) => ({
  title: `${team.name}`,
  image: getTeamImage(team.photo)!,
  alt: `${team.name}隊伍合照`,
  to: `/team/${team.key}`,
}));
