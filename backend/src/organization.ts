import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, Inject, Injectable, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseOrganization, OrganizationValidationError, type DepartmentContent, type OrganizationContent, type OrganizationKind, type OrganizationRevision, type TeamContent } from '../../shared/organization-content';
import { AuthRequest, SessionGuard } from './auth';
import { inputObject, invalid, serializable, versionOf } from './account-utils';
import { ContentAccess } from './content-access';
import { Database } from './database';
import { MediaService } from './media';
import { organizationEntity, organizationIncludes, organizationStore, type StoredRevision } from './organization-store';
export function validateOrganization(kind: OrganizationKind, value: unknown, id: string) {
  try { return parseOrganization(kind, value, id); }
  catch (error) { if (error instanceof OrganizationValidationError) throw new BadRequestException({ message: error.message, fieldErrors: error.fieldErrors }); throw error; }
}
const json = (value: OrganizationContent) => value as unknown as Prisma.InputJsonValue;
export const organizationRevisionDto = (revision: StoredRevision): OrganizationRevision => ({ id: revision.id, number: revision.number, status: revision.status, rejectionNote: revision.rejectionNote, content: revision.content as unknown as OrganizationContent, submittedAt: revision.submittedAt?.toISOString() ?? null, publishedAt: revision.publishedAt?.toISOString() ?? null });
@Injectable()
export class OrganizationService {
  constructor(@Inject(Database) private readonly db: Database, @Inject(ContentAccess) private readonly access: ContentAccess, @Inject(MediaService) private readonly media: MediaService) {}
  private async resource(tx: Prisma.TransactionClient, userId: string, kind: OrganizationKind, id: string) {
    const user = await this.access.scope(tx, userId);
    this.access.requireOrganization(user, kind, id);
    const row = await organizationStore(tx, kind).resources.findUnique({ where: { id }, include: organizationIncludes });
    if (!row) throw new NotFoundException('找不到內容，請先匯入既有資料。');
    return { user, row };
  }
  private async envelope(tx: Prisma.TransactionClient, kind: OrganizationKind, id: string) {
    const row = await organizationStore(tx, kind).resources.findUnique({ where: { id }, include: organizationIncludes });
    if (!row) throw new NotFoundException('找不到內容。');
    return { id, version: row.version, publishedRevisionId: row.publishedRevisionId, workingRevisionId: row.workingRevisionId, workingRevision: row.workingRevision ? organizationRevisionDto(row.workingRevision) : null };
  }
  async list(userId: string, kind: OrganizationKind) {
    return this.db.$transaction(async tx => {
      const user = await this.access.scope(tx, userId);
      const rows = await organizationStore(tx, kind).resources.findMany({ include: organizationIncludes, orderBy: { id: 'asc' } });
      return { items: await Promise.all(rows.filter(r => this.access.organization(user, kind, r.id)).map(r => this.envelope(tx, kind, r.id))) };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async read(userId: string, kind: OrganizationKind, id: string, mode = 'detail') {
    return this.db.$transaction(async tx => {
      const { row } = await this.resource(tx, userId, kind, id);
      if (mode === 'revisions') return { items: (await organizationStore(tx, kind).revisions.findMany({ where: { resourceId: id }, orderBy: { number: 'desc' } })).map(organizationRevisionDto) };
      if (mode === 'preview') {
        const revision = row.workingRevision ?? row.publishedRevision;
        if (!revision) throw new NotFoundException('沒有可預覽版本。');
        return organizationRevisionDto(revision);
      }
      return this.envelope(tx, kind, id);
    }, { isolationLevel: 'RepeatableRead' });
  }
  private async refs(tx: Prisma.TransactionClient, kind: OrganizationKind, id: string, revisionId: string, content: OrganizationContent, publish = false) {
    const checked = await this.media.organizationReferences(tx, content, kind, id, publish);
    const store = organizationStore(tx, kind);
    await store.references.deleteMany({ where: { revisionId } });
    if (checked.refs.length) await store.references.createMany({ data: checked.refs.map(ref => ({ revisionId, ...ref })) });
    return checked.content;
  }
  private async audit(tx: Prisma.TransactionClient, userId: string, kind: OrganizationKind, id: string, action: string) {
    await tx.auditEntry.create({ data: { actorId: userId, action: `${kind}.${action}`, entityType: organizationEntity(kind), entityId: id } });
  }
  async save(userId: string, kind: OrganizationKind, id: string, body: unknown) {
    const input = inputObject(body, ['version', 'content']);
    const version = versionOf(input.version);
    const content = validateOrganization(kind, input.content, id);
    return serializable(this.db, async tx => {
      const { user, row } = await this.resource(tx, userId, kind, id);
      if (row.version !== version) throw new ConflictException('內容已更新，請重新載入。');
      if (row.workingRevision && row.workingRevision.status !== 'DRAFT') throw new ConflictException('送審內容已凍結。');
      const previous = row.workingRevision ?? row.publishedRevision ?? await organizationStore(tx, kind).revisions.findFirst({ where: { resourceId: id }, orderBy: { number: 'desc' } });
      if (user.role !== 'ADMIN' && previous && (previous.content as { order?: number }).order !== (content as { order?: number }).order) throw new ForbiddenException('顯示順序僅限管理員調整。');
      await this.stableIds(tx, kind, id, content);
      const store = organizationStore(tx, kind);
      const last = await store.revisions.findFirst({ where: { resourceId: id }, orderBy: { number: 'desc' } });
      const revision = row.workingRevision ? await store.revisions.update({ where: { id: row.workingRevision.id }, data: { content: json(content) } })
        : await store.revisions.create({ data: { resourceId: id, number: (last?.number ?? 0) + 1, content: json(content) } });
      await this.refs(tx, kind, id, revision.id, content);
      await store.resources.update({ where: { id, version }, data: { workingRevisionId: revision.id, version: { increment: 1 } } });
      await this.audit(tx, userId, kind, id, 'draft-saved');
      return this.envelope(tx, kind, id);
    });
  }
  // A published child may disappear, but an existing child cannot change identity in place.
  private async stableIds(tx: Prisma.TransactionClient, kind: OrganizationKind, id: string, content: OrganizationContent) {
    if (kind === 'overview') return;
    const history = await organizationStore(tx, kind).revisions.findMany({ where: { resourceId: id } });
    const check = (items: { key: string; title: string }[], source: (v: OrganizationContent) => { key: string; title: string }[]) => {
      const old = history.filter(r => r.status === 'PUBLISHED').flatMap(r => source(r.content as unknown as OrganizationContent));
      for (const item of items) if (old.some(o => o.title === item.title && o.key !== item.key && !items.some(current => current.key === o.key)) && !old.some(o => o.key === item.key)) invalid('content', '已發布子項請保留原識別值，修改名稱即可。');
    };
    if (kind === 'department') {
      const source = (v: OrganizationContent) => (v as DepartmentContent).activities.map(a => ({ key: a.slug, title: a.name }));
      check(source(content), source);
      const experiences = (v: OrganizationContent) => ((v as DepartmentContent).experiences ?? []).map(e => ({ key: e.id, title: e.title }));
      check(experiences(content), experiences);
    } else {
      const source = (v: OrganizationContent) => (v as TeamContent).activities.map(a => ({ key: a.id, title: a.name }));
      check(source(content), source);
    }
  }
  private async publicDepartments(tx: Prisma.TransactionClient, replacement?: { id: string; content: DepartmentContent | null }) {
    const rows = await organizationStore(tx, 'department').resources.findMany({ include: organizationIncludes });
    return rows.flatMap(r => replacement && r.id === replacement.id ? replacement.content ? [replacement.content] : [] : r.publishedRevision?.status === 'PUBLISHED' ? [r.publishedRevision.content as unknown as DepartmentContent] : []);
  }
  private checkSidebar(departments: DepartmentContent[]) {
    const routes = new Set(departments.flatMap(d => [`/eesa/${d.id}`, `/eesa/${d.id}/activities`, ...(d.skills ? [`/eesa/${d.id}/skills`] : []), ...d.activities.map(a => `/eesa/${d.id}/activities/${a.slug}`), ...(d.experiences ?? []).map(e => `/eesa/${d.id}/experiences/${e.id}`)]));
    for (const d of departments) for (const link of d.extraSidebarItems) if (link.to && !routes.has(link.to)) throw new ConflictException(`部門 ${d.id} 的側欄指向未公開內容：${link.to}`);
  }
  async command(userId: string, kind: OrganizationKind, id: string, command: string, body: unknown) {
    if (!['submit', 'withdraw', 'reject', 'publish', 'unpublish', 'restore'].includes(command)) throw new NotFoundException('找不到此操作。');
    const input = inputObject(body, ['version', ...(command === 'reject' ? ['reason'] : command === 'restore' ? ['revisionId'] : [])]);
    const version = versionOf(input.version);
    return serializable(this.db, async tx => {
      const { user, row } = await this.resource(tx, userId, kind, id);
      if (row.version !== version) throw new ConflictException('內容已更新，請重新載入。');
      if (user.role !== 'ADMIN' && ['publish', 'reject', 'unpublish'].includes(command)) throw new ForbiddenException('此操作僅限管理員。');
      const store = organizationStore(tx, kind);
      let pointers: { workingRevisionId?: string | null; publishedRevisionId?: string | null } = {};
      if (command === 'restore') {
        if (row.workingRevisionId) throw new ConflictException('已有工作版本，不能覆寫。');
        if (typeof input.revisionId !== 'string') invalid('revisionId', '請選擇歷史版本。');
        const source = await store.revisions.findFirst({ where: { resourceId: id, id: input.revisionId } });
        if (!source) throw new NotFoundException('找不到歷史版本。');
        const content = validateOrganization(kind, source.content, id);
        const latest = row.publishedRevision ?? await store.revisions.findFirst({ where: { resourceId: id }, orderBy: { number: 'desc' } });
        const publishedOrder = latest?.content as { order?: number } | undefined;
        if (user.role !== 'ADMIN' && kind !== 'overview' && publishedOrder) (content as { order: number }).order = publishedOrder.order!;
        const last = await store.revisions.findFirst({ where: { resourceId: id }, orderBy: { number: 'desc' } });
        const revision = await store.revisions.create({ data: { resourceId: id, number: (last?.number ?? 0) + 1, content: json(content) } });
        await this.refs(tx, kind, id, revision.id, content);
        pointers = { workingRevisionId: revision.id };
      } else if (command === 'unpublish') {
        if (!row.publishedRevisionId) throw new BadRequestException('此內容尚未公開。');
        if (kind === 'department') this.checkSidebar(await this.publicDepartments(tx, { id, content: null }));
        pointers = { publishedRevisionId: null };
      } else {
        const working = row.workingRevision;
        if (!working || working.status !== (command === 'submit' ? 'DRAFT' : 'SUBMITTED')) throw new ConflictException('目前版本狀態無法執行此操作。');
        if (command === 'submit' || command === 'publish') {
          const content = validateOrganization(kind, working.content, id);
          if (kind === 'department') this.checkSidebar(await this.publicDepartments(tx, { id, content: content as DepartmentContent }));
          const normalized = await this.refs(tx, kind, id, working.id, content, command === 'publish');
          await store.revisions.update({ where: { id: working.id }, data: { content: json(normalized), status: command === 'publish' ? 'PUBLISHED' : 'SUBMITTED', ...(command === 'publish' ? { publishedAt: new Date() } : { submittedAt: new Date(), rejectionNote: null }) } });
          if (command === 'publish') pointers = { publishedRevisionId: working.id, workingRevisionId: null };
        } else {
          if (command === 'reject' && (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000)) invalid('reason', '請填寫 1–2000 字退回原因。');
          await store.revisions.update({ where: { id: working.id }, data: { status: 'DRAFT', submittedAt: null, rejectionNote: command === 'reject' ? (input.reason as string).trim() : null } });
        }
      }
      await store.resources.update({ where: { id, version }, data: { ...pointers, version: { increment: 1 } } });
      await this.audit(tx, userId, kind, id, command);
      return this.envelope(tx, kind, id);
    });
  }
  publicEesa() { return this.db.$transaction(async tx => {
    const overview = await organizationStore(tx, 'overview').resources.findUnique({ where: { id: 'overview' }, include: organizationIncludes });
    const departments = await this.publicDepartments(tx);
    return { overview: overview?.publishedRevision?.status === 'PUBLISHED' ? overview.publishedRevision.content : null, departments: departments.sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) };
  }, { isolationLevel: 'RepeatableRead' }); }
  publicTeams() { return this.db.$transaction(async tx => {
    const rows = await organizationStore(tx, 'team').resources.findMany({ include: organizationIncludes });
    const teams = rows.flatMap(r => r.publishedRevision?.status === 'PUBLISHED' ? [r.publishedRevision.content as unknown as import('../../shared/organization-content').TeamContent] : []);
    return { teams: teams.sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) };
  }, { isolationLevel: 'RepeatableRead' }); }
}

@Controller('admin/eesa/overview')
@UseGuards(SessionGuard)
export class OverviewCmsController {
  constructor(@Inject(OrganizationService) private readonly content: OrganizationService) {}
  @Get('') detail(@Req() req: AuthRequest) { return this.content.read(req.authUser!.id, 'overview', 'overview', 'detail'); }
  @Get('revisions') revisions(@Req() req: AuthRequest) { return this.content.read(req.authUser!.id, 'overview', 'overview', 'revisions'); }
  @Get('preview') preview(@Req() req: AuthRequest) { return this.content.read(req.authUser!.id, 'overview', 'overview', 'preview'); }
  @Put('draft') save(@Req() req: AuthRequest, @Body() body: unknown) { return this.content.save(req.authUser!.id, 'overview', 'overview', body); }
  @Post(':command') @HttpCode(200) command(@Req() req: AuthRequest, @Param('command') command: string, @Body() body: unknown) { return this.content.command(req.authUser!.id, 'overview', 'overview', command, body); }
}

@Controller('admin/eesa/departments')
@UseGuards(SessionGuard)
export class DepartmentCmsController {
  constructor(@Inject(OrganizationService) private readonly content: OrganizationService) {}
  @Get() list(@Req() req: AuthRequest) { return this.content.list(req.authUser!.id, 'department'); }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.read(req.authUser!.id, 'department', id, 'detail'); }
  @Get(':id/revisions') revisions(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.read(req.authUser!.id, 'department', id, 'revisions'); }
  @Get(':id/preview') preview(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.read(req.authUser!.id, 'department', id, 'preview'); }
  @Put(':id/draft') save(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.content.save(req.authUser!.id, 'department', id, body); }
  @Post(':id/:command') @HttpCode(200) command(@Req() req: AuthRequest, @Param('id') id: string, @Param('command') command: string, @Body() body: unknown) { return this.content.command(req.authUser!.id, 'department', id, command, body); }
}

@Controller('admin/teams')
@UseGuards(SessionGuard)
export class TeamCmsController {
  constructor(@Inject(OrganizationService) private readonly content: OrganizationService) {}
  @Get() list(@Req() req: AuthRequest) { return this.content.list(req.authUser!.id, 'team'); }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.read(req.authUser!.id, 'team', id, 'detail'); }
  @Get(':id/revisions') revisions(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.read(req.authUser!.id, 'team', id, 'revisions'); }
  @Get(':id/preview') preview(@Req() req: AuthRequest, @Param('id') id: string) { return this.content.read(req.authUser!.id, 'team', id, 'preview'); }
  @Put(':id/draft') save(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.content.save(req.authUser!.id, 'team', id, body); }
  @Post(':id/:command') @HttpCode(200) command(@Req() req: AuthRequest, @Param('id') id: string, @Param('command') command: string, @Body() body: unknown) { return this.content.command(req.authUser!.id, 'team', id, command, body); }
}

@Controller('public')
export class PublicOrganizationController {
  constructor(@Inject(OrganizationService) private readonly content: OrganizationService) {}
  @Get('eesa/content') eesa() { return this.content.publicEesa(); }
  @Get('teams/content') teams() { return this.content.publicTeams(); }
}
