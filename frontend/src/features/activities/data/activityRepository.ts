import rawCategoryContent from "../../../content/activities/categories.json";
import type {
  ActivityAlbum,
  ActivityCategoryOption,
  ActivityDetail,
  ActivityDetailImage,
  ActivityDetailSection,
  ActivityDetailTab,
  ActivityItem,
  ActivityLink,
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
  onlyKeys(image, ["src", "alt", "objectPosition", "fit"], source);
  const src = string(image.src, `${source}.src`);
  if (!src.startsWith("/")) fail(`${source}.src`, "must start with /");
  if (image.fit !== undefined && image.fit !== "cover" && image.fit !== "contain") {
    fail(`${source}.fit`, "must be cover or contain");
  }
  return {
    src,
    alt: string(image.alt, `${source}.alt`),
    ...(image.fit === undefined ? {} : { fit: image.fit }),
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
    ...(section.image === undefined ? {} : { image: parseImage(section.image, `${source}.image`) }),
  };
}

function parseTab(value: unknown, source: string): ActivityDetailTab {
  const tab = record(value, source);
  onlyKeys(tab, ["id", "navLabel", "sections"], source);
  const id = slug(tab.id, `${source}.id`);
  if (id === "intro") fail(`${source}.id`, "intro is reserved for the activity introduction");
  if (!Array.isArray(tab.sections) || tab.sections.length === 0) {
    fail(`${source}.sections`, "must be a non-empty array");
  }
  const sections = tab.sections.map((section, index) => parseSection(section, `${source}.sections[${index}]`));
  unique(sections.map((section) => section.id), `${source}.sections[].id`);
  return { id, navLabel: string(tab.navLabel, `${source}.navLabel`), sections };
}

function parseDetail(value: unknown, source: string): ActivityDetail {
  const detail = record(value, source);
  onlyKeys(detail, ["eyebrow", "intro", "heroImages", "sections", "tabs", "introMode"], source);
  const introMode = detail.introMode;
  if (introMode !== undefined && introMode !== "tab" && introMode !== "shared") {
    fail(`${source}.introMode`, "must be tab or shared");
  }
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
  let tabs: ActivityDetailTab[] | undefined;
  if (detail.tabs !== undefined) {
    if (!Array.isArray(detail.tabs) || detail.tabs.length === 0) {
      fail(`${source}.tabs`, "must be a non-empty array");
    }
    tabs = detail.tabs.map((tab, index) => parseTab(tab, `${source}.tabs[${index}]`));
    unique(tabs.map((tab) => tab.id), `${source}.tabs[].id`);
  }
  if (introMode === "shared" && !tabs) {
    fail(`${source}.introMode`, "shared requires tabs");
  }
  return {
    eyebrow: string(detail.eyebrow, `${source}.eyebrow`),
    intro: stringArray(detail.intro, `${source}.intro`),
    heroImages,
    sections,
    ...(tabs === undefined ? {} : { tabs }),
    ...(introMode === undefined ? {} : { introMode }),
  };
}

function parseAlbum(value: unknown, source: string): ActivityAlbum {
  const album = record(value, source);
  onlyKeys(album, ["order", "cover", "photos"], source);
  if (typeof album.order !== "number" || !Number.isInteger(album.order) || album.order < 0) {
    fail(`${source}.order`, "must be a non-negative integer");
  }
  if (!Array.isArray(album.photos) || album.photos.length === 0) {
    fail(`${source}.photos`, "must be a non-empty array");
  }
  return {
    order: album.order,
    cover: parseImage(album.cover, `${source}.cover`),
    photos: album.photos.map((image, index) => parseImage(image, `${source}.photos[${index}]`)),
  };
}

function parseDate(value: unknown, source: string): string {
  const date = string(value, source);
  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (
    !datePattern.test(date)
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() + 1 !== month
    || parsedDate.getUTCDate() !== day
  ) {
    fail(source, "must be a valid YYYY-MM-DD date");
  }
  return date;
}

function parseLinks(value: unknown, source: string): ActivityLink[] {
  if (!Array.isArray(value)) fail(source, "must be an array");
  return value.map((value, index) => {
    const linkSource = `${source}[${index}]`;
    const link = record(value, linkSource);
    onlyKeys(link, ["label", "url"], linkSource);
    const label = string(link.label, `${linkSource}.label`).trim();
    const url = string(link.url, `${linkSource}.url`).trim();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      fail(`${linkSource}.url`, "must be an absolute http:// or https:// URL");
    }
    if (!/^https?:\/\/\S+$/i.test(url) || !["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
      fail(`${linkSource}.url`, "must be an absolute http:// or https:// URL");
    }
    return { label, url };
  });
}

function parseActivity(value: unknown, source: string): ParsedActivity {
  const activity = record(value, source);
  onlyKeys(
    activity,
    ["$schema", "id", "status", "title", "date", "endDate", "categoryId", "summary", "details", "location", "links", "detail", "album"],
    source,
  );
  const status = string(activity.status, `${source}.status`);
  if (status !== "draft" && status !== "published" && status !== "archived") {
    fail(`${source}.status`, "must be draft, published, or archived");
  }
  if (activity.album !== undefined && activity.detail === undefined) {
    fail(`${source}.album`, "requires detail content");
  }
  const date = activity.date === undefined ? undefined : parseDate(activity.date, `${source}.date`);
  const endDate = activity.endDate === undefined ? undefined : parseDate(activity.endDate, `${source}.endDate`);
  if (endDate !== undefined) {
    if (date === undefined) fail(`${source}.endDate`, "requires date");
    if (endDate < date) fail(`${source}.endDate`, "must be on or after date");
  }
  return {
    id: slug(activity.id, `${source}.id`),
    status,
    title: string(activity.title, `${source}.title`),
    ...(date === undefined ? {} : { date }),
    ...(endDate === undefined ? {} : { endDate }),
    categoryId: slug(activity.categoryId, `${source}.categoryId`),
    summary: string(activity.summary, `${source}.summary`),
    details: string(activity.details, `${source}.details`),
    ...(activity.location === undefined ? {} : { location: string(activity.location, `${source}.location`) }),
    ...(activity.links === undefined ? {} : { links: parseLinks(activity.links, `${source}.links`) }),
    ...(activity.detail === undefined ? {} : { detail: parseDetail(activity.detail, `${source}.detail`) }),
    ...(activity.album === undefined ? {} : { album: parseAlbum(activity.album, `${source}.album`) }),
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
