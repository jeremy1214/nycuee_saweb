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


type JsonRecord = Record<string, unknown>;
export type ActivityStatus = "draft" | "published" | "archived";
export type ParsedActivity = Omit<ActivityItem, "category"> & { status: ActivityStatus };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class ActivityContentError extends Error {
  constructor(public readonly path: string, message: string) {
    super(`[activity content] ${path}: ${message}`);
    this.name = "ActivityContentError";
  }
}

function fail(source: string, message: string): never {
  throw new ActivityContentError(source, message);
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

export type ActivityContent = Omit<ParsedActivity, "id" | "status">;
const contentKeys = ["title", "date", "endDate", "categoryId", "summary", "details", "location", "links", "detail", "album"];

export function parseActivityContent(value: unknown, source = "activity"): ActivityContent {
  const activity = record(value, source);
  onlyKeys(activity, contentKeys, source);
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

export function parseActivity(value: unknown, source: string): ParsedActivity {
  const activity = record(value, source);
  onlyKeys(activity, ["$schema", "id", "status", ...contentKeys], source);
  const status = string(activity.status, `${source}.status`);
  if (status !== "draft" && status !== "published" && status !== "archived") {
    fail(`${source}.status`, "must be draft, published, or archived");
  }
  const { $schema: _schema, id, status: _status, ...content } = activity;
  return { id: slug(id, `${source}.id`), status, ...parseActivityContent(content, source) };
}

export function parseCategories(value: unknown): ActivityCategoryOption[] {
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

export function requireActivityCategory(content: ActivityContent, categoryIds: Iterable<string>, source = "activity") {
  if (!new Set(categoryIds).has(content.categoryId)) {
    fail(`${source}.categoryId`, `references unknown categoryId "${content.categoryId}"`);
  }
}

export function parseActivityDataset(categoryContent: unknown, activityModules: Record<string, unknown>) {
  const activityCategories = parseCategories(categoryContent);
  const categoriesById = new Map(activityCategories.map((category) => [category.id, category]));
  const parsedActivities = Object.entries(activityModules).map(([source, value]) => parseActivity(value, source));
  unique(parsedActivities.map((activity) => activity.id), "activities[].id");

  parsedActivities.forEach((activity) => {
    if (!categoriesById.has(activity.categoryId)) {
      fail(`${activity.id}.categoryId`, `references unknown categoryId "${activity.categoryId}"`);
    }
  });

  const activities: ActivityItem[] = parsedActivities
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
  return { activityCategories, parsedActivities, activities };
}

export interface PublicActivityCategory extends ActivityCategoryOption {
  order: number;
}

export interface PublicActivityContent {
  activities: ActivityItem[];
  categories: PublicActivityCategory[];
}

/** Validate a complete public snapshot without accepting workflow/internal fields. */
export function parsePublicActivityContent(value: unknown): PublicActivityContent {
  const input = record(value, "publicContent");
  onlyKeys(input, ["activities", "categories"], "publicContent");
  if (!Array.isArray(input.activities) || !Array.isArray(input.categories)) {
    fail("publicContent", "activities and categories must be arrays");
  }
  const categories = input.categories.map((value, index) => {
    const source = `publicContent.categories[${index}]`;
    const category = record(value, source);
    onlyKeys(category, ["id", "label", "shortLabel", "order", "featuredActivityId"], source);
    if (!Number.isInteger(category.order) || (category.order as number) < 0) fail(`${source}.order`, "must be a non-negative integer");
    const { order, ...legacy } = category;
    return { order: order as number, legacy };
  });
  if (!categories.length) {
    if (input.activities.length) fail("publicContent.categories", "activities require categories");
    return { activities: [], categories: [] };
  }
  const modules = Object.fromEntries(input.activities.map((value, index) => {
    const source = `publicContent.activities[${index}]`;
    const item = record(value, source);
    onlyKeys(item, ["id", "category", ...contentKeys], source);
    string(item.category, `${source}.category`);
    const { category: _category, ...content } = item;
    return [source, { ...content, status: "published" }];
  }));
  const dataset = parseActivityDataset({ categories: categories.map(c => c.legacy) }, modules);
  dataset.activities.forEach((item, index) => {
    if ((input.activities as JsonRecord[])[index].category !== item.category) {
      fail(`publicContent.activities[${index}].category`, "must match category label");
    }
  });
  return {
    activities: dataset.activities.sort((a, b) => a.id.localeCompare(b.id)),
    categories: dataset.activityCategories.map((category, index) => ({ ...category, order: categories[index].order }))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  };
}
