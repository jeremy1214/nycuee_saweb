import 'dotenv/config';
import { AuthService } from './auth';
import { ContactService } from './contact';
import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
  const auth = app.get(AuthService);
  const contact = app.get(ContactService);
  const cleanup = setInterval(() => {
    void auth.cleanup().catch(() => console.error('Session cleanup failed.'));
    void contact.cleanup().catch(() => console.error('Contact rate limit cleanup failed.'));
  }, 15 * 60 * 1000);
  cleanup.unref();
}

bootstrap().catch(() => {
  console.error('API startup failed. Check database and server configuration.');
  process.exitCode = 1;
});
