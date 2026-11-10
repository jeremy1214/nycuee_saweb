import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
