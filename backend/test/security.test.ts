import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { hash } from 'argon2';
import type { Request, Response } from 'express';
import { createApp } from '../src/app';
import { AuthService } from '../src/auth';
import { Database } from '../src/database';
import { appOrigin, digest } from '../src/account-utils';
import { anonymousSessionLimits } from '../src/security-config';

test('security configuration rejects unsafe values without exposing input', async t => {
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  process.env.NODE_ENV = 'production';
  for (const origin of [undefined, '', 'http://example.test', 'private-secret', 'https://user:private-secret@example.test', 'https://example.test/path']) {
    if (origin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = origin;
    assert.throws(appOrigin, error => error instanceof Error
      && error.message.includes('APP_ORIGIN') && !error.message.includes('private-secret'));
  }
  process.env.APP_ORIGIN = 'https://example.test';
  assert.equal(appOrigin(), 'https://example.test');
  process.env.COOKIE_SECURE = 'false';
  await assert.rejects(createApp, /COOKIE_SECURE/);
  delete process.env.ANONYMOUS_SESSION_IP_LIMIT;
  delete process.env.ANONYMOUS_SESSION_GLOBAL_LIMIT;
  assert.deepEqual(anonymousSessionLimits(), { perIp: 30, global: 300 });
  for (const value of ['', '0', '-1', '1.5', 'NaN', 'Infinity', '9007199254740992']) {
    process.env.ANONYMOUS_SESSION_IP_LIMIT = value;
    assert.throws(anonymousSessionLimits, /positive safe integer/);
  }
  process.env.ANONYMOUS_SESSION_IP_LIMIT = '31';
  process.env.ANONYMOUS_SESSION_GLOBAL_LIMIT = '30';
  assert.throws(anonymousSessionLimits, /at least/);
  process.env.COOKIE_SECURE = 'true';
  await assert.rejects(createApp, /at least/);
});

const testUrl = process.env.SECURITY_TEST_DATABASE_URL;
test('security regressions with isolated PostgreSQL', { skip: !testUrl && 'Set SECURITY_TEST_DATABASE_URL to security_test.' }, async t => {
  assert.equal(new URL(testUrl!).pathname, '/security_test');
  const saved = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: testUrl, NODE_ENV: 'test', COOKIE_SECURE: 'false', TRUST_PROXY: 'false',
    APP_ORIGIN: 'http://localhost', ANONYMOUS_SESSION_IP_LIMIT: '30', ANONYMOUS_SESSION_GLOBAL_LIMIT: '300',
  });
  let app = await createApp();
  await app.listen(0, '127.0.0.1');
  let db = app.get(Database);
  let auth = app.get(AuthService);
  let base = await app.getUrl();
  async function reset() {
    await db.googleAuthFlow.deleteMany();
    await db.session.deleteMany();
    await db.loginAttempt.deleteMany();
    await db.passwordToken.deleteMany();
    await db.auditEntry.deleteMany();
    await db.user.deleteMany();
  }
  t.after(async () => { await reset(); await app.close(); process.env = saved; });
  const call = (path: string, init?: RequestInit) => fetch(`${base}/api/v1/${path}`, init);
  const jsonPost = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  const cookieOf = (res: globalThis.Response) => res.headers.get('set-cookie')!.split(';')[0];
  function responseStub() {
    const headers = new Map<string, string>();
    let cookies = 0;
    return {
      headers, get cookies() { return cookies; },
      res: { setHeader: (key: string, value: string) => headers.set(key, value), cookie: () => { cookies++; } } as unknown as Response,
    };
  }
  const request = (ip: string, cookies: Record<string, string> = {}) =>
    ({ ip, cookies, socket: { remoteAddress: ip } }) as Request;
  // Fix the rate-limit clock so assertions never straddle a real minute boundary.
  const fixedNow = Math.floor(Date.now() / 60000) * 60000 + 1000;
  const clock = t.mock.method(Date, 'now', () => fixedNow);

  await t.test('31st new session is rejected, valid sessions bypass exhausted budgets, forged forwarding headers do not help', async () => {
    await reset();
    const first = await call('auth/csrf');
    assert.equal(first.status, 200);
    const cookie = cookieOf(first);
    const token = await first.json();
    for (let i = 1; i < 30; i++) assert.equal((await call('auth/csrf')).status, 200);
    const rejected = await call('auth/csrf', { headers: { 'X-Forwarded-For': '203.0.113.200' } });
    assert.equal(rejected.status, 429);
    assert.equal(rejected.headers.get('set-cookie'), null);
    assert.match(rejected.headers.get('retry-after')!, /^[1-9]\d*$/);
    assert.equal((await rejected.json()).message, '登入頁面請求過多，請稍後再試。');
    assert.equal(await db.session.count(), 30);
    assert.deepEqual(await (await call('auth/csrf', { headers: { Cookie: cookie } })).json(), token);
    assert.equal(await db.session.count(), 30);
    await app.close();
    app = await createApp();
    await app.listen(0, '127.0.0.1');
    db = app.get(Database); auth = app.get(AuthService); base = await app.getUrl();
    assert.equal((await call('auth/csrf')).status, 429);
    clock.mock.mockImplementation(() => fixedNow + 60000);
    assert.equal((await call('auth/csrf')).status, 200);
    clock.mock.mockImplementation(() => fixedNow);
  });

  await t.test('global budget rejects request 301 across different IPs', async () => {
    await reset();
    for (let i = 0; i < 300; i++) {
      await auth.csrf(request(`203.0.113.${i % 20}`), responseStub().res);
    }
    const rejected = responseStub();
    await assert.rejects(auth.csrf(request('198.51.100.1'), rejected.res), { status: 429 });
    assert.equal(rejected.cookies, 0);
    assert.equal(await db.session.count(), 300);
    assert.equal(await db.loginAttempt.count(), 22);
  });

  await t.test('concurrent issuance across service instances never exceeds the IP budget', async () => {
    await reset();
    const second = new AuthService(db);
    const results = await Promise.allSettled(Array.from({ length: 60 }, (_, i) =>
      (i % 2 ? auth : second).csrf(request('192.0.2.1'), responseStub().res)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 30);
    for (const result of results) if (result.status === 'rejected') assert.equal(result.reason.status, 429);
    assert.equal(await db.session.count(), 30);
  });

  await t.test('invalid and expired cookies use budget; cleanup removes expired counters', async () => {
    await reset();
    const expired = 'a'.repeat(64);
    await db.session.create({ data: { id: digest(expired), csrfHash: 'expired', expiresAt: new Date(fixedNow - 60000) } });
    await auth.csrf(request('192.0.2.2', { nycuee_session: expired }), responseStub().res);
    await auth.csrf(request('192.0.2.2', { nycuee_session: 'invalid' }), responseStub().res);
    const counters = await db.loginAttempt.findMany();
    assert.ok(counters.every(counter => counter.count === 2));
    await db.loginAttempt.updateMany({ data: { expiresAt: new Date(fixedNow - 60000) } });
    await auth.cleanup();
    assert.equal(await db.loginAttempt.count(), 0);
    assert.equal(await db.session.count(), 2);
  });

  await t.test('database failures cannot issue sessions or cookies', async () => {
    await reset();
    const stub = responseStub();
    const failing = new AuthService({ loginAttempt: { upsert: async () => { throw new Error('unavailable'); } } } as unknown as Database);
    await assert.rejects(failing.csrf(request('192.0.2.3'), stub.res), /unavailable/);
    assert.equal(stub.cookies, 0);
    assert.equal(await db.session.count(), 0);
  });

  await t.test('login, CSRF, password rotation, logout and API headers remain functional', async () => {
    await reset();
    await db.user.create({ data: { username: 'security-admin', role: 'ADMIN', passwordHash: await hash('initial-security-password') } });
    const anonymous = await call('auth/csrf');
    const anonymousCookie = cookieOf(anonymous);
    const { csrfToken } = await anonymous.json();
    assert.equal((await call('auth/login', jsonPost({ username: 'security-admin', password: 'initial-security-password' }))).status, 403);
    const login = await call('auth/login', jsonPost({ username: 'security-admin', password: 'initial-security-password' },
      { Cookie: anonymousCookie, 'X-CSRF-Token': csrfToken }));
    assert.equal(login.status, 200);
    const cookie = cookieOf(login);
    const csrf = await call('auth/csrf', { headers: { Cookie: cookie } });
    const token = (await csrf.json()).csrfToken;
    assert.equal((await call('auth/password/change', jsonPost({ currentPassword: 'initial-security-password', password: 'rotated-security-password' },
      { Cookie: cookie, 'X-CSRF-Token': token }))).status, 200);
    assert.equal((await call('auth/me', { headers: { Cookie: cookie } })).status, 401);
    const next = await call('auth/csrf');
    const nextToken = (await next.json()).csrfToken;
    const nextLogin = await call('auth/login', jsonPost({ username: 'security-admin', password: 'rotated-security-password' },
      { Cookie: cookieOf(next), 'X-CSRF-Token': nextToken }));
    assert.equal(nextLogin.status, 200);
    const nextCookie = cookieOf(nextLogin);
    const logoutCsrf = (await (await call('auth/csrf', { headers: { Cookie: nextCookie } })).json()).csrfToken;
    assert.equal((await call('auth/logout', jsonPost({}, { Cookie: nextCookie, 'X-CSRF-Token': logoutCsrf }))).status, 200);
    const response = await call('auth/me', { headers: { Cookie: nextCookie } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('strict-transport-security'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  await t.test('Google start cannot bypass anonymous-session budget', async () => {
    await reset();
    process.env.GOOGLE_CLIENT_ID = 'isolated-test-client';
    process.env.GOOGLE_CLIENT_SECRET = 'isolated-test-secret';
    for (let i = 0; i < 30; i++) await call('auth/csrf');
    const denied = await call('auth/google/start', { redirect: 'manual' });
    assert.equal(denied.status, 429);
    assert.equal(denied.headers.get('set-cookie'), null);
    assert.equal(await db.googleAuthFlow.count(), 0);
    await db.loginAttempt.deleteMany();
    const allowed = await call('auth/google/start', { redirect: 'manual' });
    assert.equal(allowed.status, 302);
    assert.ok(allowed.headers.get('location')!.startsWith('https://accounts.google.com/'));
    assert.equal(await db.googleAuthFlow.count(), 1);
  });

  await t.test('production seed blocks enabled default-password admins and preserves safe accounts', async () => {
    await reset();
    const seed = (password?: string) => spawnSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
      cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', ADMIN_INITIAL_PASSWORD: password ?? '' },
      encoding: 'utf8',
    });
    assert.notEqual(seed('short').status, 0);
    assert.equal(await db.user.count(), 0);
    assert.equal(seed('initial-security-password').status, 0);
    const before = await db.user.findUniqueOrThrow({ where: { username: 'admin' } });
    assert.equal(seed().status, 0);
    assert.equal((await db.user.findUniqueOrThrow({ where: { username: 'admin' } })).passwordHash, before.passwordHash);
    const weak = await db.user.create({ data: { username: 'other-admin', role: 'ADMIN', passwordHash: await hash('admin') } });
    const rejected = seed();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Rotate the development default password/);
    await db.user.update({ where: { id: weak.id }, data: { enabled: false } });
    assert.equal(seed().status, 0);
    await db.user.update({ where: { id: weak.id }, data: { enabled: true, role: 'EDITOR' } });
    assert.equal(seed().status, 0);
  });
});

