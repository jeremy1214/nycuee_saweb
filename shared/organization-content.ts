/** Organization CMS contract, also used by legacy import and structured forms. */
export const departmentIds = ['activities', 'technical', 'publicity', 'operation'] as const;
export const teamIds = ['basketball-men', 'basketball-women', 'volleyball-men', 'volleyball-women', 'badminton', 'table-tennis', 'baseball', 'tennis', 'soccer'] as const;
export type OrganizationKind = 'overview' | 'department' | 'team';
export interface ContentImage { src: string; alt: string; missing?: boolean }
export type ImageValue = string | ContentImage;
export const imageSrc = (image: ImageValue | null | undefined): string => typeof image === 'string' ? image : image?.missing ? '' : image?.src ?? '';
export const imageAlt = (image: ImageValue | null | undefined, fallback = '') => typeof image === 'object' && image ? image.alt : fallback;
export interface OverviewContent { bannerImage: ImageValue; bannerAlt: string; title: string; introduction: string; departmentsTitle: string; departmentsDescription: string; presidentTitle: string; presidentMessage: string }
export interface DepartmentActivity { slug: string; name: string; image: ImageValue; detailImages?: ImageValue[]; description: string[] }
export interface DepartmentExperience { id: string; title: string; images: ImageValue[]; content: string[] }
export interface DepartmentContent {
  id: string; order: number; title: string; nameEn: string; cardDescription: string; cardImage: ImageValue;
  bannerImage: ImageValue; groupPhotoImage: ImageValue; introParagraphs: string[]; memberDescription: string;
  extraSidebarItems: { label: string; to?: string }[]; activities: DepartmentActivity[];
  skills?: { mainTitle: string; subTitle: string; items: { title: string; content: string }[] };
  experiences?: DepartmentExperience[];
}
export interface ScheduleBlock { type: 'paragraph' | 'subheader' | 'list'; text?: string; items?: string[] }
export interface TeamContent {
  id: string; order: number; name: string; photo: ImageValue; ballIcon: ImageValue | null; aboutImg: ImageValue | null;
  intro: string[]; schedule: ScheduleBlock[];
  activities: { id: string; month: string; name: string; description: string; image: ImageValue | null }[];
  contact: { intro: string | null; people: { header: string | null; lines: string[] }[]; note: string | null };
}
export type OrganizationContent = OverviewContent | DepartmentContent | TeamContent;
export interface PublicEesaContent { overview: OverviewContent | null; departments: DepartmentContent[] }
export interface PublicTeamContent { teams: TeamContent[] }
export interface OrganizationRevision { id: string; number: number; status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'; content: OrganizationContent; rejectionNote: string | null; submittedAt: string | null; publishedAt: string | null }
export interface OrganizationResource { id: string; version: number; publishedRevisionId: string | null; workingRevisionId: string | null; workingRevision: OrganizationRevision | null }
export interface ContentField { type: 'text' | 'number' | 'image' | 'object' | 'array' | 'choice'; label: string; fields?: Record<string, ContentField>; item?: ContentField; optional?: boolean; nullable?: boolean; choices?: string[] }
const text = (label: string, extra: Partial<ContentField> = {}): ContentField => ({ type: 'text', label, ...extra });
const image = (label: string, nullable = false): ContentField => ({ type: 'image', label, nullable });
const object = (label: string, fields: Record<string, ContentField>, optional = false): ContentField => ({ type: 'object', label, fields, optional });
const array = (label: string, item: ContentField, optional = false): ContentField => ({ type: 'array', label, item, optional });
const order: ContentField = { type: 'number', label: '顯示順序（管理員）' };
export const organizationFields: Record<OrganizationKind, ContentField> = {
  overview: object('系學會總覽', { bannerImage: image('橫幅圖片'), bannerAlt: text('橫幅說明'), title: text('標題'), introduction: text('簡介'), departmentsTitle: text('部門區標題'), departmentsDescription: text('部門區說明'), presidentTitle: text('會長區標題'), presidentMessage: text('會長訊息') }),
  department: object('部門', { id: text('識別值'), order, title: text('部門名稱'), nameEn: text('英文名稱'), cardDescription: text('入口摘要'), cardImage: image('入口圖片'), bannerImage: image('橫幅圖片'), groupPhotoImage: image('部門合照'), introParagraphs: array('介紹段落', text('段落')), memberDescription: text('部員介紹'), extraSidebarItems: array('額外側欄', object('連結', { label: text('名稱'), to: text('站內網址', { optional: true }) })), activities: array('部門活動', object('活動', { slug: text('活動識別值'), name: text('活動名稱'), image: image('主圖'), detailImages: array('詳細圖片', image('圖片'), true), description: array('介紹段落', text('段落')) })), skills: object('學習能力', { mainTitle: text('主標題'), subTitle: text('副標題'), items: array('能力', object('能力', { title: text('標題'), content: text('說明') })) }, true), experiences: array('體驗談', object('體驗談', { id: text('識別值'), title: text('標題'), images: array('圖片', image('圖片')), content: array('段落', text('段落')) }), true) }),
  team: object('系隊', { id: text('識別值'), order, name: text('隊名'), photo: image('隊伍合照'), ballIcon: image('球類圖示', true), aboutImg: image('入隊圖片', true), intro: array('介紹段落', text('段落')), schedule: array('練習時間', object('區塊', { type: { type: 'choice', label: '種類', choices: ['paragraph', 'subheader', 'list'] }, text: text('段落／小標題', { optional: true }), items: array('清單', text('項目'), true) })), activities: array('系隊活動', object('活動', { id: text('識別值'), month: text('月份／時段'), name: text('名稱'), description: text('說明'), image: image('圖片', true) })), contact: object('聯絡與入隊', { intro: text('說明', { nullable: true }), people: array('聯絡人', object('聯絡人', { header: text('標題', { nullable: true }), lines: array('聯絡內容', text('內容')) })), note: text('備註', { nullable: true }) }) }),
};
export class OrganizationValidationError extends Error {
  constructor(public fieldErrors: { path: string; message: string }[]) { super('內容格式不正確。'); }
}
export function defaultField(field: ContentField): unknown {
  if (field.nullable) return null;
  if (field.type === 'object' && field.fields?.type?.choices?.includes('paragraph')) return { type: 'paragraph', text: '' };
  if (field.type === 'object') return Object.fromEntries(Object.entries(field.fields!).filter(([, f]) => !f.optional).map(([k, f]) => [k, defaultField(f)]));
  if (field.type === 'array') return [];
  if (field.type === 'image') return { src: '', alt: '' };
  if (field.type === 'number') return 0;
  if (field.type === 'choice') return field.choices![0];
  return '';
}
export function parseOrganization(kind: OrganizationKind, value: unknown, id?: string): OrganizationContent {
  const errors: { path: string; message: string }[] = [];
  const fail = (path: string, message: string) => { errors.push({ path, message }); };
  function parse(field: ContentField, input: unknown, path: string): unknown {
    if (input === undefined && field.optional) return undefined;
    if (input === null && field.nullable) return null;
    if (field.type === 'text' || field.type === 'choice') {
      if (typeof input !== 'string' || input.length > 20000 || (field.choices && !field.choices.includes(input))) fail(path, '請填寫有效文字（最多 20000 字）。');
      return input;
    }
    if (field.type === 'number') { if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0 || input > 2147483647) fail(path, '請填寫非負整數。'); return input; }
    if (field.type === 'image') {
      if (typeof input === 'string') {
        const root = value as Record<string, unknown>;
        const parent = path.split('.').slice(1, -1).reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value) as Record<string, unknown> | undefined;
        const title = parent?.name ?? parent?.title ?? root?.title ?? root?.name ?? '';
        input = { src: kind === 'team' && input && !input.startsWith('/') ? `/team/${input}` : input, alt: kind === 'overview' && typeof root?.bannerAlt === 'string' ? root.bannerAlt : `${title} ${field.label}`.trim() };
      }
      if (!input || typeof input !== 'object' || Array.isArray(input)) { fail(path, '請選擇圖片。'); return input; }
      const img = input as Record<string, unknown>;
      if (Object.keys(img).some(k => !['src', 'alt', 'missing'].includes(k)) || typeof img.src !== 'string' || typeof img.alt !== 'string' || img.alt.length > 500 || img.src.length > 2000 || (img.missing !== undefined && typeof img.missing !== 'boolean')) fail(path, '圖片須包含 src、alt 與選填 missing。');
      if (typeof img.src === 'string' && img.src && (!img.src.startsWith('/') || img.src.startsWith('//') || /[\\?#\u0000-\u001f]/.test(img.src) || img.src.split('/').includes('..'))) fail(`${path}.src`, '請使用網站圖片或媒體庫網址。');
      return { src: img.src, alt: img.alt, ...(img.missing ? { missing: true } : {}) };
    }
    if (field.type === 'array') {
      if (!Array.isArray(input) || input.length > 300) { fail(path, '請提供陣列（最多 300 項）。'); return []; }
      return input.map((v, i) => parse(field.item!, v, `${path}.${i}`));
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) { fail(path, '請填寫內容物件。'); return {}; }
    const record = input as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!field.fields![key]) fail(`${path}.${key}`, '不支援此欄位。');
    return Object.fromEntries(Object.entries(field.fields!).map(([key, f]) => [key, parse(f, record[key], `${path}.${key}`)]).filter(([, v]) => v !== undefined));
  }
  const content = parse(organizationFields[kind], value, 'content') as OrganizationContent;
  const required = kind === 'overview' ? ['title'] : kind === 'department' ? ['title', 'nameEn'] : ['name'];
  for (const key of required) if (typeof (content as unknown as Record<string, unknown>)[key] !== 'string' || !(content as unknown as Record<string, string>)[key].trim()) fail(`content.${key}`, '請填寫名稱。');
  if (kind !== 'overview') {
    const resource = content as DepartmentContent | TeamContent;
    const allowed: readonly string[] = kind === 'department' ? departmentIds : teamIds;
    if (!allowed.includes(resource.id) || (id && resource.id !== id)) fail('content.id', '資源識別值固定，不能變更。');
    const unique = (values: string[], path: string) => { const seen = new Set<string>(); values.forEach((v, i) => { if (typeof v !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) || seen.has(v)) fail(`${path}.${i}`, '識別值須為唯一的小寫英文、數字與連字號。'); seen.add(v); }); };
    if (kind === 'department') {
      const d = content as DepartmentContent;
      unique((d.activities ?? []).map(a => a.slug), 'content.activities');
      unique((d.experiences ?? []).map(e => e.id), 'content.experiences');
      for (const [i, link] of (d.extraSidebarItems ?? []).entries()) if (link.to && !/^\/eesa\/[a-z0-9-]+(?:\/activities(?:\/[a-z0-9-]+)?|\/skills|\/experiences\/[a-z0-9-]+)?$/.test(link.to)) fail(`content.extraSidebarItems.${i}.to`, '請使用既有部門站內路由。');
    } else {
      const t = content as TeamContent;
      unique((t.activities ?? []).map(a => a.id), 'content.activities');
      (t.schedule ?? []).forEach((block, i) => { if (block.type === 'list' ? !Array.isArray(block.items) : typeof block.text !== 'string') fail(`content.schedule.${i}`, '清單須填寫項目，段落與小標題須填寫文字。'); });
    }
  }
  if (errors.length) throw new OrganizationValidationError(errors);
  return content;
}
export function parsePublicEesa(value: unknown): PublicEesaContent {
  const v = value as PublicEesaContent;
  if (!v || !Array.isArray(v.departments) || v.overview === undefined) throw new Error('系學會回應格式錯誤。');
  const departments = v.departments.map(d => parseOrganization('department', d) as DepartmentContent);
  if (new Set(departments.map(d => d.id)).size !== departments.length) throw new Error('部門重複。');
  return { overview: v.overview === null ? null : parseOrganization('overview', v.overview) as OverviewContent, departments: departments.sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) };
}
export function parsePublicTeams(value: unknown): PublicTeamContent {
  const v = value as PublicTeamContent;
  if (!v || !Array.isArray(v.teams)) throw new Error('系隊回應格式錯誤。');
  const teams = v.teams.map(t => parseOrganization('team', t) as TeamContent);
  if (new Set(teams.map(t => t.id)).size !== teams.length) throw new Error('系隊重複。');
  return { teams: teams.sort((a,b) => a.order-b.order || a.id.localeCompare(b.id)) };
}
export function visitOrganizationImages(value: unknown, visit: (image: ContentImage, path: string) => void, path = 'content') {
  if (!value || typeof value !== 'object') return;
  if ('src' in value && 'alt' in value) visit(value as ContentImage, path);
  else for (const [key, child] of Object.entries(value)) visitOrganizationImages(child, visit, `${path}.${key}`);
}
