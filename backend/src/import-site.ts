import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { importSiteLegacy, readSiteLegacy } from './site-legacy';
const args = process.argv.slice(2);
if (args.some(arg => !['--dry-run', '--inventory'].includes(arg))) throw new Error('Use site:import [--dry-run | --inventory].');
const db = new PrismaClient();
async function main() {
  if (args.includes('--inventory')) { console.log(JSON.stringify(Object.keys(readSiteLegacy()))); return; }
  console.log(JSON.stringify(await importSiteLegacy(db, args.includes('--dry-run'))));
}
main().catch(() => { console.error('Site content import failed. Existing content was preserved; inspect source and database conflicts privately.'); process.exitCode = 1; }).finally(() => db.$disconnect());
