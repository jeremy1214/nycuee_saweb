export type ResourceSlug = "courses" | "scholarships" | "exchange" | "graduate";

export interface OfficialLink {
  label: string;
  description: string;
  href: string;
}

export interface ResourceCard {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}

export interface ResourceCategory {
  slug: ResourceSlug;
  tabLabel: string;
  eyebrow: string;
  title: string;
  intro: string;
  focus: string;
  cards: ResourceCard[];
  stepsTitle: string;
  steps: { title: string; description: string }[];
  checklistTitle: string;
  checklist: string[];
  links: OfficialLink[];
}
