/** Planned C/E interfaces; their runtime routes are not enabled by the A/G work. */
export type CmsRole = 'ADMIN' | 'EDITOR';
export type PasswordTokenPurpose = 'ACTIVATE' | 'RESET';
export interface FieldError { path: string; message: string }
export interface ApiError { message: string; fieldErrors?: FieldError[]; statusCode?: number; error?: string }
export interface AccountDto {
  id: string; username: string; role: CmsRole; enabled: boolean; version: number;
  googleLinked: boolean; hasPassword: boolean;
}
export interface GrantsDto { categoryIds: string[]; activityIds: string[] }
export interface PasswordTokenLinkDto { url: string; expiresAt: string }
export type MediaScope = { activityId: string; categoryId?: never } | { categoryId: string; activityId?: never };
export type MediaDto = MediaScope & {
  id: string; originalName: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  byteSize: number; width: number; height: number; visibility: 'PRIVATE' | 'PUBLIC';
  createdAt: string;
}
export interface AuditEntryDto {
  id: string; actorId: string | null; action: string; entityType: string; entityId: string;
  details: Record<string, unknown> | null; createdAt: string;
}
