export type ActivityCategory = "電機營" | "系露營" | "電機週" | "光舞" | "其他活動";

export interface ActivityItem {
  id: string;
  title: string;
  date: string;
  category: ActivityCategory;
  summary: string;
  details: string;
  location: string;
}

export interface ActivityCategoryOption {
  label: ActivityCategory;
  shortLabel: string;
}
