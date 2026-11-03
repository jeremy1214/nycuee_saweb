import { resetOrganizationMock, organizationMockOptions, organizationMockUsages, organizationMockMediaUsed, organizationMockRequest, OrganizationMockError } from './organizationMock';
import { OrganizationValidationError, type OrganizationKind } from '../../../../shared/organization-content';
import rawSnapshot from "virtual:legacy-activity-content";
import {
  ActivityContentError,
  parseActivityContent,
  parsePublicActivityContent,
} from "../../../../shared/activity-content";
import type { ActivityContent } from "../../../../shared/activity-content";
import type { CmsRole } from "../../../../shared/cms-contract";
import type {
  AdminActivity,
  Revision,
  Category,
  AccountDto,
  GrantsDto,
  MediaDto,
  AuditEntryDto,
} from "./cmsApi";
import { clearPreviews, registerPreview } from "./mediaPreview";

const snapshot = parsePublicActivityContent(rawSnapshot);
type StoredActivity = AdminActivity & { revisions: Revision[] };
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
let activities: StoredActivity[];
let categories: Category[];
let users: AccountDto[];
let grants: Record<string, GrantsDto>;
let media: (MediaDto & { uploaderId: string })[];
let audit: AuditEntryDto[];
let tokens: Map<string, { userId: string; expires: number; purpose: string }>;
let currentId: string | null = "demo-admin";
let inboxReadAt: string | null = null;
let sequence = 0;
const now = () => new Date().toISOString();
const next = () => `demo-${++sequence}`;
export function resetMock() {
  clearPreviews();
  resetOrganizationMock();
  inboxReadAt = null;
  sequence = 0;
  currentId = "demo-admin";
  categories = snapshot.categories.map((c) => ({ ...c, version: 1 }));
  activities = snapshot.activities.map(
    ({ id, category: _category, ...content }) => {
      const revision: Revision = {
        id: next(),
        number: 1,
        status: "PUBLISHED",
        content,
        rejectionNote: null,
        submittedAt: null,
        publishedAt: now(),
      };
      return {
        id,
        version: 1,
        publishedRevisionId: revision.id,
        workingRevisionId: null,
        workingRevision: null,
        revisions: [revision],
      };
    },
  );
  for (const [index, status] of ["DRAFT", "SUBMITTED", "DRAFT"].entries()) {
    const a = activities[index];
    const revision: Revision = {
      ...copy(a.revisions[0]),
      id: next(),
      number: 2,
      status: status as Revision["status"],
      publishedAt: null,
      submittedAt: status === "SUBMITTED" ? now() : null,
      rejectionNote: index === 2 ? "請補齊活動介紹與照片替代文字。" : null,
    };
    a.revisions.push(revision);
    a.workingRevision = revision;
    a.workingRevisionId = revision.id;
  }
  const {
    date: _date,
    endDate: _endDate,
    ...undatedContent
  } = copy(activities[0].revisions[0].content);
  const undated: Revision = {
    id: next(),
    number: 1,
    status: "DRAFT",
    content: { ...undatedContent, title: "示範常態介紹（無日期）" },
    rejectionNote: null,
    submittedAt: null,
    publishedAt: null,
  };
  activities.push({
    id: "demo-undated",
    version: 1,
    publishedRevisionId: null,
    workingRevisionId: undated.id,
    workingRevision: undated,
    revisions: [undated],
  });
  users = [
    {
      id: "demo-admin",
      username: "示範管理員",
      role: "ADMIN",
      enabled: true,
      version: 1,
      googleLinked: false,
      hasPassword: true,
    },
    {
      id: "demo-editor",
      username: "示範編輯者",
      role: "EDITOR",
      enabled: true,
      version: 1,
      googleLinked: false,
      hasPassword: true,
    },
  ];
  grants = {
    "demo-editor": {
      categoryIds: [categories.find((c) => c.id !== "other")!.id, "other"],
      activityIds: [],
      departmentIds: ["technical"],
      teamIds: ["basketball-men"],
    },
  };
  media = [];
  audit = [];
  tokens = new Map();
}
resetMock();
export function setMockRole(role: CmsRole) {
  currentId = role === "ADMIN" ? "demo-admin" : "demo-editor";
}
class Failure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new Failure(status, message);
}
function user() {
  const u = users.find((u) => u.id === currentId && u.enabled);
  return u ?? fail(401, "登入已過期，請重新登入。");
}
function admin() {
  if (user().role !== "ADMIN") fail(403, "此操作僅限管理員。");
}
function categoryAllowed(id: string) {
  const u = user();
  return u.role === "ADMIN" || grants[u.id]?.categoryIds.includes(id);
}
function organizationAllowed(kind: OrganizationKind, id: string) {
  const u = user();
  return u.role === 'ADMIN' || (kind === 'department' && !!grants[u.id]?.departmentIds?.includes(id)) || (kind === 'team' && !!grants[u.id]?.teamIds?.includes(id));
}
function mediaScopeAllowed(scope: Record<string, unknown>) {
  const keys = ['activityId', 'categoryId', 'overviewId', 'departmentId', 'teamId'].filter(k => scope[k] !== undefined);
  if (keys.length !== 1) fail(400, '請選擇且只選擇一個內容範圍。');
  const selected = keys[0]; const id = String(scope[selected]);
  if (selected === 'activityId') activity(id);
  else if (selected === 'categoryId') { if (!categoryAllowed(id)) fail(403, '沒有分類授權。'); }
  else if (!organizationAllowed(selected === 'overviewId' ? 'overview' : selected === 'departmentId' ? 'department' : 'team', id)) fail(403, '沒有內容授權。');
  return { [selected]: id };
}
function contentOf(a: StoredActivity) {
  return (
    a.workingRevision?.content ??
    a.revisions.find((v) => v.id === a.publishedRevisionId)?.content ??
    a.revisions[a.revisions.length - 1].content
  );
}
function allowed(a: StoredActivity) {
  return (
    categoryAllowed(contentOf(a).categoryId) ||
    !!grants[user().id]?.activityIds.includes(a.id)
  );
}
function activity(id: string) {
  const a = activities.find((a) => a.id === id) ?? fail(404, "找不到活動。");
  if (!allowed(a)) fail(403, "活動授權已變更，無法存取。");
  return a;
}
function locked(version: number, expected: number) {
  if (version !== expected) fail(409, "內容已被更新，請重新載入最新版本。");
}
function record(action: string, entityType: string, entityId: string) {
  audit.unshift({
    id: next(),
    actorId: currentId,
    action,
    entityType,
    entityId,
    details: null,
    createdAt: now(),
  });
}
function valid(value: unknown): ActivityContent {
  const c = parseActivityContent(value, "content");
  if (!categories.some((x) => x.id === c.categoryId)) fail(400, "分類不存在。");
  return c;
}
function envelope(a: StoredActivity): AdminActivity {
  const { revisions: _revisions, ...dto } = a;
  return copy(dto);
}
function tokenLink(u: AccountDto, purpose: string) {
  for (const [key, value] of tokens)
    if (value.userId === u.id && value.purpose === purpose) tokens.delete(key);
  const token =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");
  tokens.set(token, { userId: u.id, expires: Date.now() + 1800000, purpose });
  return {
    url: `${location.origin}/#/admin/set-password?token=${token}`,
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
  };
}
function featuredValid(id: string, categoryId: string) {
  const a = activities.find((a) => a.id === id);
  const content = a?.revisions.find(
    (v) => v.id === a.publishedRevisionId,
  )?.content;
  if (!content?.detail || content.categoryId !== categoryId)
    fail(409, "精選入口必須指向同分類且有詳細頁的公開活動。");
}
function used(src: string) {
  return organizationMockMediaUsed(src) || activities.some((a) =>
    a.revisions.some((v) => JSON.stringify(v.content).includes(src)),
  );
}
async function dispatch(
  path: string,
  method: string,
  body: Record<string, any>,
  url: URL,
): Promise<unknown> {
  const organization = organizationMockRequest(path, method, body, { allowed: organizationAllowed, admin, role: () => user().role, audit: record, media });
  if (organization !== undefined) return organization;
  if (path === "auth/csrf") return { csrfToken: "d".repeat(64) };
  if (path === "auth/login") {
    if (!["admin", "editor"].includes(body.username))
      fail(401, "示範帳號為 admin 或 editor。");
    setMockRole(body.username === "admin" ? "ADMIN" : "EDITOR");
    return { user: user() };
  }
  if (path === "auth/logout") {
    currentId = null;
    return { ok: true };
  }
  if (path === "auth/password/consume") {
    const token = tokens.get(body.token);
    if (
      !token ||
      token.expires <= Date.now() ||
      body.password?.length < 12 ||
      body.password?.length > 1024
    )
      fail(400, "連結無效、已過期或密碼長度不符。");
    const u =
      users.find((u) => u.id === token.userId && u.enabled) ??
      fail(400, "連結無效。");
    u.hasPassword = true;
    u.version++;
    tokens.delete(body.token);
    if (currentId === u.id) currentId = null;
    return { ok: true };
  }
  if (path === "auth/me") {
    const { id, username, role } = user();
    return { user: { id, username, role } };
  }
  if (path === "auth/google/link") {
    user().googleLinked = true;
    record("GOOGLE_LINK", "User", user().id);
    return { url: "/#/admin/profile?linked=1" };
  }
  if (path === "auth/password/change" && method === "POST") {
    const u = user();
    if (!body.currentPassword || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 1024)
      fail(400, "請提供目前密碼及 12–1024 字元的新密碼。");
    u.hasPassword = true;
    u.version++;
    record("PASSWORD_CHANGE", "User", u.id);
    currentId = null;
    return { ok: true };
  }
  user();
  if (path === "admin/activities" && method === "GET")
    return { items: activities.filter(allowed).map(envelope) };
  if (path === "admin/activities" && method === "POST") {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.id) ||
      ["other", "overview"].includes(body.id)
    )
      fail(400, "識別值請使用小寫英文、數字及連字號。");
    if (activities.some((a) => a.id === body.id))
      fail(409, "活動識別值已存在。");
    const content = valid(body.content);
    if (!categoryAllowed(content.categoryId)) fail(403, "沒有目標分類授權。");
    const revision: Revision = {
      id: next(),
      number: 1,
      status: "DRAFT",
      content,
      submittedAt: null,
      publishedAt: null,
      rejectionNote: null,
    };
    const a: StoredActivity = {
      id: body.id,
      version: 1,
      publishedRevisionId: null,
      workingRevisionId: revision.id,
      workingRevision: revision,
      revisions: [revision],
    };
    activities.push(a);
    record("CREATE", "Activity", a.id);
    return envelope(a);
  }
  const activityMatch = path.match(/^admin\/activities\/([^/]+)(?:\/(.+))?$/);
  if (activityMatch) {
    const [, id, action] = activityMatch;
    const a = activity(id);
    if (!action && method === "GET") return envelope(a);
    if (action === "revisions")
      return { items: copy([...a.revisions].reverse()) };
    if (action === "preview")
      return copy(
        a.workingRevision ??
          a.revisions.find((v) => v.id === a.publishedRevisionId),
      );
    locked(body.version, a.version);
    if (["publish", "reject", "unpublish"].includes(action)) admin();
    let w = a.workingRevision;
    if (action === "draft") {
      if (w?.status === "SUBMITTED") fail(400, "請先撤回送審版本。");
      const content = valid(body.content);
      if (
        content.categoryId !== contentOf(a).categoryId &&
        !categoryAllowed(content.categoryId)
      )
        fail(403, "沒有目標分類授權。");
      if (!w) {
        w = {
          id: next(),
          number: Math.max(...a.revisions.map((v) => v.number)) + 1,
          status: "DRAFT",
          content,
          rejectionNote: null,
          submittedAt: null,
          publishedAt: null,
        };
        a.revisions.push(w);
      }
      w.content = content;
      a.workingRevision = w;
      a.workingRevisionId = w.id;
    } else if (action === "restore") {
      if (w) fail(409, "已有工作版本，請先處理草稿。");
      const previous =
        a.revisions.find((v) => v.id === body.revisionId) ??
        fail(404, "版本不存在。");
      if (
        previous.content.categoryId !== contentOf(a).categoryId &&
        !categoryAllowed(previous.content.categoryId)
      )
        fail(403, "沒有目標分類授權。");
      w = {
        ...copy(previous),
        id: next(),
        number: Math.max(...a.revisions.map((v) => v.number)) + 1,
        status: "DRAFT",
        rejectionNote: null,
        submittedAt: null,
        publishedAt: null,
      };
      a.revisions.push(w);
      a.workingRevision = w;
      a.workingRevisionId = w.id;
    } else if (action === "unpublish") {
      if (!a.publishedRevisionId) fail(400, "活動尚未公開。");
      if (categories.some((c) => c.featuredActivityId === id))
        fail(409, "請先調整分類精選入口。");
      a.publishedRevisionId = null;
    } else {
      if (!w) fail(400, "沒有工作版本。");
      if (action === "submit") {
        if (w.status !== "DRAFT") fail(400, "僅草稿可送審。");
        valid(w.content);
        w.status = "SUBMITTED";
        w.submittedAt = now();
        w.rejectionNote = null;
      } else if (["withdraw", "reject", "publish"].includes(action)) {
        if (w.status !== "SUBMITTED") fail(400, "僅送審版本可執行此操作。");
        if (action === "publish") {
          valid(w.content);
          if (
            categories.some(
              (c) =>
                c.featuredActivityId === id &&
                (c.id !== w!.content.categoryId || !w!.content.detail),
            )
          )
            fail(409, "請先調整分類精選入口。");
          for (const m of media) {
            const privatePath = `/api/v1/admin/media/${m.id}/file`;
            if (JSON.stringify(w.content).includes(privatePath)) {
              if (m.activityId !== id && m.categoryId !== w.content.categoryId)
                fail(403, "圖片不在活動範圍內。");
              m.visibility = "PUBLIC";
              w.content = JSON.parse(
                JSON.stringify(w.content).replaceAll(
                  privatePath,
                  `/api/v1/public/media/${m.id}`,
                ),
              );
            }
          }
          w.status = "PUBLISHED";
          w.publishedAt = now();
          a.publishedRevisionId = w.id;
          a.workingRevision = null;
          a.workingRevisionId = null;
        } else {
          if (action === "reject" && !body.reason?.trim())
            fail(400, "請填寫退回原因。");
          w.status = "DRAFT";
          w.submittedAt = null;
          w.rejectionNote = action === "reject" ? body.reason : null;
        }
      } else fail(404, "操作不存在。");
    }
    a.version++;
    record(action.toUpperCase(), "Activity", id);
    return envelope(a);
  }
  if (path === "admin/activity-categories" && method === "GET")
    return {
      items: copy(
        categories.filter(
          (c) =>
            categoryAllowed(c.id) ||
            activities.some(
              (a) => allowed(a) && contentOf(a).categoryId === c.id,
            ),
        ),
      ),
    };
  if (path.startsWith("admin/activity-categories")) {
    admin();
    const id = path.split("/")[2] ?? body.id;
    if (
      !body.label?.trim() ||
      !body.shortLabel?.trim() ||
      !Number.isInteger(body.order) ||
      body.order < 0
    )
      fail(400, "分類欄位不完整。");
    let c = categories.find((c) => c.id === id);
    if (method === "POST") {
      if (c) fail(409, "分類已存在。");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
        fail(400, "分類識別值格式不符。");
      c = {
        id,
        label: body.label,
        shortLabel: body.shortLabel,
        order: body.order,
        version: 1,
      };
      categories.push(c);
    } else {
      if (!c) fail(404, "分類不存在。");
      locked(body.version, c.version);
      if (body.featuredActivityId) featuredValid(body.featuredActivityId, id);
      Object.assign(c, body, { version: c.version + 1 });
      if (!body.featuredActivityId) delete c.featuredActivityId;
    }
    record("SAVE", "ActivityCategory", id);
    return copy(c);
  }
  if (path === "admin/users" && method === "GET") {
    admin();
    return { items: copy(users) };
  }
  if (path === "admin/users" && method === "POST") {
    admin();
    if (!body.username?.trim()) fail(400, "請填帳號。");
    if (users.some((u) => u.username === body.username))
      fail(409, "帳號已存在。");
    const u: AccountDto = {
      id: next(),
      username: body.username,
      role: body.role,
      enabled: true,
      version: 1,
      googleLinked: false,
      hasPassword: false,
    };
    users.push(u);
    grants[u.id] = { categoryIds: [], activityIds: [] };
    record("CREATE", "User", u.id);
    return { user: copy(u), activation: tokenLink(u, "ACTIVATE") };
  }
  if (path === "admin/users/grant-options" && method === "GET") {
    admin();
    return {
      departments: organizationMockOptions("department"),
      teams: organizationMockOptions("team"),
      categories: categories.map(c => ({ id: c.id, label: c.label })),
      activities: activities.map(a => ({ id: a.id, title: (a.revisions.find(r => r.id === a.workingRevisionId)
        ?? a.revisions.find(r => r.id === a.publishedRevisionId) ?? a.revisions[0])?.content.title ?? a.id })),
    };
  }
  if (path.startsWith("admin/users/")) {
    admin();
    const [, , id, action] = path.split("/");
    const u = users.find((u) => u.id === id) ?? fail(404, "帳號不存在。");
    if (action === "grants" && method === "GET")
      return copy(grants[id] ?? { categoryIds: [], activityIds: [] });
    locked(body.version, u.version);
    if (action === "password-token") {
      record("PASSWORD_TOKEN", "User", id);
      return tokenLink(u, body.purpose);
    }
    if (action === "grants") {
      grants[id] = {
        categoryIds: body.categoryIds,
        activityIds: body.activityIds,
        departmentIds: body.departmentIds ?? grants[id]?.departmentIds ?? [],
        teamIds: body.teamIds ?? grants[id]?.teamIds ?? [],
      };
      u.version++;
    } else {
      if (
        u.enabled &&
        u.role === "ADMIN" &&
        (!body.enabled || body.role !== "ADMIN") &&
        users.filter((u) => u.enabled && u.role === "ADMIN").length === 1
      )
        fail(409, "必須保留至少一位啟用中的管理員。");
      Object.assign(u, {
        enabled: body.enabled,
        role: body.role,
        version: u.version + 1,
      });
    }
    record("UPDATE", "User", id);
    return copy(u);
  }
  if (path === "admin/media") {
    const scope =
      method === "GET" ? Object.fromEntries(url.searchParams) : body;
    const selectedScope = mediaScopeAllowed(scope);
    if (method === "GET")
      return {
        items: copy(
          media
            .filter(m => Object.entries(selectedScope).every(([key, value]) => (m as unknown as Record<string, unknown>)[key] === value))
            .map(({ uploaderId: _u, ...dto }) => dto),
        ),
      };
    const file = body.file as File;
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10485760
    )
      fail(400, "請選擇 10 MiB 內的 JPEG、PNG 或 WebP。");
    const bitmap = await createImageBitmap(file).catch(() =>
      fail(400, "無法解碼圖片。"),
    );
    const { width, height } = bitmap;
    bitmap.close();
    if (width * height > 40000000) fail(400, "圖片超過 40MP。");
    const m = {
      id: next(),
      originalName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      width,
      height,
      visibility: "PRIVATE",
      createdAt: now(),
      uploaderId: user().id,
      ...selectedScope,
    } as (typeof media)[number];
    media.push(m);
    registerPreview(m.id, file);
    record("UPLOAD", "Media", m.id);
    const { uploaderId: _u, ...dto } = m;
    return dto;
  }
  if (/^admin\/media\/[^/]+\/references$/.test(path) && method === 'GET') {
    const id = path.split('/')[2];
    const m = media.find(m => m.id === id) ?? fail(404, '圖片不存在。');
    mediaScopeAllowed(Object.fromEntries(['activityId','categoryId','overviewId','departmentId','teamId'].flatMap(key => { const value = (m as unknown as Record<string, unknown>)[key]; return value ? [[key,value]] : []; })));
    const activityRefs = activities.filter(allowed).flatMap(a => a.revisions.flatMap(v => {
      const refs: { entityType: string; entityId: string; title: string; number: number; path: string; href: string }[] = [];
      function walk(value: unknown, path: string) { if (!value || typeof value !== 'object') return; if ('src' in value && (value.src === `/api/v1/admin/media/${id}/file` || value.src === `/api/v1/public/media/${id}`)) refs.push({ entityType: 'Activity', entityId: a.id, title: contentOf(a).title, number: v.number, path, href: `/admin/activities/${a.id}` }); Object.entries(value).forEach(([key, child]) => walk(child, `${path}.${key}`)); }
      walk(v.content, 'content'); return refs;
    }));
    return { items: [...activityRefs, ...organizationMockUsages(id, organizationAllowed)] };
  }
  if (path.startsWith("admin/media/") && method === "DELETE") {
    const id = path.split("/")[2];
    const m = media.find((m) => m.id === id) ?? fail(404, "圖片不存在。");
    mediaScopeAllowed(Object.fromEntries(["activityId", "categoryId", "overviewId", "departmentId", "teamId"].flatMap(key => { const value = (m as unknown as Record<string, unknown>)[key]; return value ? [[key, value]] : []; })));
    if (user().role !== "ADMIN" && m.uploaderId !== user().id)
      fail(403, "只能刪除自己上傳的圖片。");
    if (
      m.visibility === "PUBLIC" ||
      used(`/api/v1/admin/media/${id}/file`) ||
      used(`/api/v1/public/media/${id}`)
    )
      fail(409, "圖片已公開或仍被版本引用。");
    media = media.filter((m) => m.id !== id);
    record("DELETE", "Media", id);
    return { ok: true };
  }
  if (path === "admin/audit-entries") {
    admin();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const filtered = audit.filter(
      (a) =>
        (!url.searchParams.get("entityType") ||
          a.entityType === url.searchParams.get("entityType")) &&
        (!url.searchParams.get("entityId") ||
          a.entityId === url.searchParams.get("entityId")),
    );
    return {
      items: copy(filtered.slice((page - 1) * 20, page * 20)),
      page,
      pageSize: 20,
      total: filtered.length,
    };
  }
  if (path.startsWith("admin/contact-messages")) {
    admin();
    const message = {
      id: "demo-message",
      name: "示範訪客",
      email: "demo@example.com",
      category: "website",
      subject: "網站內容更新詢問",
      message: "這是示範模式的聯絡訊息。",
      createdAt: now(),
      readAt: inboxReadAt,
    };
    if (path === "admin/contact-messages") {
      const items =
        url.searchParams.get("read") === "unread" && inboxReadAt
          ? []
          : [message];
      return {
        items,
        page: 1,
        pageSize: 20,
        total: items.length,
        unreadCount: inboxReadAt ? 0 : 1,
      };
    }
    if (method === "PATCH") inboxReadAt = inboxReadAt ?? now();
    return { ...message, readAt: inboxReadAt };
  }
  fail(404, "此服務尚未提供。");
}
export async function mockRequest(
  input: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> {
  const url = new URL(String(input), location.origin);
  const method = options?.method ?? "GET";
  try {
    if (
      !["GET", "HEAD"].includes(method) &&
      !(options?.headers as Record<string, string>)?.["X-CSRF-Token"]
    )
      fail(403, "缺少 CSRF Token。");
    const body =
      options?.body instanceof FormData
        ? Object.fromEntries(options.body)
        : typeof options?.body === "string"
          ? JSON.parse(options.body)
          : {};
    const data = await dispatch(
      decodeURI(url.pathname.replace("/api/v1/", "")),
      method,
      body,
      url,
    );
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof OrganizationValidationError) return Response.json({ message: e.message, fieldErrors: e.fieldErrors }, { status: 400 });
    if (e instanceof OrganizationMockError) return Response.json({ message: e.message }, { status: e.status });
    if (e instanceof ActivityContentError)
      return Response.json(
        {
          message: "請檢查活動欄位。",
          fieldErrors: [{ path: e.path, message: e.message }],
        },
        { status: 400 },
      );
    if (e instanceof Failure)
      return Response.json({ message: e.message }, { status: e.status });
    throw e;
  }
}
