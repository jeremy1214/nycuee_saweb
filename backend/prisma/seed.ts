import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash, argon2id } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  if (await prisma.user.findUnique({ where: { username: 'admin' } })) {
    console.log('Existing admin account preserved.');
    return;
  }
  const password = process.env.ADMIN_INITIAL_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'admin' : '');
  if (!password || (process.env.NODE_ENV === 'production' && password.length < 12) || password.length > 1024) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD to 12–1024 characters for first production initialization.');
  }
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: await hash(password, { type: argon2id }),
      role: 'ADMIN',
    },
  });
  console.log('Initial admin is available; existing accounts were preserved.');
}

main().catch(() => {
  console.error('Admin initialization failed. Check database configuration.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
