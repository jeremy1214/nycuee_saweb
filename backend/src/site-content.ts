import { Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, Inject, Injectable, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from './database';
import { AdminGuard, AuthRequest } from './auth';
import { inputObject, invalid, serializable, versionOf } from './account-utils';
import { parseSiteContent, SiteContentError, siteContentKinds, type SiteContentKind } from '../../shared/site-content';
import { MediaService } from './media';

export function siteKind(value: string): SiteContentKind {
  if (!siteContentKinds.includes(value as SiteContentKind)) throw new NotFoundException('找不到此全站內容。');
  return value as SiteContentKind;
}
export function validateSiteContent(kind: SiteContentKind, content: unknown) {
  try { return parseSiteContent(kind, content); }
  catch (error) { if (error instanceof SiteContentError) invalid(error.path, error.message); throw error; }
}
const includes = { workingRevision: true, publishedRevision: true } as const;

@Injectable()
export class SiteContentService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(MediaService) private readonly media: MediaService) {}
  async publicContent() {
    return this.db.$transaction(async tx => {
      const records = await tx.siteContent.findMany({ include: { publishedRevision: true } });
      return Object.fromEntries(siteContentKinds.map(kind => {
        const revision = records.find(row => row.id === kind)?.publishedRevision;
        return [kind, revision?.status === 'PUBLISHED' ? validateSiteContent(kind, revision.content) : null];
      }));
    }, { isolationLevel: 'RepeatableRead' });
  }
  async get(id: string) {
    siteKind(id);
    const resource = await this.db.siteContent.findUnique({ where: { id }, include: includes });
    if (!resource) throw new NotFoundException('尚未匯入此內容，請先執行 site:import。');
    const latestRevision = await this.db.siteContentRevision.findFirst({ where: { resourceId: id }, orderBy: { number: 'desc' } });
    return { ...resource, latestRevision };
  }
  async history(id: string) { await this.get(id); return { items: await this.db.siteContentRevision.findMany({ where: { resourceId: id }, orderBy: { number: 'desc' } }) }; }
  async change(actorId: string, id: string, command: string, body: unknown) {
    const kind = siteKind(id);
    const input = inputObject(body, command === 'draft' ? ['version', 'content'] : command === 'reject' ? ['version', 'reason'] : command === 'restore' ? ['version', 'revisionId'] : ['version']);
    const version = versionOf(input.version);
    return serializable(this.db, async tx => {
      const user = await tx.user.findUnique({ where: { id: actorId } });
      if (!user?.enabled || user.role !== 'ADMIN') throw new ForbiddenException('此功能僅限管理員。');
      const resource = await tx.siteContent.findUnique({ where: { id }, include: includes });
      if (!resource) throw new NotFoundException('請先匯入內容。');
      if (resource.version !== version) throw new ConflictException('內容已更新，請重新載入。');
      const working = resource.workingRevision;
      let workingRevisionId = resource.workingRevisionId;
      let publishedRevisionId = resource.publishedRevisionId;
      const references = async (content: unknown, publish = false) => this.media.siteReferences(tx, validateSiteContent(kind, content), kind, publish);
      const saveRefs = async (revisionId: string, refs: { mediaId: string; path: string }[]) => {
        await tx.siteContentMediaReference.deleteMany({ where: { revisionId } });
        if (refs.length) await tx.siteContentMediaReference.createMany({ data: refs.map(ref => ({ revisionId, ...ref })) });
      };
      if (command === 'draft' || command === 'restore') {
        if (working?.status === 'SUBMITTED' || (command === 'restore' && working)) throw new ConflictException('請先撤回送審或處理現有草稿。');
        const original = command === 'restore' && typeof input.revisionId === 'string'
          ? await tx.siteContentRevision.findFirst({ where: { id: input.revisionId, resourceId: id } }) : null;
        if (command === 'restore' && !original) throw new NotFoundException('找不到歷史版本。');
        const prepared = await references(command === 'restore' ? original!.content : input.content);
        let revision;
        if (working) revision = await tx.siteContentRevision.update({ where: { id: working.id }, data: { content: prepared.content as unknown as Prisma.InputJsonValue, rejectionNote: null } });
        else {
          const last = await tx.siteContentRevision.aggregate({ where: { resourceId: id }, _max: { number: true } });
          revision = await tx.siteContentRevision.create({ data: { resourceId: id, number: (last._max.number ?? 0) + 1, content: prepared.content as unknown as Prisma.InputJsonValue } });
        }
        workingRevisionId = revision.id;
        await saveRefs(revision.id, prepared.refs);
      } else if (command === 'unpublish') {
        if (!publishedRevisionId) throw new ConflictException('此內容尚未公開。');
        publishedRevisionId = null;
      } else {
        if (!working) throw new ConflictException('沒有工作版本。');
        if (command === 'submit') {
          if (working.status !== 'DRAFT') throw new ConflictException('只有草稿可送審。');
          await references(working.content);
          await tx.siteContentRevision.update({ where: { id: working.id }, data: { status: 'SUBMITTED', rejectionNote: null } });
        } else if (command === 'withdraw' || command === 'reject') {
          if (working.status !== 'SUBMITTED') throw new ConflictException('只有送審版本可撤回或退回。');
          if (command === 'reject' && (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000)) invalid('reason', '請填寫退回原因（最多 2000 字元）。');
          await tx.siteContentRevision.update({ where: { id: working.id }, data: { status: 'DRAFT', rejectionNote: command === 'reject' ? input.reason as string : null } });
        } else if (command === 'publish') {
          if (working.status !== 'SUBMITTED') throw new ConflictException('請先送審後發布。');
          const prepared = await references(working.content, true);
          if (kind === 'resources' && resource.publishedRevision) {
            const before = parseSiteContent('resources', resource.publishedRevision.content);
            const after = parseSiteContent('resources', prepared.content);
            for (const page of before.pages) if (!after.pages.some(candidate => candidate.id === page.id)) invalid('content.pages', '已公開的資源識別值須保留，以維持既有網址。');
          }
          await tx.siteContentRevision.update({ where: { id: working.id }, data: { status: 'PUBLISHED', content: prepared.content as unknown as Prisma.InputJsonValue, rejectionNote: null } });
          await saveRefs(working.id, prepared.refs);
          publishedRevisionId = working.id; workingRevisionId = null;
        } else throw new NotFoundException('不支援的操作。');
      }
      await tx.siteContent.update({ where: { id, version }, data: { workingRevisionId, publishedRevisionId, version: { increment: 1 } } });
      await tx.auditEntry.create({ data: { actorId, action: `site.${command}`, entityType: 'SiteContent', entityId: id } });
      return tx.siteContent.findUniqueOrThrow({ where: { id }, include: includes });
    });
  }
}
@Controller('public/site-content')
export class PublicSiteContentController {
  constructor(@Inject(SiteContentService) private readonly service: SiteContentService) {}
  @Get() content() { return this.service.publicContent(); }
}
@Controller('admin/site-content')
@UseGuards(AdminGuard)
export class AdminSiteContentController {
  constructor(@Inject(SiteContentService) private readonly service: SiteContentService) {}
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Get(':id/revisions') history(@Param('id') id: string) { return this.service.history(id); }
  @Put(':id/draft') draft(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.change(req.authUser!.id, id, 'draft', body); }
  @Post(':id/:command') @HttpCode(200) change(@Req() req: AuthRequest, @Param('id') id: string, @Param('command') command: string, @Body() body: unknown) {
    if (!['submit', 'withdraw', 'reject', 'publish', 'unpublish', 'restore'].includes(command)) throw new NotFoundException('不支援的操作。');
    return this.service.change(req.authUser!.id, id, command, body);
  }
}
