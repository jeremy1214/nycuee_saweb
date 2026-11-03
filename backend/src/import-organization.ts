import 'dotenv/config';
import { createHash } from 'node:crypto';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { visitOrganizationImages, type OrganizationContent, type DepartmentContent, type TeamContent } from '../../shared/organization-content';
import { organizationLegacyRoot, readOrganizationLegacy, readOrganizationManifest, type LegacyOrganization } from './organization-legacy';
import { organizationEntity, organizationIncludes, organizationStore } from './organization-store';
export function organizationInventory(records: LegacyOrganization[]) {
  const root = organizationLegacyRoot();
  const manifest = readOrganizationManifest(root);
  const publicDirectory = resolve(process.env.ORGANIZATION_PUBLIC_DIR || '../frontend/public');
  const physical = existsSync(publicDirectory) ? realpathSync(publicDirectory) : null;
  const images = new Set<string>(); const missing: { kind: string; id: string; path: string; src: string }[] = [];
  records.forEach(record => visitOrganizationImages(record.content, (image, path) => {
    if (image.missing) { missing.push({ kind: record.kind, id: record.id, path, src: image.src }); return; }
    images.add(image.src);
  }));
  for (const src of images) {
    if (physical) {
      const file = realpathSync(resolve(physical, src.slice(1))); const child = relative(physical, file);
      if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) throw new Error(`Image outside public: ${src}`);
      const bytes = readFileSync(file);
      if (!bytes.length || manifest && (manifest[src]?.bytes !== bytes.length || manifest[src]?.sha256 !== createHash('sha256').update(bytes).digest('hex'))) throw new Error(`Image manifest mismatch: ${src}`);
    } else if (!manifest?.[src] || manifest[src].bytes <= 0 || !/^[a-f0-9]{64}$/.test(manifest[src].sha256)) throw new Error(`Image missing from manifest: ${src}`);
  }
  return { overview: records.filter(r => r.kind === 'overview').length, departments: records.filter(r => r.kind === 'department').length, teams: records.filter(r => r.kind === 'team').length, images: [...images].sort(), missing };
}
export async function importOrganizations(db: PrismaClient, records: LegacyOrganization[], dryRun = false, compare = false) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2026110302)`;
    const conflicts: string[] = []; const pending: LegacyOrganization[] = []; const unchanged: string[] = [];
    for (const record of records) {
      const store = organizationStore(tx, record.kind);
      const row = await store.resources.findUnique({ where: { id: record.id }, include: organizationIncludes });
      const key = `${record.kind}:${record.id}`;
      if (!row) { if (compare) conflicts.push(`${key}:missing`); else pending.push(record); continue; }
      if (row.workingRevisionId || !row.publishedRevision || row.publishedRevision.status !== 'PUBLISHED' || !isDeepStrictEqual(row.publishedRevision.content, record.content)) conflicts.push(key);
      else unchanged.push(key);
    }
    if (conflicts.length) throw new Error(`Import aborted; database content differs: ${conflicts.join(', ')}`);
    if (!dryRun && !compare) for (const record of pending) {
      const store = organizationStore(tx, record.kind);
      await store.resources.create({ data: { id: record.id } });
      const revision = await store.revisions.create({ data: { resourceId: record.id, number: 1, status: 'PUBLISHED', publishedAt: new Date(), content: record.content as unknown as Prisma.InputJsonValue } });
      await store.resources.update({ where: { id: record.id }, data: { publishedRevisionId: revision.id } });
      await tx.auditEntry.create({ data: { action: `${record.kind}.legacy-imported`, entityType: organizationEntity(record.kind), entityId: record.id } });
    }
    return { dryRun, compare, create: pending.map(r => `${r.kind}:${r.id}`), unchanged };
  }, { isolationLevel: 'Serializable', timeout: 60000 });
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--dry-run', '--inventory', '--compare', '--compare-public'].includes(arg)) || args.length > 1) throw new Error('Usage: npm run organization:import -- [--dry-run|--inventory|--compare|--compare-public]');
  const records = readOrganizationLegacy();
  const inventory = organizationInventory(records);
  if (args.includes('--inventory')) { console.log(JSON.stringify(inventory, null, 2)); return; }
  if (args.includes('--compare-public')) {
    if (!process.env.APP_ORIGIN) throw new Error('APP_ORIGIN is required for public comparison.');
    const read = async (path: string) => {
      const target = new URL(`/api/v1/public/${path}`, process.env.ORGANIZATION_PUBLIC_ORIGIN || process.env.APP_ORIGIN);
      if (process.env.ORGANIZATION_PUBLIC_ORIGIN) {
        // Node fetch derives Host from the URL; use HTTP directly when addressing the
        // Compose service by name while preserving Caddy's configured virtual host.
        const body = await new Promise<string>((resolve, reject) => {
          const get = target.protocol === 'https:' ? httpsGet : httpGet;
          const request = get(target, { headers: { Host: new URL(process.env.APP_ORIGIN!).host }, timeout: 15000 }, response => {
            if (response.statusCode !== 200) { response.resume(); reject(new Error(`Public API failed: ${path} (${response.statusCode})`)); return; }
            let data = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => resolve(data));
            response.on('error', reject);
          });
          request.on('timeout', () => request.destroy(new Error('Public API comparison timed out.')));
          request.on('error', reject);
        });
        return JSON.parse(body);
      }
      const response = await fetch(target, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (!response.ok) throw new Error(`Public API failed: ${path} (${response.status})`);
      return response.json();
    };
    const [eesa, teams] = await Promise.all([read('eesa/content'), read('teams/content')]);
    const sort = <T extends { order: number; id: string }>(items: T[]) => items.sort((a,b) => a.order-b.order || a.id.localeCompare(b.id));
    const expectedEesa = { overview: records.find(r => r.kind === 'overview')!.content, departments: sort(records.filter(r => r.kind === 'department').map(r => r.content as DepartmentContent)) };
    const expectedTeams = { teams: sort(records.filter(r => r.kind === 'team').map(r => r.content as TeamContent)) };
    if (!isDeepStrictEqual(eesa, expectedEesa) || !isDeepStrictEqual(teams, expectedTeams)) throw new Error('Public API content differs from the 14 imported resources.');
    console.log(JSON.stringify({ publicContentMatches: true, overview: 1, departments: 4, teams: 9 }, null, 2)); return;
  }
  const db = new PrismaClient();
  try { console.log(JSON.stringify({ inventory, ...await importOrganizations(db, records, args.includes('--dry-run'), args.includes('--compare')) }, null, 2)); }
  finally { await db.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : 'Import failed.'); process.exitCode = 1; });
