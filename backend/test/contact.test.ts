import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash } from 'argon2';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { ContactService } from '../src/contact';

const testUrl = process.env.TEST_DATABASE_URL;
const valid = { name: '王小明', email: 'student@example.com', category: 'website', subject: '網站內容問題', message: '我想詢問網站上的學習資料如何更新。' };

test('contact HTTP API with PostgreSQL', { skip: !testUrl && 'Set TEST_DATABASE_URL to a dedicated database named contact_test.' }, async (t) => {
  assert.equal(new URL(testUrl!).pathname, '/contact_test', 'Tests must use an isolated contact_test database.');
  process.env.DATABASE_URL = testUrl;
  process.env.TRUST_PROXY = 'false';
  process.env.COOKIE_SECURE = 'false';
  process.env.NODE_ENV = 'test';
  let app = await createApp();
  await app.listen(0, '127.0.0.1');
  let base = await app.getUrl();
  let db = app.get(Database);
  t.after(async () => {
    await db.contactMessage.deleteMany();
    await db.contactSubmissionAttempt.deleteMany();
    await db.loginAttempt.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
    await app.close();
  });
  await db.contactMessage.deleteMany();
  await db.contactSubmissionAttempt.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.loginAttempt.deleteMany();
  const user = await db.user.create({ data: { username: 'inbox-test', passwordHash: await hash('test-password'), role: 'ADMIN' } });
  const call = (path: string, options?: RequestInit) => fetch(`${base}/api/v1/${path}`, options);
  const post = (body: unknown) => call('public/contact-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function resetMessages() {
    await db.contactMessage.deleteMany();
    await db.contactSubmissionAttempt.deleteMany();
  }

  const anonymous = await call('auth/csrf');
  const anonymousCookie = anonymous.headers.get('set-cookie')!.split(';')[0];
  const { csrfToken: loginCsrf } = await anonymous.json();
  const login = await call('auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: anonymousCookie, 'X-CSRF-Token': loginCsrf }, body: JSON.stringify({ username: user.username, password: 'test-password' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const { csrfToken } = await (await call('auth/csrf', { headers: { Cookie: cookie } })).json();
  const adminHeaders = { Cookie: cookie, 'X-CSRF-Token': csrfToken };

  await t.test('stores full Chinese text, ignores client timestamps, and persists across API restart', async () => {
    await resetMessages();
    // Escaped Unicode deliberately exceeds the former 8 KB request limit.
    const body = JSON.stringify({ ...valid, message: '中'.repeat(2000), subject: '主'.repeat(120), submittedAt: '2000-01-01T00:00:00Z', readAt: '2000-01-01T00:00:00Z' })
      .replace(/[\u0080-\uFFFF]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
    assert.ok(Buffer.byteLength(body) > 8192);
    const response = await call('public/contact-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true });
    const saved = await db.contactMessage.findFirstOrThrow();
    assert.equal(saved.message.length, 2000);
    assert.equal(saved.readAt, null);
    assert.ok(saved.createdAt.getTime() > Date.now() - 60000);
    await app.close();
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    db = app.get(Database);
    const detail = await call(`admin/contact-messages/${saved.id}`, { headers: adminHeaders });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).message, '中'.repeat(2000));
  });

  await t.test('rejects invalid fields without saving', async () => {
    for (const input of [null, [], {}, { ...valid, name: ' ' }, { ...valid, name: '名'.repeat(61) }, { ...valid, email: 'bad' }, { ...valid, email: `${'a'.repeat(110)}@example.com` }, { ...valid, category: 'invalid' }, { ...valid, subject: '主'.repeat(121) }, { ...valid, message: '太短' }, { ...valid, message: '中'.repeat(2001) }]) {
      await resetMessages();
      assert.equal((await post(input)).status, 400);
      assert.equal(await db.contactMessage.count(), 0);
    }
  });

  await t.test('silently drops honeypot submissions', async () => {
    await resetMessages();
    assert.equal((await post({ ...valid, website: 'https://spam.example' })).status, 201);
    assert.equal(await db.contactMessage.count(), 0);
  });

  await t.test('atomically limits concurrent requests, persists limits, and cleans up expired counters', async () => {
    await resetMessages();
    const statuses = await Promise.all(Array.from({ length: 8 }, async () => (await post(valid)).status));
    assert.equal(statuses.filter((status) => status === 201).length, 5);
    assert.equal(statuses.filter((status) => status === 429).length, 3);
    assert.equal(await db.contactMessage.count(), 5);
    const counter = await db.contactSubmissionAttempt.findFirstOrThrow();
    assert.match(counter.key, /^[a-f0-9]{64}$/);
    const rateLimit = await post(valid);
    assert.equal(rateLimit.status, 429);
    assert.ok(Number(rateLimit.headers.get('retry-after')) > 0);
    await app.close();
    app = await createApp(); await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database);
    assert.equal((await post(valid)).status, 429);
    await db.contactSubmissionAttempt.create({ data: { key: 'expired-test', expiresAt: new Date(0) } });
    await app.get(ContactService).cleanup();
    assert.equal(await db.contactSubmissionAttempt.count(), 1);
  });

  await t.test('uses fixed ten-minute windows and counts invalid submissions', async (context) => {
    await resetMessages();
    const end = (Math.floor(Date.now() / 600000) + 1) * 600000;
    let now = end - 1;
    const clock = context.mock.method(Date, 'now', () => now);
    try {
      for (let index = 0; index < 5; index++) assert.equal((await post({ ...valid, message: '短' })).status, 400);
      const spoof = await call('public/contact-messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.123' }, body: JSON.stringify(valid) });
      assert.equal(spoof.status, 429);
      now = end + 1;
      assert.equal((await post(valid)).status, 201);
      assert.equal(await db.contactMessage.count(), 1);
    } finally { clock.mock.restore(); }
  });

  await t.test('lists newest first, paginates, filters unread and returns a global unread count', async () => {
    await resetMessages();
    await db.contactMessage.createMany({ data: Array.from({ length: 25 }, (_, index) => ({ ...valid, category: 'website' as const, id: `message-${String(index).padStart(2, '0')}`, createdAt: new Date(1700000000000 + index * 1000), readAt: index < 3 ? new Date() : null })) });
    const listing = await call('admin/contact-messages?page=1&read=all', { headers: adminHeaders });
    assert.equal(listing.status, 200);
    assert.equal(listing.headers.get('cache-control'), 'no-store');
    const first = await listing.json();
    assert.equal(first.total, 25); assert.equal(first.unreadCount, 22); assert.equal(first.items.length, 20);
    assert.equal(first.items[0].id, 'message-24'); assert.equal(first.items[0].message, undefined);
    const second = await (await call('admin/contact-messages?page=2&read=all', { headers: adminHeaders })).json();
    assert.equal(second.items.length, 5); assert.equal(second.items[0].id, 'message-04');
    const unread = await (await call('admin/contact-messages?page=2&read=unread', { headers: adminHeaders })).json();
    assert.equal(unread.total, 22); assert.equal(unread.unreadCount, 22); assert.equal(unread.items.length, 2);
    for (const query of ['page=0', 'page=1.5', 'page=999999999999', 'read=invalid', 'page=1&page=2']) {
      assert.equal((await call(`admin/contact-messages?${query}`, { headers: adminHeaders })).status, 400);
    }
  });

  await t.test('requires admin sessions and CSRF, preserves first read time under concurrent updates', async () => {
    const id = 'message-24';
    for (const path of ['admin/contact-messages', `admin/contact-messages/${id}`]) assert.equal((await call(path)).status, 401);
    assert.equal((await call(`admin/contact-messages/${id}/read`, { method: 'PATCH' })).status, 401);
    assert.equal((await call(`admin/contact-messages/${id}/read`, { method: 'PATCH', headers: { Cookie: cookie } })).status, 403);
    assert.equal((await db.contactMessage.findUniqueOrThrow({ where: { id } })).readAt, null);
    await db.user.update({ where: { id: user.id }, data: { role: 'EDITOR' } });
    assert.equal((await call('admin/contact-messages', { headers: adminHeaders })).status, 403);
    await db.user.update({ where: { id: user.id }, data: { role: 'ADMIN', enabled: false } });
    assert.equal((await call('admin/contact-messages', { headers: adminHeaders })).status, 401);
    await db.user.update({ where: { id: user.id }, data: { enabled: true } });
    const read = await call(`admin/contact-messages/${id}/read`, { method: 'PATCH', headers: adminHeaders });
    assert.equal(read.status, 200);
    const first = await read.json();
    assert.ok(first.readAt);
    const repeats = await Promise.all(Array.from({ length: 3 }, async () => (await call(`admin/contact-messages/${id}/read`, { method: 'PATCH', headers: adminHeaders })).json()));
    assert.ok(repeats.every((message) => message.readAt === first.readAt));
    assert.equal((await call('admin/contact-messages/missing', { headers: adminHeaders })).status, 404);
    assert.equal((await call('admin/contact-messages/missing/read', { method: 'PATCH', headers: adminHeaders })).status, 404);
    const list = await (await call('admin/contact-messages?read=unread', { headers: adminHeaders })).json();
    assert.equal(list.unreadCount, 21);
    assert.ok(list.items.every((message: { id: string }) => message.id !== id));
  });

  await t.test('database failure returns an error instead of acknowledging success', async () => {
    await resetMessages();
    const original = db.contactMessage.create;
    db.contactMessage.create = async () => { throw new Error('Simulated storage failure'); };
    try {
      assert.equal((await post(valid)).status, 500);
      assert.equal(await db.contactMessage.count(), 0);
    } finally { db.contactMessage.create = original; }
  });
});
