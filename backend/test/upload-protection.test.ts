import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutionContext } from '@nestjs/common';
import { of, Subject } from 'rxjs';
import type { Database } from '../src/database';
import { UploadProtection } from '../src/upload-protection';

test('upload admission limits reject overload and release slots after errors', async t => {
  const saved = { ...process.env };
  const root = await mkdtemp(join(tmpdir(), 'nycuee-upload-limits-'));
  t.after(async () => { process.env = saved; await rm(root, { recursive: true, force: true }); });
  Object.assign(process.env, { MEDIA_ROOT: root, MEDIA_UPLOAD_CONCURRENCY: '1', MEDIA_UPLOADS_PER_MINUTE: '2', MEDIA_MIN_FREE_BYTES: '1' });
  const headers = new Map<string, string>();
  const context = { switchToHttp: () => ({
    getRequest: () => ({ authUser: { id: 'upload-test' } }),
    getResponse: () => ({ setHeader: (key: string, value: string) => headers.set(key, value) }),
  }) } as unknown as ExecutionContext;
  let count = 0;
  const db = { loginAttempt: { upsert: async () => ({ count: ++count }) } } as unknown as Database;
  const next = { handle: () => of('done') };

  await t.test('concurrency rejects before buffering and completion releases its slot', async () => {
    count = 0;
    const guard = new UploadProtection(db);
    const pending = new Subject<string>();
    const admitted = await guard.intercept(context, { handle: () => pending });
    const subscription = admitted.subscribe();
    await assert.rejects(guard.intercept(context, next), { status: 429 });
    assert.equal(count, 1);
    assert.equal(headers.get('Retry-After'), '5');
    pending.complete();
    subscription.unsubscribe();
    (await guard.intercept(context, next)).subscribe();
    assert.equal(count, 2);
  });

  await t.test('frequency rejection has retry information and does not leak a concurrency slot', async () => {
    count = 0;
    const guard = new UploadProtection(db);
    for (let i = 0; i < 2; i++) (await guard.intercept(context, next)).subscribe();
    await assert.rejects(guard.intercept(context, next), { status: 429 });
    assert.ok(Number(headers.get('Retry-After')) >= 1);
    count = 0;
    (await guard.intercept(context, next)).subscribe();
    assert.equal(count, 1);
  });

  await t.test('low disk reserve rejects before image handling', async () => {
    count = 0;
    process.env.MEDIA_MIN_FREE_BYTES = String(Number.MAX_SAFE_INTEGER);
    const guard = new UploadProtection(db);
    let handled = false;
    await assert.rejects(guard.intercept(context, { handle: () => { handled = true; return of('unexpected'); } }), { status: 503 });
    assert.equal(handled, false);
    process.env.MEDIA_MIN_FREE_BYTES = '1';
  });

  await t.test('invalid limits fail at startup', () => {
    for (const value of ['0', '-1', '1.5', 'invalid']) {
      process.env.MEDIA_UPLOAD_CONCURRENCY = value;
      assert.throws(() => new UploadProtection(db), /positive safe integer/);
    }
    process.env.MEDIA_UPLOAD_CONCURRENCY = '1';
  });
});
