/** Shared account, content-scope and media contracts, including organization CMS scopes. */
export type CmsRole = 'ADMIN' | 'EDITOR';
export type PasswordTokenPurpose = 'ACTIVATE' | 'RESET';
export interface FieldError { path: string; message: string }
export interface ApiError { message: string; fieldErrors?: FieldError[]; statusCode?: number; error?: string }
export interface AccountDto {
  id: string; username: string; role: CmsRole; enabled: boolean; version: number;
  googleLinked: boolean; hasPassword: boolean;
}
export interface GrantsDto { categoryIds: string[]; activityIds: string[]; departmentIds?: string[]; teamIds?: string[] }
export interface GrantOptionsDto {
  categories: { id: string; label: string }[];
  activities: { id: string; title: string }[];
  departments?: { id: string; title: string }[];
  teams?: { id: string; title: string }[];
}
export interface PasswordTokenLinkDto { url: string; expiresAt: string }
type ScopeKey = 'activityId' | 'categoryId' | 'overviewId' | 'departmentId' | 'teamId' | 'siteContentId';
export type MediaScope = { [K in ScopeKey]: { [P in K]: string } & { [P in Exclude<ScopeKey, K>]?: never } }[ScopeKey];
export type MediaDto = MediaScope & {
  id: string; originalName: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  byteSize: number; width: number; height: number; visibility: 'PRIVATE' | 'PUBLIC';
  createdAt: string; revokedAt?: string | null;
}
export interface AuditEntryDto {
  id: string; actorId: string | null; action: string; entityType: string; entityId: string;
  details: Record<string, unknown> | null; createdAt: string;
}
