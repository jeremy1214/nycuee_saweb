import type { ActivityLink, ActivityDetailImage } from "../../../../shared/activity-content";
export type { ActivityAlbum, ActivityCategoryOption, ActivityDetail, ActivityDetailImage, ActivityDetailSection, ActivityDetailTab, ActivityItem, ActivityLink } from "../../../../shared/activity-content";

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
