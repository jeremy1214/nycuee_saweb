import 'dotenv/config';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { importLegacyContent, readLegacyContent } from './legacy-import';

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Usage: npm run content:import -- [--dry-run]');
  const dataset = readLegacyContent(
    process.env.LEGACY_CONTENT_DIR ?? resolve('../frontend/src/content/activities'),
    process.env.LEGACY_PUBLIC_DIR ?? resolve('../frontend/public'),
  );
  const db = new PrismaClient();
  try { console.log(JSON.stringify(await importLegacyContent(db, dataset, args.includes('--dry-run')), null, 2)); }
  finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Import failed.'); process.exitCode = 1; });
