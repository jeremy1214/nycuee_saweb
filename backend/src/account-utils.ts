import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { Database } from './database';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('hex');

export function invalid(path: string, message: string): never {
  throw new BadRequestException({ message: '資料格式不正確。', fieldErrors: [{ path, message }] });
}

export function inputObject(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('', '請提供 JSON 物件。');
  const input = value as Record<string, unknown>;
  const extra = Object.keys(input).find(key => !allowed.includes(key));
  if (extra) invalid(extra, '不接受此欄位。');
  return input;
}

export function versionOf(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) invalid('version', '版本須為正整數。');
  return value;
}

export function passwordOf(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 1024) invalid('password', '密碼須為 12–1024 字元。');
  return value;
}

export function roleOf(value: unknown): 'ADMIN' | 'EDITOR' {
  if (value !== 'ADMIN' && value !== 'EDITOR') invalid('role', '請選擇有效角色。');
  return value;
}

export function appOrigin(): string {
  const configured = process.env.APP_ORIGIN;
  const message = 'APP_ORIGIN must be an explicit frontend origin using HTTPS in production.';
  if (process.env.NODE_ENV === 'production' && !configured) throw new Error(message);
  let url: URL;
  try {
    url = new URL(configured || 'http://localhost:5173');
  } catch {
    throw new Error(message);
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || !['http:', 'https:'].includes(url.protocol)
    || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    throw new Error(message);
  }
  return url.origin;
}

/** Retry serialization conflicts; unique/version failures become explicit conflicts. */
export async function serializable<T>(db: Database, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034' && attempt < 2) continue;
        if (['P2034', 'P2002', 'P2025', 'P2003'].includes(error.code)) {
          throw new ConflictException('資料已變更或與現有資料衝突，請重新載入。');
        }
      }
      throw error;
    }
  }
  throw new ConflictException('資料正在更新，請重新載入。');
}

export function writeAudit(tx: Prisma.TransactionClient, actorId: string | null, action: string,
  entityId: string, details: Prisma.InputJsonObject = {}) {
  return tx.auditEntry.create({ data: { actorId, action, entityType: 'User', entityId, details } });
}
