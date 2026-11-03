import {
  BadRequestException, Controller, ForbiddenException, Get, HttpCode, Inject, Injectable,
  Post, Query, Req, Res, UseGuards, ConflictException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { AuthService, SessionGuard } from './auth';
import { Database } from './database';
import { appOrigin, digest, secret, serializable, writeAudit } from './account-utils';

@Injectable()
export class GoogleAuthService {
  private readonly verifier = new OAuth2Client();
  constructor(@Inject(Database) private readonly db: Database, @Inject(AuthService) private readonly auth: AuthService) {}

  private config() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new BadRequestException('尚未設定 Google 登入，請先使用帳號密碼。');
    return { clientId, clientSecret, redirectUri: `${appOrigin()}/api/v1/auth/google/callback` };
  }

  async start(req: Request, res: Response, link = false) {
    const config = this.config();
    await this.auth.limitLogin(req, 'google-start');
    if (!await this.auth.session(req)) {
      // Sets an anonymous Cookie; the flow is saved against that exact new Session.
      await this.auth.csrf(req, res);
    }
    const session = await this.auth.session(req);
    if (!session) throw new BadRequestException('登入流程已過期。');
    const user = link ? await this.auth.authenticated(req) : null;
    const state = secret();
    const nonce = secret();
    const verifier = secret();
    await this.db.googleAuthFlow.create({ data: {
      stateHash: digest(state), sessionId: session.id, nonceHash: digest(nonce), verifier,
      linkUserId: user?.id, userVersion: user?.version, expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    } });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code',
      scope: 'openid email', state, nonce, prompt: 'select_account',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
    }).toString();
    return { url: url.toString() };
  }

  async complete(req: Request, res: Response, state?: string, code?: string, providerError?: string) {
    const config = this.config();
    const session = await this.auth.session(req);
    if (!session || typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state)) {
      throw new BadRequestException('Google 登入流程無效或已過期，請重新開始。');
    }
    const flow = await serializable(this.db, async tx => {
      const saved = await tx.googleAuthFlow.findUnique({ where: { stateHash: digest(state) } });
      if (!saved || saved.sessionId !== session.id || saved.expiresAt <= new Date()) {
        throw new BadRequestException('Google 登入流程無效或已過期，請重新開始。');
      }
      await tx.googleAuthFlow.delete({ where: { stateHash: saved.stateHash } });
      return saved;
    });
    if (providerError || typeof code !== 'string' || !code.length || code.length > 4096) {
      throw new BadRequestException('Google 登入未完成，請重新開始。');
    }
    // Google's library verifies signature, issuer, audience and token expiry.
    const identity = await (async () => {
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST', signal: AbortSignal.timeout(10000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code, client_id: config.clientId, client_secret: config.clientSecret,
            redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: flow.verifier,
          }),
        });
        if (!response.ok) throw new Error('code exchange failed');
        const body = await response.json() as { id_token?: unknown };
        if (typeof body.id_token !== 'string') throw new Error('missing id token');
        const ticket = await this.verifier.verifyIdToken({ idToken: body.id_token, audience: config.clientId });
        const payload = ticket.getPayload() as (ReturnType<typeof ticket.getPayload> & { nonce?: string });
        if (!payload || !payload.sub || !payload.nonce || digest(payload.nonce) !== flow.nonceHash) throw new Error('nonce mismatch');
        return { subject: payload.sub, email: payload.email_verified ? payload.email : undefined };
      } catch {
        throw new BadRequestException('Google 身分驗證未完成，請重新登入。');
      }
    })();

    const user = await serializable(this.db, async tx => {
      const initiating = await tx.session.findUnique({ where: { id: session.id } });
      if (!initiating || initiating.expiresAt <= new Date()) throw new BadRequestException('登入流程已過期。');
      if (flow.linkUserId) {
        const current = await tx.user.findUnique({ where: { id: flow.linkUserId }, include: { googleIdentity: true } });
        if (!current?.enabled || initiating.userId !== current.id || current.version !== flow.userVersion) {
          throw new ForbiddenException('帳號狀態已變更，請重新登入後綁定。');
        }
        const existing = await tx.googleIdentity.findUnique({ where: { subject: identity.subject } });
        if ((existing && existing.userId !== current.id)
          || (current.googleIdentity && current.googleIdentity.subject !== identity.subject)) {
          throw new ConflictException('此 Google 身分或目前帳號已有其他綁定。');
        }
        if (!existing) await tx.googleIdentity.create({ data: { userId: current.id, ...identity } });
        const updated = await tx.user.update({ where: { id: current.id }, data: { version: { increment: 1 } } });
        await writeAudit(tx, current.id, 'account.google-linked', current.id);
        return updated;
      }
      const linked = await tx.googleIdentity.findUnique({ where: { subject: identity.subject }, include: { user: true } });
      if (!linked?.user.enabled) throw new ForbiddenException('此 Google 身分尚未獲授權，請先使用帳密登入並主動綁定。');
      return linked.user;
    });
    await this.auth.establish(session.id, user, res);
    res.redirect(302, `${appOrigin()}/#/admin${flow.linkUserId ? '/profile?linked=1' : ''}`);
  }
}

@Controller('auth/google')
export class GoogleAuthController {
  constructor(@Inject(GoogleAuthService) private readonly google: GoogleAuthService) {}
  @Get('start')
  async start(@Req() req: Request, @Res() res: Response) {
    const { url } = await this.google.start(req, res);
    res.redirect(302, url);
  }
  @Post('link') @HttpCode(200) @UseGuards(SessionGuard)
  link(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.google.start(req, res, true); }
  @Get('callback')
  callback(@Req() req: Request, @Res() res: Response, @Query('state') state?: string,
    @Query('code') code?: string, @Query('error') error?: string) {
    return this.google.complete(req, res, state, code, error);
  }
}
