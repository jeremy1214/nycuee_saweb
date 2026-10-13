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

export interface TeamContent extends TeamData {
  id: string;
  order: number;
}
export interface TeamItem extends TeamData { key: string; }
