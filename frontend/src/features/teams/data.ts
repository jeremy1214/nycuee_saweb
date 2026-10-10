import sourceTeams from "./teams.json";

export interface ScheduleBlock {
  type: "paragraph" | "subheader" | "list";
  text?: string;
  items?: string[];
}

export interface TeamData {
  name: string;
  photo: string;
  ballIcon: string | null;
  aboutImg: string | null;
  intro: string[];
  schedule: ScheduleBlock[];
  activities: { id: string; month: string; name: string; description: string; image: string | null }[];
  contact: {
    intro: string | null;
    people: { header: string | null; lines: string[] }[];
    note: string | null;
  };
}

export const teamsData = sourceTeams as Record<string, TeamData>;
export const teams = Object.entries(teamsData).map(([key, team]) => ({ key, ...team }));
export const getTeamImage = (path: string | null) => path ? `/team/${path}` : undefined;
export const teamSlides = [
  { title: "交大電機系隊", image: "/team/team.jpg", alt: "交大電機系隊合照", to: null },
  ...teams.map((team) => ({ title: `電機${team.name}`, image: getTeamImage(team.photo)!, alt: `${team.name}隊伍合照`, to: `/team/${team.key}` })),
];
