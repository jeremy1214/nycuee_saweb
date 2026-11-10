import { useCallback, useEffect, useState, useRef } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  AuthError,
  getCurrentUser,
  login,
  logout,
  isAdminMock,
  loadAdminMock,
} from "./api";
import type { AdminUser } from "./api";
import {
  ContactInbox,
  ContactMessageDetail,
  InboxSummary,
} from "./ContactInbox";
import { OrganizationManager, OrganizationEditor, OrganizationWorkSummary } from "./OrganizationManager";
import { SiteContentManager } from "./SiteContentManager";
import ActivityManager, { WorkOverview } from "./ActivityManager";
import ActivityEditor from "./ActivityEditor";
import MediaManager from "./MediaManager";
import AccountManager, { SetPassword, Profile } from "./AccountManager";
import { CategoryManager, AuditPage } from "./SettingsPages";
import { CmsContext, UnsavedChanges } from "./cmsUi";
import "./admin.css";

type AuthState =
  | { status: "loading" }
  | { status: "ready"; user: AdminUser | null }
  | { status: "error"; message: string; forbidden: boolean };

function LoginPage({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const { user } = await login(username, password);
      onLogin(user);
      setPassword("");
      navigate("/admin", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "登入失敗，請重試。");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="admin-card admin-login"
      aria-labelledby="admin-login-title"
    >
      <span className="eyebrow">NYCU EE · ADMIN</span>
      <h1 id="admin-login-title">後台登入</h1>
      <p className="admin-description">使用帳號登入網站內容管理後台。</p>
      <form onSubmit={submit}>
        <label htmlFor="admin-username">使用者帳號</label>
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          required
          maxLength={100}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={pending}
        />
        <label htmlFor="admin-password">密碼</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button className="admin-button" type="submit" disabled={pending}>
          {pending ? "登入中…" : "登入後台"}
        </button>
      </form>
      <p className="cms-muted">
        {isAdminMock
          ? "示範帳號 admin／editor，密碼可填任意文字。"
          : "帳號由管理員建立，請使用獲授權的登入方式。"}
      </p>
      <a
        className="admin-text-link"
        href={isAdminMock ? "/#/admin" : "/api/v1/auth/google/start"}
        onClick={
          isAdminMock
            ? (e) => {
                e.preventDefault();
                void loadAdminMock().then(async (mock) => {
                  mock.setMockRole("ADMIN");
                  onLogin((await getCurrentUser()).user);
                  navigate("/admin");
                });
              }
            : undefined
        }
      >
        {isAdminMock ? "示範 Google 登入" : "使用 Google 登入"}
      </a>
      <br />
      <Link className="admin-text-link" to="/">
        ← 返回公開網站
      </Link>
    </section>
  );
}

export default function AdminRoutes() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false);
  const demoBanner = useRef<HTMLDivElement>(null);
  const [demoHeight, setDemoHeight] = useState(0);
  useEffect(() => {
    const banner = demoBanner.current;
    if (!banner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setDemoHeight(banner.getBoundingClientRect().height),
    );
    observer.observe(banner);
    return () => observer.disconnect();
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = useCallback(
    () => setAuth({ status: "ready", user: null }),
    [],
  );

  useEffect(() => {
    let active = true;
    setAuth({ status: "loading" });
    getCurrentUser()
      .then(({ user }) => {
        if (active) setAuth({ status: "ready", user });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof AuthError && error.status === 401)
          setAuth({ status: "ready", user: null });
        else
          setAuth({
            status: "error",
            message:
              error instanceof Error ? error.message : "無法取得登入狀態。",
            forbidden: error instanceof AuthError && error.status === 403,
          });
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const user = auth.status === "ready" ? auth.user : null;
  const routeGroups = [
    { label: null, routes: [["/admin", "工作總覽", false]] },
    {
      label: "活動管理",
      routes: [
        ["/admin/activities", "活動管理", false],
        ["/admin/other", "其他活動介紹", false],
        ["/admin/categories", "分類設定", true],
      ],
    },
    {
      label: null,
      routes: [
        ["/admin/eesa", "系學會管理", false],
        ["/admin/teams", "系隊管理", false],
        ["/admin/site-content/home", "首頁內容", true],
        ["/admin/site-content/resources", "學習資源", true],
        ["/admin/site-content/settings", "全站聯絡設定", true],
        ["/admin/media", "媒體管理", false],
        ["/admin/users", "帳號與授權", true],
        ["/admin/audit", "操作紀錄", true],
        ["/admin/contact-messages", "聯絡收件匣", true],
        ["/admin/profile", "我的帳號", false],
      ],
    },
  ] as const;
  const routes = routeGroups.flatMap((group) => [...group.routes]);
  const title =
    routes
      .slice()
      .reverse()
      .find(([path]) => location.pathname.startsWith(path))?.[1] ??
    "網站管理後台";
  const guard = (node: React.ReactNode, adminOnly = false) =>
    !user ? (
      <Navigate to="/admin/login" replace />
    ) : adminOnly && user.role !== "ADMIN" ? (
      <section>
        <h1>無法存取此功能</h1>
        <p role="alert">此功能僅限管理員。</p>
        <Link to="/admin">返回工作總覽</Link>
      </section>
    ) : (
      node
    );
  async function demo(change: "ADMIN" | "EDITOR" | "reset") {
    if (
      dirty &&
      !window.confirm("切換示範身分或重設會放棄未儲存的修改，確定繼續？")
    )
      return;
    const mock = await loadAdminMock();
    if (change === "reset") mock.resetMock();
    else mock.setMockRole(change);
    setDirty(false);
    setRetry((v) => v + 1);
  }
  async function signOut() {
    if (dirty && !window.confirm("登出會離開未儲存的修改，確定繼續？")) return;
    setPending(true);
    setOperationError("");
    try {
      await logout();
      setDirty(false);
      sessionExpired();
    } catch (e) {
      if (e instanceof AuthError && e.status === 401) sessionExpired();
      else setOperationError(e instanceof Error ? e.message : "登出失敗。");
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      className={`admin-shell${user ? " cms-authenticated" : ""}`}
      style={{ "--cms-demo-height": `${demoHeight}px` } as CSSProperties}
    >
      {isAdminMock && (
        <div className="cms-demo-bar" ref={demoBanner}>
          <strong>示範模式</strong>
          <span>資料保存在記憶體，重新整理即重設。</span>
          <button type="button" onClick={() => void demo("ADMIN")}>
            切換管理員
          </button>
          <button type="button" onClick={() => void demo("EDITOR")}>
            切換編輯者
          </button>
          <button type="button" onClick={() => void demo("reset")}>
            重設示範資料
          </button>
        </div>
      )}
      {user && (
        <>
          <UnsavedChanges dirty={dirty} />
          <aside className="cms-sidebar">
            <Link to="/admin" className="cms-brand">
              NYCU EE<span>網站內容管理</span>
            </Link>
            <button
              type="button"
              className="cms-menu-toggle"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              功能選單
            </button>
            <nav aria-label="後台功能" className={menuOpen ? "is-open" : ""}>
              {routeGroups.map((group, index) => (
                <div
                  key={group.label ?? index}
                  className={`cms-nav-group${group.label ? " cms-nav-group-labeled" : ""}`}
                  role={group.label ? "group" : undefined}
                  aria-label={group.label ?? undefined}
                >
                  {group.label && (
                    <button
                      type="button"
                      className="cms-nav-group-toggle"
                      aria-expanded={activityMenuOpen}
                      aria-controls="cms-activity-menu"
                      onClick={() => setActivityMenuOpen((open) => !open)}
                    >
                      <span>{group.label}</span>
                      <span className="cms-nav-group-arrow" aria-hidden="true">{activityMenuOpen ? "▾" : "▸"}</span>
                    </button>
                  )}
                  <div
                    id={group.label ? "cms-activity-menu" : undefined}
                    className="cms-nav-group-items"
                    hidden={Boolean(group.label) && !activityMenuOpen}
                  >
                    {group.routes
                    .filter(
                      ([, , adminOnly]) => !adminOnly || user.role === "ADMIN",
                    )
                    .map(([path, label]) => (
                      <NavLink
                        key={path}
                        to={path}
                        end={path === "/admin"}
                        onClick={() => setMenuOpen(false)}
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <small>
              陽明交大電機系
              <br />
              CONTENT WORKSPACE
            </small>
          </aside>
        </>
      )}

      <header className="admin-header">
        <strong>{user ? title : "陽明交大電機系 · 網站管理後台"}</strong>
        {user && (
          <div className="cms-toolbar">
            <span>
              {user.username} · {user.role === "ADMIN" ? "管理員" : "編輯者"}
            </span>
            <Link to="/">公開網站 ↗</Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => void signOut()}
            >
              {pending ? "登出中…" : "登出"}
            </button>
          </div>
        )}
      </header>
      {operationError && (
        <p role="alert" className="admin-error">
          {operationError}
        </p>
      )}
      <main className="admin-main">
        {auth.status === "loading" ? (
          <p role="status">正在取得登入狀態…</p>
        ) : auth.status === "error" ? (
          <section className="admin-card">
            <h1>{auth.forbidden ? "無法存取後台" : "暫時無法連線"}</h1>
            <p className="admin-error" role="alert">
              {auth.message}
            </p>
            <button
              className="admin-button"
              onClick={() => {
                if (auth.forbidden) setAuth({ status: "ready", user: null });
                else setRetry((value) => value + 1);
              }}
            >
              {auth.forbidden ? "使用其他帳號登入" : "重試"}
            </button>
            <Link className="admin-text-link" to="/">
              返回公開網站
            </Link>
          </section>
        ) : (
          <CmsContext.Provider
            value={{
              user: user ?? { id: "", username: "", role: "ADMIN" },
              expired: sessionExpired,
              dirty,
              setDirty,
            }}
          >
            <Routes>
              <Route
                path="login"
                element={
                  user ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <LoginPage
                      onLogin={(user) => setAuth({ status: "ready", user })}
                    />
                  )
                }
              />
              <Route path="set-password" element={<SetPassword />} />
              <Route
                index
                element={guard(
                  <>
                    <WorkOverview />
                    <OrganizationWorkSummary />
                    {user?.role === "ADMIN" && (
                      <InboxSummary onSessionExpired={sessionExpired} />
                    )}
                  </>,
                )}
              />
              <Route path="activities" element={guard(<ActivityManager />)} />
              <Route
                path="activities/:id"
                element={guard(<ActivityEditor />)}
              />
              <Route path="other" element={guard(<ActivityManager other />)} />
              <Route path="eesa" element={guard(<OrganizationManager kind="department" />)} />
              <Route path="eesa/overview" element={guard(<OrganizationEditor kind="overview" />, true)} />
              <Route path="eesa/departments/:id" element={guard(<OrganizationEditor kind="department" />)} />
              <Route path="teams" element={guard(<OrganizationManager kind="team" />)} />
              <Route path="teams/:id" element={guard(<OrganizationEditor kind="team" />)} />
              <Route path="site-content/home" element={guard(<SiteContentManager kind="home" />, true)} />
              <Route path="site-content/resources" element={guard(<SiteContentManager kind="resources" />, true)} />
              <Route path="site-content/settings" element={guard(<SiteContentManager kind="settings" />, true)} />
              <Route path="media" element={guard(<MediaManager />)} />
              <Route
                path="categories"
                element={guard(<CategoryManager />, true)}
              />
              <Route path="users" element={guard(<AccountManager />, true)} />
              <Route path="audit" element={guard(<AuditPage />, true)} />
              <Route path="profile" element={guard(<Profile />)} />
              <Route
                path="contact-messages"
                element={guard(
                  <ContactInbox onSessionExpired={sessionExpired} />,
                  true,
                )}
              />
              <Route
                path="contact-messages/:id"
                element={guard(
                  <ContactMessageDetail onSessionExpired={sessionExpired} />,
                  true,
                )}
              />
              <Route
                path="*"
                element={
                  <Navigate to={user ? "/admin" : "/admin/login"} replace />
                }
              />
            </Routes>
          </CmsContext.Provider>
        )}
      </main>
    </div>
  );
}
