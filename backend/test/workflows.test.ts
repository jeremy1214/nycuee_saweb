import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hash } from 'argon2';
import sharp from 'sharp';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { importLegacyContent, readLegacyContent } from '../src/legacy-import';
import { importOrganizations } from '../src/import-organization';
import { readOrganizationLegacy } from '../src/organization-legacy';
import { importSiteLegacy, readSiteLegacy } from '../src/site-legacy';
import type { OrganizationContent } from '../../shared/organization-content';
import { siteContentKinds } from '../../shared/site-content';

const testUrl = process.env.WORKFLOW_TEST_DATABASE_URL;
type Session = { Cookie: string; 'X-CSRF-Token': string };
test('real CMS workflows, organization scopes and site content', {
  skip: !testUrl && 'Set WORKFLOW_TEST_DATABASE_URL to a migrated workflow_test database.',
}, async t => {
  assert.equal(new URL(testUrl!).pathname, '/workflow_test');
  const saved = { ...process.env };
  const root = await mkdtemp(join(tmpdir(), 'nycuee-workflow-'));
  Object.assign(process.env, { DATABASE_URL: testUrl, NODE_ENV: 'test', COOKIE_SECURE: 'false', TRUST_PROXY: 'false',
    APP_ORIGIN: 'http://localhost', MEDIA_ROOT: root, MEDIA_MIN_FREE_BYTES: '1', MEDIA_UPLOADS_PER_MINUTE: '20' });
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  let db: Database | undefined;
  async function clear() {
    if (db) await db.$executeRawUnsafe('TRUNCATE TABLE "SiteContent", "EesaOverview", "Department", "Team", "Activity", "ActivityCategory", "Media", "User", "Session", "PasswordToken", "GoogleAuthFlow", "LoginAttempt", "AuditEntry" CASCADE');
  }
  t.after(async () => {
    try { await clear(); } finally {
      try { await app?.close(); } finally { process.env = saved; await rm(root, { recursive: true, force: true }); }
    }
  });
  app = await createApp(); db = app.get(Database);
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api/v1/`;
  const call = (path: string, session?: Session, method = 'GET', body?: unknown) => fetch(`${base}${path}`, {
    method, headers: { ...session, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual',
  });
  async function json(path: string, session?: Session, method = 'GET', body?: unknown) {
    const response = await call(path, session, method, body);
    assert.ok(response.ok, `${method} ${path}: ${response.status}`);
    return response.json();
  }
  async function login(username: string): Promise<Session> {
    const anonymous = await call('auth/csrf');
    assert.equal(anonymous.status, 200);
    const headers = { Cookie: anonymous.headers.get('set-cookie')!.split(';')[0], 'X-CSRF-Token': (await anonymous.json()).csrfToken };
    const result = await call('auth/login', headers, 'POST', { username, password: 'workflow-password' });
    assert.equal(result.status, 200);
    const Cookie = result.headers.get('set-cookie')!.split(';')[0];
    const csrf = await json('auth/csrf', { Cookie, 'X-CSRF-Token': '' });
    return { Cookie, 'X-CSRF-Token': csrf.csrfToken };
  }
  const legacyOrganizations = readOrganizationLegacy();
  const passwordHash = await hash('workflow-password');
  async function setup() {
    await clear();
    await importLegacyContent(db!, readLegacyContent('../frontend/src/content/activities', '../frontend/public'));
    await importOrganizations(db!, legacyOrganizations);
    await importSiteLegacy(db!);
    await db!.user.create({ data: { username: 'workflow-admin', role: 'ADMIN', passwordHash } });
    const editor = await db!.user.create({ data: { username: 'workflow-editor', role: 'EDITOR', passwordHash } });
    return { admin: await login('workflow-admin'), editor: await login('workflow-editor'), editorId: editor.id };
  }
  async function command(path: string, session: Session, action: string, version: number, extra = {}) {
    return json(`${path}/${action}`, session, 'POST', { version, ...extra });
  }
  async function upload(scope: Record<string, string>, session: Session) {
    const form = new FormData();
    for (const [key, value] of Object.entries(scope)) form.set(key, value);
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
    form.set('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'fixture.png');
    const response = await fetch(`${base}admin/media`, { method: 'POST', headers: session, body: form });
    assert.equal(response.status, 201);
    const media = await response.json(); assert.equal(media.mimeType, 'image/webp');
    return media;
  }

  const cli = (script: string, args: string[] = [], env = {}) => promisify(execFile)(process.execPath,
    ['--import', 'tsx', `src/${script}.ts`, ...args], { env: { ...process.env, ...env }, timeout: 30000 });

  await t.test('bootstrap initializes empty content, is repeatable and preserves existing edits', async () => {
    await clear();
    await cli('bootstrap-content');
    assert.equal(await db!.activity.count(), 11);
    assert.equal(await db!.activityCategory.count(), 5);
    assert.equal(await db!.department.count(), 4);
    assert.equal(await db!.team.count(), 9);
    assert.equal(await db!.siteContent.count(), 3);
    const auditCount = await db!.auditEntry.count();
    await cli('bootstrap-content');
    assert.equal(await db!.auditEntry.count(), auditCount);
    assert.deepEqual(await json('health'), { status: 'ok' });
    await cli('import-content', ['--dry-run']);
    await cli('import-organization', ['--compare']);
    await cli('import-organization', ['--compare-public'], { APP_ORIGIN: (await app!.getUrl()) });
    await cli('import-site', ['--inventory']);
    await cli('import-site', ['--dry-run']);
    const revision = await db!.activityRevision.findFirstOrThrow();
    await db!.activityRevision.update({ where: { id: revision.id }, data: { title: 'preserved-custom-title' } });
    await cli('bootstrap-content');
    assert.equal((await db!.activityRevision.findUniqueOrThrow({ where: { id: revision.id } })).title, 'preserved-custom-title');
  });

  await t.test('retention inventories first, deletes only expired read messages and preserves unread messages', async () => {
    await setup();
    const past = new Date(Date.now() - 90 * 86400000);
    const message = { name: '測試', email: 'test@example.com', category: 'website' as const, subject: '清理測試', message: '這是一筆測試聯絡訊息。' };
    await db!.contactMessage.deleteMany();
    await db!.contactMessage.createMany({ data: [
      { ...message, id: 'old-read', createdAt: past, readAt: past },
      { ...message, id: 'old-unread', createdAt: past },
      { ...message, id: 'recent-read', readAt: new Date() },
    ] });
    await db!.auditEntry.create({ data: { action: 'retention-fixture', entityType: 'Test', entityId: 'old-audit', createdAt: past } });
    const env = { CONTACT_RETENTION_DAYS: '30', AUDIT_RETENTION_DAYS: '30' };
    try {
      const inventory = JSON.parse((await cli('retention', [], env)).stdout);
      assert.equal(inventory.apply, false);
      assert.equal(inventory.contacts, 1);
      assert.equal(inventory.audits, 1);
      assert.equal(await db!.contactMessage.count(), 3);
      const applied = JSON.parse((await cli('retention', ['--apply'], env)).stdout);
      assert.equal(applied.apply, true);
      assert.equal(await db!.contactMessage.count(), 2);
      assert.ok(await db!.contactMessage.findUnique({ where: { id: 'old-unread' } }));
      assert.equal(await db!.auditEntry.count({ where: { entityId: 'old-audit' } }), 0);
      assert.equal(await db!.auditEntry.count({ where: { action: 'operations.retention' } }), 1);
      await assert.rejects(cli('retention', [], { ...env, CONTACT_RETENTION_DAYS: '1' }));
    } finally { await db!.contactMessage.deleteMany(); }
  });

  await t.test('grant HTTP replacement validates all scopes, version conflicts and immediate revocation', async () => {
    const { admin, editor, editorId } = await setup();
    const path = `admin/users/${editorId}/grants`;
    const user = (await json('admin/users', admin)).items.find((item: { id: string }) => item.id === editorId);
    const grants = { version: user.version, categoryIds: ['other'], activityIds: ['course-selection'], departmentIds: ['activities'], teamIds: ['basketball-men'] };
    assert.equal((await call(path, editor, 'PUT', grants)).status, 403);
    assert.equal((await call(path, admin, 'PUT', { ...grants, categoryIds: ['missing'] })).status, 400);
    assert.deepEqual(await json(path, admin), { categoryIds: [], activityIds: [], departmentIds: [], teamIds: [] });
    const updated = await json(path, admin, 'PUT', grants);
    assert.equal((await call(path, admin, 'PUT', grants)).status, 409);
    const { version: _, ...expected } = grants;
    assert.deepEqual(await json(path, admin), expected);
    for (const target of ['admin/activities/course-selection', 'admin/eesa/departments/activities', 'admin/teams/basketball-men']) {
      assert.equal((await call(target, editor)).status, 200);
    }
    await json(path, admin, 'PUT', { version: updated.version, categoryIds: [], activityIds: [], departmentIds: [], teamIds: [] });
    for (const target of ['admin/activities/course-selection', 'admin/eesa/departments/activities', 'admin/teams/basketball-men']) {
      assert.equal((await call(target, editor)).status, 403);
    }
    assert.ok((await json('admin/users/grant-options', admin)).categories.length > 0);
    assert.ok((await json(`admin/audit-entries?entityId=${editorId}`, admin)).total >= 2);
  });

  await t.test('category and activity creation enforce scope, optimistic concurrency and publication rules', async () => {
    const { admin, editor, editorId } = await setup();
    const category = { id: 'integration-category', label: '測試分類', shortLabel: 'TEST', order: 50 };
    assert.equal((await call('admin/activity-categories', editor, 'POST', category)).status, 403);
    const created = await json('admin/activity-categories', admin, 'POST', category);
    const { id, ...fields } = category;
    const changed = await json(`admin/activity-categories/${id}`, admin, 'PUT', { ...fields, label: '更新分類', version: created.version });
    assert.equal((await call(`admin/activity-categories/${id}`, admin, 'PUT', { ...fields, version: created.version })).status, 409);
    assert.equal((await call(`admin/activity-categories/${id}`, admin, 'PUT', { ...fields, version: changed.version, featuredActivityId: 'course-selection' })).status, 409);
    const activityId = 'integration-activity';
    const content = { title: '新增活動', categoryId: id, summary: '測試摘要', details: '測試內容' };
    assert.equal((await call('admin/activities', editor, 'POST', { id: activityId, content })).status, 403);
    await db!.categoryGrant.create({ data: { userId: editorId, categoryId: id } });
    let activity = await json('admin/activities', editor, 'POST', { id: activityId, content });
    assert.equal((await call(`public/activities/${activityId}`)).status, 404);
    assert.ok((await json('admin/activities', editor)).items.some((item: { id: string }) => item.id === activityId));
    activity = await command(`admin/activities/${activityId}`, editor, 'submit', activity.version);
    activity = await command(`admin/activities/${activityId}`, editor, 'withdraw', activity.version);
    activity = await command(`admin/activities/${activityId}`, editor, 'submit', activity.version);
    await command(`admin/activities/${activityId}`, admin, 'publish', activity.version);
    assert.equal((await json(`public/activities/${activityId}`)).title, content.title);
  });

  await t.test('invalid uploads leave no media; private media lists, references and deletion respect grants', async () => {
    const { admin, editor, editorId } = await setup();
    async function attempt(scope: Record<string, string>, bytes: Uint8Array, session = admin) {
      const form = new FormData();
      for (const [key, value] of Object.entries(scope)) form.set(key, value);
      form.set('file', new Blob([bytes], { type: 'image/png' }), 'fake.png');
      return fetch(`${base}admin/media`, { method: 'POST', headers: session, body: form });
    }
    assert.equal((await attempt({ activityId: 'course-selection' }, new TextEncoder().encode('<script>bad</script>'))).status, 400);
    const png = new Uint8Array(await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer());
    assert.equal((await attempt({}, png)).status, 400);
    assert.equal((await attempt({ activityId: 'course-selection' }, png, editor)).status, 403);
    assert.equal(await db!.media.count(), 0);
    await db!.activityGrant.create({ data: { userId: editorId, activityId: 'course-selection' } });
    const owned = await upload({ activityId: 'course-selection' }, editor);
    const other = await upload({ activityId: 'course-selection' }, admin);
    assert.equal((await call('admin/media', editor)).status, 400);
    assert.ok((await json('admin/media?activityId=course-selection', editor)).items.some((item: { id: string }) => item.id === owned.id));
    assert.deepEqual((await json(`admin/media/${owned.id}/references`, editor)).items, []);
    assert.equal((await call(`admin/media/${other.id}`, editor, 'DELETE')).status, 403);
    assert.ok((await call(`admin/media/${owned.id}`, editor, 'DELETE')).ok);
    assert.equal((await call(`admin/media/${owned.id}/file`, admin)).status, 404);
    assert.ok((await call(`admin/media/${other.id}`, admin, 'DELETE')).ok);
    assert.equal(await db!.media.count(), 0);
  });

  await t.test('simultaneous draft saves and publication accept only one writer per version', async () => {
    const { admin } = await setup();
    const path = 'admin/activities/course-selection';
    const initial = await json(path, admin);
    const content = (await json(`${path}/revisions`, admin)).items[0].content;
    const titles = ['concurrent-writer-one', 'concurrent-writer-two'];
    const responses = await Promise.all(titles.map(title => call(`${path}/draft`, admin, 'PUT', {
      version: initial.version, content: { ...content, title },
    })));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
    const winner = await responses.find(response => response.status === 200)!.json();
    assert.ok(titles.includes(winner.workingRevision.content.title));
    const submitted = await command(path, admin, 'submit', winner.version);
    const publications = await Promise.all([0, 1].map(() => call(`${path}/publish`, admin, 'POST', { version: submitted.version })));
    assert.deepEqual(publications.map(response => response.status).sort(), [200, 409]);
    assert.equal((await json('public/activities/course-selection')).title, winner.workingRevision.content.title);
    assert.equal(await db!.auditEntry.count({ where: { action: 'activity.publish', entityId: 'course-selection' } }), 1);
  });

  await t.test('category grants filter working content, preview and historical revisions across category moves', async () => {
    const { admin, editor, editorId } = await setup();
    const path = 'admin/activities/course-selection';
    const initial = await json(path, admin);
    const original = (await json(`${path}/revisions`, admin)).items[0];
    await db!.categoryGrant.create({ data: { userId: editorId, categoryId: original.content.categoryId } });
    let moved = await json(`${path}/draft`, admin, 'PUT', {
      version: initial.version, content: { ...original.content, categoryId: 'ee-camp', title: 'restricted-category-marker' },
    });
    assert.equal((await json(path, editor)).workingRevision, null);
    assert.ok(!JSON.stringify(await json(`${path}/revisions`, editor)).includes('restricted-category-marker'));
    assert.equal((await call(`${path}/preview`, editor)).status, 403);
    assert.equal((await call(`${path}/draft`, editor, 'PUT', { version: moved.version, content: original.content })).status, 403);
    moved = await command(path, admin, 'submit', moved.version);
    await command(path, admin, 'publish', moved.version);
    assert.equal((await call(path, editor)).status, 403);
    await db!.categoryGrant.deleteMany({ where: { userId: editorId } });
    await db!.categoryGrant.create({ data: { userId: editorId, categoryId: 'ee-camp' } });
    const history = await json(`${path}/revisions`, editor);
    assert.equal(history.items.length, 1);
    assert.equal(history.items[0].content.title, 'restricted-category-marker');
    assert.ok(!history.items.some((item: { id: string }) => item.id === original.id));
  });

  await t.test('activity draft, freeze, publication, restore, private media and immediate grant revocation', async () => {
    const { admin, editor, editorId } = await setup();
    const path = 'admin/activities/course-selection';
    assert.equal((await call(path, editor)).status, 403);
    await db!.activityGrant.create({ data: { userId: editorId, activityId: 'course-selection' } });
    const initial = await json(path, editor);
    const original = (await json(`${path}/revisions`, editor)).items[0];
    const content = { ...original.content, title: 'private-activity-marker' };
    assert.equal((await call(`${path}/draft`, { ...editor, 'X-CSRF-Token': '0'.repeat(64) }, 'PUT', { version: initial.version, content })).status, 403);
    let state = await json(`${path}/draft`, editor, 'PUT', { version: initial.version, content });
    assert.equal((await call(`${path}/draft`, editor, 'PUT', { version: initial.version, content })).status, 409);
    assert.ok(!JSON.stringify(await json('public/activity-content')).includes(content.title));
    assert.equal((await call(`${path}/draft`, editor, 'PUT', { version: state.version, content: { ...content, categoryId: 'ee-camp' } })).status, 403);
    const media = await upload({ activityId: 'course-selection' }, editor);
    assert.equal((await call(`public/media/${media.id}`)).status, 404);
    assert.equal((await call(`admin/media/${media.id}/file`)).status, 401);
    assert.equal((await call(`admin/media/${media.id}/file`, editor)).status, 200);
    state = await command(path, editor, 'submit', state.version);
    assert.equal((await call(`${path}/draft`, editor, 'PUT', { version: state.version, content })).status, 400);
    assert.equal((await call(`${path}/publish`, editor, 'POST', { version: state.version })).status, 403);
    state = await command(path, admin, 'reject', state.version, { reason: '補充資料' });
    assert.equal(state.workingRevision.rejectionNote, '補充資料');
    state = await command(path, editor, 'submit', state.version);
    state = await command(path, admin, 'publish', state.version);
    assert.equal((await json('public/activities/course-selection')).title, content.title);
    state = await command(path, admin, 'unpublish', state.version);
    assert.equal((await call('public/activities/course-selection')).status, 404);
    state = await command(path, admin, 'restore', state.version, { revisionId: original.id });
    assert.equal(state.workingRevision.status, 'DRAFT');
    assert.equal(state.workingRevision.content.title, original.content.title);
    await db!.activityGrant.deleteMany({ where: { userId: editorId } });
    for (const suffix of ['', '/revisions', '/preview']) assert.equal((await call(path + suffix, editor)).status, 403);
    assert.equal((await call(`admin/media/${media.id}/file`, editor)).status, 403);
  });

  for (const record of legacyOrganizations) await t.test(`${record.kind}/${record.id}: authorization, order, freeze, publication and restore`, async () => {
    const { admin, editor, editorId } = await setup();
    const path = record.kind === 'overview' ? 'admin/eesa/overview' : record.kind === 'department' ? `admin/eesa/departments/${record.id}` : `admin/teams/${record.id}`;
    assert.equal((await call(path, editor)).status, 403);
    const actor = record.kind === 'overview' ? admin : editor;
    if (record.kind === 'department') await db!.departmentGrant.create({ data: { userId: editorId, departmentId: record.id } });
    if (record.kind === 'team') await db!.teamGrant.create({ data: { userId: editorId, teamId: record.id } });
    const initial = await json(path, actor);
    const original = (await json(`${path}/revisions`, actor)).items[0];
    const content = structuredClone(record.content) as OrganizationContent;
    if ('name' in content) content.name = 'private-org-marker';
    else content.title = 'private-org-marker';
    if ('order' in content) assert.equal((await call(`${path}/draft`, editor, 'PUT', { version: initial.version, content: { ...content, order: content.order + 1 } })).status, 403);
    let state = await json(`${path}/draft`, actor, 'PUT', { version: initial.version, content });
    const publicPath = record.kind === 'team' ? 'public/teams/content' : 'public/eesa/content';
    assert.ok(!JSON.stringify(await json(publicPath)).includes('private-org-marker'));
    assert.equal((await call(`${path}/draft`, actor, 'PUT', { version: initial.version, content })).status, 409);
    state = await command(path, actor, 'submit', state.version);
    assert.equal((await call(`${path}/draft`, actor, 'PUT', { version: state.version, content })).status, 409);
    state = await command(path, admin, 'reject', state.version, { reason: '需補充' });
    assert.equal(state.workingRevision.rejectionNote, '需補充');
    state = await command(path, actor, 'submit', state.version);
    state = await command(path, actor, 'withdraw', state.version);
    state = await command(path, actor, 'submit', state.version);
    if (record.kind !== 'overview') assert.equal((await call(`${path}/publish`, editor, 'POST', { version: state.version })).status, 403);
    state = await command(path, admin, 'publish', state.version);
    assert.ok(JSON.stringify(await json(publicPath)).includes('private-org-marker'));
    state = await command(path, actor, 'restore', state.version, { revisionId: original.id });
    assert.deepEqual(state.workingRevision.content, original.content);
    if (record.kind === 'department') await db!.departmentGrant.deleteMany({ where: { userId: editorId } });
    if (record.kind === 'team') await db!.teamGrant.deleteMany({ where: { userId: editorId } });
    assert.equal((await call(path, editor)).status, 403);
  });

  for (const kind of siteContentKinds) await t.test(`${kind}: site draft isolation, version lock, review and restore`, async () => {
    const { admin, editor } = await setup();
    const path = `admin/site-content/${kind}`;
    assert.equal((await call(path)).status, 401);
    assert.equal((await call(path, editor)).status, 403);
    const initial = await json(path, admin);
    const original = initial.publishedRevision;
    const content = readSiteLegacy()[kind];
    if ('title' in content) content.title = 'private-site-marker';
    else if ('siteContact' in content) content.siteContact.office = 'private-site-marker';
    else content.categories.categories[0].searchDescription = 'private-site-marker';
    let state = await json(`${path}/draft`, admin, 'PUT', { version: initial.version, content });
    assert.ok(!JSON.stringify(await json('public/site-content')).includes('private-site-marker'));
    assert.equal((await call(`${path}/draft`, admin, 'PUT', { version: initial.version, content })).status, 409);
    state = await command(path, admin, 'submit', state.version);
    assert.equal((await call(`${path}/draft`, admin, 'PUT', { version: state.version, content })).status, 409);
    state = await command(path, admin, 'publish', state.version);
    assert.ok(JSON.stringify(await json('public/site-content')).includes('private-site-marker'));
    state = await command(path, admin, 'restore', state.version, { revisionId: original.id });
    assert.deepEqual(state.workingRevision.content, original.content);
  });

  await t.test('homepage media remains private until publication and emergency revocation blocks origin reads', async () => {
    const { admin, editor } = await setup();
    const media = await upload({ siteContentId: 'home' }, admin);
    assert.equal((await call(`admin/media/${media.id}/file`, editor)).status, 403);
    const path = 'admin/site-content/home';
    let state = await json(path, admin);
    const content = readSiteLegacy().home;
    content.slides[0].image = `/api/v1/admin/media/${media.id}/file`;
    state = await json(`${path}/draft`, admin, 'PUT', { version: state.version, content });
    assert.equal((await call(`admin/media/${media.id}`, admin, 'DELETE')).status, 409);
    assert.equal((await call(`public/media/${media.id}`)).status, 404);
    state = await command(path, admin, 'submit', state.version);
    await command(path, admin, 'publish', state.version);
    assert.equal((await json('public/site-content')).home.slides[0].image, `/api/v1/public/media/${media.id}`);
    assert.equal((await call(`public/media/${media.id}`)).status, 200);
    assert.equal((await call(`admin/media/${media.id}/revoke`, editor, 'POST', { reason: '合成事件' })).status, 403);
    assert.ok((await call(`admin/media/${media.id}/revoke`, admin, 'POST', { reason: '合成事件' })).ok);
    assert.equal((await call(`public/media/${media.id}`)).status, 404);
    assert.equal((await call(`admin/media/${media.id}/file`, admin)).status, 200);
  });
});
