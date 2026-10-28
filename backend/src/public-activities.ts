import { Controller, Get, Inject, Injectable, NotFoundException, Param } from '@nestjs/common';
import { ActivityRevision, Prisma } from '@prisma/client';
import { parseActivityContent, parsePublicActivityContent } from '../../shared/activity-content';
import { Database } from './database';

export function revisionContent(revision: ActivityRevision) {
  return parseActivityContent({
    title: revision.title, categoryId: revision.categoryId, summary: revision.summary, details: revision.details,
    ...(revision.date ? { date: revision.date.toISOString().slice(0, 10) } : {}),
    ...(revision.endDate ? { endDate: revision.endDate.toISOString().slice(0, 10) } : {}),
    ...(revision.location !== null ? { location: revision.location } : {}),
    links: revision.links,
    ...(revision.detail !== null ? { detail: revision.detail } : {}),
    ...(revision.album !== null ? { album: revision.album } : {}),
  });
}

export async function publicSnapshot(tx: Prisma.TransactionClient) {
  const categories = await tx.activityCategory.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  const resources = await tx.activity.findMany({ where: { publishedRevisionId: { not: null } }, include: { publishedRevision: true }, orderBy: { id: 'asc' } });
  const labels = new Map(categories.map(c => [c.id, c.label]));
  const activities = resources.flatMap(resource => {
    const revision = resource.publishedRevision;
    if (!revision || revision.status !== 'PUBLISHED') return [];
    return [{ id: resource.id, category: labels.get(revision.categoryId), ...revisionContent(revision) }];
  });
  return parsePublicActivityContent({
    activities,
    categories: categories.map(c => ({
      id: c.id, label: c.label, shortLabel: c.shortLabel, order: c.order,
      // Defensive filtering avoids stale featured links before the publishing service exists.
      ...(activities.some(a => a.id === c.featuredActivityId && a.categoryId === c.id && a.detail)
        ? { featuredActivityId: c.featuredActivityId } : {}),
    })),
  });
}

@Injectable()
export class PublicActivityService {
  constructor(@Inject(Database) private readonly db: Database) {}
  snapshot() {
    return this.db.$transaction(tx => publicSnapshot(tx), { isolationLevel: 'RepeatableRead' });
  }
}

@Controller('public')
export class PublicActivityController {
  constructor(@Inject(PublicActivityService) private readonly content: PublicActivityService) {}
  @Get('activity-content')
  snapshot() { return this.content.snapshot(); }
  @Get('activities')
  async list() { return { items: (await this.content.snapshot()).activities }; }
  @Get('activity-categories')
  async categories() { return { items: (await this.content.snapshot()).categories }; }
  @Get('activities/:id')
  async detail(@Param('id') id: string) {
    const activity = (await this.content.snapshot()).activities.find(a => a.id === id);
    if (!activity) throw new NotFoundException('找不到公開活動。');
    return activity;
  }
}
