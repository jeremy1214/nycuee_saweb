import {
  BadRequestException, Body, CallHandler, Controller, ExecutionContext, Get, HttpException, Inject, Injectable,
  NestInterceptor, NotFoundException, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContactCategory } from '@prisma/client';
import { createHash } from 'node:crypto';
import { Request, Response } from 'express';
import { finalize } from 'rxjs';
import { AdminGuard } from './auth';
import { Database } from './database';
import { normalizeImage } from './normalize-image';

const windowMs = 10 * 60 * 1000;
const pageSize = 20;
const maxImageBytes = 10 * 1024 * 1024;
const summary = {
  id: true, name: true, email: true, category: true, subject: true, createdAt: true, readAt: true,
} as const;

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`請填寫${label}。`);
  }
  return value.trim();
}

@Injectable()
export class ContactService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async limitSubmissions(ip: string, res: Response) {
    const now = Date.now();
    const end = (Math.floor(now / windowMs) + 1) * windowMs;
    const key = createHash('sha256').update(`contact:${ip}:${end}`).digest('hex');
    const attempt = await this.db.contactSubmissionAttempt.upsert({
      where: { key }, create: { key, expiresAt: new Date(end) }, update: { count: { increment: 1 } },
    });
    if (attempt.count > 5) {
      res.setHeader('Retry-After', String(Math.ceil((end - now) / 1000)));
      throw new HttpException('傳送次數過多，請稍後再試。', 429);
    }
  }

  async submit(body: unknown, file?: { buffer: Buffer }) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('請提供有效的表單資料。');
    }
    const input = body as Record<string, unknown>;
    // Silently discard honeypot submissions without saving them.
    if (input.website) return { ok: true };
    if (typeof input.category !== 'string'
      || !Object.values(ContactCategory).includes(input.category as ContactCategory)) {
      throw new BadRequestException('請選擇有效的問題類別。');
    }
    const subject = requiredText(input.subject, '主旨');
    const message = requiredText(input.message, '問題內容');
    if (file && (!file.buffer.length || file.buffer.length > maxImageBytes)) {
      throw new BadRequestException('請上傳 10 MiB 以內的圖片。');
    }
    const image = file ? await normalizeImage(file.buffer) : undefined;
    await this.db.contactMessage.create({ data: {
      category: input.category as ContactCategory, subject, message,
      image: image ? { create: image } : undefined,
    } });
    return { ok: true };
  }

  async list(pageInput?: string, readInput?: string) {
    if ((pageInput !== undefined && !/^[1-9]\d*$/.test(pageInput))
      || (readInput !== undefined && !['all', 'unread'].includes(readInput))) {
      throw new BadRequestException('無效的分頁或篩選條件。');
    }
    const page = Number(pageInput ?? 1);
    if (!Number.isSafeInteger(page) || page > Math.floor(2147483647 / pageSize)) {
      throw new BadRequestException('無效的頁碼。');
    }
    const where = readInput === 'unread' ? { readAt: null } : {};
    const [items, total, unreadCount] = await this.db.$transaction([
      this.db.contactMessage.findMany({
        where, select: summary, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.db.contactMessage.count({ where }),
      this.db.contactMessage.count({ where: { readAt: null } }),
    ], { isolationLevel: 'RepeatableRead' });
    return { items, total, unreadCount, page, pageSize };
  }

  async detail(id: string) {
    const message = await this.db.contactMessage.findUnique({
      where: { id },
      select: { ...summary, message: true, image: { select: { width: true, height: true } } },
    });
    if (!message) throw new NotFoundException('找不到這則聯絡訊息。');
    return message;
  }

  async image(id: string) {
    const attachment = await this.db.contactMessageImage.findUnique({
      where: { messageId: id }, select: { data: true },
    });
    if (!attachment) throw new NotFoundException('找不到這則訊息的圖片附件。');
    return Buffer.from(attachment.data);
  }

  async markRead(id: string) {
    // A conditional update preserves the first read time even across concurrent requests.
    await this.db.contactMessage.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
    return this.detail(id);
  }

  async cleanup() {
    await this.db.contactSubmissionAttempt.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}

@Injectable()
export class ContactSubmissionProtection implements NestInterceptor {
  private activeUploads = 0;
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    await this.contact.limitSubmissions(req.ip ?? req.socket.remoteAddress ?? 'unknown', res);
    if (!req.is('multipart/form-data')) return next.handle();
    if (this.activeUploads >= 2) {
      res.setHeader('Retry-After', '5');
      throw new HttpException('圖片處理忙碌，請稍後再試。', 429);
    }
    this.activeUploads++;
    return next.handle().pipe(finalize(() => { this.activeUploads--; }));
  }
}

@Controller('public/contact-messages')
export class PublicContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  @Post()
  @UseInterceptors(ContactSubmissionProtection, FileInterceptor('image', {
    limits: { fileSize: maxImageBytes + 1, files: 1, fields: 6, parts: 8 },
  }))
  submit(@Body() body: unknown, @UploadedFile() file?: { buffer: Buffer }) {
    return this.contact.submit(body, file);
  }
}

@Controller('admin/contact-messages')
@UseGuards(AdminGuard)
export class AdminContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  @Get()
  list(@Query('page') page?: string, @Query('read') read?: string) {
    return this.contact.list(page, read);
  }

  @Get(':id')
  detail(@Param('id') id: string) { return this.contact.detail(id); }

  @Get(':id/image')
  async image(@Param('id') id: string, @Res() res: Response) {
    res.type('image/webp').send(await this.contact.image(id));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) { return this.contact.markRead(id); }
}
