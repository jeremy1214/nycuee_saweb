export interface ActivityDetailImage {
  src: string;
  alt: string;
  objectPosition?: string;
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
  categoryId: string;
  category: string;
  summary: string;
  details: string;
  location: string;
  detail?: ActivityDetail;
}

export interface ActivityCategoryOption {
  id: string;
  label: string;
  shortLabel: string;
  featuredActivityId?: string;
}
