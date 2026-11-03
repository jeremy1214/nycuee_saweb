import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { organizationFields, defaultField, parseOrganization, OrganizationValidationError, imageSrc, type ContentField, type ContentImage, type OrganizationContent, type OrganizationKind, type OrganizationRevision } from '../../../../shared/organization-content';
import { AuthError } from './api';
import { useCms, useResource, ResourceState, ErrorNotice, Field, useOperation } from './cmsUi';
import { listOrganizations, loadOrganization, organizationAdminLink, organizationMediaScope, saveOrganization, organizationCommand } from './organizationApi';
import { MediaBrowser } from './MediaManager';
import { Modal } from '../../shared/components/ui/Modal';
import { mediaPreview } from './mediaPreview';
import { OrganizationPreview } from './OrganizationPreview';
const labels = { overview: '系學會總覽', department: '系學會部門', team: '系隊' };
export function OrganizationManager({ kind }: { kind: 'department' | 'team' }) {
  const { user } = useCms();
  const list = useResource(async () => Promise.all((await listOrganizations(kind)).items.map(item => loadOrganization(kind, item.id))), [kind]);
  return <section><h1>{labels[kind]}管理</h1>{kind === 'department' && user.role === 'ADMIN' && <Link className="admin-button" to="/admin/eesa/overview">編輯系學會總覽</Link>}
    <ResourceState {...list} retry={list.reload}>{!list.data?.length && <p>目前沒有可編輯的內容。請確認授權，或先執行內容匯入。</p>}
      <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>內容</th><th>公開狀態</th><th>工作版本</th><th>操作</th></tr></thead><tbody>{list.data?.map(({ resource, content }) => <tr key={resource.id}><td>{'title' in content ? content.title : 'name' in content ? content.name : resource.id}</td><td>{resource.publishedRevisionId ? '已公開' : '未公開'}</td><td>{resource.workingRevision?.status ?? '沒有草稿'}{resource.workingRevision?.rejectionNote && <p>{resource.workingRevision.rejectionNote}</p>}</td><td><Link to={organizationAdminLink(kind, resource.id)}>編輯與審核</Link></td></tr>)}</tbody></table></div>
    </ResourceState></section>;
}
export function OrganizationWorkSummary() {
  const { user } = useCms();
  const list = useResource(async () => {
    const kinds = (['department', 'team'] as const);
    const resources = await Promise.all(kinds.map(async kind => (await listOrganizations(kind)).items.map(resource => ({ kind, resource }))));
    const overview = user.role === 'ADMIN' ? [{ kind: 'overview' as const, resource: (await loadOrganization('overview', 'overview')).resource }] : [];
    return [...overview, ...resources.flat()].filter(r => r.resource.workingRevision);
  });
  return <section className="admin-card"><h2>系學會與系隊待辦</h2><ResourceState {...list} retry={list.reload}>{!list.data?.length && <p>目前沒有工作版本。</p>}<ul>{list.data?.map(({ kind, resource }) => <li key={kind + resource.id}><Link to={organizationAdminLink(kind, resource.id)}>{labels[kind]} · {resource.id}</Link> · {resource.workingRevision?.status}{resource.workingRevision?.rejectionNote && <p>{resource.workingRevision.rejectionNote}</p>}</li>)}</ul></ResourceState></section>;
}
function StructuredField({ field, value, change, path, kind, id, admin, locked }: { field: ContentField; value: unknown; change: (value: unknown) => void; path: string; kind: OrganizationKind; id: string; admin: boolean; locked: Set<string> }) {
  const [choosing, setChoosing] = useState(false);
  const absent = value === undefined || value === null;
  if ((field.optional || field.nullable) && absent) return <div className="cms-toolbar"><span>{field.label}：{value === null ? '未提供' : '未啟用'}</span><button type="button" onClick={() => change(defaultField({ ...field, nullable: false, optional: false }))}>啟用{field.label}</button></div>;
  const remove = field.optional || field.nullable ? <button type="button" onClick={() => change(field.nullable ? null : undefined)}>停用{field.label}</button> : null;
  if (field.type === 'object') {
    const record = (value ?? {}) as Record<string, unknown>;
    return <section className="cms-panel" data-field-section={path}><h3>{field.label}</h3>{remove}{Object.entries(field.fields!).filter(([key]) => !field.fields?.type?.choices?.includes('paragraph') || (key !== 'text' && key !== 'items') || (record.type === 'list' ? key === 'items' : key === 'text')).map(([key, original]) => { const f = field.fields?.type?.choices?.includes('paragraph') && (key === 'text' || key === 'items') ? { ...original, optional: false } : original; return <StructuredField key={key} field={f} value={record[key]} change={next => { if (key === 'type' && field.fields?.type?.choices?.includes('paragraph')) { change(next === 'list' ? { type: next, items: [] } : { type: next, text: '' }); return; } const updated = { ...record, [key]: next }; if (next === undefined) delete updated[key]; change(updated); }} path={`${path}.${key}`} kind={kind} id={id} admin={admin} locked={locked} />; })}</section>;
  }
  if (field.type === 'array') {
    const items = (value ?? []) as unknown[];
    return <section className="cms-list-editor" data-field-section={path}><h3>{field.label}</h3>{remove}{items.map((item, i) => <div key={i} className="cms-nested"><div className="cms-toolbar"><strong>{field.label} {i + 1}</strong><button type="button" disabled={i === 0} onClick={() => { const next = [...items]; [next[i-1], next[i]] = [next[i], next[i-1]]; change(next); }}>上移</button><button type="button" disabled={i === items.length-1} onClick={() => { const next = [...items]; [next[i+1], next[i]] = [next[i], next[i+1]]; change(next); }}>下移</button><button type="button" onClick={() => change(items.filter((_, index) => index !== i))}>移除</button></div><StructuredField field={field.item!} value={item} change={next => change(items.map((old, index) => index === i ? next : old))} path={`${path}.${i}`} kind={kind} id={id} admin={admin} locked={locked} /></div>)}<button type="button" onClick={() => change([...items, defaultField(field.item!)])}>新增{field.label}</button></section>;
  }
  if (field.type === 'image') {
    const img: ContentImage = typeof value === 'string' ? { src: value, alt: field.label } : value as ContentImage;
    return <section className="cms-image-field" data-field-section={path}><h4>{field.label}</h4>{img?.missing ? <p>原有圖片預留項目</p> : imageSrc(img) && <img src={mediaPreview(imageSrc(img))} alt={img.alt} />}<Field label={`${field.label}替代文字`} path={`${path}.alt`}><input value={img?.alt ?? ''} maxLength={500} onChange={e => change({ ...img, alt: e.target.value })} /></Field><p className="cms-muted">{img?.src}</p><div className="cms-toolbar">{remove}<button type="button" onClick={() => setChoosing(true)}>從媒體庫選取{field.label}</button></div>{choosing && <Modal open title={`選取${field.label}`} onClose={() => setChoosing(false)}><MediaBrowser scope={organizationMediaScope(kind, id)} onSelect={(src, alt) => { change({ src, alt }); setChoosing(false); }} /></Modal>}</section>;
  }
  if (field.type === 'choice') return <Field label={field.label} path={path}><select value={String(value ?? '')} onChange={e => change(e.target.value)}>{field.choices!.map(choice => <option key={choice}>{choice}</option>)}</select>{remove}</Field>;
  const isIdentity = /\.(id|slug)$/.test(path);
  const disabled = path === 'content.id' || (path === 'content.order' && !admin) || (isIdentity && locked.has(`${path.replace(/\.\d+\./g, '.*.')}=${value}`));
  return <div><Field label={field.label} path={path}>{field.type === 'number' ? <input type="number" min={0} disabled={disabled} value={Number(value ?? 0)} onChange={e => change(Number(e.target.value))} /> : <textarea rows={path.endsWith('.id') || path.endsWith('.slug') ? 1 : 3} readOnly={disabled} value={String(value ?? '')} maxLength={20000} onChange={e => change(e.target.value)} />}</Field>{remove}</div>;
}
export function OrganizationEditor({ kind }: { kind: OrganizationKind }) {
  const { id: routeId } = useParams(); const id = kind === 'overview' ? 'overview' : routeId!;
  const resource = useResource(() => loadOrganization(kind, id), [kind, id]);
  const [content, setContent] = useState<OrganizationContent>();
  const [preview, setPreview] = useState<OrganizationContent>();
  const { user, dirty, setDirty } = useCms(); const op = useOperation();
  useEffect(() => { setContent(resource.data?.content); setPreview(undefined); setDirty(false); }, [resource.data, kind, id]);
  const row = resource.data?.resource;
  const readonly = row?.workingRevision?.status === 'SUBMITTED';
  const locked = new Set<string>();
  function collect(value: unknown, path: string) { if (!value || typeof value !== 'object') return; for (const [key, child] of Object.entries(value)) { const childPath = `${path}.${key}`; if (key === 'id' || key === 'slug') locked.add(`${childPath.replace(/\.\d+\./g, '.*.')}=${child}`); else collect(child, childPath); } }
  resource.data?.revisions.filter(r => r.status === 'PUBLISHED').forEach(r => collect(r.content, 'content'));
  async function save() { if (!content || !row) return; const parsed = parseOrganization(kind, content, id); await saveOrganization(kind, id, row.version, parsed); setDirty(false); resource.reload(); op.setMessage('草稿已儲存。'); }
  async function command(name: string, extra = {}) { if (!row) return; await organizationCommand(kind, id, name, row.version, extra); setDirty(false); resource.reload(); }
  const fields = op.error instanceof OrganizationValidationError ? op.error.fieldErrors : op.error instanceof AuthError ? op.error.fieldErrors : undefined;
  return <section><div className="cms-toolbar"><h1>{labels[kind]}：{id}</h1><Link to={kind === 'team' ? '/admin/teams' : '/admin/eesa'}>返回列表</Link></div><ResourceState {...resource} retry={resource.reload}>{content && row && <>
    <p>公開版本：{row.publishedRevisionId ? '已公開' : '未公開'} · 工作版本：{row.workingRevision?.status ?? '尚無草稿'}</p>{row.workingRevision?.rejectionNote && <p className="cms-notice">退回原因：{row.workingRevision.rejectionNote}</p>}
    <ErrorNotice error={op.error} retry={() => { if (!dirty || window.confirm('重新載入會放棄未儲存內容，確定繼續？')) resource.reload(); }} />{fields?.length ? <ul className="admin-error">{fields.map(f => <li key={f.path}>{f.path}：{f.message}</li>)}</ul> : null}<p role="status">{op.message}</p>
    <nav className="cms-toolbar" aria-label="編輯器分區">{Object.entries(organizationFields[kind].fields!).filter(([, field]) => ['array','object','image'].includes(field.type)).map(([key, field]) => <a key={key} href={`#organization-field-${key}`} onClick={event => { event.preventDefault(); document.querySelector(`[data-field-section="content.${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{field.label}</a>)}</nav>
    <div className="cms-toolbar"><button disabled={op.pending || readonly} onClick={() => void op.run(save)}>儲存草稿</button><button onClick={() => { try { setPreview(preview ? undefined : parseOrganization(kind, content, id)); } catch (e) { op.setError(e); } }}>{preview ? '返回編輯' : '預覽目前內容'}</button>{row.workingRevision?.status === 'DRAFT' && <button disabled={op.pending || dirty} onClick={() => void op.run(() => command('submit'))}>送審</button>}{readonly && <button disabled={op.pending} onClick={() => void op.run(() => command('withdraw'))}>撤回</button>}{readonly && user.role === 'ADMIN' && <><button disabled={op.pending} onClick={() => { if (window.confirm('確定發布目前送審版本？')) void op.run(() => command('publish')); }}>發布</button><button disabled={op.pending} onClick={() => { const reason = window.prompt('退回原因'); if (reason) void op.run(() => command('reject', { reason })); }}>退回</button></>}{row.publishedRevisionId && user.role === 'ADMIN' && <button disabled={op.pending || dirty} onClick={() => { if (window.confirm('確定下架此資源？')) void op.run(() => command('unpublish')); }}>下架</button>}</div>
    {preview ? <OrganizationPreview key={JSON.stringify(preview)} kind={kind} id={id} content={preview} /> : <fieldset disabled={readonly || op.pending}><legend>{readonly ? '送審內容唯讀' : '內容編輯'}</legend><StructuredField field={organizationFields[kind]} value={content} change={next => { setContent(next as OrganizationContent); setDirty(true); }} path="content" kind={kind} id={id} admin={user.role === 'ADMIN'} locked={locked} /></fieldset>}
    <section className="cms-panel"><h2>歷史版本</h2>{resource.data?.revisions.map((revision: OrganizationRevision) => <div className="cms-toolbar" key={revision.id}><span>版本 {revision.number} · {revision.status}</span><button onClick={() => setPreview(revision.content)}>預覽此版本</button><button disabled={op.pending || dirty || !!row.workingRevisionId} onClick={() => { if (window.confirm('將此版本還原為新草稿？')) void op.run(() => command('restore', { revisionId: revision.id })); }}>還原為新草稿</button></div>)}</section>
  </>}</ResourceState></section>;
}
