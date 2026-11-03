import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { DependencyList, ReactNode } from "react";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router-dom";
import { AuthError } from "./api";
import type { AdminUser } from "./api";
export const CmsContext = createContext<{
  user: AdminUser;
  expired: () => void;
  dirty: boolean;
  setDirty: (value: boolean) => void;
} | null>(null);
export function useCms() {
  const value = useContext(CmsContext);
  if (!value) throw new Error("Missing CMS context");
  return value;
}
export function useResource<T>(
  load: () => Promise<T>,
  dependencies: DependencyList = [],
) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([dependencies, revision]);
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error?: unknown;
    loading: boolean;
  }>({ key, loading: true });
  const { expired } = useCms();
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setState({ key, loading: true });
    load()
      .then((data) => {
        if (active) setState({ key, data, loading: false });
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof AuthError && error.status === 401) expired();
        setState({ key, error, loading: false });
      });
    return () => {
      active = false;
    };
  }, [key]);
  return state.key === key
    ? { data: state.data, error: state.error, loading: state.loading, reload }
    : { data: undefined, error: undefined, loading: true, reload };
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { expired } = useCms();
  useEffect(() => {
    if (error instanceof AuthError && error.status === 401) expired();
  }, [error, expired]);
  if (!error) return null;
  return (
    <div className="cms-notice cms-error" role="alert">
      <p>
        {error instanceof AuthError && error.status === 403
          ? "權限不足或授權已變更。"
          : error instanceof Error
            ? error.message
            : "操作失敗，請重試。"}
      </p>
      {retry && (
        <button type="button" onClick={retry}>
          重新載入
        </button>
      )}
    </div>
  );
}
export function ResourceState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <p role="status" className="cms-loading">
        正在載入內容…
      </p>
    );
  if (error) return <ErrorNotice error={error} retry={retry} />;
  return children;
}
export function Field({
  label,
  children,
  path,
}: {
  label: string;
  children: ReactNode;
  path?: string;
}) {
  return (
    <label className="cms-field" data-field-path={path}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="admin-empty">{children}</p>;
}
function NavigationBlocker({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("尚有未儲存的修改，確定要離開嗎？")) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  return null;
}
export function UnsavedChanges({ dirty }: { dirty: boolean }) {
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  useEffect(() => {
    if (!dirty || dataRouter) return;
    const savedUrl = window.location.href;
    const savedState = window.history.state;
    let restoring = false;
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || target.getAttribute('target') === '_blank' || target.hasAttribute('download')) return;
      const url = new URL(target.getAttribute('href')!, savedUrl);
      if (url.href === savedUrl || target.closest('.cms-preview') || target.getAttribute('href')?.startsWith('#organization-field-')) return;
      if (!window.confirm('尚有未儲存的修改，確定要離開嗎？')) { event.preventDefault(); event.stopPropagation(); }
    };
    const pop = (event: PopStateEvent) => {
      if (restoring || window.location.href === savedUrl) return;
      if (window.confirm('尚有未儲存的修改，確定要離開嗎？')) return;
      event.stopImmediatePropagation();
      const delta = typeof savedState?.idx === 'number' && typeof event.state?.idx === 'number' ? savedState.idx - event.state.idx : 0;
      if (delta) { restoring = true; window.history.go(delta); }
      else window.history.pushState(savedState, '', savedUrl);
    };
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', pop, true);
    return () => { document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop, true); };
  }, [dirty, dataRouter]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  return dataRouter ? <NavigationBlocker dirty={dirty} /> : null;
}
export function useOperation() {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError(undefined);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(e);
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return { pending, error, setError, message, setMessage, run };
}
