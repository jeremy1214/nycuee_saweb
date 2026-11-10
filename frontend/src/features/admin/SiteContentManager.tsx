import { useEffect, useState } from 'react';
import { apiMutation, apiRequest, AuthError, isAdminMock } from './api';
import { ErrorNotice, Field, ResourceState, RevisionBadges, useCms, useOperation, useResource } from './cmsUi';
import { parseSiteContent, type SiteContentKind, type SiteContentMap, type SiteResource, type SiteRevision } from '../../../../shared/site-content';
import { MediaBrowser } from './MediaManager';
import { mediaPreview } from './mediaPreview';
import { SiteContentSnapshot, type PublicSiteContent } from '../../shared/data/SiteContentProvider';
import { HomeHero } from '../home/components/HomeHero';
import { HeroCarousel } from '../home/components/HeroCarousel';
import { OfficialLinks, ResourceContentSections } from '../resources/components/ResourceSections';
import { resourceSnapshot } from '../../../../shared/site-content';

const titles = { home: '首頁輪播與探索', resources: '學習資源', settings: '全站聯絡與社群' };
const labels: Record<string, string> = {
  eyebrow: '英文眉標', title: '標題', description: '說明', link: '探索連結', label: '顯示文字', to: '站內網址',
  slides: '輪播項目', id: '識別值', image: '圖片', alt: '圖片替代文字', imagePosition: '圖片位置',
  categories: '分類設定', defaultCategory: '預設分類識別值', searchDescription: '搜尋摘要', pages: '資源頁面',
  links: '官方連結', sections: '內容區塊', type: '區塊類型', items: '項目', href: '網址', status: '頁面狀態',
  siteContact: '聯絡資訊', institution: '機構名稱', email: '電子信箱', office: '辦公室', website: '官方網站', newsUrl: '公告網址',
  socialLinks: '社群平台', displayName: '帳號顯示名稱',
};
function blank(path: string): unknown {
  if (path.endsWith('.slides')) return { id: 'new-slide', image: '', alt: '', imagePosition: 'center', eyebrow: '', title: '', description: [''] };
  if (path.endsWith('.pages')) return { id: 'new-page', status: 'published', links: [{ label: '', description: '', href: '' }], sections: [] };
  if (path.endsWith('.categories')) return { id: 'new-category', label: '', searchDescription: '' };
  if (path.endsWith('.socialLinks')) return { id: 'instagram', label: '', displayName: '', href: '' };
  if (path.endsWith('.links')) return { label: '', description: '', href: '' };
  if (path.endsWith('.sections')) return { id: 'new-section', type: 'checklist', title: '', items: [''] };
  return '';
}
function Fields({ value, path, change, disabled, itemTemplate }: { value: unknown; path: string; change: (value: unknown) => void; disabled: boolean; itemTemplate?: unknown }) {
  const name = path.split('.').at(-1)!.replace(/\[\d+\]$/, '');
  const label = labels[name] ?? name;
  if (Array.isArray(value)) return <fieldset disabled={disabled} className="admin-card"><legend>{label}</legend>
    {value.map((child, index) => <div key={index} className="admin-card">
      <Fields value={child} path={`${path}[${index}]`} disabled={disabled} change={next => change(value.map((item, i) => i === index ? next : item))} />
      <div className="cms-toolbar">
        <button type="button" disabled={index === 0} onClick={() => { const next = [...value]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; change(next); }}>上移</button>
        <button type="button" disabled={index === value.length - 1} onClick={() => { const next = [...value]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; change(next); }}>下移</button>
        <button type="button" onClick={() => change(value.filter((_, i) => i !== index))}>移除此項</button>
      </div>
    </div>)}
    <button type="button" onClick={() => change([...value, itemTemplate ?? (path.endsWith('.items') && typeof value[0] === 'object' ? { title: '', description: '' } : blank(path))])}>新增{label}</button>
    {path.endsWith('.sections') && <button type="button" onClick={() => change([...value, { id: 'new-process', type: 'process', title: '', items: [{ title: '', description: '' }] }])}>新增流程區塊</button>}
    {path.endsWith('.items') && value.some(item => typeof item === 'object') && <p>流程項目請填寫標題與說明。</p>}
  </fieldset>;
  if (value && typeof value === 'object') return <fieldset disabled={disabled}><legend>{label === 'content' ? '內容欄位' : label}</legend>
    {Object.entries(value).map(([key, child]) => <Fields key={key} value={child} path={`${path}.${key}`} disabled={disabled} itemTemplate={key === 'items' && 'type' in value && value.type === 'process' ? { title: '', description: '' } : undefined} change={next => change({ ...value, [key]: next })} />)}
  </fieldset>;
  return <Field label={label} path={path}>
    {name === 'type' || name === 'status' ? <input value={String(value ?? '')} readOnly />
      : name === 'description' || String(value ?? '').length > 150 ? <textarea disabled={disabled} value={String(value ?? '')} onChange={event => change(event.target.value)} />
      : <input disabled={disabled} value={String(value ?? '')} onChange={event => change(event.target.value)} />}
  </Field>;
}
export function SiteContentManager({ kind }: { kind: SiteContentKind }) {
  const resource = useResource(() => apiRequest<SiteResource>(`admin/site-content/${kind}`), [kind]);
  return <section><h1>{titles[kind]}</h1>{isAdminMock ? <p role="alert">此功能使用真實 API，請切換至 API 模式。</p> : <ResourceState {...resource} retry={resource.reload}>{resource.data && <Editor key={kind} kind={kind} initial={resource.data} />}</ResourceState>}</section>;
}
function Editor({ kind, initial }: { kind: SiteContentKind; initial: SiteResource }) {
  const [resource, setResource] = useState(initial);
  const [content, setContent] = useState<SiteContentMap[SiteContentKind]>(() => structuredClone((initial.workingRevision ?? initial.publishedRevision ?? initial.latestRevision)!.content));
  const [preview, setPreview] = useState(false);
  const [media, setMedia] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [reason, setReason] = useState('');
  const [historyVersion, setHistoryVersion] = useState('');
  const [historical, setHistorical] = useState<SiteRevision>();
  const { dirty, setDirty } = useCms();
  const op = useOperation();
  const history = useResource(() => apiRequest<{ items: SiteRevision[] }>(`admin/site-content/${kind}/revisions`), [kind, resource.version]);
  useEffect(() => () => setDirty(false), [setDirty]);
  const frozen = resource.workingRevision?.status === 'SUBMITTED';
  function edit(next: unknown) { setContent(next as typeof content); setDirty(true); setHistorical(undefined); }
  async function command(action: string, extra = {}) {
    if (dirty && action !== 'draft') throw new Error('請先儲存目前修改，再執行流程操作。');
    if (action === 'draft') parseSiteContent(kind, content);
    const updated = await apiMutation<SiteResource>(`admin/site-content/${kind}/${action}`, action === 'draft' ? 'PUT' : 'POST', { version: resource.version, ...(action === 'draft' ? { content } : extra) });
    setResource(updated); setDirty(false); setHistorical(undefined);
    setContent(structuredClone((updated.workingRevision ?? updated.publishedRevision ?? resource.publishedRevision)!.content));
    op.setMessage('操作已完成。');
  }
  const errors = op.error instanceof AuthError ? op.error.fieldErrors : op.error && typeof op.error === 'object' && 'path' in op.error ? [{ path: String(op.error.path), message: op.error instanceof Error ? op.error.message : '欄位格式錯誤。' }] : [];
  return <div>
    <RevisionBadges resource={resource} />
    <p>僅管理員可編輯。每組內容一起送審與發布，儲存草稿不影響公開頁。</p>
    {resource.workingRevision?.rejectionNote && <p role="status">退回原因：{resource.workingRevision.rejectionNote}</p>}
    <ErrorNotice error={op.error} />
    {errors?.map(error => <p role="alert" key={error.path}>{error.path}：{error.message}</p>)}
    {op.error instanceof AuthError && op.error.status === 409 && <button onClick={() => window.location.reload()}>放棄修改並重新載入</button>}
    <p role="status">{op.pending ? '處理中…' : op.message}{dirty ? ' 尚有未儲存修改。' : ''}</p>
    <div className="cms-toolbar">
      <button disabled={op.pending || frozen} onClick={() => void op.run(() => command('draft'))}>儲存草稿</button>
      <button onClick={() => { setPreview(!preview); setHistorical(undefined); }}>預覽目前內容</button>
      <button disabled={op.pending || dirty || !resource.workingRevision || frozen} onClick={() => void op.run(() => command('submit'))}>送審</button>
      <button disabled={op.pending || dirty || !frozen} onClick={() => void op.run(() => command('withdraw'))}>撤回</button>
      <button disabled={op.pending || dirty || !frozen} onClick={() => void op.run(() => command('publish'))}>發布</button>
      <button disabled={op.pending || dirty || !resource.publishedRevisionId} onClick={() => { if (window.confirm('確定下架這組公開內容？')) void op.run(() => command('unpublish')); }}>下架</button>
    </div>
    {frozen && <div><Field label="退回原因"><textarea value={reason} onChange={event => setReason(event.target.value)} /></Field><button disabled={op.pending || !reason.trim()} onClick={() => void op.run(() => command('reject', { reason }))}>退回</button></div>}
    {kind === 'home' && <><button onClick={() => setMedia(!media)}>開啟／關閉首頁媒體庫</button>{media && <>
      <Field label="套用到輪播項目"><select value={slideIndex} onChange={event => setSlideIndex(Number(event.target.value))}>{(content as SiteContentMap['home']).slides.map((slide, index) => <option key={index} value={index}>{index + 1} · {slide.title}</option>)}</select></Field>
      <MediaBrowser scope={{ siteContentId: 'home' }} onSelect={frozen || op.pending ? undefined : (src, alt) => { const next = structuredClone(content) as SiteContentMap['home']; if (next.slides[slideIndex]) { next.slides[slideIndex].image = src; next.slides[slideIndex].alt = alt; edit(next); } }} />
    </>}</>}
    <Fields value={content} path="content" disabled={op.pending || frozen} change={edit} />
    <h2>歷史版本</h2><ErrorNotice error={history.error} retry={history.reload} />
    <select aria-label="歷史版本" value={historyVersion} onChange={event => setHistoryVersion(event.target.value)}><option value="">選擇版本</option>{history.data?.items.map(revision => <option value={revision.id} key={revision.id}>版本 {revision.number} · {revision.status}</option>)}</select>
    <button disabled={!historyVersion} onClick={() => { setHistorical(history.data?.items.find(revision => revision.id === historyVersion)); setPreview(true); }}>檢視歷史內容</button>
    <button disabled={op.pending || dirty || !historyVersion || !!resource.workingRevision} onClick={() => void op.run(() => command('restore', { revisionId: historyVersion }))}>還原為新草稿</button>
    {preview && <Preview kind={kind} content={historical?.content ?? content} />}
  </div>;
}
function Preview({ kind, content }: { kind: SiteContentKind; content: SiteContentMap[SiteContentKind] }) {
  try {
    const parsed = parseSiteContent(kind, content);
    const snapshot = { home: null, resources: null, settings: null, [kind]: parsed } as PublicSiteContent;
    if (kind === 'home') {
      const home = snapshot.home!;
      snapshot.home = { ...home, slides: home.slides.map(slide => ({ ...slide, image: mediaPreview(slide.image) })) };
      return <div className="cms-preview" onClickCapture={event => { if ((event.target as Element).closest('a')) event.preventDefault(); }}><SiteContentSnapshot content={snapshot}><HomeHero /><HeroCarousel /></SiteContentSnapshot></div>;
    }
    if (kind === 'resources') {
      const resources = resourceSnapshot(snapshot.resources!);
      return <div className="cms-preview">{resources.resourceOrder.map(slug => <section key={slug}><h2>{resources.resourceCategories[slug].tabLabel}</h2><OfficialLinks category={resources.resourceCategories[slug]} /><ResourceContentSections category={resources.resourceCategories[slug]} /></section>)}</div>;
    }
    const settings = snapshot.settings!;
    return <div className="cms-preview"><h2>{settings.siteContact.institution}</h2><p>{settings.siteContact.email} · {settings.siteContact.office}</p>{settings.socialLinks.map(social => <p key={social.id}>{social.label}：{social.displayName} · {social.href}</p>)}</div>;
  } catch (error) { return <p role="alert">請先修正欄位再預覽：{error instanceof Error ? error.message : '格式錯誤'}</p>; }
}
