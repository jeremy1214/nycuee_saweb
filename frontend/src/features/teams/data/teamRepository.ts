import type { TeamContent, TeamData, TeamItem } from "../teamTypes";

const modules = import.meta.glob<TeamContent>("../../../content/teams/*.json", { eager: true, import: "default" });
const content = Object.values(modules).sort((a, b) => a.order - b.order);

export const teamsData: Record<string, TeamData> = Object.fromEntries(content.map((team) => [team.id, team]));
export const teams: TeamItem[] = content.map((team) => ({ key: team.id, ...team }));
