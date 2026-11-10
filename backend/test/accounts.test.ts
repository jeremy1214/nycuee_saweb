import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash } from 'argon2';
import { createApp } from '../src/app';
import { Database } from '../src/database';
import { digest } from '../src/account-utils';

const testUrl = process.env.ACCOUNT_TEST_DATABASE_URL;
const password = 'account-integration-password';
type Session = { Cookie: string; 'X-CSRF-Token': string };

test('account HTTP lifecycle with isolated PostgreSQL', {
  skip: !testUrl && 'Set ACCOUNT_TEST_DATABASE_URL to a migrated database named account_test.',
}, async t => {
  // Check before opening the app or allowing any cleanup writes.
  assert.equal(new URL(testUrl!).pathname, '/account_test');
  const saved = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: testUrl, NODE_ENV: 'test', COOKIE_SECURE: 'false', TRUST_PROXY: 'false',
    APP_ORIGIN: 'http://localhost', ANONYMOUS_SESSION_IP_LIMIT: '30', ANONYMOUS_SESSION_GLOBAL_LIMIT: '300',
  });
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  const app = await createApp().catch(error => { process.env = saved; throw error; });
  t.after(async () => {
    try { await clear(); } finally {
      try { await app.close(); } finally { process.env = saved; }
    }
  });
  const db = app.get(Database);
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api/v1/`;
  const call = (path: string, options?: RequestInit) => fetch(`${base}${path}`, { redirect: 'manual', ...options });
  const write = (path: string, body: unknown, session?: Session, method = 'POST') => call(path, {
    method, headers: { 'Content-Type': 'application/json', ...session }, body: JSON.stringify(body),
  });
  const cookieOf = (response: Response) => {
    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie);
    return cookie.split(';')[0];
  };
  async function csrf(cookie?: string): Promise<Session> {
    const response = await call('auth/csrf', cookie ? { headers: { Cookie: cookie } } : undefined);
    assert.equal(response.status, 200);
    return { Cookie: cookie ?? cookieOf(response), 'X-CSRF-Token': (await response.json()).csrfToken };
  }
  async function login(username: string, value = password): Promise<Session> {
    const anonymous = await csrf();
    const response = await write('auth/login', { username, password: value }, anonymous);
    assert.equal(response.status, 200);
    assert.notEqual(cookieOf(response), anonymous.Cookie);
    assert.equal((await call('auth/me', { headers: anonymous })).status, 401);
    return csrf(cookieOf(response));
  }
  const read = (path: string, session: Session) => call(path, { headers: session });
  const tokenOf = (url: string) => {
    const token = new URLSearchParams(new URL(url).hash.split('?')[1]).get('token');
    assert.match(token!, /^[a-f0-9]{64}$/);
    return token!;
  };
  async function clear() {
    await db.googleAuthFlow.deleteMany();
    await db.session.deleteMany();
    await db.loginAttempt.deleteMany();
    await db.passwordToken.deleteMany();
    await db.auditEntry.deleteMany();
    await db.user.deleteMany();
  }
  // This suite never imports content or uploads files; cleanup touches account data only.
  const passwordHash = await hash(password);
  async function setup() {
    await clear();
    const admin = await db.user.create({ data: { username: 'account-admin', passwordHash, role: 'ADMIN' } });
    return { admin, session: await login(admin.username) };
  }
  async function create(session: Session, username = 'new-editor') {
    const response = await write('admin/users', { username, role: 'EDITOR' }, session);
    assert.equal(response.status, 201);
    return response.json();
  }

  await t.test('anonymous, CSRF and editor restrictions protect account, audit and inbox routes', async () => {
    const { session } = await setup();
    for (const path of ['admin/users', 'admin/audit-entries', 'admin/contact-messages']) {
      assert.equal((await call(path)).status, 401);
    }
    assert.equal((await write('admin/users', { username: 'forbidden', role: 'ADMIN' },
      { ...session, 'X-CSRF-Token': '0'.repeat(64) })).status, 403);
    assert.equal(await db.user.count({ where: { username: 'forbidden' } }), 0);
    await db.user.create({ data: { username: 'account-editor', passwordHash, role: 'EDITOR' } });
    const editor = await login('account-editor');
    for (const path of ['admin/users', 'admin/audit-entries', 'admin/contact-messages']) {
      assert.equal((await read(path, editor)).status, 403);
    }
    assert.equal((await write('admin/users', { username: 'elevated', role: 'ADMIN' }, editor)).status, 403);
  });

  await t.test('activation stores only a digest, permits editor login and consumes the ticket once', async () => {
    const { session } = await setup();
    const created = await create(session);
    assert.equal(created.user.hasPassword, false);
    assert.equal(created.user.role, 'EDITOR');
    const token = tokenOf(created.activation.url);
    const ticket = await db.passwordToken.findUniqueOrThrow({ where: { tokenHash: digest(token) } });
    assert.equal(ticket.userId, created.user.id);
    assert.equal(ticket.purpose, 'ACTIVATE');
    assert.notEqual(ticket.tokenHash, token);
    const anonymous = await csrf();
    assert.equal((await write('auth/password/consume', { token, password }, anonymous)).status, 200);
    assert.equal((await write('auth/password/consume', { token, password }, anonymous)).status, 400);
    const editor = await login(created.user.username);
    assert.equal((await read('auth/me', editor)).status, 200);
    const users = await (await read('admin/users', session)).json();
    const dto = users.items.find((user: { id: string }) => user.id === created.user.id);
    assert.equal(dto.hasPassword, true);
    assert.equal('passwordHash' in dto, false);
    const audit = JSON.stringify(await (await read('admin/audit-entries', session)).json());
    for (const sensitive of [password, token, ticket.tokenHash, created.activation.url, editor.Cookie.split('=')[1]]) {
      assert.ok(!audit.includes(sensitive));
    }
    assert.ok(audit.includes('account.created'));
    assert.ok(audit.includes('account.password-set'));
  });

  await t.test('reissued and expired activation tickets cannot set a password', async () => {
    const { session } = await setup();
    const created = await create(session);
    const old = tokenOf(created.activation.url);
    const issued = await write(`admin/users/${created.user.id}/password-token`, {
      version: created.user.version, purpose: 'ACTIVATE',
    }, session);
    assert.equal(issued.status, 200);
    const current = tokenOf((await issued.json()).url);
    const anonymous = await csrf();
    assert.equal((await write('auth/password/consume', { token: old, password }, anonymous)).status, 400);
    await db.passwordToken.update({ where: { tokenHash: digest(current) }, data: { expiresAt: new Date(0) } });
    assert.equal((await write('auth/password/consume', { token: current, password }, anonymous)).status, 400);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: created.user.id } })).passwordHash, null);
  });

  await t.test('account version conflicts preserve the previous update and reject duplicate usernames', async () => {
    const { session } = await setup();
    const { user } = await create(session);
    assert.equal((await write('admin/users', { username: user.username, role: 'ADMIN' }, session)).status, 409);
    const changed = await write(`admin/users/${user.id}`, { version: user.version, role: 'ADMIN' }, session, 'PATCH');
    assert.equal(changed.status, 200);
    assert.equal((await changed.json()).version, user.version + 1);
    assert.equal((await write(`admin/users/${user.id}`, { version: user.version, enabled: false }, session, 'PATCH')).status, 409);
    const actual = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(actual.enabled, true);
    assert.equal(actual.role, 'ADMIN');
  });

  await t.test('pending administrators cannot bypass last-administrator protection', async () => {
    const { admin, session } = await setup();
    assert.equal((await write('admin/users', { username: 'pending-admin', role: 'ADMIN' }, session)).status, 201);
    for (const change of [{ enabled: false }, { role: 'EDITOR' }]) {
      assert.equal((await write(`admin/users/${admin.id}`, { version: admin.version, ...change }, session, 'PATCH')).status, 409);
    }
    assert.equal((await read('admin/users', session)).status, 200);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: admin.id } })).version, admin.version);
  });

  await t.test('role changes apply to existing sessions and disabling revokes sessions and tickets', async () => {
    const { session } = await setup();
    const other = await db.user.create({ data: { username: 'second-admin', passwordHash, role: 'ADMIN' } });
    const otherSession = await login(other.username);
    const issued = await write(`admin/users/${other.id}/password-token`, { version: other.version, purpose: 'RESET' }, session);
    assert.equal(issued.status, 200);
    const token = tokenOf((await issued.json()).url);
    const demoted = await write(`admin/users/${other.id}`, { version: other.version, role: 'EDITOR' }, session, 'PATCH');
    assert.equal(demoted.status, 200);
    assert.equal((await read('admin/users', otherSession)).status, 403);
    assert.equal((await (await read('auth/me', otherSession)).json()).user.role, 'EDITOR');
    const version = (await demoted.json()).version;
    assert.equal((await write(`admin/users/${other.id}`, { version, enabled: false }, session, 'PATCH')).status, 200);
    assert.equal((await read('auth/me', otherSession)).status, 401);
    assert.equal(await db.session.count({ where: { userId: other.id } }), 0);
    assert.ok((await db.passwordToken.findUniqueOrThrow({ where: { tokenHash: digest(token) } })).usedAt);
    assert.equal((await write('auth/password/consume', { token, password }, await csrf())).status, 400);
  });

  await t.test('password reset revokes every device, rejects replay and allows only the new password', async () => {
    const { session } = await setup();
    const user = await db.user.create({ data: { username: 'reset-editor', passwordHash, role: 'EDITOR' } });
    const devices = [await login(user.username), await login(user.username)];
    const response = await write(`admin/users/${user.id}/password-token`, { version: user.version, purpose: 'RESET' }, session);
    assert.equal(response.status, 200);
    const token = tokenOf((await response.json()).url);
    const anonymous = await csrf();
    const nextPassword = 'reset-account-password';
    assert.equal((await write('auth/password/consume', { token, password: nextPassword }, anonymous)).status, 200);
    for (const device of devices) assert.equal((await read('auth/me', device)).status, 401);
    assert.equal((await write('auth/password/consume', { token, password: nextPassword }, anonymous)).status, 400);
    assert.equal((await write('auth/login', { username: user.username, password }, anonymous)).status, 401);
    assert.equal((await read('auth/me', await login(user.username, nextPassword))).status, 200);
  });

  await t.test('Google callbacks reject cross-session, expired and replayed states before provider exchange', async () => {
    await setup();
    assert.equal((await call('auth/google/start')).status, 400);
    process.env.GOOGLE_CLIENT_ID = 'isolated-account-client';
    process.env.GOOGLE_CLIENT_SECRET = 'isolated-account-secret';
    try {
      const initiating = await csrf();
      const stranger = await csrf();
      const start = await read('auth/google/start', initiating);
      assert.equal(start.status, 302);
      const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
      const callback = `auth/google/callback?state=${state}&error=access_denied`;
      assert.equal((await read(callback, stranger)).status, 400);
      assert.ok(await db.googleAuthFlow.findUnique({ where: { stateHash: digest(state) } }));
      assert.equal((await read(callback, initiating)).status, 400);
      assert.equal(await db.googleAuthFlow.findUnique({ where: { stateHash: digest(state) } }), null);
      assert.equal((await read(callback, initiating)).status, 400);
      const again = await read('auth/google/start', initiating);
      assert.equal(again.status, 302);
      const expiredState = new URL(again.headers.get('location')!).searchParams.get('state')!;
      await db.googleAuthFlow.update({ where: { stateHash: digest(expiredState) }, data: { expiresAt: new Date(0) } });
      assert.equal((await read(`auth/google/callback?state=${expiredState}&error=access_denied`, initiating)).status, 400);
      assert.equal(await db.googleIdentity.count(), 0);
    } finally {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
    }
  });
});
