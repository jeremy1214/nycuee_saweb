import content from "../../../content/activities/other-activities.json";
import type { OtherActivity, OtherActivityImage } from "../activityTypes";

function fail(field: string): never {
  throw new Error(`[other activity content] ${field}: invalid or missing value`);
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(field);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) fail(field);
  return value;
}
function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value) || !value.length) fail(field);
  return value;
}
function paragraphs(value: unknown, field: string): string[] {
  return list(value, field).map((item, index) => text(item, `${field}[${index}]`));
}
function id(value: unknown, field: string): string {
  const parsed = text(value, field);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed)) fail(field);
  return parsed;
}
function uniqueIds(items: { id: string }[], field: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) fail(field);
}
function image(value: unknown, field: string): OtherActivityImage {
  const item = record(value, field);
  const src = text(item.src, `${field}.src`);
  if (!src.startsWith("/activities/")) fail(`${field}.src`);
  if (item.fit !== undefined && item.fit !== "cover" && item.fit !== "contain") fail(`${field}.fit`);
  return {
    src, alt: text(item.alt, `${field}.alt`),
    ...(item.fit === undefined ? {} : { fit: item.fit as "cover" | "contain" }),
    ...(item.objectPosition === undefined ? {} : { objectPosition: text(item.objectPosition, `${field}.objectPosition`) }),
  };
}

export function parseOtherActivities(value: unknown): OtherActivity[] {
  const items = list(value, "activities").map((value, index): OtherActivity => {
    const field = `activities[${index}]`;
    const item = record(value, field);
    const groups = item.groups === undefined ? undefined : list(item.groups, `${field}.groups`).map((value, groupIndex) => {
      const groupField = `${field}.groups[${groupIndex}]`;
      const group = record(value, groupField);
      return { id: id(group.id, `${groupField}.id`), title: text(group.title, `${groupField}.title`), paragraphs: paragraphs(group.paragraphs, `${groupField}.paragraphs`), image: image(group.image, `${groupField}.image`) };
    });
    if (groups) uniqueIds(groups, `${field}.groups[].id`);
    return {
      id: id(item.id, `${field}.id`), title: text(item.title, `${field}.title`),
      summary: text(item.summary, `${field}.summary`), intro: paragraphs(item.intro, `${field}.intro`),
      cover: image(item.cover, `${field}.cover`), photos: list(item.photos, `${field}.photos`).map((photo, photoIndex) => image(photo, `${field}.photos[${photoIndex}]`)),
      ...(groups ? { groups } : {}),
    };
  });
  uniqueIds(items, "activities[].id");
  return items;
}

export const otherActivities = parseOtherActivities(content);
