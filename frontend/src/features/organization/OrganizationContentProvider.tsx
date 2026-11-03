import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { parsePublicEesa, parsePublicTeams, imageSrc, imageAlt, type PublicEesaContent, type PublicTeamContent } from '../../../../shared/organization-content';
export const emptyEesa: PublicEesaContent = { overview: null, departments: [] };
export const emptyTeams: PublicTeamContent = { teams: [] };
interface Snapshot<T> { status: 'loading' | 'ready' | 'error'; data: T; error?: string; refresh: () => void }
export const EesaContentContext = createContext<Snapshot<PublicEesaContent>>({ status: 'loading', data: emptyEesa, refresh() {} });
export const TeamContentContext = createContext<Snapshot<PublicTeamContent>>({ status: 'loading', data: emptyTeams, refresh() {} });
export const PreviewNavigationContext = createContext<{ path: string; navigate: (path: string) => void } | null>(null);
export function useOrganizationParams() {
  const actual = useParams();
  const preview = useContext(PreviewNavigationContext);
  if (!preview) return actual;
  const parts = preview.path.split('?')[0].split('/');
  return { slug: parts[2], activitySlug: parts[3] === 'activities' ? parts[4] : undefined, expId: parts[3] === 'experiences' ? parts[4] : undefined, teamKey: parts[2] };
}
export function useOrganizationNavigate() { const navigate = useNavigate(); const preview = useContext(PreviewNavigationContext); return preview?.navigate ?? navigate; }
async function load<T>(path: string, parse: (value: unknown) => T, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/public/${path}`, { signal, cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('內容服務暫時無法使用，請重試。');
  return parse(await response.json());
}
const loadEesa = async (signal: AbortSignal) => {
  const source = import.meta.env.VITE_EESA_SOURCE ?? 'json';
  if (source === 'json') return parsePublicEesa((await import('virtual:legacy-eesa-content')).default);
  if (source !== 'api') throw new Error('VITE_EESA_SOURCE 必須是 api 或 json。');
  return load('eesa/content', parsePublicEesa, signal);
};
const loadTeams = async (signal: AbortSignal) => {
  const source = import.meta.env.VITE_TEAM_SOURCE ?? 'json';
  if (source === 'json') return parsePublicTeams((await import('virtual:legacy-team-content')).default);
  if (source !== 'api') throw new Error('VITE_TEAM_SOURCE 必須是 api 或 json。');
  return load('teams/content', parsePublicTeams, signal);
};
function useSnapshot<T>(read: (signal: AbortSignal) => Promise<T>, empty: T): Snapshot<T> {
  const location = useLocation();
  const routeKey = location.pathname + location.search;
  const [generation, setGeneration] = useState(0);
  const refresh = useCallback(() => setGeneration(n => n + 1), []);
  const key = `${routeKey}:${generation}`;
  const [state, setState] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; data: T; error?: string }>({ key, status: 'loading', data: empty });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    setState({ key, status: 'loading', data: empty });
    read(controller.signal).then(data => { if (active) setState({ key, status: 'ready', data }); }).catch(error => { if (active) setState({ key, status: 'error', data: empty, error: controller.signal.aborted ? '內容載入逾時，請重試。' : error instanceof Error ? error.message : '無法載入內容。' }); }).finally(() => window.clearTimeout(timer));
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [key, read, empty]);
  useEffect(() => { const visible = () => { if (document.visibilityState !== 'hidden') refresh(); }; window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible); return () => { window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); }; }, [refresh]);
  return state.key === key ? { ...state, refresh } : { status: 'loading', data: empty, refresh };
}
export function OrganizationContentProvider({ children }: { children: ReactNode }) {
  const eesa = useSnapshot(loadEesa, emptyEesa);
  const teams = useSnapshot(loadTeams, emptyTeams);
  return <EesaContentContext.Provider value={eesa}><TeamContentContext.Provider value={teams}>{children}</TeamContentContext.Provider></EesaContentContext.Provider>;
}
export function useEesaContent() {
  const state = useContext(EesaContentContext);
  return useMemo(() => ({ ...state, eesaOverview: state.data.overview, departments: Object.fromEntries(state.data.departments.map(d => [d.id, d])), departmentCards: state.data.departments.map(d => ({ name: d.title, nameEn: d.nameEn, description: d.cardDescription, image: d.cardImage, link: `/eesa/${d.id}` })) }), [state]);
}
export function useTeamContent() {
  const state = useContext(TeamContentContext);
  return useMemo(() => ({ ...state, teams: state.data.teams.map(t => ({ ...t, key: t.id })), teamsData: Object.fromEntries(state.data.teams.map(t => [t.id, t])), teamSlides: state.data.teams.filter(t => imageSrc(t.photo)).map(t => ({ title: t.name, image: imageSrc(t.photo), alt: imageAlt(t.photo, `${t.name}隊伍合照`), to: `/team/${t.id}` })) }), [state]);
}
export function OrganizationContentStatus({ kind }: { kind: 'eesa' | 'team' }) {
  const eesa = useContext(EesaContentContext); const team = useContext(TeamContentContext);
  const state = kind === 'eesa' ? eesa : team;
  if (state.status === 'loading') return <p role="status">正在載入{kind === 'eesa' ? '系學會' : '系隊'}內容…</p>;
  if (state.status === 'error') return <div role="alert"><p>{state.error}</p><button onClick={state.refresh}>重試載入內容</button></div>;
  return null;
}
