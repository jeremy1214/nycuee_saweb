import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { parseSiteContent, resourceSnapshot, type SiteContentMap, type SiteContentKind } from '../../../../shared/site-content';
import { exploreContent } from '../../features/home/data/home';
import { siteContact, socialLinks } from './site';
import { resourceCategories, resourceOrder, defaultResourceSlug } from '../../features/resources/data/resources';

export type PublicSiteContent = { [K in SiteContentKind]: SiteContentMap[K] | null };
const staticContent = {
  home: { ...exploreContent, slides: exploreContent.slides.map(slide => ({ ...slide, alt: slide.title })) },
  settings: { siteContact, socialLinks },
};
const emptyResources = { resourceOrder: [] as string[], resourceCategories: {} as typeof resourceCategories, defaultResourceSlug: '' };
const Context = createContext<{ content: PublicSiteContent; resources: typeof emptyResources } | null>(null);
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const [retry, setRetry] = useState(0);
  const [focus, setFocus] = useState(0);
  const [state, setState] = useState<{ key: string; data?: PublicSiteContent; error?: string }>();
  const key = `${pathname}${search}:${retry}:${focus}`;
  const api = import.meta.env.VITE_SITE_CONTENT_SOURCE === 'api';
  useEffect(() => {
    if (!api) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    void fetch('/api/v1/public/site-content', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('無法載入網站內容。');
      const raw = await response.json();
      const data: PublicSiteContent = {
        home: raw.home === null ? null : parseSiteContent('home', raw.home),
        resources: raw.resources === null ? null : parseSiteContent('resources', raw.resources),
        settings: raw.settings === null ? null : parseSiteContent('settings', raw.settings),
      };
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : '網站內容載入失敗。' });
    }).finally(() => window.clearTimeout(timer));
    const timeout = window.setTimeout(() => { if (controller.signal.aborted) setState({ key, error: '網站內容載入逾時，請重試。' }); }, 15001);
    return () => { controller.abort(); window.clearTimeout(timer); window.clearTimeout(timeout); };
  }, [api, key]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== 'hidden') setFocus(value => value + 1); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const value = useMemo(() => state?.data ? { content: state.data, resources: state.data.resources ? resourceSnapshot(state.data.resources) : emptyResources } : null, [state]);
  if (!api) return children;
  if (state?.key !== key || !value) return <section className="page-container" aria-live="polite">
    {state?.key === key && state.error ? <><p role="alert">{state.error}</p><button onClick={() => setRetry(value => value + 1)}>重試網站內容</button></> : <p role="status">正在載入網站內容…</p>}
  </section>;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSiteContent() { return useContext(Context); }
export function useHomeContent() {
  const value = useSiteContent();
  return value ? value.content.home : staticContent.home;
}
export function useSiteSettings() {
  const value = useSiteContent();
  return value ? value.content.settings ?? { siteContact: { institution: '', email: '', office: '', website: '', newsUrl: '' }, socialLinks: [] } : staticContent.settings;
}
export function useResourceContent() { return useSiteContent()?.resources ?? { resourceCategories, resourceOrder, defaultResourceSlug }; }

export function SiteContentSnapshot({ content, children }: { content: PublicSiteContent; children: ReactNode }) {
  const resources = useMemo(() => content.resources ? resourceSnapshot(content.resources) : emptyResources, [content.resources]);
  return <Context.Provider value={{ content, resources }}>{children}</Context.Provider>;
}
