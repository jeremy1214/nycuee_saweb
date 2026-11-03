import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get,
  HttpCode, Inject, Injectable, NotFoundException, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { argon2id, hash, verify } from 'argon2';
import { Request } from 'express';
import type { AccountDto, GrantsDto } from '../../shared/cms-contract';
import { AdminGuard, AuthRequest, AuthService, SessionGuard } from './auth';
import { organizationStore } from './organization-store';
import { Database } from './database';
import {
  appOrigin, digest, inputObject, invalid, passwordOf, roleOf, secret,
  serializable, versionOf, writeAudit,
} from './account-utils';

type AccountRow = User & { googleIdentity: { id: string } | null };
const includeIdentity = { googleIdentity: { select: { id: true } } } as const;
const accountDto = (user: AccountRow): AccountDto => ({
  id: user.id, username: user.username, role: user.role, enabled: user.enabled,
  version: user.version, googleLinked: !!user.googleIdentity, hasPassword: !!user.passwordHash,
});
const badToken = () => new BadRequestException('連結無效或已過期，請向管理員索取新連結。');

function ids(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length > 1000
    || value.some(id => typeof id !== 'string' || !id.length || id.length > 200)
    || new Set(value).size !== value.length) invalid(path, '請提供不重複的有效識別值陣列（最多 1000 筆）。');
  return value as string[];
}

@Injectable()
export class AccountService {
  constructor(@Inject(Database) private readonly db: Database) {}

  private async actor(tx: Prisma.TransactionClient, actorId: string) {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (!actor?.enabled || actor.role !== 'ADMIN') throw new ForbiddenException('此功能僅限管理員。');
  }

  private async target(tx: Prisma.TransactionClient, id: string, version?: number) {
    const user = await tx.user.findUnique({ where: { id }, include: includeIdentity });
    if (!user) throw new NotFoundException('找不到此帳號。');
    if (version !== undefined && user.version !== version) throw new ConflictException('帳號已被更新，請重新載入。');
    return user;
  }

  async list() {
    const users = await this.db.user.findMany({ include: includeIdentity, orderBy: [{ username: 'asc' }, { id: 'asc' }] });
    return { items: users.map(accountDto) };
  }

  async options() {
    return this.db.$transaction(async tx => {
      const categories = await tx.activityCategory.findMany({
        select: { id: true, label: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
      });
      const activities = await tx.activity.findMany({
        include: { workingRevision: { select: { title: true } }, publishedRevision: { select: { title: true } } },
        orderBy: { id: 'asc' },
      });
      const options = async (kind: 'department' | 'team') => (await organizationStore(tx, kind).resources.findMany({ include: { workingRevision: true, publishedRevision: true } })).map(r => ({ id: r.id, title: ((r.workingRevision ?? r.publishedRevision)?.content as { title?: string; name?: string } | undefined)?.title ?? ((r.workingRevision ?? r.publishedRevision)?.content as { name?: string } | undefined)?.name ?? r.id }));
      return { categories, departments: await options('department'), teams: await options('team'), activities: activities.map(a => ({
        id: a.id, title: a.workingRevision?.title ?? a.publishedRevision?.title ?? a.id,
      })) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  private async token(tx: Prisma.TransactionClient, userId: string, purpose: 'ACTIVATE' | 'RESET', actorId: string) {
    const token = secret();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const url = `${appOrigin()}/#/admin/set-password?token=${token}`;
    await tx.passwordToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordToken.create({ data: { userId, purpose, tokenHash: digest(token), expiresAt } });
    await writeAudit(tx, actorId, 'account.password-token-issued', userId, { purpose });
    return { url, expiresAt: expiresAt.toISOString() };
  }

  async create(actorId: string, body: unknown) {
    const input = inputObject(body, ['username', 'role']);
    if (typeof input.username !== 'string' || !input.username.trim()
      || input.username.length > 100 || /[\u0000-\u001f\u007f]/.test(input.username)) invalid('username', '帳號須為 1–100 字元且不含控制字元。');
    const username = input.username.trim();
    const role = roleOf(input.role);
    return serializable(this.db, async tx => {
      await this.actor(tx, actorId);
      const user = await tx.user.create({ data: { username, role }, include: includeIdentity });
      const activation = await this.token(tx, user.id, 'ACTIVATE', actorId);
      await writeAudit(tx, actorId, 'account.created', user.id, { username, role });
      return { user: accountDto(user), activation };
    });
  }

  async update(actorId: string, id: string, body: unknown) {
    const input = inputObject(body, ['version', 'role', 'enabled']);
    const version = versionOf(input.version);
    if (input.role === undefined && input.enabled === undefined) invalid('', '請指定角色或啟用狀態。');
    const role = input.role === undefined ? undefined : roleOf(input.role);
    if (input.enabled !== undefined && typeof input.enabled !== 'boolean') invalid('enabled', '啟用狀態須為布林值。');
    const enabled = input.enabled as boolean | undefined;
    return serializable(this.db, async tx => {
      await this.actor(tx, actorId);
      const previous = await this.target(tx, id, version);
      if (previous.role === 'ADMIN' && previous.enabled && (role === 'EDITOR' || enabled === false)) {
        if (await tx.user.count({ where: { id: { not: id }, role: 'ADMIN', enabled: true,
          OR: [{ passwordHash: { not: null } }, { googleIdentity: { isNot: null } }],
        } }) < 1) {
          throw new ConflictException('不能停用或降級最後一位啟用中的管理員。');
        }
      }
      const user = await tx.user.update({
        where: { id, version }, data: { role, enabled, version: { increment: 1 } }, include: includeIdentity,
      });
      if (!user.enabled) {
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.passwordToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: new Date() } });
      }
      await writeAudit(tx, actorId, 'account.updated', id, {
        previousRole: previous.role, role: user.role, previousEnabled: previous.enabled, enabled: user.enabled,
      });
      return accountDto(user);
    });
  }

  async grants(id: string): Promise<GrantsDto> {
    return this.db.$transaction(async tx => {
      await this.target(tx, id);
      const [categories, activities, departments, teams] = await Promise.all([
        tx.categoryGrant.findMany({ where: { userId: id }, orderBy: { categoryId: 'asc' } }),
        tx.activityGrant.findMany({ where: { userId: id }, orderBy: { activityId: 'asc' } }),
        tx.departmentGrant.findMany({ where: { userId: id }, orderBy: { departmentId: 'asc' } }),
        tx.teamGrant.findMany({ where: { userId: id }, orderBy: { teamId: 'asc' } }),
      ]);
      return { categoryIds: categories.map(g => g.categoryId), activityIds: activities.map(g => g.activityId), departmentIds: departments.map(g => g.departmentId), teamIds: teams.map(g => g.teamId) };
    }, { isolationLevel: 'RepeatableRead' });
  }

  async replaceGrants(actorId: string, id: string, body: unknown) {
    const input = inputObject(body, ['version', 'categoryIds', 'activityIds', 'departmentIds', 'teamIds']);
    const version = versionOf(input.version);
    const categoryIds = ids(input.categoryIds, 'categoryIds');
    const activityIds = ids(input.activityIds, 'activityIds');
    const departmentIds = input.departmentIds === undefined ? undefined : ids(input.departmentIds, 'departmentIds');
    const teamIds = input.teamIds === undefined ? undefined : ids(input.teamIds, 'teamIds');
    return serializable(this.db, async tx => {
      await this.actor(tx, actorId);
      await this.target(tx, id, version);
      if (await tx.activityCategory.count({ where: { id: { in: categoryIds } } }) !== categoryIds.length) invalid('categoryIds', '包含不存在的分類。');
      if (await tx.activity.count({ where: { id: { in: activityIds } } }) !== activityIds.length) invalid('activityIds', '包含不存在的活動。');
      if (departmentIds !== undefined) {
        if (await tx.department.count({ where: { id: { in: departmentIds } } }) !== departmentIds.length) invalid('departmentIds', '包含不存在的部門。');
        await tx.departmentGrant.deleteMany({ where: { userId: id } });
        if (departmentIds.length) await tx.departmentGrant.createMany({ data: departmentIds.map(departmentId => ({ userId: id, departmentId })) });
      }
      if (teamIds !== undefined) {
        if (await tx.team.count({ where: { id: { in: teamIds } } }) !== teamIds.length) invalid('teamIds', '包含不存在的系隊。');
        await tx.teamGrant.deleteMany({ where: { userId: id } });
        if (teamIds.length) await tx.teamGrant.createMany({ data: teamIds.map(teamId => ({ userId: id, teamId })) });
      }
      await tx.categoryGrant.deleteMany({ where: { userId: id } });
      await tx.activityGrant.deleteMany({ where: { userId: id } });
      if (categoryIds.length) await tx.categoryGrant.createMany({ data: categoryIds.map(categoryId => ({ userId: id, categoryId })) });
      if (activityIds.length) await tx.activityGrant.createMany({ data: activityIds.map(activityId => ({ userId: id, activityId })) });
      const user = await tx.user.update({ where: { id, version }, data: { version: { increment: 1 } }, include: includeIdentity });
      await writeAudit(tx, actorId, 'account.grants-replaced', id, { categoryIds, activityIds, ...(departmentIds ? { departmentIds } : {}), ...(teamIds ? { teamIds } : {}) });
      return accountDto(user);
    });
  }

  async issue(actorId: string, id: string, body: unknown) {
    const input = inputObject(body, ['version', 'purpose']);
    const version = versionOf(input.version);
    if (input.purpose !== 'ACTIVATE' && input.purpose !== 'RESET') invalid('purpose', '請選擇啟用或重設用途。');
    const purpose = input.purpose;
    return serializable(this.db, async tx => {
      await this.actor(tx, actorId);
      const user = await this.target(tx, id, version);
      if (!user.enabled) throw new ConflictException('請先啟用帳號。');
      if (purpose === 'ACTIVATE' && user.passwordHash) throw new ConflictException('帳號已啟用，請改用密碼重設。');
      return this.token(tx, id, purpose, actorId);
    });
  }

  async consume(body: unknown) {
    const input = inputObject(body, ['token', 'password']);
    if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) throw badToken();
    const tokenHash = digest(input.token);
    const password = passwordOf(input.password);
    const ticket = await this.db.passwordToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!ticket || ticket.usedAt || ticket.expiresAt <= new Date() || !ticket.user.enabled) throw badToken();
    const passwordHash = await hash(password, { type: argon2id });
    return serializable(this.db, async tx => {
      const current = await tx.passwordToken.findUnique({ where: { tokenHash }, include: { user: true } });
      const now = new Date();
      if (!current || current.usedAt || current.expiresAt <= now || !current.user.enabled) throw badToken();
      const consumed = await tx.passwordToken.updateMany({
        where: { id: current.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now },
      });
      if (consumed.count !== 1) throw badToken();
      await tx.user.update({ where: { id: current.userId }, data: { passwordHash, version: { increment: 1 } } });
      await tx.passwordToken.updateMany({ where: { userId: current.userId, usedAt: null }, data: { usedAt: now } });
      await tx.session.deleteMany({ where: { userId: current.userId } });
      await writeAudit(tx, current.userId, 'account.password-set', current.userId, { purpose: current.purpose });
      return { ok: true };
    });
  }

  async changePassword(userId: string, body: unknown) {
    const input = inputObject(body, ['currentPassword', 'password']);
    const password = passwordOf(input.password);
    if (typeof input.currentPassword !== 'string' || input.currentPassword.length > 1024) invalid('currentPassword', '請輸入目前密碼。');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user?.enabled || !user.passwordHash || !await verify(user.passwordHash, input.currentPassword)) {
      throw new BadRequestException('目前密碼不正確，或此帳號須透過管理員重設密碼。');
    }
    if (input.currentPassword === password) invalid('password', '請使用不同的新密碼。');
    const passwordHash = await hash(password, { type: argon2id });
    return serializable(this.db, async tx => {
      const fresh = await this.target(tx, userId, user.version);
      if (!fresh.enabled || fresh.passwordHash !== user.passwordHash) throw new ConflictException('帳號已變更，請重新登入。');
      await tx.user.update({ where: { id: userId }, data: { passwordHash, version: { increment: 1 } } });
      await tx.passwordToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.session.deleteMany({ where: { userId } });
      await writeAudit(tx, userId, 'account.password-changed', userId);
      return { ok: true };
    });
  }

  async audit(pageInput?: string, entityType?: string, entityId?: string) {
    if (pageInput !== undefined && !/^[1-9]\d*$/.test(pageInput)) throw new BadRequestException('無效的頁碼。');
    const page = Number(pageInput ?? 1);
    if (!Number.isSafeInteger(page) || page > 1000000 || (entityType?.length ?? 0) > 100 || (entityId?.length ?? 0) > 200) throw new BadRequestException('無效的查詢條件。');
    const where = { ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.auditEntry.findMany({ where, skip: (page - 1) * 20, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      this.db.auditEntry.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return { items, total, page, pageSize: 20 };
  }
}

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AccountController {
  constructor(@Inject(AccountService) private readonly accounts: AccountService) {}
  @Get() list() { return this.accounts.list(); }
  @Get('grant-options') options() { return this.accounts.options(); }
  @Post() create(@Req() req: AuthRequest, @Body() body: unknown) { return this.accounts.create(req.authUser!.id, body); }
  @Patch(':id') update(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.accounts.update(req.authUser!.id, id, body); }
  @Get(':id/grants') grants(@Param('id') id: string) { return this.accounts.grants(id); }
  @Put(':id/grants') grantsUpdate(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.accounts.replaceGrants(req.authUser!.id, id, body); }
  @Post(':id/password-token') @HttpCode(200)
  issue(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) { return this.accounts.issue(req.authUser!.id, id, body); }
}

@Controller('auth/password')
export class PasswordController {
  constructor(@Inject(AccountService) private readonly accounts: AccountService, @Inject(AuthService) private readonly auth: AuthService) {}
  @Post('consume') @HttpCode(200)
  async consume(@Req() req: Request, @Body() body: unknown) {
    await this.auth.limitLogin(req, 'password-consume');
    await this.auth.requireCsrf(req);
    return this.accounts.consume(body);
  }
  @Post('change') @HttpCode(200) @UseGuards(SessionGuard)
  async change(@Req() req: AuthRequest, @Body() body: unknown) {
    await this.auth.limitLogin(req, 'password-change');
    return this.accounts.changePassword(req.authUser!.id, body);
  }
}

@Controller('admin/audit-entries')
@UseGuards(AdminGuard)
export class AuditController {
  constructor(@Inject(AccountService) private readonly accounts: AccountService) {}
  @Get() list(@Query('page') page?: string, @Query('entityType') type?: string, @Query('entityId') id?: string) {
    return this.accounts.audit(page, type, id);
  }
}
