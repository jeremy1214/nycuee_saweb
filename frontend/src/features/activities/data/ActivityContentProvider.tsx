import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { PublicActivityContent } from '../../../../../shared/activity-content';
import { compareActivityDates, hasActivityDate } from './activityDates';
import { deriveOtherActivities } from './contentSelectors';
import { loadActivityContent } from './publicContentApi';

const empty: PublicActivityContent = { activities: [], categories: [] };
export interface ActivityContentState {
  status: 'loading' | 'ready' | 'error';
  data: PublicActivityContent;
  error?: string;
  refresh: () => void;
}
// An enclosing provider can inject a snapshot (tests/embedded rendering).
export const ActivityContentContext = createContext<ActivityContentState | null>(null);

export function ActivityContentProvider({ children }: { children: ReactNode }) {
  const inherited = useContext(ActivityContentContext);
  return inherited ? children : <ManagedContent>{children}</ManagedContent>;
}

function ManagedContent({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const routeKey = pathname + search;
  const route = useRef(routeKey);
  route.current = routeKey;
  const [state, setState] = useState<Omit<ActivityContentState, 'refresh'> & { routeKey: string }>({ status: 'loading', data: empty, routeKey });
  const pending = useRef<AbortController | null>(null);
  const timeout = useRef<number | null>(null);
  const refresh = useCallback(() => {
    if (pending.current) return;
    const controller = new AbortController();
    const requestedRoute = route.current;
    pending.current = controller;
    setState({ status: 'loading', data: empty, routeKey: requestedRoute });
    const timer = window.setTimeout(() => controller.abort(), 15000);
    timeout.current = timer;
    void loadActivityContent(controller.signal).then(data => {
      if (pending.current === controller) setState({ status: 'ready', data, routeKey: requestedRoute });
    }).catch(error => {
      if (pending.current === controller) setState({ status: 'error', data: empty, routeKey: requestedRoute, error: error instanceof Error && error.name !== 'AbortError' ? error.message : '活動資料載入逾時，請重試。' });
    }).finally(() => {
      window.clearTimeout(timer);
      if (pending.current === controller) pending.current = null;
    });
  }, []);
  useEffect(() => {
    refresh();
    return () => {
      pending.current?.abort();
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      pending.current = null;
    };
  }, [routeKey, refresh]);
  useEffect(() => {
    const visible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  // Gate the new route during render, before any detail-page redirect/404 can use an old snapshot.
  const value = useMemo<ActivityContentState>(() => state.routeKey === routeKey ? { ...state, refresh }
    : { status: 'loading', data: empty, refresh }, [state, refresh, routeKey]);
  return <ActivityContentContext.Provider value={value}>{children}</ActivityContentContext.Provider>;
}

export function useActivityContent() {
  const context = useContext(ActivityContentContext);
  if (!context) throw new Error('Activity components must be inside ActivityContentProvider.');
  return useMemo(() => ({
    ...context, activities: context.data.activities, activityCategories: context.data.categories,
    otherActivities: deriveOtherActivities(context.data.activities),
    calendarEvents: context.data.activities.filter(hasActivityDate).sort(compareActivityDates),
  }), [context]);
}

export function ActivityContentStatus() {
  const { status, error, refresh } = useActivityContent();
  if (status === 'loading') return <p role="status">正在載入活動資料…</p>;
  if (status === 'error') return <div role="alert"><p>{error}</p><button type="button" onClick={refresh}>重試活動資料</button></div>;
  return null;
}
