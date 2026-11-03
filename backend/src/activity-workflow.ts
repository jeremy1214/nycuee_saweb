import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get,
  HttpCode, Inject, Injectable, NotFoundException, Param, Post, Put, Req, UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ActivityContent } from '../../shared/activity-content';
import { AuthRequest, AdminGuard, SessionGuard } from './auth';
import { ContentAccess } from './content-access';
import { Database } from './database';
import { inputObject, invalid, serializable, versionOf } from './account-utils';
import { validateActivityRevision } from './activity-content';
import { MediaService } from './media';
import { revisionContent } from './public-activities';

function revisionData(content: ActivityContent) {
  return {
    title: content.title, categoryId: content.categoryId, summary: content.summary, details: content.details,
    date: content.date ? new Date(`${content.date}T00:00:00.000Z`) : null,
    endDate: content.endDate ? new Date(`${content.endDate}T00:00:00.000Z`) : null,
    location: content.location ?? null,
    links: (content.links ?? []) as unknown as Prisma.InputJsonValue,
    detail: content.detail ? content.detail as unknown as Prisma.InputJsonValue : Prisma.DbNull,
    album: content.album ? content.album as unknown as Prisma.InputJsonValue : Prisma.DbNull,
  };
}

@Injectable()
export class ActivityWorkflow {
  constructor(@Inject(Database) private readonly db: Database, @Inject(ContentAccess) private readonly access: ContentAccess,
    @Inject(MediaService) private readonly media: MediaService) {}

  private async content(tx: Prisma.TransactionClient, body: unknown) {
    const categories = await tx.activityCategory.findMany({ select: { id: true } });
    return validateActivityRevision(body, categories.map(c => c.id));
  }

  private async audit(tx: Prisma.TransactionClient, userId: string, id: string, action: string) {
    await tx.auditEntry.create({ data: { actorId: userId, action: `activity.${action}`, entityType: 'Activity', entityId: id } });
  }

  private async refs(tx: Prisma.TransactionClient, revisionId: string, refs: { mediaId: string; path: string }[]) {
    await tx.mediaReference.deleteMany({ where: { revisionId } });
    if (refs.length) await tx.mediaReference.createMany({ data: refs.map(ref => ({ revisionId, ...ref })) });
  }

  private async envelope(tx: Prisma.TransactionClient, id: string) {
    const activity = await tx.activity.findUniqueOrThrow({ where: { id }, include: { workingRevision: true } });
    const revision = activity.workingRevision;
    return { id, version: activity.version, publishedRevisionId: activity.publishedRevisionId,
      workingRevisionId: activity.workingRevisionId, workingRevision: revision ? {
        id: revision.id, number: revision.number, status: revision.status, content: revisionContent(revision),
        rejectionNote: revision.rejectionNote, submittedAt: revision.submittedAt?.toISOString() ?? null,
        publishedAt: revision.publishedAt?.toISOString() ?? null,
      } : null };
  }

  private async nextNumber(tx: Prisma.TransactionClient, id: string) {
    const last = await tx.activityRevision.aggregate({ where: { activityId: id }, _max: { number: true } });
    return (last._max.number ?? 0) + 1;
  }

  async create(userId: string, body: unknown) {
    const input = inputObject(body, ['id', 'content']);
    if (typeof input.id !== 'string' || input.id.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)
      || ['overview', 'other'].includes(input.id)) invalid('id', '請使用未保留的小寫英文、數字與連字號識別值。');
    const id = input.id;
    return serializable(this.db, async tx => {
      const scope = await this.access.scope(tx, userId);
      const content = await this.content(tx, input.content);
      this.access.requireCategory(scope, content.categoryId);
      const checked = await this.media.references(tx, content, id);
      await tx.activity.create({ data: { id } });
      const revision = await tx.activityRevision.create({ data: { ...revisionData(content), activityId: id, number: 1 } });
      await this.refs(tx, revision.id, checked.refs);
      await tx.activity.update({ where: { id }, data: { workingRevisionId: revision.id } });
      await this.audit(tx, userId, id, 'created');
      return this.envelope(tx, id);
    });
  }

  async save(userId: string, id: string, body: unknown) {
    const input = inputObject(body, ['version', 'content']);
    const version = versionOf(input.version);
    return serializable(this.db, async tx => {
      const scope = await this.access.scope(tx, userId);
      const content = await this.content(tx, input.content);
      const activity = await this.access.requireMove(tx, scope, id, content.categoryId);
      if (activity.version !== version) throw new ConflictException('活動已更新，請重新載入。');
      if (activity.workingRevision && activity.workingRevision.status !== 'DRAFT') throw new BadRequestException('送審版本已凍結，請先撤回或退回。');
      const checked = await this.media.references(tx, content, id);
      const revision = activity.workingRevision
        ? await tx.activityRevision.update({ where: { id: activity.workingRevision.id }, data: revisionData(content) })
        : await tx.activityRevision.create({ data: { ...revisionData(content), activityId: id, number: await this.nextNumber(tx, id) } });
      await this.refs(tx, revision.id, checked.refs);
      await tx.activity.update({ where: { id, version }, data: { workingRevisionId: revision.id, version: { increment: 1 } } });
      await this.audit(tx, userId, id, 'draft-saved');
      return this.envelope(tx, id);
    });
  }

  async command(userId: string, id: string, command: string, body: unknown) {
    if (!['submit', 'withdraw', 'reject', 'publish', 'unpublish', 'restore'].includes(command)) throw new NotFoundException('找不到此操作。');
    const input = inputObject(body, ['version', ...(command === 'reject' ? ['reason'] : command === 'restore' ? ['revisionId'] : [])]);
    const version = versionOf(input.version);
    return serializable(this.db, async tx => {
      const scope = await this.access.scope(tx, userId);
      const activity = await this.access.requireActivity(tx, scope, id);
      if (scope.role !== 'ADMIN' && ['reject', 'publish', 'unpublish'].includes(command)) throw new ForbiddenException('此操作僅限管理員。');
      if (activity.version !== version) throw new ConflictException('活動已更新，請重新載入。');
      const working = activity.workingRevision;
      if (working && !this.access.revision(scope, working)) throw new ForbiddenException('沒有目前工作版本的授權。');
      let pointer: { workingRevisionId?: string | null; publishedRevisionId?: string | null } = {};
      if (command === 'restore') {
        if (working) throw new ConflictException('已有工作版本，不能覆寫。');
        if (typeof input.revisionId !== 'string') invalid('revisionId', '請選擇歷史版本。');
        const source = await tx.activityRevision.findFirst({ where: { id: input.revisionId, activityId: id } });
        if (!source) throw new NotFoundException('找不到此歷史版本。');
        const content = await this.content(tx, revisionContent(source));
        await this.access.requireMove(tx, scope, id, content.categoryId);
        const checked = await this.media.references(tx, content, id);
        const revision = await tx.activityRevision.create({ data: { ...revisionData(content), activityId: id, number: await this.nextNumber(tx, id) } });
        await this.refs(tx, revision.id, checked.refs);
        pointer = { workingRevisionId: revision.id };
      } else if (command === 'unpublish') {
        if (!activity.publishedRevisionId) throw new BadRequestException('活動尚未公開。');
        if (await tx.activityCategory.count({ where: { featuredActivityId: id } })) throw new ConflictException('請先調整分類精選入口，再下架活動。');
        pointer = { publishedRevisionId: null };
      } else {
        if (!working) throw new BadRequestException('此活動沒有工作版本。');
        const expected = command === 'submit' ? 'DRAFT' : 'SUBMITTED';
        if (working.status !== expected) throw new BadRequestException('目前版本狀態無法執行此操作。');
        if (command === 'submit' || command === 'publish') {
          const content = await this.content(tx, revisionContent(working));
          const checked = await this.media.references(tx, content, id, command === 'publish');
          if (command === 'publish') {
            const featured = await tx.activityCategory.findMany({ where: { featuredActivityId: id } });
            if (featured.some(c => c.id !== content.categoryId || !content.detail)) throw new ConflictException('發布後會使精選入口失效，請先調整入口。');
            await tx.activityRevision.update({ where: { id: working.id }, data: {
              ...revisionData(checked.content), status: 'PUBLISHED', publishedAt: new Date(),
            } });
            pointer = { publishedRevisionId: working.id, workingRevisionId: null };
          } else {
            await tx.activityRevision.update({ where: { id: working.id }, data: { status: 'SUBMITTED', submittedAt: new Date(), rejectionNote: null } });
          }
          await this.refs(tx, working.id, checked.refs);
        } else {
          let rejectionNote: string | null = null;
          if (command === 'reject') {
            if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000) invalid('reason', '請提供 1–2000 字的退回原因。');
            rejectionNote = input.reason.trim();
          }
          await tx.activityRevision.update({ where: { id: working.id }, data: { status: 'DRAFT', submittedAt: null, rejectionNote } });
        }
      }
      await tx.activity.update({ where: { id, version }, data: { ...pointer, version: { increment: 1 } } });
      await this.audit(tx, userId, id, command);
      return this.envelope(tx, id);
    });
  }

  async preview(userId: string, id: string) {
    return this.db.$transaction(async tx => {
      const scope = await this.access.scope(tx, userId);
      const activity = await this.access.requireActivity(tx, scope, id);
      const revision = activity.workingRevision ?? activity.publishedRevision;
      if (!revision) throw new NotFoundException('沒有可預覽的版本。');
      if (!this.access.revision(scope, revision)) throw new ForbiddenException('沒有此版本的預覽授權。');
      return { id: revision.id, number: revision.number, status: revision.status, content: revisionContent(revision),
        rejectionNote: revision.rejectionNote, submittedAt: revision.submittedAt?.toISOString() ?? null,
        publishedAt: revision.publishedAt?.toISOString() ?? null };
    }, { isolationLevel: 'RepeatableRead' });
  }
}

@Injectable()
export class CategoryService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(ContentAccess) private readonly access: ContentAccess) {}
  async save(userId: string, body: unknown, id?: string) {
    const input = inputObject(body, id ? ['version', 'label', 'shortLabel', 'order', 'featuredActivityId'] : ['id', 'label', 'shortLabel', 'order']);
    const version = id ? versionOf(input.version) : undefined;
    if (!id) {
      if (typeof input.id !== 'string' || input.id.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id)) invalid('id', '無效的分類識別值。');
      id = input.id;
    }
    const categoryId = id;
    if (typeof input.label !== 'string' || !input.label.trim() || input.label.length > 100) invalid('label', '分類名稱須為 1–100 字。');
    if (typeof input.shortLabel !== 'string' || !input.shortLabel.trim() || input.shortLabel.length > 100) invalid('shortLabel', '短標籤須為 1–100 字。');
    if (typeof input.order !== 'number' || !Number.isSafeInteger(input.order) || input.order < 0 || input.order > 2147483647) invalid('order', '順序須為非負整數。');
    const data = { label: input.label.trim(), shortLabel: input.shortLabel.trim(), order: input.order };
    if (input.featuredActivityId !== undefined && input.featuredActivityId !== null && typeof input.featuredActivityId !== 'string') invalid('featuredActivityId', '無效的精選活動。');
    const featuredId = input.featuredActivityId as string | null | undefined;
    return serializable(this.db, async tx => {
      if ((await this.access.scope(tx, userId)).role !== 'ADMIN') throw new ForbiddenException('分類設定僅限管理員。');
      const previous = version ? await tx.activityCategory.findUnique({ where: { id: categoryId } }) : null;
      if (version && !previous) throw new NotFoundException('找不到此分類。');
      if (previous && previous.version !== version) throw new ConflictException('分類已更新，請重新載入。');
      const featuredActivityId = featuredId === undefined ? previous?.featuredActivityId ?? null : featuredId;
      if (featuredActivityId) {
        const activity = await tx.activity.findUnique({ where: { id: featuredActivityId }, include: { publishedRevision: true } });
        if (!activity?.publishedRevision || activity.publishedRevision.status !== 'PUBLISHED'
          || activity.publishedRevision.categoryId !== categoryId || activity.publishedRevision.detail === null) {
          throw new ConflictException('精選入口須指向同分類、已公開且有詳細頁的活動。');
        }
      }
      const category = version
        ? await tx.activityCategory.update({ where: { id: categoryId, version }, data: { ...data, featuredActivityId, version: { increment: 1 } } })
        : await tx.activityCategory.create({ data: { id: categoryId, ...data } });
      await tx.auditEntry.create({ data: { actorId: userId, action: version ? 'category.updated' : 'category.created',
        entityType: 'ActivityCategory', entityId: categoryId, details: { ...data, featuredActivityId } } });
      return { ...category, featuredActivityId: category.featuredActivityId ?? undefined };
    });
  }
}

@Controller('admin/activities')
@UseGuards(SessionGuard)
export class ActivityWriteController {
  constructor(@Inject(ActivityWorkflow) private readonly workflow: ActivityWorkflow) {}
  @Post() create(@Req() req: AuthRequest, @Body() body: unknown) { return this.workflow.create(req.authUser!.id, body); }
  @Put(':id/draft') save(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.workflow.save(req.authUser!.id, id, body); }
  @Post(':id/:command') @HttpCode(200)
  command(@Req() req: AuthRequest, @Param('id') id: string, @Param('command') command: string, @Body() body: unknown) { return this.workflow.command(req.authUser!.id, id, command, body); }
  @Get(':id/preview') preview(@Req() req: AuthRequest, @Param('id') id: string) { return this.workflow.preview(req.authUser!.id, id); }
}

@Controller('admin/activity-categories')
@UseGuards(AdminGuard)
export class CategoryWriteController {
  constructor(@Inject(CategoryService) private readonly categories: CategoryService) {}
  @Post() create(@Req() req: AuthRequest, @Body() body: unknown) { return this.categories.save(req.authUser!.id, body); }
  @Put(':id') save(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.categories.save(req.authUser!.id, body, id); }
}
