import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseOrganization, visitOrganizationImages, departmentIds, teamIds, type OrganizationContent, type OrganizationKind } from '../../shared/organization-content';
export const organizationLegacyRoot = () => resolve(process.env.ORGANIZATION_CONTENT_DIR || resolve(process.cwd(), '../frontend/src/content'));
export const knownMissingImages = new Set(['/eesa.jpg', '/intro/operations-group-photo.jpg', '/intro/publicity-group-photo.jpg', '/intro/technical-group-photo.jpg', '']);
export interface LegacyOrganization { kind: OrganizationKind; id: string; content: OrganizationContent }
export function readOrganizationLegacy(root = organizationLegacyRoot()): LegacyOrganization[] {
  const read = (file: string) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  const records: LegacyOrganization[] = [
    { kind: 'overview', id: 'overview', content: parseOrganization('overview', read('eesa/overview.json')) },
    ...departmentIds.map(id => ({ kind: 'department' as const, id, content: parseOrganization('department', read(`eesa/departments/${id}.json`), id) })),
    ...teamIds.map(id => ({ kind: 'team' as const, id, content: parseOrganization('team', read(`teams/${id}.json`), id) })),
  ];
  records.forEach(record => visitOrganizationImages(record.content, image => { if (knownMissingImages.has(image.src)) image.missing = true; }));
  return records;
}
export function readOrganizationManifest(root = organizationLegacyRoot()): Record<string, { bytes: number; sha256: string }> | null {
  const path = resolve(root, 'organization-image-manifest.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}
