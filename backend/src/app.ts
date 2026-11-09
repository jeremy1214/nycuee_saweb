import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { AuthController, AuthService, AdminGuard, SessionGuard } from './auth';
import { Database } from './database';
import { HealthController } from './health';
import { AdminContactController, ContactService, PublicContactController } from './contact';
import { PublicActivityController, PublicActivityService } from './public-activities';
import { AccountController, AccountService, AuditController, PasswordController } from './accounts';
import { GoogleAuthController, GoogleAuthService } from './google-auth';
import { AdminCategoryReadController, AdminContentReadController, AdminContentReadService, ContentAccess, ContentScopeGuard } from './content-access';
import { appOrigin } from './account-utils';
import { anonymousSessionLimits } from './security-config';
import { MediaService, AdminMediaController, PublicMediaController } from './media';
import { OrganizationService, OverviewCmsController, DepartmentCmsController, TeamCmsController, PublicOrganizationController } from './organization';
import { ActivityWorkflow, ActivityWriteController, CategoryService, CategoryWriteController } from './activity-workflow';

@Module({
  controllers: [OverviewCmsController, DepartmentCmsController, TeamCmsController, PublicOrganizationController, HealthController, AuthController, PublicContactController, AdminContactController, PublicActivityController,
    AccountController, PasswordController, AuditController, GoogleAuthController, AdminContentReadController, AdminCategoryReadController,
    AdminMediaController, PublicMediaController, ActivityWriteController, CategoryWriteController],
  providers: [OrganizationService, Database, AuthService, AdminGuard, SessionGuard, ContactService, PublicActivityService,
    AccountService, GoogleAuthService, ContentAccess, ContentScopeGuard, AdminContentReadService,
    MediaService, ActivityWorkflow, CategoryService],
})
class AppModule {}

export async function createApp() {
  appOrigin();
  anonymousSessionLimits();
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') {
    throw new Error('Production requires COOKIE_SECURE=true and HTTPS.');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  app.use(helmet({ strictTransportSecurity: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api/v1');
  return app;
}
