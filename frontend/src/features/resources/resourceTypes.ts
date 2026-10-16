// IDs are validated against the published JSON content by isResourceSlug.
export type ResourceSlug = string;

export interface OfficialLink {
  label: string;
  description: string;
  href: string;
}

interface ResourceSectionBase {
  id: string;
  title: string;
}

export interface ProcessSection extends ResourceSectionBase {
  type: "process";
  items: { title: string; description: string }[];
}

export interface ChecklistSection extends ResourceSectionBase {
  type: "checklist";
  items: string[];
}

export type ResourceSection = ProcessSection | ChecklistSection;

export interface ResourceCategory {
  slug: ResourceSlug;
  tabLabel: string;
  searchDescription: string;
  links: OfficialLink[];
  sections: ResourceSection[];
}
