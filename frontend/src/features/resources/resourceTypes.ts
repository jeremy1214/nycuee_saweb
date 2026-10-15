export type ResourceSlug = "courses" | "scholarships" | "exchange" | "graduate";

export interface OfficialLink {
  label: string;
  description: string;
  href: string;
}

export interface ResourceCategory {
  slug: ResourceSlug;
  tabLabel: string;
  searchDescription: string;
  stepsTitle: string;
  steps: { title: string; description: string }[];
  checklistTitle: string;
  checklist: string[];
  links: OfficialLink[];
}
