import rawCategoryContent from "../../../content/activities/categories.json";
import type {
  ActivityCategoryOption,
  ActivityDetail,
  ActivityDetailImage,
  ActivityDetailSection,
  ActivityItem,
} from "../activityTypes";

type JsonRecord = Record<string, unknown>;
type ActivityStatus = "draft" | "published" | "archived";
type ParsedActivity = Omit<ActivityItem, "category"> & { status: ActivityStatus };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function fail(source: string, message: string): never {
  throw new Error(`[activity content] ${source}: ${message}`);
}

function record(value: unknown, source: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(source, "must be an object");
  return value as JsonRecord;
}

function onlyKeys(value: JsonRecord, allowed: string[], source: string) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) fail(source, `contains unknown field(s): ${unexpected.join(", ")}`);
}

function string(value: unknown, source: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(source, "must be a non-empty string");
  return value;
}

function slug(value: unknown, source: string): string {
  const parsed = string(value, source);
  if (!slugPattern.test(parsed)) fail(source, "must use lowercase letters, numbers, and hyphens only");
  return parsed;
}

function stringArray(value: unknown, source: string): string[] {
  if (!Array.isArray(value) || value.length === 0) fail(source, "must be a non-empty array");
  return value.map((item, index) => string(item, `${source}[${index}]`));
}

function unique(values: string[], source: string) {
  if (new Set(values).size !== values.length) fail(source, "contains duplicate values");
}

function parseImage(value: unknown, source: string): ActivityDetailImage {
  const image = record(value, source);
  onlyKeys(image, ["src", "alt", "objectPosition"], source);
  const src = string(image.src, `${source}.src`);
  if (!src.startsWith("/")) fail(`${source}.src`, "must start with /");
  return {
    src,
    alt: string(image.alt, `${source}.alt`),
    ...(image.objectPosition === undefined
      ? {}
      : { objectPosition: string(image.objectPosition, `${source}.objectPosition`) }),
  };
}

function parseSection(value: unknown, source: string): ActivityDetailSection {
  const section = record(value, source);
  onlyKeys(section, ["id", "navLabel", "eyebrow", "title", "paragraphs", "image"], source);
  return {
    id: slug(section.id, `${source}.id`),
    navLabel: string(section.navLabel, `${source}.navLabel`),
    eyebrow: string(section.eyebrow, `${source}.eyebrow`),
    title: string(section.title, `${source}.title`),
    paragraphs: stringArray(section.paragraphs, `${source}.paragraphs`),
    image: parseImage(section.image, `${source}.image`),
  };
}

function parseDetail(value: unknown, source: string): ActivityDetail {
  const detail = record(value, source);
  onlyKeys(detail, ["eyebrow", "intro", "heroImages", "sections"], source);
  if (!Array.isArray(detail.heroImages) || detail.heroImages.length !== 2) {
    fail(`${source}.heroImages`, "must contain exactly two images");
  }
  if (!Array.isArray(detail.sections)) fail(`${source}.sections`, "must be an array");

  const heroImages = detail.heroImages.map((image, index) =>
    parseImage(image, `${source}.heroImages[${index}]`),
  ) as [ActivityDetailImage, ActivityDetailImage];
  const sections = detail.sections.map((section, index) =>
    parseSection(section, `${source}.sections[${index}]`),
  );
  unique(sections.map((section) => section.id), `${source}.sections[].id`);
  return {
    eyebrow: string(detail.eyebrow, `${source}.eyebrow`),
    intro: stringArray(detail.intro, `${source}.intro`),
    heroImages,
    sections,
  };
}

function parseActivity(value: unknown, source: string): ParsedActivity {
  const activity = record(value, source);
  onlyKeys(
    activity,
    ["$schema", "id", "status", "title", "date", "categoryId", "summary", "details", "location", "detail"],
    source,
  );
  const status = string(activity.status, `${source}.status`);
  if (status !== "draft" && status !== "published" && status !== "archived") {
    fail(`${source}.status`, "must be draft, published, or archived");
  }
  const date = string(activity.date, `${source}.date`);
  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    !datePattern.test(date)
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() + 1 !== month
    || parsedDate.getUTCDate() !== day
  ) {
    fail(`${source}.date`, "must be a valid YYYY-MM-DD date");
  }
  return {
    id: slug(activity.id, `${source}.id`),
    status,
    title: string(activity.title, `${source}.title`),
    date,
    categoryId: slug(activity.categoryId, `${source}.categoryId`),
    summary: string(activity.summary, `${source}.summary`),
    details: string(activity.details, `${source}.details`),
    location: string(activity.location, `${source}.location`),
    ...(activity.detail === undefined ? {} : { detail: parseDetail(activity.detail, `${source}.detail`) }),
  };
}

function parseCategories(value: unknown): ActivityCategoryOption[] {
  const content = record(value, "categories.json");
  onlyKeys(content, ["$schema", "categories"], "categories.json");
  if (!Array.isArray(content.categories) || content.categories.length === 0) {
    fail("categories.json.categories", "must be a non-empty array");
  }
  const categories = content.categories.map((value, index) => {
    const source = `categories.json.categories[${index}]`;
    const category = record(value, source);
    onlyKeys(category, ["id", "label", "shortLabel", "featuredActivityId"], source);
    return {
      id: slug(category.id, `${source}.id`),
      label: string(category.label, `${source}.label`),
      shortLabel: string(category.shortLabel, `${source}.shortLabel`),
      ...(category.featuredActivityId === undefined
        ? {}
        : { featuredActivityId: slug(category.featuredActivityId, `${source}.featuredActivityId`) }),
    };
  });
  unique(categories.map((category) => category.id), "categories.json.categories[].id");
  unique(categories.map((category) => category.label), "categories.json.categories[].label");
  return categories;
}

const activityModules = import.meta.glob("../../../content/activities/events/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export const activityCategories = parseCategories(rawCategoryContent);
const categoriesById = new Map(activityCategories.map((category) => [category.id, category]));
const parsedActivities = Object.entries(activityModules).map(([source, value]) => parseActivity(value, source));
unique(parsedActivities.map((activity) => activity.id), "activities[].id");

parsedActivities.forEach((activity) => {
  if (!categoriesById.has(activity.categoryId)) {
    fail(activity.id, `references unknown categoryId "${activity.categoryId}"`);
  }
});

export const activities: ActivityItem[] = parsedActivities
  .filter((activity) => activity.status === "published")
  .map(({ status: _status, ...activity }) => ({
    ...activity,
    category: categoriesById.get(activity.categoryId)!.label,
  }));

const publishedById = new Map(activities.map((activity) => [activity.id, activity]));
activityCategories.forEach((category) => {
  if (!category.featuredActivityId) return;
  const featured = publishedById.get(category.featuredActivityId);
  if (!featured?.detail) {
    fail(
      `category "${category.id}"`,
      `featuredActivityId "${category.featuredActivityId}" must reference a published activity with detail content`,
    );
  }
  if (featured.categoryId !== category.id) {
    fail(`category "${category.id}"`, "featured activity must belong to the same category");
  }
});
