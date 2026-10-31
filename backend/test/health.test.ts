import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app';
import { Database } from '../src/database';

test('anonymous health HTTP endpoint reports database readiness', async t => {
  process.env.NODE_ENV = 'test';
  t.mock.method(Database.prototype, 'onModuleInit', async () => {});
  const app = await createApp();
  t.after(() => app.close());
  const db = app.get(Database);
  const query = t.mock.fn(async (..._args: unknown[]): Promise<unknown> => [{ '?column?': 1 }]);
  db.$queryRaw = query as typeof db.$queryRaw;
  await app.listen(0, '127.0.0.1');
  const url = `${await app.getUrl()}/api/v1/health`;

  async function check(code: number, status: string) {
    const response = await fetch(url);
    assert.equal(response.status, code);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(await response.json(), { status });
  }

  await t.test('healthy without credentials or activity content', async () => {
    await check(200, 'ok');
    assert.deepEqual(Array.from(query.mock.calls[0].arguments[0]), ['SELECT 1']);
  });
  await t.test('database failure returns only unavailable status', async () => {
    query.mock.mockImplementation(async () => { throw new Error('private database credentials'); });
    await check(503, 'unavailable');
  });
  await t.test('a stalled query returns within the deadline and can recover', async () => {
    query.mock.mockImplementation(() => new Promise(() => {}));
    const started = performance.now();
    await check(503, 'unavailable');
    const elapsed = performance.now() - started;
    assert.ok(elapsed >= 2900 && elapsed < 4500, `Response took ${elapsed}ms`);
    query.mock.mockImplementation(async () => [{ '?column?': 1 }]);
    await check(200, 'ok');
  });
});
