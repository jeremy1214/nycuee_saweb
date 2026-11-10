import { CallHandler, ExecutionContext, HttpException, Inject, Injectable, NestInterceptor, ServiceUnavailableException } from '@nestjs/common';
import { finalize } from 'rxjs';
import { mkdir, statfs } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Database } from './database';
import { AuthRequest } from './auth';
import { digest } from './account-utils';

const limit = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive safe integer.`);
  return value;
};
// Runs before multipart buffering, and releases its slot on observable completion or error.
@Injectable()
export class UploadProtection implements NestInterceptor {
  private active = 0;
  private readonly concurrency = limit('MEDIA_UPLOAD_CONCURRENCY', 2);
  private readonly perMinute = limit('MEDIA_UPLOADS_PER_MINUTE', 10);
  private readonly reserve = limit('MEDIA_MIN_FREE_BYTES', 1024 * 1024 * 1024);
  constructor(@Inject(Database) private readonly db: Database) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const response = context.switchToHttp().getResponse();
    if (this.active >= this.concurrency) {
      response.setHeader('Retry-After', '5');
      throw new HttpException('圖片處理忙碌，請稍後再試。', 429);
    }
    this.active++;
    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const expiresAt = new Date((minute + 1) * 60000);
      const key = digest(`media-upload:${request.authUser!.id}:${minute}`);
      const attempt = await this.db.loginAttempt.upsert({ where: { key }, create: { key, expiresAt }, update: { count: { increment: 1 } } });
      if (attempt.count > this.perMinute) {
        response.setHeader('Retry-After', String(Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000))));
        throw new HttpException('圖片上傳次數過多，請稍後再試。', 429);
      }
      const root = resolve(process.env.MEDIA_ROOT || 'media');
      await mkdir(root, { recursive: true });
      const space = await statfs(root);
      // Reserve room for every admitted request, including its re-encoded output.
      if (space.bavail * space.bsize < this.reserve + this.concurrency * 64 * 1024 * 1024) {
        throw new ServiceUnavailableException('圖片儲存空間不足，請聯絡管理員。');
      }
      return next.handle().pipe(finalize(() => { this.active--; }));
    } catch (error) { this.active--; throw error; }
  }
}
