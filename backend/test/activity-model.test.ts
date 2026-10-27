import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';

const url = process.env.CMS_TEST_DATABASE_URL;

test('CMS migration preserves auth/contact data and isolates public and working revisions', {
  skip: !url && 'Set CMS_TEST_DATABASE_URL to a disposable database named cms_test; this test resets its public schema.',
}, async t => {
  assert.equal(new URL(url!).pathname, '/cms_test', 'Only a disposable cms_test database may be reset.');
  const db = new PrismaClient({ datasourceUrl: url });
  const temporary = mkdtempSync(join(tmpdir(), 'nycuee-cms-migration-'));
  t.after(async () => { await db.$disconnect(); rmSync(temporary, { recursive: true, force: true }); });
  await db.$executeRawUnsafe('DROP SCHEMA public CASCADE');
  await db.$executeRawUnsafe('CREATE SCHEMA public');

  // Deploy the original schema first, then upgrade it with existing data in place.
  copyFileSync(resolve('prisma/schema.prisma'), join(temporary, 'schema.prisma'));
  mkdirSync(join(temporary, 'migrations'));
  copyFileSync(resolve('prisma/migrations/migration_lock.toml'), join(temporary, 'migrations/migration_lock.toml'));
  for (const name of ['202610200001_auth', '202610250001_contact_messages']) {
    cpSync(resolve('prisma/migrations', name), join(temporary, 'migrations', name), { recursive: true });
  }
  const migrate = (schema: string) => execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', schema], {
    env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe',
  });
  migrate(join(temporary, 'schema.prisma'));
  await db.user.create({ data: { id: 'preserved-user', username: 'preserved', passwordHash: 'preserved-hash', role: 'ADMIN' } });
  await db.session.create({ data: { id: 'preserved-session', csrfHash: 'preserved-csrf', userId: 'preserved-user', expiresAt: new Date('2030-01-01') } });
  await db.loginAttempt.create({ data: { key: 'preserved-login', count: 3, expiresAt: new Date('2030-01-01') } });
  await db.contactMessage.create({ data: { id: 'preserved-message', name: '測試', email: 'test@example.com', category: 'website', subject: '保留', message: '升級前已存在的聯絡訊息。' } });
  await db.contactSubmissionAttempt.create({ data: { key: 'preserved-contact', count: 2, expiresAt: new Date('2030-01-01') } });
  migrate(resolve('prisma/schema.prisma'));
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: 'preserved-user' } })).passwordHash, 'preserved-hash');
  assert.equal((await db.session.findUniqueOrThrow({ where: { id: 'preserved-session' } })).csrfHash, 'preserved-csrf');
  assert.equal((await db.contactMessage.findUniqueOrThrow({ where: { id: 'preserved-message' } })).message, '升級前已存在的聯絡訊息。');
  assert.equal((await db.loginAttempt.findUniqueOrThrow({ where: { key: 'preserved-login' } })).count, 3);
  assert.equal((await db.contactSubmissionAttempt.findUniqueOrThrow({ where: { key: 'preserved-contact' } })).count, 2);
  // Reapplying committed migrations must be a no-op.
  migrate(resolve('prisma/schema.prisma'));

  await db.activityCategory.createMany({ data: [
    { id: 'camp', label: '營隊', shortLabel: 'CAMP' }, { id: 'other', label: '其他', shortLabel: 'OTHER' },
  ] });
  await db.activity.createMany({ data: [{ id: 'stable-slug' }, { id: 'another' }] });
  const published = await db.activityRevision.create({ data: {
    activityId: 'stable-slug', number: 1, status: 'PUBLISHED', title: '公開標題', categoryId: 'camp',
    date: new Date('2027-05-22'), endDate: new Date('2027-05-27'), summary: '公開摘要', details: '公開介紹',
    detail: { intro: ['公開段落'] }, publishedAt: new Date(),
  } });
  const draft = await db.activityRevision.create({ data: {
    activityId: 'stable-slug', number: 2, title: '草稿標題', categoryId: 'other',
    date: new Date('2027-06-01'), summary: '草稿摘要', details: '草稿介紹',
    detail: { intro: ['草稿段落'] },
  } });
  await db.activity.update({ where: { id: 'stable-slug' }, data: { publishedRevisionId: published.id, workingRevisionId: draft.id } });
  await db.activityRevision.update({ where: { id: draft.id }, data: { title: '更新草稿', detail: { intro: ['更新段落'] } } });
  const current = await db.activity.findUniqueOrThrow({ where: { id: 'stable-slug' }, include: { publishedRevision: true, workingRevision: true } });
  assert.equal(current.publishedRevision!.title, '公開標題');
  assert.equal(current.publishedRevision!.categoryId, 'camp');
  assert.equal(current.publishedRevision!.endDate!.toISOString().slice(0, 10), '2027-05-27');
  assert.deepEqual(current.publishedRevision!.detail, { intro: ['公開段落'] });
  assert.equal(current.workingRevision!.title, '更新草稿');
  assert.equal(current.workingRevision!.categoryId, 'other');

  await assert.rejects(db.activity.update({ where: { id: 'another' }, data: { publishedRevisionId: published.id } }));
  await assert.rejects(db.activityRevision.create({ data: { activityId: 'stable-slug', number: 2, title: '重複', categoryId: 'camp', summary: '摘要', details: '內容' } }));
  await assert.rejects(db.activityRevision.create({ data: { activityId: 'another', number: 1, title: '錯誤日期', categoryId: 'camp', date: new Date('2027-05-27'), endDate: new Date('2027-05-22'), summary: '摘要', details: '內容' } }));
  await assert.rejects(db.activityRevision.create({ data: { activityId: 'another', number: 1, title: '無開始日期', categoryId: 'camp', endDate: new Date('2027-05-27'), summary: '摘要', details: '內容' } }));
});
