import rawCategoryContent from "../../../content/activities/categories.json";
import { parseActivityDataset } from "../../../../../shared/activity-content";

const activityModules = import.meta.glob("../../../content/activities/events/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export const { activityCategories, activities } = parseActivityDataset(rawCategoryContent, activityModules);
