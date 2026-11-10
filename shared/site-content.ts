import { createResourceRepository } from './resource-content';

export const siteContentKinds = ['home', 'resources', 'settings'] as const;
export type SiteContentKind = typeof siteContentKinds[number];
export interface HomeSlide {
  id: string; image: string; alt: string; imagePosition: string;
  eyebrow: string; title: string; description: string[];
}
export interface HomeContent {
  eyebrow: string; title: string; description: string;
  link: { label: string; to: string }; slides: HomeSlide[];
}
export interface SiteSettings {
  siteContact: { institution: string; email: string; office: string; website: string; newsUrl: string };
  socialLinks: { id: 'instagram' | 'facebook' | 'youtube'; label: string; displayName: string; href: string }[];
}
export interface ResourceDocument {
  categories: { defaultCategory: string; categories: { id: string; label: string; searchDescription: string }[] };
  pages: { id: string; status: 'published'; links: { label: string; description: string; href: string }[];
    sections: import('./resource-types').ResourceSection[] }[];
}
export interface SiteContentMap { home: HomeContent; resources: ResourceDocument; settings: SiteSettings }
export interface SiteRevision {
  id: string; number: number; status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED';
  content: SiteContentMap[SiteContentKind]; rejectionNote: string | null;
}
export interface SiteResource {
  id: SiteContentKind; version: number; publishedRevisionId: string | null;
  workingRevision: SiteRevision | null; publishedRevision: SiteRevision | null; latestRevision?: SiteRevision | null;
}
export class SiteContentError extends Error {
  constructor(public path: string, message: string) { super(message); }
}
function fail(path: string, message: string): never { throw new SiteContentError(path, message); }
function object(value: unknown, path: string, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '請提供物件。');
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!keys.includes(key)) fail(`${path}.${key}`, '不接受此欄位。');
  return record;
}
function text(value: unknown, path: string, max = 5000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(path, `請填寫 1–${max} 字元。`);
  return value;
}
function list(value: unknown, path: string, min = 1, max = 100) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(path, `筆數須為 ${min}–${max}。`);
  return value as unknown[];
}
function url(value: unknown, path: string) {
  const string = text(value, path, 2048);
  let parsed: URL;
  try { parsed = new URL(string); } catch { return fail(path, '請填寫 HTTP(S) 網址。'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || /\s/.test(string)) fail(path, '請填寫 HTTP(S) 網址。');
  return string;
}
function unique(ids: string[], path: string) { if (new Set(ids).size !== ids.length) fail(path, '識別值不能重複。'); }
export function resourceSnapshot(content: ResourceDocument) {
  return createResourceRepository(content.categories, Object.fromEntries(content.pages.map(page => [`${page.id}.json`, page])));
}
export function parseSiteContent<K extends SiteContentKind>(kind: K, input: unknown): SiteContentMap[K] {
  let result: SiteContentMap[SiteContentKind];
  if (kind === 'home') {
    const value = object(input, 'content', ['eyebrow', 'title', 'description', 'link', 'slides']);
    const link = object(value.link, 'content.link', ['label', 'to']);
    const to = text(link.to, 'content.link.to', 500);
    if (!/^\/(?!\/)[a-zA-Z0-9/?&=_%#.-]*$/.test(to)) fail('content.link.to', '請填寫站內路由。');
    const slides = list(value.slides, 'content.slides', 1, 30).map((raw, i) => {
      const path = `content.slides[${i}]`;
      const slide = object(raw, path, ['id', 'image', 'alt', 'imagePosition', 'eyebrow', 'title', 'description']);
      const id = text(slide.id, `${path}.id`, 100);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`${path}.id`, '請使用英文小寫、數字與連字號。');
      const image = text(slide.image, `${path}.image`, 500);
      if (!/^\/home\/[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp)$/.test(image)
        && !/^\/api\/v1\/(?:admin\/media\/[a-zA-Z0-9_-]+\/file|public\/media\/[a-zA-Z0-9_-]+)$/.test(image)) fail(`${path}.image`, '請選擇首頁舊圖片或媒體庫圖片。');
      const imagePosition = text(slide.imagePosition, `${path}.imagePosition`, 50);
      if (!/^(?:center|top|bottom|left|right|\d{1,3}%)(?: (?:center|top|bottom|left|right|\d{1,3}%))?$/.test(imagePosition)) fail(`${path}.imagePosition`, '請填寫圖片位置，例如 center 43%。');
      return { id, image, alt: text(slide.alt, `${path}.alt`, 300), imagePosition,
        eyebrow: text(slide.eyebrow, `${path}.eyebrow`, 300), title: text(slide.title, `${path}.title`, 300),
        description: list(slide.description, `${path}.description`, 1, 10).map((line, n) => text(line, `${path}.description[${n}]`)) };
    });
    unique(slides.map(s => s.id), 'content.slides');
    result = { eyebrow: text(value.eyebrow, 'content.eyebrow', 300), title: text(value.title, 'content.title', 300),
      description: text(value.description, 'content.description'), link: { to, label: text(link.label, 'content.link.label', 300) }, slides };
  } else if (kind === 'settings') {
    const value = object(input, 'content', ['siteContact', 'socialLinks']);
    const contact = object(value.siteContact, 'content.siteContact', ['institution', 'email', 'office', 'website', 'newsUrl']);
    const email = text(contact.email, 'content.siteContact.email', 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('content.siteContact.email', '請填寫有效信箱。');
    const socialLinks = list(value.socialLinks, 'content.socialLinks', 0, 3).map((raw, i) => {
      const path = `content.socialLinks[${i}]`;
      const social = object(raw, path, ['id', 'label', 'displayName', 'href']);
      if (!['instagram', 'facebook', 'youtube'].includes(String(social.id))) fail(`${path}.id`, '不支援的社群平台。');
      return { id: social.id as SiteSettings['socialLinks'][number]['id'], label: text(social.label, `${path}.label`, 100),
        displayName: text(social.displayName, `${path}.displayName`, 100), href: url(social.href, `${path}.href`) };
    });
    unique(socialLinks.map(s => s.id), 'content.socialLinks');
    result = { siteContact: { institution: text(contact.institution, 'content.siteContact.institution', 300),
      office: text(contact.office, 'content.siteContact.office', 300), email,
      website: url(contact.website, 'content.siteContact.website'), newsUrl: url(contact.newsUrl, 'content.siteContact.newsUrl') }, socialLinks };
  } else {
    const value = object(input, 'content', ['categories', 'pages']);
    const pages = list(value.pages, 'content.pages', 1, 100);
    const ids = pages.map((page, i) => {
      const raw = object(page, `content.pages[${i}]`, ['id', 'status', 'links', 'sections']);
      if (raw.status !== 'published') fail(`content.pages[${i}].status`, '整組發布的頁面狀態須為 published；草稿由外層版本管理。');
      return text(raw.id, `content.pages[${i}].id`, 100);
    });
    unique(ids, 'content.pages');
    const document = { categories: value.categories, pages } as ResourceDocument;
    try { resourceSnapshot(document); } catch (error) { fail('content', error instanceof Error ? error.message : '資源內容格式錯誤。'); }
    result = structuredClone(document);
  }
  return result as SiteContentMap[K];
}
