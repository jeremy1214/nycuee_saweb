import { activities } from "./activities";
import type { OtherActivity } from "../activityTypes";

/** Keep the album and detail pages on the same published JSON content. */
export const otherActivities: OtherActivity[] = activities
  .filter((activity) => activity.categoryId === "other" && activity.album && activity.detail)
  .sort((first, second) => first.album!.order - second.album!.order || first.id.localeCompare(second.id))
  .map((activity) => ({
    id: activity.id,
    title: activity.title,
    summary: activity.summary,
    intro: activity.detail!.intro,
    ...(activity.links === undefined ? {} : { links: activity.links }),
    cover: activity.album!.cover,
    photos: activity.album!.photos,
    groups: activity.detail!.sections.flatMap((section) => section.image ? [{
      id: section.id,
      title: section.title,
      paragraphs: section.paragraphs,
      image: section.image,
    }] : []),
  }));
