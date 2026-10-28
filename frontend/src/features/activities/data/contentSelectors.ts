import type { ActivityItem, OtherActivity } from '../activityTypes';

export function deriveOtherActivities(activities: ActivityItem[]): OtherActivity[] {
  return activities.filter(activity => activity.categoryId === 'other' && activity.album && activity.detail)
    .sort((a, b) => a.album!.order - b.album!.order || a.id.localeCompare(b.id))
    .map(activity => ({
      id: activity.id, title: activity.title, summary: activity.summary,
      ...(activity.date === undefined ? {} : { date: activity.date }),
      ...(activity.endDate === undefined ? {} : { endDate: activity.endDate }),
      intro: activity.detail!.intro,
      ...(activity.links === undefined ? {} : { links: activity.links }),
      cover: activity.album!.cover, photos: activity.album!.photos,
      groups: activity.detail!.sections.flatMap(section => section.image ? [{ id: section.id, title: section.title, paragraphs: section.paragraphs, image: section.image }] : []),
    }));
}
