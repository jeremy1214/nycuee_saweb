import { apiRequest, apiMutation } from "./api";
import type {
  ActivityContent,
  ActivityCategoryOption,
} from "../../../../shared/activity-content";
import type {
  AccountDto,
  GrantsDto,
  MediaDto,
  MediaScope,
  AuditEntryDto,
  PasswordTokenLinkDto,
  GrantOptionsDto,
} from "../../../../shared/cms-contract";
export type { AccountDto, GrantsDto, MediaDto, MediaScope, AuditEntryDto };
export interface Revision {
  id: string;
  number: number;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED";
  content: ActivityContent;
  rejectionNote: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
}
export interface AdminActivity {
  id: string;
  version: number;
  publishedRevisionId: string | null;
  workingRevisionId: string | null;
  workingRevision: Revision | null;
}
export interface Category extends ActivityCategoryOption {
  version: number;
  order: number;
}
export interface ActivityRecord {
  activity: AdminActivity;
  revisions: Revision[];
  content: ActivityContent;
}
const key = encodeURIComponent;
export const listActivities = () =>
  apiRequest<{ items: AdminActivity[] }>("admin/activities");
export const listCategories = () =>
  apiRequest<{ items: Category[] }>("admin/activity-categories");
export const listRevisions = (id: string) =>
  apiRequest<{ items: Revision[] }>(`admin/activities/${key(id)}/revisions`);
export async function loadActivity(id: string): Promise<ActivityRecord> {
  const [activity, { items: revisions }] = await Promise.all([
    apiRequest<AdminActivity>(`admin/activities/${key(id)}`),
    listRevisions(id),
  ]);
  const content =
    activity.workingRevision?.content ??
    revisions.find((v) => v.id === activity.publishedRevisionId)?.content ??
    revisions[0]?.content;
  if (!content) throw new Error("此活動沒有可讀取的內容版本。");
  return { activity, revisions, content };
}
export async function loadActivities() {
  const { items } = await listActivities();
  return Promise.all(items.map((a) => loadActivity(a.id)));
}
export const createActivity = (id: string, content: ActivityContent) =>
  apiMutation<AdminActivity>("admin/activities", "POST", { id, content });
export const saveDraft = (
  id: string,
  version: number,
  content: ActivityContent,
) =>
  apiMutation<AdminActivity>(`admin/activities/${key(id)}/draft`, "PUT", {
    version,
    content,
  });
export const activityCommand = (
  id: string,
  command: string,
  version: number,
  extra = {},
) =>
  apiMutation<AdminActivity>(`admin/activities/${key(id)}/${command}`, "POST", {
    version,
    ...extra,
  });
export const saveCategory = (category: Category, create = false) => {
  const { id, version, ...content } = category;
  return apiMutation<Category>(
    `admin/activity-categories${create ? "" : "/" + key(id)}`,
    create ? "POST" : "PUT",
    create
      ? {
          id,
          label: content.label,
          shortLabel: content.shortLabel,
          order: content.order,
        }
      : {
          version,
          ...content,
          featuredActivityId: content.featuredActivityId ?? null,
        },
  );
};
export const listAccounts = () =>
  apiRequest<{ items: AccountDto[] }>("admin/users");
export const getGrantOptions = () =>
  apiRequest<GrantOptionsDto>("admin/users/grant-options");
export const createAccount = (username: string, role: string) =>
  apiMutation<{ user: AccountDto; activation: PasswordTokenLinkDto }>(
    "admin/users",
    "POST",
    { username, role },
  );
export const updateAccount = (a: AccountDto) =>
  apiMutation<AccountDto>(`admin/users/${key(a.id)}`, "PATCH", {
    version: a.version,
    role: a.role,
    enabled: a.enabled,
  });
export const getGrants = (id: string) =>
  apiRequest<GrantsDto>(`admin/users/${key(id)}/grants`);
export const saveGrants = (a: AccountDto, grants: GrantsDto) =>
  apiMutation<AccountDto>(`admin/users/${key(a.id)}/grants`, "PUT", {
    version: a.version,
    ...grants,
  });
export const issueToken = (
  id: string,
  version: number,
  purpose: "ACTIVATE" | "RESET",
) =>
  apiMutation<PasswordTokenLinkDto>(
    `admin/users/${key(id)}/password-token`,
    "POST",
    { version, purpose },
  );
export const consumeToken = (token: string, password: string) =>
  apiMutation<{ ok: boolean }>("auth/password/consume", "POST", {
    token,
    password,
  });
export const changePassword = (currentPassword: string, password: string) =>
  apiMutation<{ ok: boolean }>("auth/password/change", "POST", { currentPassword, password });
export const linkGoogle = () =>
  apiMutation<{ url: string }>("auth/google/link", "POST");
export const listMedia = (scope: MediaScope) =>
  apiRequest<{ items: MediaDto[] }>(
    `admin/media?${new URLSearchParams(Object.entries(scope).filter(([, v]) => v !== undefined) as [string, string][])}`,
  );
export const uploadMedia = (scope: MediaScope, file: File) => {
  const body = new FormData();
  body.append("file", file);
  Object.entries(scope).forEach(([name, value]) => body.append(name, value));
  return apiMutation<MediaDto>("admin/media", "POST", body);
};
export const deleteMedia = (id: string) =>
  apiMutation<{ ok: boolean }>(`admin/media/${key(id)}`, "DELETE");
export const listAudit = (page: number, entityType: string, entityId: string) =>
  apiRequest<{
    items: AuditEntryDto[];
    total: number;
    page: number;
    pageSize: number;
  }>(
    `admin/audit-entries?${new URLSearchParams({ page: String(page), entityType, entityId })}`,
  );
export const mediaPath = (m: MediaDto) =>
  m.visibility === "PUBLIC"
    ? `/api/v1/public/media/${key(m.id)}`
    : `/api/v1/admin/media/${key(m.id)}/file`;
