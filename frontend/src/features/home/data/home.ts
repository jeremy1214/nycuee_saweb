import explore from "../../../content/home/explore.json";
import type { CalendarEvent, ExploreContent } from "../homeTypes";
import { activities } from "../../activities/data/activities";
import { compareActivityDates, hasActivityDate } from "../../activities/data/activityDates";

export const exploreContent: ExploreContent = explore;
export const slides = exploreContent.slides;

export const calendarEvents: CalendarEvent[] = activities.filter(hasActivityDate).sort(compareActivityDates);
