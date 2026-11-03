import {
  BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Inject,
  Injectable, NotFoundException, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Media, Prisma } from '@prisma/client';
import sharp from 'sharp';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Response } from 'express';
import { visitOrganizationImages, type OrganizationContent, type OrganizationKind } from '../../shared/organization-content';
import { organizationStore } from './organization-store';
import { readOrganizationLegacy } from './organization-legacy';
import type { ActivityContent } from '../../shared/activity-content';
import { AuthRequest, SessionGuard } from './auth';
import { ContentAccess, ContentScope } from './content-access';
import { Database } from './database';
import { inputObject, invalid, secret, serializable } from './account-utils';

interface Upload { buffer: Buffer; originalname: string }
interface Scope { activityId?: string; categoryId?: string; overviewId?: string; departmentId?: string; teamId?: string }
const mediaRoot = () => resolve(process.env.MEDIA_ROOT || resolve(process.cwd(), 'media'));
const dto = (m: Media) => ({
  id: m.id, originalName: m.originalName, mimeType: m.mimeType, byteSize: m.byteSize,
  width: m.width, height: m.height, visibility: m.visibility, createdAt: m.createdAt.toISOString(),
  ...Object.fromEntries(['activityId', 'categoryId', 'overviewId', 'departmentId', 'teamId'].flatMap(key => { const value = m[key as keyof Media]; return value ? [[key, value]] : []; })),
});
const managedId = (src: string) => {
  const match = /^\/api\/v1\/(?:admin\/media\/([a-zA-Z0-9_-]+)\/file|public\/media\/([a-zA-Z0-9_-]+))$/.exec(src);
  return match?.[1] ?? match?.[2];
};
function images(value: unknown, visit: (src: string, path: string, image: Record<string, unknown>) => void, path = 'content') {
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (typeof record.src === 'string') visit(record.src, `${path}.src`, record);
  for (const [key, child] of Object.entries(record)) if (key !== 'src') images(child, visit, `${path}.${key}`);
}

@Injectable()
export class MediaService {
  private legacyPaths?: Set<string>;
  constructor(@Inject(Database) private readonly db: Database, @Inject(ContentAccess) private readonly access: ContentAccess) {}

  private legacy() {
    if (!this.legacyPaths) {
      this.legacyPaths = new Set();
      const root = resolve(process.env.LEGACY_CONTENT_DIR || resolve(process.cwd(), '../frontend/src/content/activities'));
      const directory = resolve(root, 'events');
      if (existsSync(directory)) for (const name of readdirSync(directory).filter(n => n.endsWith('.json'))) {
        images(JSON.parse(readFileSync(resolve(directory, name), 'utf8')), src => this.legacyPaths!.add(src));
      }
    }
    return this.legacyPaths;
  }

  scope(body: unknown): Scope {
    const keys = ['activityId', 'categoryId', 'overviewId', 'departmentId', 'teamId'];
    const input = inputObject(body, keys);
    const selected = keys.filter(key => input[key] !== undefined);
    if (selected.length !== 1) invalid('', '須指定且只能指定一個內容範圍。');
    const key = selected[0];
    const value = input[key];
    if (typeof value !== 'string' || !value.length || value.length > 200) invalid(key, '無效的範圍識別值。');
    return { [key]: value };
  }

  private async authorize(tx: Prisma.TransactionClient, user: ContentScope, scope: Scope) {
    if (scope.activityId) await this.access.requireActivity(tx, user, scope.activityId);
    else if (scope.overviewId || scope.departmentId || scope.teamId) {
      const kind = scope.overviewId ? 'overview' : scope.departmentId ? 'department' : 'team';
      const id = scope.overviewId ?? scope.departmentId ?? scope.teamId!;
      this.access.requireOrganization(user, kind, id);
      if (!await organizationStore(tx, kind).resources.findUnique({ where: { id } })) throw new NotFoundException('找不到此內容。');
    } else {
      this.access.requireCategory(user, scope.categoryId!);
      if (!await tx.activityCategory.findUnique({ where: { id: scope.categoryId! } })) throw new NotFoundException('找不到此分類。');
    }
  }

  async list(userId: string, input: unknown) {
    const scope = this.scope(input);
    return this.db.$transaction(async tx => {
      const user = await this.access.scope(tx, userId);
      await this.authorize(tx, user, scope);
      const items = await tx.media.findMany({ where: scope, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      return { items: items.map(dto) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async upload(userId: string, input: unknown, file?: Upload) {
    const scope = this.scope(input);
    if (!file?.buffer?.length || file.buffer.length > 10 * 1024 * 1024) throw new BadRequestException('請上傳 10 MiB 以內的圖片。');
    // Recheck the scope after decoding, immediately before recording the upload.
    await this.db.$transaction(async tx => this.authorize(tx, await this.access.scope(tx, userId), scope));
    let buffer: Buffer;
    let width: number;
    let height: number;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 40000000, failOn: 'warning' });
      const metadata = await image.metadata();
      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)
        || !metadata.width || !metadata.height || metadata.width * metadata.height > 40000000
        || (metadata.pages ?? 1) > 1) throw new Error('unsupported image');
      const output = await image.rotate().resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      buffer = output.data; width = output.info.width; height = output.info.height;
    } catch {
      throw new BadRequestException('圖片必須為可解碼的 JPEG、PNG 或 WebP，且不超過 40MP；不接受動畫。');
    }
    const storageKey = `${secret()}.webp`;
    const path = resolve(mediaRoot(), storageKey);
    await mkdir(mediaRoot(), { recursive: true });
    let created = false;
    try {
      const handle = await open(path, 'wx', 0o600);
      created = true;
      try { await handle.writeFile(buffer); }
      finally { await handle.close(); }
      return await serializable(this.db, async tx => {
        const user = await this.access.scope(tx, userId);
        await this.authorize(tx, user, scope);
        const media = await tx.media.create({ data: {
          ...scope, storageKey, originalName: basename(file.originalname).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'image',
          mimeType: 'image/webp', byteSize: buffer.length, width, height,
          sha256: createHash('sha256').update(buffer).digest('hex'), uploadedById: userId,
        } });
        await tx.auditEntry.create({ data: { actorId: userId, action: 'media.uploaded', entityType: 'Media', entityId: media.id,
          details: { ...scope, width, height, byteSize: buffer.length } } });
        return dto(media);
      });
    } catch (error) {
      if (created) await unlink(path).catch(() => undefined);
      throw error;
    }
  }

  async usages(userId: string, id: string) {
    return this.db.$transaction(async tx => {
      const user = await this.access.scope(tx, userId);
      await this.access.requireMedia(tx, user, id);
      const items: { entityType: string; entityId: string; title: string; number: number; path: string; href: string }[] = [];
      for (const ref of await tx.mediaReference.findMany({ where: { mediaId: id }, include: { revision: true } })) {
        if (this.access.revision(user, ref.revision)) items.push({ entityType: 'Activity', entityId: ref.revision.activityId, title: ref.revision.title, number: ref.revision.number, path: ref.path, href: `/admin/activities/${ref.revision.activityId}` });
      }
      const groups = [
        { kind: 'overview' as const, refs: await tx.eesaOverviewMediaReference.findMany({ where: { mediaId: id }, include: { revision: true } }) },
        { kind: 'department' as const, refs: await tx.departmentMediaReference.findMany({ where: { mediaId: id }, include: { revision: true } }) },
        { kind: 'team' as const, refs: await tx.teamMediaReference.findMany({ where: { mediaId: id }, include: { revision: true } }) },
      ];
      for (const group of groups) for (const ref of group.refs) if (this.access.organization(user, group.kind, ref.revision.resourceId)) {
        const content = ref.revision.content as { title?: string; name?: string };
        const href = group.kind === 'overview' ? '/admin/eesa/overview' : group.kind === 'department' ? `/admin/eesa/departments/${ref.revision.resourceId}` : `/admin/teams/${ref.revision.resourceId}`;
        items.push({ entityType: group.kind, entityId: ref.revision.resourceId, title: content.title ?? content.name ?? ref.revision.resourceId, number: ref.revision.number, path: ref.path, href });
      }
      return { items };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async remove(userId: string, id: string) {
    const removed = await serializable(this.db, async tx => {
      const user = await this.access.scope(tx, userId);
      const media = await this.access.requireMedia(tx, user, id);
      if (user.role !== 'ADMIN' && media.uploadedById !== userId) throw new ForbiddenException('只能刪除自己上傳的圖片。');
      if (media.visibility === 'PUBLIC' || await tx.mediaReference.count({ where: { mediaId: id } })
        || await tx.eesaOverviewMediaReference.count({ where: { mediaId: id } })
        || await tx.departmentMediaReference.count({ where: { mediaId: id } })
        || await tx.teamMediaReference.count({ where: { mediaId: id } })) {
        throw new ConflictException('已公開或仍被版本引用的圖片不能刪除。');
      }
      await tx.media.delete({ where: { id } });
      await tx.auditEntry.create({ data: { actorId: userId, action: 'media.deleted', entityType: 'Media', entityId: id } });
      return media;
    });
    await unlink(this.path(removed)).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Unreferenced media file cleanup failed.');
    });
    return { ok: true };
  }

  private path(media: Media) {
    if (!/^[a-f0-9]{64}\.webp$/.test(media.storageKey)) throw new NotFoundException('找不到圖片檔案。');
    return resolve(mediaRoot(), media.storageKey);
  }

  async file(id: string, res: Response, userId?: string) {
    const media = await this.db.$transaction(async tx => {
      if (userId) return this.access.requireMedia(tx, await this.access.scope(tx, userId), id);
      const row = await tx.media.findUnique({ where: { id } });
      if (!row || row.visibility !== 'PUBLIC') throw new NotFoundException('找不到公開圖片。');
      return row;
    }, { isolationLevel: 'RepeatableRead' });
    let bytes: Buffer;
    try { bytes = await readFile(this.path(media)); }
    catch { throw new NotFoundException('找不到圖片檔案。'); }
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', userId ? 'no-store' : 'public, max-age=31536000, immutable');
    res.send(bytes);
  }

  async organizationReferences(tx: Prisma.TransactionClient, content: OrganizationContent, kind: OrganizationKind, resourceId: string, publish = false) {
    const normalized = structuredClone(content);
    const refs: { mediaId: string; path: string }[] = [];
    const legacy = readOrganizationLegacy().find(record => record.kind === kind && record.id === resourceId);
    const legacyImages = new Map<string, { src: string; missing?: boolean }>();
    if (legacy) visitOrganizationImages(legacy.content, (image, path) => legacyImages.set(path, image));
    const allowed = new Set([...legacyImages.values()].filter(i => !i.missing).map(i => i.src));
    visitOrganizationImages(normalized, (image, path) => {
      const mediaId = managedId(image.src);
      if (mediaId) {
        if (image.missing) invalid(path, '媒體庫圖片不能標為缺圖。');
        refs.push({ mediaId, path: `${path}.src` });
        if (publish) image.src = `/api/v1/public/media/${mediaId}`;
      } else if (image.missing) {
        const original = legacyImages.get(path);
        if (!original?.missing || original.src !== image.src) invalid(path, '只能保留原欄位的既有缺圖項目。');
      } else if (!allowed.has(image.src)) invalid(path, '圖片須來自此資源的舊圖片或媒體庫。');
    });
    const ids = [...new Set(refs.map(ref => ref.mediaId))];
    const items = await tx.media.findMany({ where: { id: { in: ids } } });
    for (const ref of refs) {
      const item = items.find(m => m.id === ref.mediaId);
      const scopeId = kind === 'overview' ? item?.overviewId : kind === 'department' ? item?.departmentId : item?.teamId;
      if (!item || scopeId !== resourceId) invalid(ref.path, '圖片不存在或不屬於此資源。');
      if (publish && !existsSync(this.path(item))) invalid(ref.path, '圖片檔案不存在，無法發布。');
    }
    if (publish && ids.length) await tx.media.updateMany({ where: { id: { in: ids } }, data: { visibility: 'PUBLIC' } });
    return { content: normalized, refs };
  }

  /** D calls this in the same transaction as every revision write/publication. */
  async references(tx: Prisma.TransactionClient, content: ActivityContent, activityId: string, publish = false) {
    const normalized = structuredClone(content);
    const refs: { mediaId: string; path: string }[] = [];
    images(normalized, (src, path, image) => {
      const id = managedId(src);
      if (id) {
        refs.push({ mediaId: id, path });
        if (publish) image.src = `/api/v1/public/media/${id}`;
      } else if (!this.legacy().has(src)) invalid(path, '圖片須選自媒體庫或既有網站圖片。');
    });
    const unique = [...new Set(refs.map(ref => ref.mediaId))];
    const media = await tx.media.findMany({ where: { id: { in: unique } } });
    for (const ref of refs) {
      const item = media.find(m => m.id === ref.mediaId);
      if (!item || (item.activityId !== activityId && item.categoryId !== content.categoryId)) invalid(ref.path, '圖片不存在或不屬於此活動／分類。');
      // Validate that the persisted file is present before exposing a published reference.
      if (publish && !existsSync(this.path(item))) invalid(ref.path, '圖片檔案不存在，無法發布。');
    }
    if (publish && unique.length) await tx.media.updateMany({ where: { id: { in: unique } }, data: { visibility: 'PUBLIC' } });
    return { content: normalized, refs };
  }
}

@Controller('admin/media')
@UseGuards(SessionGuard)
export class AdminMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: unknown) { return this.media.list(req.authUser!.id, query); }
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1024, parts: 3 } }))
  upload(@Req() req: AuthRequest, @Body() body: unknown, @UploadedFile() file?: Upload) { return this.media.upload(req.authUser!.id, body, file); }
  @Delete(':id') remove(@Req() req: AuthRequest, @Param('id') id: string) { return this.media.remove(req.authUser!.id, id); }
  @Get(':id/references') usages(@Req() req: AuthRequest, @Param('id') id: string) { return this.media.usages(req.authUser!.id, id); }
  @Get(':id/file') file(@Req() req: AuthRequest, @Param('id') id: string, @Res() res: Response) { return this.media.file(id, res, req.authUser!.id); }
}

@Controller('public/media')
export class PublicMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}
  @Get(':id') file(@Param('id') id: string, @Res() res: Response) { return this.media.file(id, res); }
}
