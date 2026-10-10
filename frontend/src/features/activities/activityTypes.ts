export type ActivityCategory = "電機營" | "系露營" | "電機週" | "光舞" | "其他活動";

export interface ActivityDetailImage {
  src: string;
  alt: string;
}

export interface ActivityDetailSection {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  image: ActivityDetailImage;
}

export interface ActivityDetail {
  eyebrow: string;
  intro: string[];
  heroImages: [ActivityDetailImage, ActivityDetailImage];
  sections: ActivityDetailSection[];
}

export interface ActivityItem {
  id: string;
  title: string;
  date: string;
  category: ActivityCategory;
  summary: string;
  details: string;
  location: string;
  detail?: ActivityDetail;
}

export interface ActivityCategoryOption {
  label: ActivityCategory;
  shortLabel: string;
}
