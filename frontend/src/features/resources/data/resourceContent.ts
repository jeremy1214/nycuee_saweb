import type { OfficialLink, ResourceCategory, ResourceSection } from "../resourceTypes";

type JsonRecord = Record<string, unknown>;
type ResourceStatus = "draft" | "published" | "archived";
interface ResourceContent {
  id: string;
  status: ResourceStatus;
  links: OfficialLink[];
  sections: ResourceSection[];
  source: string;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(source: string, message: string): never {
  throw new Error(`[resource content] ${source}: ${message}`);
}

function record(value: unknown, source: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(source, "must be an object");
  return value as JsonRecord;
}

function onlyKeys(value: JsonRecord, allowed: string[], source: string) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) fail(source, `contains unknown field(s): ${unexpected.join(", ")}`);
  if (value.$schema !== undefined) string(value.$schema, `${source}.$schema`);
}

function string(value: unknown, source: string): string {
  if (typeof value !== "string" || !value.trim()) fail(source, "must be a non-empty string");
  return value;
}

function slug(value: unknown, source: string): string {
  const parsed = string(value, source);
  if (!slugPattern.test(parsed)) fail(source, "must use lowercase letters, numbers, and hyphens only");
  return parsed;
}

function array(value: unknown, source: string, allowEmpty = false): unknown[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(source, allowEmpty ? "must be an array" : "must be a non-empty array");
  }
  return value;
}

function unique(values: string[], source: string) {
  if (new Set(values).size !== values.length) fail(source, "contains duplicate values");
}

function parseLink(value: unknown, source: string): OfficialLink {
  const link = record(value, source);
  onlyKeys(link, ["label", "description", "href"], source);
  const href = string(link.href, `${source}.href`);
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    fail(`${source}.href`, "must be an absolute HTTP or HTTPS URL");
  }
  if (!/^https?:\/\//i.test(href) || /\s/.test(href) || !url.hostname || !["http:", "https:"].includes(url.protocol)) {
    fail(`${source}.href`, "must be an absolute HTTP or HTTPS URL");
  }
  return {
    label: string(link.label, `${source}.label`),
    description: string(link.description, `${source}.description`),
    href,
  };
}

function parseSection(value: unknown, source: string): ResourceSection {
  const section = record(value, source);
  onlyKeys(section, ["id", "type", "title", "items"], source);
  const id = slug(section.id, `${source}.id`);
  const title = string(section.title, `${source}.title`);
  const items = array(section.items, `${source}.items`);
  if (section.type === "checklist") {
    return { id, title, type: "checklist", items: items.map((item, index) => string(item, `${source}.items[${index}]`)) };
  }
  if (section.type === "process") {
    return {
      id, title, type: "process",
      items: items.map((item, index) => {
        const itemSource = `${source}.items[${index}]`;
        const step = record(item, itemSource);
        onlyKeys(step, ["title", "description"], itemSource);
        return { title: string(step.title, `${itemSource}.title`), description: string(step.description, `${itemSource}.description`) };
      }),
    };
  }
  fail(`${source}.type`, "must be process or checklist");
}

function parseContent(value: unknown, source: string): ResourceContent {
  const content = record(value, source);
  onlyKeys(content, ["$schema", "id", "status", "links", "sections"], source);
  const status = content.status;
  if (status !== "draft" && status !== "published" && status !== "archived") {
    fail(`${source}.status`, "must be draft, published, or archived");
  }
  const sections = content.sections === undefined ? [] : array(content.sections, `${source}.sections`, true)
    .map((section, index) => parseSection(section, `${source}.sections[${index}]`));
  unique(sections.map((section) => section.id), `${source}.sections[].id`);
  return {
    id: slug(content.id, `${source}.id`), status, source, sections,
    links: array(content.links, `${source}.links`).map((link, index) => parseLink(link, `${source}.links[${index}]`)),
  };
}

// Kept separate from Vite loading so content rules can also be tested with fixtures.
export function createResourceRepository(categoryValue: unknown, modules: Record<string, unknown>) {
  const configSource = "resources/categories.json";
  const config = record(categoryValue, configSource);
  onlyKeys(config, ["$schema", "defaultCategory", "categories"], configSource);
  const defaultResourceSlug = slug(config.defaultCategory, `${configSource}.defaultCategory`);
  const categories = array(config.categories, `${configSource}.categories`).map((value, index) => {
    const source = `${configSource}.categories[${index}]`;
    const category = record(value, source);
    onlyKeys(category, ["id", "label", "searchDescription"], source);
    return {
      id: slug(category.id, `${source}.id`),
      label: string(category.label, `${source}.label`),
      searchDescription: string(category.searchDescription, `${source}.searchDescription`),
      source,
    };
  });
  unique(categories.map((category) => category.id), `${configSource}.categories[].id`);
  unique(categories.map((category) => category.label), `${configSource}.categories[].label`);
  const configuredIds = new Set(categories.map((category) => category.id));
  const pages = Object.entries(modules).map(([source, value]) => parseContent(value, source));
  const seenPages = new Map<string, string>();
  for (const page of pages) {
    const previous = seenPages.get(page.id);
    if (previous) fail(`${page.source}.id`, `duplicate id "${page.id}" (already defined in ${previous})`);
    seenPages.set(page.id, page.source);
  }
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  for (const page of pages) {
    if (!configuredIds.has(page.id)) fail(`${page.source}.id`, `references unknown category "${page.id}"`);
    if (page.source.split(/[\\/]/).pop() !== `${page.id}.json`) {
      fail(`${page.source}.id`, "must match the JSON filename");
    }
  }
  for (const category of categories) {
    if (!pagesById.has(category.id)) fail(`${category.source}.id`, `missing content file for "${category.id}"`);
  }
  const publishedCategories: ResourceCategory[] = categories.flatMap((category) => {
    const page = pagesById.get(category.id)!;
    return page.status === "published" ? [{
      slug: category.id, tabLabel: category.label, searchDescription: category.searchDescription,
      links: page.links, sections: page.sections,
    }] : [];
  });
  if (!publishedCategories.length) fail(configSource, "must contain at least one published category");
  const resourceOrder = publishedCategories.map((category) => category.slug);
  if (!resourceOrder.includes(defaultResourceSlug)) {
    fail(`${configSource}.defaultCategory`, "must reference a published category");
  }
  const resourceCategories: Record<string, ResourceCategory> = Object.fromEntries(
    publishedCategories.map((category) => [category.slug, category]),
  );
  return { resourceOrder, resourceCategories, defaultResourceSlug };
}
