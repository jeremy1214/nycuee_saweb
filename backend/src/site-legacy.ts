import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { isDeepStrictEqual } from 'node:util';
import { parseSiteContent, siteContentKinds, type SiteContentMap } from '../../shared/site-content';

export function readSiteLegacy(): SiteContentMap {
  const root = resolve(process.env.SITE_CONTENT_DIR || '../frontend/src/content');
  const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  const home = read('home/explore.json');
  home.slides = home.slides.map((slide: { title: string; alt?: string }) => ({ ...slide, alt: slide.alt ?? slide.title }));
  const categories = read('resources/categories.json'); delete categories.$schema;
  const pages = readdirSync(resolve(root, 'resources/pages')).filter(name => name.endsWith('.json')).sort().map(name => {
    const page = read(`resources/pages/${name}`); delete page.$schema; return page;
  });
  return { home: parseSiteContent('home', home), resources: parseSiteContent('resources', { categories, pages }), settings: parseSiteContent('settings', read('site/settings.json')) };
}
export async function importSiteLegacy(db: PrismaClient, dryRun = false, bootstrap = false) {
  const source = readSiteLegacy();
  return db.$transaction(async tx => {
    const actions: { id: string; action: string }[] = [];
    for (const id of siteContentKinds) {
      const existing = await tx.siteContent.findUnique({ where: { id }, include: { publishedRevision: true } });
      if (existing) {
        if (!bootstrap && (existing.workingRevisionId || !isDeepStrictEqual(existing.publishedRevision?.content, source[id]))) throw new Error(`Import conflict: ${id}; existing content is preserved.`);
        actions.push({ id, action: 'skip' }); continue;
      }
      actions.push({ id, action: 'create' });
      if (dryRun) continue;
      await tx.siteContent.create({ data: { id } });
      const revision = await tx.siteContentRevision.create({ data: { resourceId: id, number: 1, status: 'PUBLISHED', content: JSON.parse(JSON.stringify(source[id])) } });
      await tx.siteContent.update({ where: { id }, data: { publishedRevisionId: revision.id } });
      await tx.auditEntry.create({ data: { action: 'site.imported', entityType: 'SiteContent', entityId: id } });
    }
    return actions;
  }, { isolationLevel: 'Serializable' });
}
