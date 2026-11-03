import {
  CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Inject,
  Injectable, NotFoundException, Param, Req, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Prisma, ActivityRevision } from '@prisma/client';
import { AuthRequest, SessionGuard } from './auth';
import { Database } from './database';
import { revisionContent } from './public-activities';

const userScope = { categoryGrants: true, activityGrants: true } as const;
export type ContentScope = Prisma.UserGetPayload<{ include: typeof userScope }>;
const activityIncludes = { workingRevision: true, publishedRevision: true } as const;
type ScopedActivity = Prisma.ActivityGetPayload<{ include: typeof activityIncludes }>;

@Injectable()
export class ContentAccess {
  constructor(@Inject(Database) private readonly db: Database) {}

  async scope(tx: Prisma.TransactionClient, userId: string) {
    const user = await tx.user.findUnique({ where: { id: userId }, include: userScope });
    if (!user?.enabled) throw new UnauthorizedException('請先登入。');
    return user;
  }

  category(scope: ContentScope, categoryId: string) {
    return scope.role === 'ADMIN' || scope.categoryGrants.some(grant => grant.categoryId === categoryId);
  }

  revision(scope: ContentScope, revision: ActivityRevision) {
    return scope.role === 'ADMIN' || scope.activityGrants.some(grant => grant.activityId === revision.activityId)
      || this.category(scope, revision.categoryId);
  }

  activity(scope: ContentScope, activity: ScopedActivity) {
    return scope.role === 'ADMIN' || scope.activityGrants.some(grant => grant.activityId === activity.id)
      || !!(activity.workingRevision && this.category(scope, activity.workingRevision.categoryId))
      || !!(activity.publishedRevision && this.category(scope, activity.publishedRevision.categoryId));
  }

  requireCategory(scope: ContentScope, categoryId: string) {
    if (!this.category(scope, categoryId)) throw new ForbiddenException('沒有目標分類的編輯授權。');
  }

  async requireActivity(tx: Prisma.TransactionClient, scope: ContentScope, id: string) {
    const activity = await tx.activity.findUnique({ where: { id }, include: activityIncludes });
    if (!activity) throw new NotFoundException('找不到此活動。');
    if (!this.activity(scope, activity)) throw new ForbiddenException('沒有此活動的編輯授權。');
    return activity;
  }

  /** D must call this inside the same transaction as its update or restore. */
  async requireMove(tx: Prisma.TransactionClient, scope: ContentScope, id: string, targetCategoryId: string) {
    const activity = await this.requireActivity(tx, scope, id);
    const original = activity.workingRevision ?? activity.publishedRevision;
    if (original && !this.revision(scope, original)) throw new ForbiddenException('沒有目前工作版本的編輯授權。');
    if (!original || original.categoryId !== targetCategoryId) this.requireCategory(scope, targetCategoryId);
    return activity;
  }

  /** E can reuse the same fresh scope for private media reads and uploads. */
  async requireMedia(tx: Prisma.TransactionClient, scope: ContentScope, mediaId: string) {
    const media = await tx.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException('找不到此圖片。');
    if (media.activityId) await this.requireActivity(tx, scope, media.activityId);
    else if (media.categoryId) this.requireCategory(scope, media.categoryId);
    else throw new ForbiddenException('圖片缺少有效授權範圍。');
    return media;
  }

  async check(userId: string, id: string, targetCategoryId?: string) {
    return this.db.$transaction(async tx => {
      const scope = await this.scope(tx, userId);
      if (targetCategoryId) await this.requireMove(tx, scope, id, targetCategoryId);
      else await this.requireActivity(tx, scope, id);
    }, { isolationLevel: 'RepeatableRead' });
  }
}

@Injectable()
export class ContentScopeGuard implements CanActivate {
  constructor(@Inject(ContentAccess) private readonly access: ContentAccess) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!req.authUser) throw new UnauthorizedException('請先登入。');
    const id = req.params.id;
    if (typeof id !== 'string') throw new ForbiddenException('缺少內容範圍。');
    const category = req.body?.content?.categoryId;
    await this.access.check(req.authUser.id, id, typeof category === 'string' ? category : undefined);
    return true;
  }
}

const revisionDto = (revision: ActivityRevision) => ({
  id: revision.id, number: revision.number, status: revision.status, content: revisionContent(revision),
  rejectionNote: revision.rejectionNote, submittedAt: revision.submittedAt?.toISOString() ?? null,
  publishedAt: revision.publishedAt?.toISOString() ?? null,
});

@Injectable()
export class AdminContentReadService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(ContentAccess) private readonly access: ContentAccess) {}

  private envelope(scope: ContentScope, activity: ScopedActivity) {
    const working = activity.workingRevision && this.access.revision(scope, activity.workingRevision)
      ? activity.workingRevision : null;
    const published = activity.publishedRevision && this.access.revision(scope, activity.publishedRevision)
      ? activity.publishedRevision : null;
    return {
      id: activity.id, version: activity.version,
      publishedRevisionId: published?.id ?? null, workingRevisionId: working?.id ?? null,
      workingRevision: working ? revisionDto(working) : null,
    };
  }

  list(userId: string) {
    return this.db.$transaction(async tx => {
      const scope = await this.access.scope(tx, userId);
      const activities = await tx.activity.findMany({ include: activityIncludes, orderBy: { id: 'asc' } });
      return { items: activities.filter(a => this.access.activity(scope, a)).map(a => this.envelope(scope, a)) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  detail(userId: string, id: string) {
    return this.db.$transaction(async tx => {
      const scope = await this.access.scope(tx, userId);
      return this.envelope(scope, await this.access.requireActivity(tx, scope, id));
    }, { isolationLevel: 'RepeatableRead' });
  }

  revisions(userId: string, id: string) {
    return this.db.$transaction(async tx => {
      const scope = await this.access.scope(tx, userId);
      await this.access.requireActivity(tx, scope, id);
      const items = await tx.activityRevision.findMany({ where: { activityId: id }, orderBy: { number: 'desc' } });
      return { items: items.filter(revision => this.access.revision(scope, revision)).map(revisionDto) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  categories(userId: string) {
    return this.db.$transaction(async tx => {
      const scope = await this.access.scope(tx, userId);
      const categories = await tx.activityCategory.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
      const assigned = await tx.activity.findMany({
        where: { id: { in: scope.activityGrants.map(g => g.activityId) } }, include: activityIncludes,
      });
      const assignedCategories = new Set(assigned.flatMap(a => [a.workingRevision?.categoryId, a.publishedRevision?.categoryId]));
      return { items: categories.filter(c => this.access.category(scope, c.id) || assignedCategories.has(c.id)).map(c => ({
        id: c.id, label: c.label, shortLabel: c.shortLabel, order: c.order, version: c.version,
        ...(c.featuredActivityId ? { featuredActivityId: c.featuredActivityId } : {}),
      })) };
    }, { isolationLevel: 'RepeatableRead' });
  }
}

@Controller('admin/activities')
@UseGuards(SessionGuard)
export class AdminContentReadController {
  constructor(@Inject(AdminContentReadService) private readonly content: AdminContentReadService) {}
  @Get() list(@Req() req: AuthRequest) { return this.content.list(req.authUser!.id); }
  @Get(':id') @UseGuards(ContentScopeGuard)
  detail(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.detail(req.authUser!.id, id); }
  @Get(':id/revisions') @UseGuards(ContentScopeGuard)
  revisions(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.revisions(req.authUser!.id, id); }
}

@Controller('admin/activity-categories')
@UseGuards(SessionGuard)
export class AdminCategoryReadController {
  constructor(@Inject(AdminContentReadService) private readonly content: AdminContentReadService) {}
  @Get() list(@Req() req: AuthRequest) { return this.content.categories(req.authUser!.id); }
}
