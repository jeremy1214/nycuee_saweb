export interface Slide {
  id: string;
  image: string;
  imagePosition: string;
  eyebrow: string;
  title: string;
  description: string[];
}

export interface ExploreContent {
  eyebrow: string;
  title: string;
  description: string;
  link: {
    label: string;
    to: string;
  };
  slides: Slide[];
}

export type CalendarEvent = import("../activities/data/activityDates").DatedActivity;
