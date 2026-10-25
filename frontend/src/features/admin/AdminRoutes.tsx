import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthError, getCurrentUser, login, logout } from "./api";
import type { AdminUser } from "./api";
import { ContactInbox, ContactMessageDetail, InboxSummary } from "./ContactInbox";
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
    <section className="admin-card admin-login" aria-labelledby="admin-login-title">
      <span className="eyebrow">NYCU EE · ADMIN</span>
      <h1 id="admin-login-title">後台登入</h1>
      <p className="admin-description">使用管理員帳號登入網站管理後台。</p>
      <form onSubmit={submit}>
        <label htmlFor="admin-username">使用者帳號</label>
        <input id="admin-username" name="username" autoComplete="username" required
          maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)}
          disabled={pending} />
        <label htmlFor="admin-password">密碼</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password"
          required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)}
          disabled={pending} />
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="admin-button" type="submit" disabled={pending}>
          {pending ? "登入中…" : "登入後台"}
        </button>
      </form>
      <Link className="admin-text-link" to="/">← 返回公開網站</Link>
    </section>
  );
}

function Dashboard({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await logout();
      onLogout();
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) onLogout();
      else setError(error instanceof Error ? error.message : "登出失敗，請重試。");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-card" aria-labelledby="admin-dashboard-title">
      <span className="eyebrow">管理總覽</span>
      <h1 id="admin-dashboard-title">歡迎，{user.username}</h1>
      <p className="admin-description">你已登入網站管理後台。</p>
      <dl className="admin-profile">
        <div><dt>使用者帳號</dt><dd>{user.username}</dd></div>
        <div><dt>角色</dt><dd>管理員</dd></div>
      </dl>
      <InboxSummary onSessionExpired={onLogout} />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-actions">
        <button className="admin-button" type="button" onClick={signOut} disabled={pending}>
          {pending ? "登出中…" : "登出"}
        </button>
        <Link className="admin-text-link" to="/">返回公開網站 ↗</Link>
      </div>
    </section>
  );
}

export default function AdminRoutes() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const sessionExpired = useCallback(() => setAuth({ status: "ready", user: null }), []);

  useEffect(() => {
    let active = true;
    setAuth({ status: "loading" });
    getCurrentUser().then(({ user }) => {
      if (active) setAuth({ status: "ready", user });
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof AuthError && error.status === 401) setAuth({ status: "ready", user: null });
      else setAuth({
        status: "error", message: error instanceof Error ? error.message : "無法取得登入狀態。",
        forbidden: error instanceof AuthError && error.status === 403,
      });
    });
    return () => { active = false; };
  }, [retry]);

  return (
    <div className="admin-shell">
      <header className="admin-header"><Link to="/">陽明交大電機系</Link><span>網站管理後台</span></header>
      <main className="admin-main">
        {auth.status === "loading" ? <p role="status">正在取得登入狀態…</p>
          : auth.status === "error" ? (
            <section className="admin-card">
              <h1>{auth.forbidden ? "無法存取後台" : "暫時無法連線"}</h1>
              <p className="admin-error" role="alert">{auth.message}</p>
              <button className="admin-button" onClick={() => {
                if (auth.forbidden) setAuth({ status: "ready", user: null });
                else setRetry((value) => value + 1);
              }}>{auth.forbidden ? "使用其他帳號登入" : "重試"}</button>
              <Link className="admin-text-link" to="/">返回公開網站</Link>
            </section>
          ) : (
            <Routes>
              <Route path="login" element={auth.user
                ? <Navigate to="/admin" replace />
                : <LoginPage onLogin={(user) => setAuth({ status: "ready", user })} />} />
              <Route index element={auth.user
                ? <Dashboard user={auth.user} onLogout={sessionExpired} />
                : <Navigate to="/admin/login" replace />} />
              <Route path="contact-messages" element={auth.user
                ? <ContactInbox onSessionExpired={sessionExpired} />
                : <Navigate to="/admin/login" replace />} />
              <Route path="contact-messages/:id" element={auth.user
                ? <ContactMessageDetail onSessionExpired={sessionExpired} />
                : <Navigate to="/admin/login" replace />} />
              <Route path="*" element={<Navigate to={auth.user ? "/admin" : "/admin/login"} replace />} />
            </Routes>
          )}
      </main>
    </div>
  );
}
