import rawEesa from 'virtual:legacy-eesa-content';
import rawTeams from 'virtual:legacy-team-content';
import { parsePublicEesa, parsePublicTeams, parseOrganization, visitOrganizationImages, type OrganizationKind, type OrganizationResource, type OrganizationRevision, type OrganizationContent, type DepartmentContent } from '../../../../shared/organization-content';
import type { MediaDto } from '../../../../shared/cms-contract';
type Stored = OrganizationResource & { kind: OrganizationKind; revisions: OrganizationRevision[] };
interface Context { allowed: (kind: OrganizationKind, id: string) => boolean; admin: () => void; role: () => string; audit: (action: string, entityType: string, id: string) => void; media: MediaDto[] }
export class OrganizationMockError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new OrganizationMockError(status, message); }
const clone = <T>(value: T): T => structuredClone(value);
let records: Stored[] = []; let sequence = 0;
const key = () => `org-demo-${++sequence}`;
const now = () => new Date().toISOString();
const contentOf = (r: Stored) => r.workingRevision?.content ?? r.revisions.find(v => v.id === r.publishedRevisionId)?.content ?? r.revisions[0].content;
export function resetOrganizationMock() {
  sequence = 0;
  const eesa = parsePublicEesa(rawEesa); const teams = parsePublicTeams(rawTeams);
  const seed: { kind: OrganizationKind; id: string; content: OrganizationContent }[] = [
    ...(eesa.overview ? [{ kind: 'overview' as const, id: 'overview', content: eesa.overview }] : []),
    ...eesa.departments.map(content => ({ kind: 'department' as const, id: content.id, content })),
    ...teams.teams.map(content => ({ kind: 'team' as const, id: content.id, content })),
  ];
  records = seed.map(seed => { const revision: OrganizationRevision = { id: key(), number: 1, status: 'PUBLISHED', content: clone(seed.content), rejectionNote: null, submittedAt: null, publishedAt: now() }; return { id: seed.id, kind: seed.kind, version: 1, publishedRevisionId: revision.id, workingRevisionId: null, workingRevision: null, revisions: [revision] }; });
}
resetOrganizationMock();
const envelope = ({ kind: _k, revisions: _r, ...r }: Stored) => clone(r);
export function organizationMockOptions(kind: 'department' | 'team') { return records.filter(r => r.kind === kind).map(r => { const c = contentOf(r); return { id: r.id, title: 'title' in c ? c.title : 'name' in c ? c.name : r.id }; }); }
export function organizationMockUsages(id: string, allowed: Context['allowed']) {
  return records.filter(r => allowed(r.kind, r.id)).flatMap(r => r.revisions.flatMap(revision => {
    const items: { entityType: string; entityId: string; title: string; number: number; path: string; href: string }[] = [];
    visitOrganizationImages(revision.content, (image, path) => { if (image.src === `/api/v1/admin/media/${id}/file` || image.src === `/api/v1/public/media/${id}`) items.push({ entityType: r.kind, entityId: r.id, title: r.id, number: revision.number, path: `${path}.src`, href: r.kind === 'overview' ? '/admin/eesa/overview' : r.kind === 'department' ? `/admin/eesa/departments/${r.id}` : `/admin/teams/${r.id}` }); });
    return items;
  }));
}
export function organizationMockMediaUsed(src: string) { return records.some(r => r.revisions.some(v => JSON.stringify(v.content).includes(src))); }
function checkSidebar(replacement: Stored, content: OrganizationContent | null) {
  const departments = records.filter(r => r.kind === 'department').flatMap(r => r.id === replacement.id ? content ? [content as DepartmentContent] : [] : r.revisions.filter(v => v.id === r.publishedRevisionId).map(v => v.content as DepartmentContent));
  const routes = new Set(departments.flatMap(d => [`/eesa/${d.id}`, `/eesa/${d.id}/activities`, ...(d.skills ? [`/eesa/${d.id}/skills`] : []), ...d.activities.map(a => `/eesa/${d.id}/activities/${a.slug}`), ...(d.experiences ?? []).map(e => `/eesa/${d.id}/experiences/${e.id}`)]));
  for (const d of departments) for (const item of d.extraSidebarItems) if (item.to && !routes.has(item.to)) fail(409, '側欄指向未公開內容，請先調整引用。');
}
function checkMedia(r: Stored, content: OrganizationContent, context: Context, publish = false) {
  const normalized = clone(content);
  const legacy = r.revisions[0].content;
  const allowed = new Set<string>(); const missing = new Map<string, string>();
  visitOrganizationImages(legacy, (image, path) => { if (image.missing) missing.set(path, image.src); else allowed.add(image.src); });
  visitOrganizationImages(normalized, (image, path) => {
    const match = /^\/api\/v1\/(?:admin\/media\/([^/]+)\/file|public\/media\/([^/]+))$/.exec(image.src);
    if (match) {
      const item = context.media.find(m => m.id === (match[1] ?? match[2]));
      const scope = r.kind === 'overview' ? item?.overviewId : r.kind === 'department' ? item?.departmentId : item?.teamId;
      if (!item || scope !== r.id || image.missing) fail(400, '圖片不存在或不屬於此資源。');
      if (publish) { item.visibility = 'PUBLIC'; image.src = `/api/v1/public/media/${item.id}`; }
    } else if (image.missing ? missing.get(path) !== image.src : !allowed.has(image.src)) fail(400, '請使用原有圖片或此資源的媒體庫。');
  });
  return normalized;
}
export function organizationMockRequest(path: string, method: string, body: Record<string, unknown>, context: Context): unknown | undefined {
  if (path === 'public/eesa/content') return { overview: records.find(r => r.kind === 'overview')?.revisions.find(v => records.find(r => r.kind === 'overview')?.publishedRevisionId === v.id)?.content ?? null, departments: records.filter(r => r.kind === 'department').flatMap(r => r.revisions.filter(v => v.id === r.publishedRevisionId).map(v => v.content)) };
  if (path === 'public/teams/content') return { teams: records.filter(r => r.kind === 'team').flatMap(r => r.revisions.filter(v => v.id === r.publishedRevisionId).map(v => v.content)) };
  const match = /^(admin\/eesa\/overview|admin\/eesa\/departments|admin\/teams)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(path);
  if (!match) return undefined;
  const kind: OrganizationKind = match[1] === 'admin/eesa/overview' ? 'overview' : match[1] === 'admin/teams' ? 'team' : 'department';
  const id = kind === 'overview' ? 'overview' : match[2];
  const action = kind === 'overview' ? match[2] : match[3];
  if (!id) return { items: records.filter(r => r.kind === kind && context.allowed(kind, r.id)).map(envelope) };
  const r = records.find(r => r.kind === kind && r.id === id) ?? fail(404, '找不到此內容。');
  if (!context.allowed(kind, id)) fail(403, '沒有此內容的授權。');
  if (method === 'GET') {
    if (action === 'revisions') return { items: clone([...r.revisions].reverse()) };
    if (action === 'preview') return clone(r.workingRevision ?? r.revisions.find(v => v.id === r.publishedRevisionId) ?? fail(404, '沒有可預覽版本。'));
    if (!action) return envelope(r);
    fail(404, '找不到此操作。');
  }
  if (body.version !== r.version) fail(409, '內容已更新，請重新載入。');
  const last = () => Math.max(...r.revisions.map(v => v.number)) + 1;
  const newDraft = (content: OrganizationContent) => { const revision: OrganizationRevision = { id: key(), number: last(), status: 'DRAFT', content, rejectionNote: null, submittedAt: null, publishedAt: null }; r.revisions.push(revision); r.workingRevision = revision; r.workingRevisionId = revision.id; };
  if (action === 'draft' && method === 'PUT') {
    if (r.workingRevision && r.workingRevision.status !== 'DRAFT') fail(409, '送審內容已凍結。');
    const content = parseOrganization(kind, body.content, id);
    if (context.role() !== 'ADMIN' && (contentOf(r) as { order?: number }).order !== (content as { order?: number }).order) fail(403, '排序僅限管理員。');
    const checked = checkMedia(r, content, context);
    if (r.workingRevision) r.workingRevision.content = checked; else newDraft(checked);
  } else if (method === 'POST' && action && ['submit','withdraw','reject','publish','unpublish','restore'].includes(action)) {
    if (['reject','publish','unpublish'].includes(action)) context.admin();
    if (action === 'restore') {
      if (r.workingRevision) fail(409, '已有工作版本。');
      const source = r.revisions.find(v => v.id === body.revisionId) ?? fail(404, '找不到歷史版本。');
      const content = parseOrganization(kind, source.content, id);
      if (context.role() !== 'ADMIN' && kind !== 'overview') (content as { order: number }).order = (contentOf(r) as { order: number }).order;
      newDraft(checkMedia(r, content, context));
    } else if (action === 'unpublish') {
      if (!r.publishedRevisionId) fail(409, '尚未公開。');
      if (kind === 'department') checkSidebar(r, null);
      r.publishedRevisionId = null;
    } else {
      const working = r.workingRevision ?? fail(409, '沒有工作版本。');
      if (working.status !== (action === 'submit' ? 'DRAFT' : 'SUBMITTED')) fail(409, '目前狀態無法操作。');
      if (action === 'submit' || action === 'publish') {
        const content = parseOrganization(kind, working.content, id);
        if (kind === 'department') checkSidebar(r, content);
        working.content = checkMedia(r, content, context, action === 'publish');
        working.status = action === 'publish' ? 'PUBLISHED' : 'SUBMITTED';
        if (action === 'publish') { working.publishedAt = now(); r.publishedRevisionId = working.id; r.workingRevision = null; r.workingRevisionId = null; }
        else { working.submittedAt = now(); working.rejectionNote = null; }
      } else {
        if (action === 'reject' && (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 2000)) fail(400, '請填寫退回原因。');
        working.status = 'DRAFT'; working.submittedAt = null; working.rejectionNote = action === 'reject' ? String(body.reason).trim() : null;
      }
    }
  } else fail(404, '找不到此操作。');
  r.version++; context.audit(action!, kind === 'overview' ? 'EesaOverview' : kind === 'department' ? 'Department' : 'Team', id);
  return envelope(r);
}
