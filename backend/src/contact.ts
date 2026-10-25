import {
  BadRequestException, Body, Controller, Get, HttpException, Inject, Injectable,
  NotFoundException, Param, Patch, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { ContactCategory } from '@prisma/client';
import { createHash } from 'node:crypto';
import { Request, Response } from 'express';
import { AdminGuard } from './auth';
import { Database } from './database';

const windowMs = 10 * 60 * 1000;
const pageSize = 20;
const summary = {
  id: true, name: true, email: true, category: true, subject: true, createdAt: true, readAt: true,
} as const;

function text(input: Record<string, unknown>, key: string, min: number, max: number) {
  const value = input[key];
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new BadRequestException(`欄位 ${key} 須為 ${min}–${max} 字。`);
  }
  return value.trim();
}

@Injectable()
export class ContactService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async submit(body: unknown, ip: string, res: Response) {
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('請提供有效的表單資料。');
    }
    const input = body as Record<string, unknown>;
    // Silently discard honeypot submissions without saving them.
    if (input.website) return { ok: true };
    const name = text(input, 'name', 1, 60);
    const email = text(input, 'email', 3, 120);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      throw new BadRequestException('請提供有效的 Email。');
    }
    if (typeof input.category !== 'string'
      || !Object.values(ContactCategory).includes(input.category as ContactCategory)) {
      throw new BadRequestException('請選擇有效的問題類別。');
    }
    const subject = text(input, 'subject', 1, 120);
    const message = text(input, 'message', 10, 2000);
    await this.db.contactMessage.create({ data: {
      name, email, category: input.category as ContactCategory, subject, message,
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
    const message = await this.db.contactMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('找不到這則聯絡訊息。');
    return message;
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

@Controller('public/contact-messages')
export class PublicContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  @Post()
  submit(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.contact.submit(body, req.ip ?? req.socket.remoteAddress ?? 'unknown', res);
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

  @Patch(':id/read')
  markRead(@Param('id') id: string) { return this.contact.markRead(id); }
}
