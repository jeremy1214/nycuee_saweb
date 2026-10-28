import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import {
  ActivityContentError, parseActivityContent, parseActivityDataset, parsePublicActivityContent,
} from '../../shared/activity-content';
import { validateActivityRevision } from '../src/activity-content';

const directory = resolve(__dirname, '../../frontend/src/content/activities');
const categories = JSON.parse(readFileSync(resolve(directory, 'categories.json'), 'utf8'));
const modules = Object.fromEntries(readdirSync(resolve(directory, 'events')).filter(name => name.endsWith('.json'))
  .map(name => [name, JSON.parse(readFileSync(resolve(directory, 'events', name), 'utf8'))]));
const dataset = parseActivityDataset(categories, modules);
const editable = (id: string) => {
  const { id: _id, status: _status, ...content } = dataset.parsedActivities.find(item => item.id === id)!;
  return content;
};

test('all 11 legacy activities use the same parser in Node and the frontend', () => {
  assert.equal(dataset.parsedActivities.length, 11);
  for (const item of dataset.parsedActivities) {
    assert.deepEqual(validateActivityRevision(editable(item.id), dataset.activityCategories.map(c => c.id)), editable(item.id));
  }
  assert.equal(editable('smart-ee-camp').detail?.heroImages.length, 2);
  assert.equal(editable('ee-week-showcase').detail?.introMode, 'shared');
  assert.ok(editable('course-selection').album);
  const undated = { ...editable('course-selection'), date: undefined, endDate: undefined };
  assert.equal(parseActivityContent(undated).date, undefined);
});

test('content errors carry a stable field path, including nested and date errors', () => {
  const base = editable('smart-ee-camp');
  const cases: [unknown, string][] = [
    [{ ...base, date: '2027-02-29' }, 'activity.date'],
    [{ ...base, date: undefined, endDate: '2027-05-27' }, 'activity.endDate'],
    [{ ...base, date: '2027-05-27', endDate: '2027-05-26' }, 'activity.endDate'],
    [{ ...base, id: 'cannot-change-identity' }, 'activity'],
    [{ ...base, status: 'published' }, 'activity'],
    [{ ...base, detail: { ...base.detail, heroImages: [] } }, 'activity.detail.heroImages'],
    [{ ...base, links: [{ label: 'bad', url: 'javascript:alert(1)' }] }, 'activity.links[0].url'],
    [{ ...editable('course-selection'), detail: undefined }, 'activity.album'],
  ];
  for (const [input, path] of cases) {
    assert.throws(() => parseActivityContent(input), error => error instanceof ActivityContentError && error.path === path);
  }
  assert.throws(() => validateActivityRevision({ ...base, categoryId: 'missing' }, ['ee-camp']), error => {
    assert.ok(error instanceof BadRequestException);
    assert.equal(error.getStatus(), 400);
    const response = error.getResponse() as { fieldErrors: { path: string }[] };
    assert.equal(response.fieldErrors[0].path, 'activity.categoryId');
    return true;
  });
});

test('dataset rejects invalid category references, duplicate IDs and invalid featured activities', () => {
  const copy = structuredClone(modules);
  copy['smart-ee-camp.json'].categoryId = 'missing';
  assert.throws(() => parseActivityDataset(categories, copy), /categoryId.*unknown categoryId/);
  assert.throws(() => parseActivityDataset(categories, { ...modules, duplicate: modules['smart-ee-camp.json'] }), /duplicate/);
  const invalid = structuredClone(categories);
  invalid.categories[0].featuredActivityId = 'course-selection';
  assert.throws(() => parseActivityDataset(invalid, modules), /same category/);
});

test('public snapshots accept empty databases and reject internal fields, invalid labels and references', () => {
  assert.deepEqual(parsePublicActivityContent({ activities: [], categories: [] }), { activities: [], categories: [] });
  const content = { activities: dataset.activities, categories: dataset.activityCategories.map((c, order) => ({ ...c, order })) };
  assert.equal(parsePublicActivityContent(content).activities.length, 11);
  assert.throws(() => parsePublicActivityContent({ ...content, sessions: [] }), /unknown field/);
  const leaked = structuredClone(content);
  (leaked.activities[0] as unknown as Record<string, unknown>).status = 'draft';
  assert.throws(() => parsePublicActivityContent(leaked), /unknown field/);
  const invalid = structuredClone(content); invalid.activities[0].category = 'wrong label';
  assert.throws(() => parsePublicActivityContent(invalid), /must match category label/);
  assert.throws(() => parsePublicActivityContent({ activities: dataset.activities, categories: [] }), /require categories/);
});
