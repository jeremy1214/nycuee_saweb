import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { parseActivityDataset, type ActivityContent } from '../../shared/activity-content';
import { revisionContent } from './public-activities';

type LegacyDataset = ReturnType<typeof parseActivityDataset> & { imageCount: number };
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const normalize = (content: ActivityContent) => ({ ...content, links: content.links ?? [] });

export function readLegacyContent(directory: string, publicDirectory?: string): LegacyDataset {
  const modules = Object.fromEntries(readdirSync(resolve(directory, 'events')).filter(n => n.endsWith('.json')).sort()
    .map(name => [name, json(resolve(directory, 'events', name))]));
  const dataset = parseActivityDataset(json(resolve(directory, 'categories.json')), modules);
  for (const item of dataset.parsedActivities) {
    if (['overview', 'other'].includes(item.id)) throw new Error(`Reserved activity ID: ${item.id}`);
  }
  const paths = new Set<string>();
  function walk(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'src' && typeof child === 'string') paths.add(child);
      else walk(child);
    }
  }
  dataset.parsedActivities.forEach(walk);
  const manifestPath = resolve(directory, 'image-manifest.json');
  const manifest = existsSync(manifestPath) ? json(manifestPath) as Record<string, { sha256: string; bytes: number }> : null;
  const physicalRoot = publicDirectory && existsSync(publicDirectory) ? realpathSync(publicDirectory) : null;
  for (const path of paths) {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\?#\0]/.test(path) || path.split('/').includes('..')) {
      throw new Error(`Unsafe legacy image path: ${path}`);
    }
    if (physicalRoot) {
      const file = realpathSync(resolve(physicalRoot, path.slice(1)));
      const child = relative(physicalRoot, file);
      if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) throw new Error(`Image escapes public directory: ${path}`);
      const bytes = readFileSync(file);
      if (manifest && (!manifest[path] || manifest[path].bytes !== bytes.length || manifest[path].sha256 !== createHash('sha256').update(bytes).digest('hex'))) {
        throw new Error(`Image manifest mismatch: ${path}`);
      }
    } else if (!manifest?.[path] || !/^[a-f0-9]{64}$/.test(manifest[path].sha256) || manifest[path].bytes <= 0) {
      throw new Error(`Missing image or build-time image manifest entry: ${path}`);
    }
  }
  return { ...dataset, imageCount: paths.size };
}

export async function importLegacyContent(db: PrismaClient, dataset: LegacyDataset, dryRun = false) {
  return db.$transaction(async tx => {
    // Serialize import commands; serializable isolation also rejects concurrent content edits.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2900261029)`;
    const existingCategories = await tx.activityCategory.findMany();
    const existingActivities = await tx.activity.findMany({ include: { publishedRevision: true, revisions: true } });
    const categoriesById = new Map(existingCategories.map(c => [c.id, c]));
    const activitiesById = new Map(existingActivities.map(a => [a.id, a]));
    const conflicts: string[] = [];
    dataset.activityCategories.forEach((category, order) => {
      const existing = categoriesById.get(category.id);
      if (existing && (existing.label !== category.label || existing.shortLabel !== category.shortLabel || existing.order !== order
        || existing.featuredActivityId !== (category.featuredActivityId ?? null))) conflicts.push(`category:${category.id}`);
      if (!existing && existingCategories.some(c => c.label === category.label)) conflicts.push(`category-label:${category.label}`);
    });
    for (const { id, status, ...content } of dataset.parsedActivities) {
      const existing = activitiesById.get(id);
      if (!existing) continue;
      const snapshot = status === 'published' ? existing.publishedRevision
        : status === 'archived' && !existing.publishedRevisionId && existing.revisions.length === 1 ? existing.revisions[0] : null;
      if (existing.workingRevisionId || !snapshot || (status === 'published' && snapshot.status !== 'PUBLISHED')
        || !isDeepStrictEqual(normalize(content), normalize(revisionContent(snapshot)))) {
        conflicts.push(`activity:${id}`);
      }
    }
    if (conflicts.length) throw new Error(`Import aborted; conflicting database records: ${conflicts.join(', ')}`);
    const newCategories = dataset.activityCategories.filter(c => !categoriesById.has(c.id));
    const newActivities = dataset.parsedActivities.filter(a => !activitiesById.has(a.id));
    const report = {
      dryRun, activities: dataset.parsedActivities.length, categories: dataset.activityCategories.length, images: dataset.imageCount,
      createActivities: newActivities.length, skipActivities: dataset.parsedActivities.length - newActivities.length,
      createCategories: newCategories.length, skipCategories: dataset.activityCategories.length - newCategories.length,
    };
    if (dryRun || (!newCategories.length && !newActivities.length)) return report;
    for (const [order, category] of dataset.activityCategories.entries()) {
      if (!categoriesById.has(category.id)) await tx.activityCategory.create({ data: { id: category.id, label: category.label, shortLabel: category.shortLabel, order } });
    }
    for (const { id, status, ...content } of newActivities) {
      await tx.activity.create({ data: { id } });
      const revision = await tx.activityRevision.create({ data: {
        ...content, links: (content.links ?? []) as unknown as Prisma.InputJsonValue,
        detail: content.detail as unknown as Prisma.InputJsonValue | undefined,
        album: content.album as unknown as Prisma.InputJsonValue | undefined,
        date: content.date ? new Date(`${content.date}T00:00:00.000Z`) : undefined,
        endDate: content.endDate ? new Date(`${content.endDate}T00:00:00.000Z`) : undefined,
        activityId: id, number: 1, status: status === 'published' ? 'PUBLISHED' : 'DRAFT',
        ...(status === 'published' ? { publishedAt: new Date() } : {}),
      } });
      await tx.activity.update({ where: { id }, data: status === 'published' ? { publishedRevisionId: revision.id }
        : status === 'draft' ? { workingRevisionId: revision.id } : {} });
    }
    for (const category of newCategories) {
      if (category.featuredActivityId) await tx.activityCategory.update({ where: { id: category.id }, data: { featuredActivityId: category.featuredActivityId } });
    }
    await tx.auditEntry.create({ data: { action: 'legacy.import', entityType: 'ActivityContent', entityId: 'legacy-json', details: report } });
    return report;
  }, { isolationLevel: 'Serializable', timeout: 30000 });
}
