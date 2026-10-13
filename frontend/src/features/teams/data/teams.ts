import { teams } from "./teamRepository";
export { teams, teamsData } from "./teamRepository";

export const getTeamImage = (path: string | null) => path ? `/team/${path}` : undefined;
export const teamSlides = [
  { title: "交大電機系隊", image: "/team/team.jpg", alt: "交大電機系隊合照", to: null },
  ...teams.map((team) => ({ title: `電機${team.name}`, image: getTeamImage(team.photo)!, alt: `${team.name}隊伍合照`, to: `/team/${team.key}` })),
];
