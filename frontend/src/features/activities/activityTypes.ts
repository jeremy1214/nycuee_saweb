export interface ActivityDetailImage {
  src: string;
  alt: string;
  objectPosition?: string;
  fit?: "cover" | "contain";
}

export interface ActivityDetailSection {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  image?: ActivityDetailImage;
}

export interface ActivityDetail {
  eyebrow: string;
  intro: string[];
  heroImages: [ActivityDetailImage, ActivityDetailImage];
  sections: ActivityDetailSection[];
  tabs?: ActivityDetailTab[];
  introMode?: "tab" | "shared";
}

export interface ActivityDetailTab {
  id: string;
  navLabel: string;
  sections: ActivityDetailSection[];
}

export interface ActivityLink {
  label: string;
  url: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  date?: string;
  endDate?: string;
  categoryId: string;
  category: string;
  summary: string;
  details: string;
  location?: string;
  links?: ActivityLink[];
  detail?: ActivityDetail;
  album?: ActivityAlbum;
}

export interface ActivityAlbum {
  order: number;
  cover: ActivityDetailImage;
  photos: ActivityDetailImage[];
}

export interface ActivityCategoryOption {
  id: string;
  label: string;
  shortLabel: string;
  featuredActivityId?: string;
}

/** Album view derived from published activity content. */
export interface OtherActivity {
  id: string;
  title: string;
  date?: string;
  endDate?: string;
  summary: string;
  intro: string[];
  links?: ActivityLink[];
  cover: ActivityDetailImage;
  photos: ActivityDetailImage[];
  groups?: {
    id: string;
    title: string;
    paragraphs: string[];
    image: ActivityDetailImage;
  }[];
}
