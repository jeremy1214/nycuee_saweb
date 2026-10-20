import 'reflect-metadata';
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { AuthController, AuthService, AdminGuard } from './auth';
import { Database } from './database';

@Module({ controllers: [AuthController], providers: [Database, AuthService, AdminGuard] })
class AppModule {}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') {
    throw new Error('Production requires COOKIE_SECURE=true and HTTPS.');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  app.use(helmet());
  app.use(express.json({ limit: '8kb' }));
  app.use(cookieParser());
  app.use('/api', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
  const auth = app.get(AuthService);
  const cleanup = setInterval(() => {
    void auth.cleanup().catch(() => console.error('Session cleanup failed.'));
  }, 15 * 60 * 1000);
  cleanup.unref();
}

bootstrap().catch(() => {
  console.error('API startup failed. Check database and server configuration.');
  process.exitCode = 1;
});
