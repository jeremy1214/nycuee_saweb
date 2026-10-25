import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { AuthController, AuthService, AdminGuard } from './auth';
import { Database } from './database';
import { AdminContactController, ContactService, PublicContactController } from './contact';

@Module({
  controllers: [AuthController, PublicContactController, AdminContactController],
  providers: [Database, AuthService, AdminGuard, ContactService],
})
class AppModule {}

export async function createApp() {
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') {
    throw new Error('Production requires COOKIE_SECURE=true and HTTPS.');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use('/api', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api/v1');
  return app;
}
