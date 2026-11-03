import { Prisma } from '@prisma/client';
import type { OrganizationKind } from '../../shared/organization-content';
export interface StoredRevision { id: string; resourceId: string; number: number; status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'; content: Prisma.JsonValue; rejectionNote: string | null; submittedAt: Date | null; publishedAt: Date | null }
export interface StoredResource { id: string; version: number; publishedRevisionId: string | null; workingRevisionId: string | null; workingRevision?: StoredRevision | null; publishedRevision?: StoredRevision | null }
interface ResourceDelegate {
  findUnique(args: { where: { id: string }; include?: { workingRevision: true; publishedRevision: true } }): Promise<StoredResource | null>;
  findMany(args?: { include?: { workingRevision: true; publishedRevision: true }; orderBy?: { id: 'asc' } }): Promise<StoredResource[]>;
  create(args: { data: { id: string } }): Promise<StoredResource>;
  update(args: { where: { id: string; version?: number }; data: { version?: { increment: number }; publishedRevisionId?: string | null; workingRevisionId?: string | null } }): Promise<StoredResource>;
}
interface RevisionDelegate {
  findMany(args: { where: { resourceId: string }; orderBy?: { number: 'desc' } }): Promise<StoredRevision[]>;
  findFirst(args: { where: { resourceId: string; id?: string }; orderBy?: { number: 'desc' } }): Promise<StoredRevision | null>;
  create(args: { data: { resourceId: string; number: number; content: Prisma.InputJsonValue; status?: 'DRAFT' | 'PUBLISHED'; publishedAt?: Date } }): Promise<StoredRevision>;
  update(args: { where: { id: string }; data: { content?: Prisma.InputJsonValue; status?: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'; submittedAt?: Date | null; publishedAt?: Date; rejectionNote?: string | null } }): Promise<StoredRevision>;
}
interface ReferenceDelegate {
  deleteMany(args: { where: { revisionId: string } }): Promise<unknown>;
  createMany(args: { data: { revisionId: string; path: string; mediaId: string }[] }): Promise<unknown>;
}
/** The three models deliberately share this persistence shape; casts stay at this boundary. */
export function organizationStore(tx: Prisma.TransactionClient, kind: OrganizationKind) {
  const delegates = kind === 'overview' ? [tx.eesaOverview, tx.eesaOverviewRevision, tx.eesaOverviewMediaReference]
    : kind === 'department' ? [tx.department, tx.departmentRevision, tx.departmentMediaReference]
    : [tx.team, tx.teamRevision, tx.teamMediaReference];
  return { resources: delegates[0] as unknown as ResourceDelegate, revisions: delegates[1] as unknown as RevisionDelegate, references: delegates[2] as unknown as ReferenceDelegate };
}
export const organizationIncludes = { workingRevision: true, publishedRevision: true } as const;
export const organizationEntity = (kind: OrganizationKind) => kind === 'overview' ? 'EesaOverview' : kind === 'department' ? 'Department' : 'Team';
