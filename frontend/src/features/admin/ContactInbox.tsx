import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AuthError } from "./api";
import { contactCategories, getContactMessage, getContactMessages, markContactRead } from "./contactApi";

type AuthProps = { onSessionExpired: () => void };
const dateFormat = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
});
const date = (value: string) => dateFormat.format(new Date(value));

function useLoad<T>(load: () => Promise<T>, onSessionExpired: () => void) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    load().then((result) => { if (active) setData(result); }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof AuthError && cause.status === 401) onSessionExpired();
      else setError(cause instanceof Error ? cause.message : "無法載入聯絡訊息。");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, onSessionExpired, version]);
  return { data, setData, loading, error, reload: () => setVersion((value) => value + 1) };
}

const loadSummary = () => getContactMessages();

export function InboxSummary({ onSessionExpired }: AuthProps) {
  const { data, loading, error, reload } = useLoad(loadSummary, onSessionExpired);
  return <div className="admin-inbox-summary">
    <h2>聯絡訊息</h2>
    {loading && <p role="status">正在取得未讀數量…</p>}
    {data && <p>未讀訊息 <strong className="admin-count">{data.unreadCount}</strong> 則</p>}
    {error && <p className="admin-error" role="alert">{error} <button type="button" onClick={reload}>重試</button></p>}
    <Link className="admin-text-link" to="/admin/contact-messages">開啟收件匣 →</Link>
  </div>;
}

export function ContactInbox({ onSessionExpired }: AuthProps) {
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 107374182 ? requestedPage : 1;
  const read = params.get("read") === "unread" ? "unread" : "all";
  const load = useCallback(() => getContactMessages(page, read), [page, read]);
  const { data, loading, error, reload } = useLoad(load, onSessionExpired);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const query = `?page=${page}&read=${read}`;

  // Reading the last item in the unread filter can remove the last page.
  useEffect(() => {
    if (data && page > totalPages) setParams({ page: String(totalPages), read }, { replace: true });
  }, [data, page, read, setParams, totalPages]);

  return <section className="admin-card admin-inbox" aria-labelledby="admin-inbox-title">
    <Link className="admin-text-link" to="/admin">← 管理總覽</Link>
    <h1 id="admin-inbox-title">聯絡訊息</h1>
    <p className="admin-description">查看訪客透過聯絡表單送來的問題。回覆請使用既有信箱。</p>
    <div className="admin-inbox-toolbar">
      <label>顯示訊息 <select value={read} onChange={(event) => setParams({ page: "1", read: event.target.value })}>
        <option value="all">全部訊息</option><option value="unread">未讀訊息</option>
      </select></label>
      <button className="admin-button" type="button" disabled={loading} onClick={reload}>重新整理</button>
    </div>
    {loading && <p role="status">正在載入訊息…</p>}
    {error && <div role="alert"><p className="admin-error">{error}</p><button className="admin-button" onClick={reload}>重試</button></div>}
    {data && <>
      <p role="status">共 {data.total} 則 · 未讀 {data.unreadCount} 則</p>
      {!data.items.length ? <p className="admin-empty">{read === "unread" ? "目前沒有未讀訊息。" : "目前尚未收到聯絡訊息。"}</p>
        : <ul className="admin-message-list">{data.items.map((message) => <li key={message.id}>
          <Link to={`/admin/contact-messages/${encodeURIComponent(message.id)}${query}`}>
            <div className="admin-message-heading"><span className={`admin-read-badge${message.readAt ? " is-read" : ""}`}>{message.readAt ? "已讀" : "未讀"}</span><strong>{message.subject}</strong></div>
            <div className="admin-message-meta"><span>{message.name} · {message.email}</span><span>{contactCategories[message.category]}</span><time dateTime={message.createdAt}>{date(message.createdAt)}（台灣時間）</time></div>
          </Link>
        </li>)}</ul>}
      <nav className="admin-pagination" aria-label="訊息分頁">
        <button type="button" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1), read })}>上一頁</button>
        <span>第 {page} / {totalPages} 頁</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1), read })}>下一頁</button>
      </nav>
    </>}
  </section>;
}

export function ContactMessageDetail({ onSessionExpired }: AuthProps) {
  const { id = "" } = useParams();
  const { search } = useLocation();
  const load = useCallback(() => getContactMessage(id), [id]);
  const { data, setData, loading, error, reload } = useLoad(load, onSessionExpired);
  const [pending, setPending] = useState(false);
  const [readError, setReadError] = useState("");
  async function markRead() {
    if (pending) return;
    setPending(true);
    setReadError("");
    try { setData(await markContactRead(id)); }
    catch (cause) {
      if (cause instanceof AuthError && cause.status === 401) onSessionExpired();
      else setReadError(cause instanceof Error ? cause.message : "無法標記已讀。");
    } finally { setPending(false); }
  }
  return <section className="admin-card admin-inbox" aria-labelledby="admin-message-title">
    <Link className="admin-text-link" to={`/admin/contact-messages${search}`}>← 返回收件匣</Link>
    <h1 id="admin-message-title">訊息詳情</h1>
    {loading && <p role="status">正在載入訊息…</p>}
    {error && <div role="alert"><p className="admin-error">{error}</p><button className="admin-button" onClick={reload}>重試</button></div>}
    {data && <>
      <h2 className="admin-message-subject">{data.subject}</h2>
      <dl className="admin-message-details">
        <div><dt>姓名</dt><dd>{data.name}</dd></div>
        <div><dt>Email</dt><dd><a href={`mailto:${encodeURIComponent(data.email)}`}>{data.email}</a></dd></div>
        <div><dt>問題類別</dt><dd>{contactCategories[data.category]}</dd></div>
        <div><dt>收件時間</dt><dd><time dateTime={data.createdAt}>{date(data.createdAt)}（台灣時間）</time></dd></div>
        <div><dt>已讀狀態</dt><dd>{data.readAt ? `已讀 · ${date(data.readAt)}（台灣時間）` : "未讀"}</dd></div>
      </dl>
      <h3>問題內容</h3><p className="admin-message-body">{data.message}</p>
      {readError && <p className="admin-error" role="alert">{readError}</p>}
      {data.readAt ? <p role="status">這則訊息已標記為已讀。</p> : <button className="admin-button" disabled={pending} onClick={markRead}>{pending ? "更新中…" : "標記已讀"}</button>}
    </>}
  </section>;
}
