import { apiRequest, apiMutation } from './api';
import type { OrganizationKind, OrganizationContent, OrganizationResource, OrganizationRevision } from '../../../../shared/organization-content';
import type { MediaScope } from '../../../../shared/cms-contract';
export const organizationPath = (kind: OrganizationKind, id?: string) => kind === 'overview' ? 'admin/eesa/overview' : `${kind === 'department' ? 'admin/eesa/departments' : 'admin/teams'}${id ? '/' + encodeURIComponent(id) : ''}`;
export const organizationAdminLink = (kind: OrganizationKind, id: string) => '/' + organizationPath(kind, id);
export const organizationMediaScope = (kind: OrganizationKind, id: string): MediaScope => kind === 'overview' ? { overviewId: id } : kind === 'department' ? { departmentId: id } : { teamId: id };
export const listOrganizations = (kind: 'department' | 'team') => apiRequest<{ items: OrganizationResource[] }>(organizationPath(kind));
export async function loadOrganization(kind: OrganizationKind, id: string) {
  const [resource, history] = await Promise.all([apiRequest<OrganizationResource>(organizationPath(kind, id)), apiRequest<{ items: OrganizationRevision[] }>(`${organizationPath(kind, id)}/revisions`)]);
  const content = resource.workingRevision?.content ?? history.items.find(r => r.id === resource.publishedRevisionId)?.content ?? history.items[0]?.content;
  if (!content) throw new Error('此資源沒有內容版本，請先匯入資料。');
  return { resource, revisions: history.items, content };
}
export const saveOrganization = (kind: OrganizationKind, id: string, version: number, content: OrganizationContent) => apiMutation<OrganizationResource>(`${organizationPath(kind, id)}/draft`, 'PUT', { version, content });
export const organizationCommand = (kind: OrganizationKind, id: string, command: string, version: number, extra = {}) => apiMutation<OrganizationResource>(`${organizationPath(kind, id)}/${command}`, 'POST', { version, ...extra });
