import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { importLegacyContent, readLegacyContent } from '../src/legacy-import';
import { publicSnapshot } from '../src/public-activities';

const url = process.env.CONTENT_TEST_DATABASE_URL;
const source = resolve('../frontend/src/content/activities');
const pictures = resolve('../frontend/public');

test('public API and legacy import with isolated PostgreSQL', {
  skip: !url && 'Set CONTENT_TEST_DATABASE_URL to an isolated database named content_test.',
}, async t => {
  assert.equal(new URL(url!).pathname, '/content_test');
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test'; process.env.COOKIE_SECURE = 'false'; process.env.TRUST_PROXY = 'false';
  const app = await createApp(); await app.listen(0, '127.0.0.1');
  const db = app.get(Database);
  const base = await app.getUrl();
  const api = (path: string) => fetch(`${base}/api/v1/public/${path}`);
  const dataset = readLegacyContent(source, pictures);
  async function clear() {
    await db.mediaReference.deleteMany(); await db.media.deleteMany();
    await db.activityGrant.deleteMany(); await db.categoryGrant.deleteMany(); await db.auditEntry.deleteMany();
    await db.activityCategory.updateMany({ data: { featuredActivityId: null } });
    await db.activity.updateMany({ data: { publishedRevisionId: null, workingRevisionId: null } });
    await db.activityRevision.deleteMany(); await db.activity.deleteMany(); await db.activityCategory.deleteMany();
  }
  t.after(async () => { await clear(); await app.close(); });
  await clear();

  await t.test('validates 11 activities, 5 categories and 65 images; dry-run writes nothing', async () => {
    const plan = await importLegacyContent(db, dataset, true);
    assert.equal(plan.activities, 11); assert.equal(plan.categories, 5); assert.equal(plan.images, 65);
    assert.equal(await db.activity.count(), 0); assert.equal(await db.activityCategory.count(), 0); assert.equal(await db.auditEntry.count(), 0);
    const result = await importLegacyContent(db, dataset);
    assert.equal(result.createActivities, 11); assert.equal(result.createCategories, 5);
    const again = await importLegacyContent(db, dataset);
    assert.equal(again.createActivities, 0); assert.equal(again.skipActivities, 11);
    assert.equal(await db.activityRevision.count(), 11); assert.equal(await db.auditEntry.count(), 1);
    const response = await api('activity-content');
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const content = await response.json();
    assert.equal(content.activities.length, 11); assert.equal(content.categories.length, 5);
    const expected = dataset.activities.map(a => ({ ...a, links: a.links ?? [] })).sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(content.activities, expected);
    assert.deepEqual(content.categories.map((c: { id: string }) => c.id), dataset.activityCategories.map(c => c.id));
    assert.deepEqual((await (await api('activities')).json()).items, content.activities);
    assert.deepEqual((await (await api('activity-categories')).json()).items, content.categories);
    assert.deepEqual(await (await api('activities/smart-ee-camp')).json(), expected.find(a => a.id === 'smart-ee-camp'));
  });

  await t.test('conflicts abort the whole batch and never overwrite existing work', async () => {
    const resource = await db.activity.findUniqueOrThrow({ where: { id: 'smart-ee-camp' }, include: { publishedRevision: true } });
    const original = resource.publishedRevision!;
    await db.activityRevision.update({ where: { id: original.id }, data: { title: '資料庫已更新' } });
    const withNew = structuredClone(dataset);
    withNew.parsedActivities.push({ ...withNew.parsedActivities[0], id: 'canary-new' });
    await assert.rejects(importLegacyContent(db, withNew), /activity:smart-ee-camp/);
    assert.equal(await db.activity.count({ where: { id: 'canary-new' } }), 0);
    assert.equal((await db.activityRevision.findUniqueOrThrow({ where: { id: original.id } })).title, '資料庫已更新');
    await db.activityRevision.update({ where: { id: original.id }, data: { title: original.title } });
    const draft = await db.activityRevision.create({ data: { activityId: resource.id, number: 2, categoryId: 'other', title: 'secret working title', summary: 'secret summary', details: 'secret details', date: new Date('2030-01-01') } });
    await db.activity.update({ where: { id: resource.id }, data: { workingRevisionId: draft.id } });
    await assert.rejects(importLegacyContent(db, dataset, true), /activity:smart-ee-camp/);
    const response = await (await api('activity-content')).json();
    const item = response.activities.find((a: { id: string }) => a.id === resource.id);
    assert.equal(item.title, original.title); assert.equal(item.categoryId, original.categoryId);
    assert.ok(!JSON.stringify(response).includes('secret')); assert.ok(!JSON.stringify(response).includes(draft.id));
    await db.activity.update({ where: { id: resource.id }, data: { workingRevisionId: null } });
    await db.activityRevision.delete({ where: { id: draft.id } });
  });

  await t.test('missing images and invalid JSON fail before any import writes', async () => {
    const temporary = mkdtempSync(join(tmpdir(), 'nycuee-ag-fixture-'));
    try {
      cpSync(source, join(temporary, 'content'), { recursive: true }); mkdirSync(join(temporary, 'public'));
      await clear();
      assert.throws(() => readLegacyContent(join(temporary, 'content'), join(temporary, 'public')), /ENOENT/);
      assert.equal(await db.activity.count(), 0);
      const file = join(temporary, 'content/events/smart-ee-camp.json');
      const input = JSON.parse(readFileSync(file, 'utf8')); input.date = '2027-02-29';
      writeFileSync(file, JSON.stringify(input));
      assert.throws(() => readLegacyContent(join(temporary, 'content'), pictures), /valid YYYY-MM-DD/);
      assert.equal(await db.activityCategory.count(), 0);
    } finally {
      assert.ok(!relative(tmpdir(), temporary).startsWith('..'));
      rmSync(temporary, { recursive: true, force: true });
    }
    await importLegacyContent(db, dataset);
  });

  await t.test('unpublished and draft-only resources are hidden and stale featured links are removed', async () => {
    await db.activity.create({ data: { id: 'draft-only' } });
    const revision = await db.activityRevision.create({ data: { activityId: 'draft-only', number: 1, categoryId: 'other', title: 'private', summary: 'private', details: 'private' } });
    await db.activity.update({ where: { id: 'draft-only' }, data: { workingRevisionId: revision.id } });
    assert.equal((await api('activities/draft-only')).status, 404);
    const camp = await db.activity.findUniqueOrThrow({ where: { id: 'smart-ee-camp' } });
    await db.activityRevision.update({ where: { id: camp.publishedRevisionId! }, data: { status: 'DRAFT' } });
    assert.equal((await api('activities/smart-ee-camp')).status, 404);
    await assert.rejects(importLegacyContent(db, dataset, true), /activity:smart-ee-camp/);
    await db.activityRevision.update({ where: { id: camp.publishedRevisionId! }, data: { status: 'PUBLISHED' } });
    await db.activity.update({ where: { id: camp.id }, data: { publishedRevisionId: null } });
    assert.equal((await api('activities/smart-ee-camp')).status, 404);
    const snapshot = await (await api('activity-content')).json();
    assert.equal(snapshot.activities.length, 10);
    assert.ok(!snapshot.categories.find((c: { id: string }) => c.id === 'ee-camp').featuredActivityId);
    await db.activity.update({ where: { id: camp.id }, data: { publishedRevisionId: camp.publishedRevisionId } });
  });

  await t.test('legacy draft and archived files never create a public pointer', async () => {
    const temporary = mkdtempSync(join(tmpdir(), 'nycuee-ag-status-'));
    try {
      cpSync(source, join(temporary, 'content'), { recursive: true });
      for (const [id, status] of [['course-selection', 'draft'], ['icebreaker', 'archived']]) {
        const file = join(temporary, 'content/events', `${id}.json`);
        const value = JSON.parse(readFileSync(file, 'utf8')); value.status = status;
        writeFileSync(file, JSON.stringify(value));
      }
      await clear();
      await importLegacyContent(db, readLegacyContent(join(temporary, 'content'), pictures));
      assert.equal((await (await api('activity-content')).json()).activities.length, 9);
      const draft = await db.activity.findUniqueOrThrow({ where: { id: 'course-selection' } });
      assert.ok(draft.workingRevisionId); assert.equal(draft.publishedRevisionId, null);
      const archived = await db.activity.findUniqueOrThrow({ where: { id: 'icebreaker' } });
      assert.equal(archived.publishedRevisionId, null); assert.equal(archived.workingRevisionId, null);
      assert.equal((await api('activities/course-selection')).status, 404);
      assert.equal((await api('activities/icebreaker')).status, 404);
    } finally {
      assert.ok(!relative(tmpdir(), temporary).startsWith('..'));
      rmSync(temporary, { recursive: true, force: true });
    }
    await clear(); await importLegacyContent(db, dataset);
  });

  await t.test('repeatable-read snapshots stay consistent and later HTTP reads see changed public content', async () => {
    const camp = await db.activity.findUniqueOrThrow({ where: { id: 'smart-ee-camp' }, include: { publishedRevision: true } });
    const original = camp.publishedRevision!;
    await db.$transaction(async tx => {
      await tx.activityCategory.count(); // Establish the repeatable-read snapshot.
      await db.activityRevision.update({ where: { id: original.id }, data: { title: '新公開內容' } });
      const snapshot = await publicSnapshot(tx);
      assert.equal(snapshot.activities.find(a => a.id === camp.id)!.title, original.title);
    }, { isolationLevel: 'RepeatableRead' });
    assert.equal((await (await api('activities/smart-ee-camp')).json()).title, '新公開內容');
  });
});
