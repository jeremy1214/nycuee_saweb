import { teams } from "./teamRepository";
export { teams, teamsData } from "./teamRepository";

import { getTeamImage } from "../teamImage";
export { getTeamImage } from "../teamImage";
export const teamSlides = teams.map((team) => ({
  title: `${team.name}`,
  image: getTeamImage(team.photo)!,
  alt: `${team.name}隊伍合照`,
  to: `/team/${team.key}`,
}));
