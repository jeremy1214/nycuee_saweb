import { activities } from "./activities";
import { deriveOtherActivities } from "./contentSelectors";

/** Legacy JSON adapter, used only by JSON mode and fixture checks. */
export const otherActivities = deriveOtherActivities(activities);
