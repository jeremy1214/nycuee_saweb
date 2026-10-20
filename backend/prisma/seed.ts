import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash, argon2id } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: await hash('admin', { type: argon2id }),
      role: 'ADMIN',
    },
  });
  console.log('Initial admin is available; existing accounts were preserved.');
}

main().catch(() => {
  console.error('Admin initialization failed. Check database configuration.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
