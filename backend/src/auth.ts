import {
  Body, CanActivate, Controller, ExecutionContext, ForbiddenException,
  Get, HttpCode, HttpException, Inject, Injectable, OnModuleInit, Post, Req, Res,
  UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Session, User } from '@prisma/client';
import { hash, verify, argon2id } from 'argon2';
import { Request, Response } from 'express';
import { Database } from './database';
import { digest, secret, serializable } from './account-utils';

const cookieName = 'nycuee_session';
const sessionLifetime = 8 * 60 * 60 * 1000;
const publicUser = (user: User) => ({ id: user.id, username: user.username, role: user.role });
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax' as const,
  path: '/api',
});

export type AuthRequest = Request & { authUser?: User };

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  constructor(@Inject(Database) private readonly db: Database) {}

  async onModuleInit() {
    this.dummyHash = await hash(secret(), { type: argon2id });
  }

  async session(req: Request) {
    const token: unknown = req.cookies?.[cookieName];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    const session = await this.db.session.findUnique({
      where: { id: digest(token) }, include: { user: true },
    });
    return session && session.expiresAt.getTime() > Date.now() ? session : null;
  }

  async csrf(req: Request, res: Response) {
    const current = await this.session(req);
    if (current) {
      return { csrfToken: digest(`csrf:${req.cookies[cookieName]}`) };
    } else {
      const token = secret();
      const csrfToken = digest(`csrf:${token}`);
      // Anonymous sessions only support acquiring a token for the login form.
      const lifetime = 30 * 60 * 1000;
      await this.db.session.create({ data: {
        id: digest(token), csrfHash: digest(csrfToken), expiresAt: new Date(Date.now() + lifetime),
      } });
      res.cookie(cookieName, token, { ...cookieOptions(), maxAge: lifetime });
      req.cookies = { ...req.cookies, [cookieName]: token };
      return { csrfToken };
    }
  }

  async requireCsrf(req: Request) {
    const current = await this.session(req);
    const token = req.get('X-CSRF-Token');
    if (!current || !token || token.length !== 64 || digest(token) !== current.csrfHash) {
      throw new ForbiddenException('操作已過期，請重試。');
    }
    return current;
  }

  async limitLogin(req: Request, bucket = 'login') {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = digest(`${bucket}:${req.ip}:${minute}`);
    await this.db.loginAttempt.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
    const attempt = await this.db.loginAttempt.upsert({
      where: { key },
      create: { key, expiresAt: new Date((minute + 1) * 60000) },
      update: { count: { increment: 1 } },
    });
    if (attempt.count > 5) throw new HttpException('登入嘗試過多，請稍後再試。', 429);
  }

  async login(req: Request, res: Response, body: unknown) {
    await this.limitLogin(req);
    const previous = await this.requireCsrf(req);
    const input = body as { username?: unknown; password?: unknown } | null;
    if (!input || typeof input.username !== 'string' || typeof input.password !== 'string'
      || !input.username.length || input.username.length > 100
      || !input.password.length || input.password.length > 1024) {
      throw new UnauthorizedException('帳號或密碼不正確。');
    }
    const user = await this.db.user.findUnique({ where: { username: input.username } });
    const matches = await verify(user?.passwordHash ?? this.dummyHash, input.password);
    if (!user || !user.passwordHash || !matches || !user.enabled) throw new UnauthorizedException('帳號或密碼不正確。');
    return this.establish(previous.id, user, res);
  }

  async establish(previousId: string, user: User, res: Response) {
    const token = secret();
    const current = await serializable(this.db, async tx => {
      const fresh = await tx.user.findUnique({ where: { id: user.id } });
      if (!fresh?.enabled || fresh.version !== user.version) throw new UnauthorizedException('帳號狀態已變更，請重新登入。');
      const previous = await tx.session.findUnique({ where: { id: previousId } });
      if (!previous || previous.expiresAt <= new Date()) throw new UnauthorizedException('登入流程已過期，請重試。');
      await tx.session.delete({ where: { id: previousId } });
      await tx.session.create({ data: {
        id: digest(token), csrfHash: digest(digest(`csrf:${token}`)), userId: fresh.id,
        expiresAt: new Date(Date.now() + sessionLifetime),
      } });
      return fresh;
    });
    res.cookie(cookieName, token, { ...cookieOptions(), maxAge: sessionLifetime });
    return { user: publicUser(current) };
  }

  async logout(req: Request, res: Response) {
    const current: Session = await this.requireCsrf(req);
    await this.db.session.deleteMany({ where: { id: current.id } });
    res.clearCookie(cookieName, cookieOptions());
    return { ok: true };
  }

  async admin(req: Request) {
    const user = await this.authenticated(req);
    if (user.role !== 'ADMIN') throw new ForbiddenException('此帳號沒有後台管理權限。');
    return user;
  }

  async authenticated(req: Request) {
    const current = await this.session(req);
    if (!current?.user?.enabled) throw new UnauthorizedException('請先登入。');
    return current.user;
  }

  async cleanup() {
    await this.db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.db.googleAuthFlow.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await this.db.passwordToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    req.authUser = await this.auth.authenticated(req);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) await this.auth.requireCsrf(req);
    return true;
  }
}

// Apply this guard to every future admin controller. It reads current account state per request.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    req.authUser = await this.auth.admin(req);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) await this.auth.requireCsrf(req);
    return true;
  }
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('csrf')
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.csrf(req, res);
  }

  @Post('login')
  @HttpCode(200)
  login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) {
    return this.auth.login(req, res, body);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() req: AuthRequest) { return { user: publicUser(req.authUser!) }; }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }
}
