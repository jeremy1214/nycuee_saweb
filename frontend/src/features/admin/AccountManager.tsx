import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  listAccounts,
  createAccount,
  updateAccount,
  getGrants,
  saveGrants,
  issueToken,
  listCategories,
  loadActivities,
  consumeToken,
  linkGoogle,
} from "./cmsApi";
import type { AccountDto, GrantsDto } from "./cmsApi";
import type { PasswordTokenLinkDto } from "../../../../shared/cms-contract";
import {
  useResource,
  ResourceState,
  Field,
  ErrorNotice,
  useOperation,
  useCms,
} from "./cmsUi";
import { isAdminMock } from "./api";
function TokenLink({
  value,
  close,
}: {
  value: PasswordTokenLinkDto;
  close: () => void;
}) {
  const op = useOperation();
  return (
    <section className="cms-notice">
      <h2>一次顯示的設定密碼連結</h2>
      <p>
        請透過既有聯絡方式交付。有效期限{" "}
        {new Date(value.expiresAt).toLocaleString("zh-TW")}。
      </p>
      <Field label="設定密碼連結">
        <input readOnly value={value.url} onFocus={(e) => e.target.select()} />
      </Field>
      <div className="cms-toolbar">
        <button
          onClick={() =>
            void op.run(async () => {
              await navigator.clipboard.writeText(value.url);
              op.setMessage("連結已複製。");
            })
          }
        >
          複製連結
        </button>
        <button onClick={close}>完成並隱藏連結</button>
      </div>
      <ErrorNotice error={op.error} />
      <p role="status">{op.message}</p>
    </section>
  );
}
export default function AccountManager() {
  const resource = useResource(async () => ({
    users: (await listAccounts()).items,
    categories: (await listCategories()).items,
    activities: await loadActivities(),
  }));
  const [selected, setSelected] = useState<AccountDto>();
  const [grants, setGrants] = useState<GrantsDto>({
    categoryIds: [],
    activityIds: [],
  });
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [token, setToken] = useState<PasswordTokenLinkDto>();
  const op = useOperation();
  const { user, expired } = useCms();
  async function select(a: AccountDto) {
    setToken(undefined);
    const value = await getGrants(a.id);
    setSelected(a);
    setGrants(value);
  }
  function toggle(key: keyof GrantsDto, id: string, checked: boolean) {
    setGrants((g) => ({
      ...g,
      [key]: checked ? [...g[key], id] : g[key].filter((v) => v !== id),
    }));
  }
  async function refresh(a: AccountDto) {
    setSelected(a);
    resource.reload();
    if (a.id === user.id && (!a.enabled || a.role !== user.role)) expired();
  }
  return (
    <section>
      <h1>帳號與授權</h1>
      <p className="admin-description">
        建立帳號後交付啟用連結，並指定分類或活動的編輯範圍。
      </p>
      <ErrorNotice
        error={op.error}
        retry={() => {
          setSelected(undefined);
          resource.reload();
        }}
      />
      <p role="status">{op.message}</p>
      {token && <TokenLink value={token} close={() => setToken(undefined)} />}
      <section className="cms-panel">
        <h2>建立帳號</h2>
        <form
          className="cms-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            void op.run(async () => {
              const result = await createAccount(username.trim(), role);
              setToken(result.activation);
              setUsername("");
              resource.reload();
            });
          }}
        >
          <Field label="新帳號名稱">
            <input
              required
              maxLength={100}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="新帳號角色">
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="EDITOR">編輯者</option>
              <option value="ADMIN">管理員</option>
            </select>
          </Field>
          <button className="admin-button" disabled={op.pending}>
            建立並產生啟用連結
          </button>
        </form>
      </section>
      <ResourceState {...resource} retry={resource.reload}>
        <div className="cms-records">
          {resource.data?.users.map((a) => (
            <article className="cms-record" key={a.id}>
              <div>
                <strong>{a.username}</strong>
                <p>
                  {a.role === "ADMIN" ? "管理員" : "編輯者"} ·{" "}
                  {a.enabled ? "啟用中" : "已停用"} ·{" "}
                  {a.hasPassword ? "已設定密碼" : "待啟用"} ·{" "}
                  {a.googleLinked ? "Google 已綁定" : "Google 未綁定"}
                </p>
              </div>
              <button
                disabled={op.pending}
                onClick={() => void op.run(() => select(a))}
              >
                管理 {a.username}
              </button>
            </article>
          ))}
        </div>
        {selected && (
          <section className="cms-panel">
            <h2>{selected.username} 的帳號與授權</h2>
            <fieldset disabled={op.pending}>
              <div className="cms-form-grid">
                <Field label="角色">
                  <select
                    value={selected.role}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        role: e.target.value as AccountDto["role"],
                      })
                    }
                  >
                    <option value="EDITOR">編輯者</option>
                    <option value="ADMIN">管理員</option>
                  </select>
                </Field>
                <label className="cms-check">
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(e) =>
                      setSelected({ ...selected, enabled: e.target.checked })
                    }
                  />
                  啟用帳號
                </label>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("確定更新帳號角色及啟用狀態？"))
                    void op.run(async () => {
                      await refresh(await updateAccount(selected));
                      op.setMessage("帳號已更新。");
                    });
                }}
              >
                儲存帳號設定
              </button>
              <h3>分類授權</h3>
              <div
                className="cms-check-grid"
                role="group"
                aria-label="分類授權"
              >
                {resource.data?.categories.map((c) => (
                  <label className="cms-check" key={c.id}>
                    <input
                      type="checkbox"
                      checked={grants.categoryIds.includes(c.id)}
                      onChange={(e) =>
                        toggle("categoryIds", c.id, e.target.checked)
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <h3>指定活動授權</h3>
              <div
                className="cms-check-grid"
                role="group"
                aria-label="指定活動授權"
              >
                {resource.data?.activities.map((a) => (
                  <label className="cms-check" key={a.activity.id}>
                    <input
                      type="checkbox"
                      checked={grants.activityIds.includes(a.activity.id)}
                      onChange={(e) =>
                        toggle("activityIds", a.activity.id, e.target.checked)
                      }
                    />
                    {a.content.title}
                  </label>
                ))}
              </div>
              <div className="cms-toolbar">
                <button
                  onClick={() =>
                    void op.run(async () => {
                      await refresh(await saveGrants(selected, grants));
                      op.setMessage("編輯範圍已更新。");
                    })
                  }
                >
                  儲存授權範圍
                </button>
                <button
                  onClick={() =>
                    void op.run(async () =>
                      setToken(
                        await issueToken(
                          selected.id,
                          selected.version,
                          selected.hasPassword ? "RESET" : "ACTIVATE",
                        ),
                      ),
                    )
                  }
                >
                  {selected.hasPassword
                    ? "產生密碼重設連結"
                    : "重新產生啟用連結"}
                </button>
              </div>
            </fieldset>
          </section>
        )}
      </ResourceState>
    </section>
  );
}
export function SetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);
  const op = useOperation();
  return (
    <section className="admin-card admin-login">
      <h1>設定密碼</h1>
      {done ? (
        <>
          <p>密碼已設定，請重新登入。</p>
          <Link to="/admin/login" replace>
            前往登入
          </Link>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void op.run(async () => {
              if (password !== confirmation)
                throw new Error("兩次密碼不一致。");
              await consumeToken(params.get("token") ?? "", password);
              setPassword("");
              setConfirmation("");
              navigate("/admin/set-password", { replace: true });
              setDone(true);
            });
          }}
        >
          <Field label="新密碼（12–1024 字元）">
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="確認新密碼">
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </Field>
          <ErrorNotice error={op.error} />
          <button
            className="admin-button"
            disabled={op.pending || !params.get("token")}
          >
            設定密碼
          </button>
        </form>
      )}
    </section>
  );
}
export function Profile() {
  const { user } = useCms();
  const [params] = useSearchParams();
  const op = useOperation();
  return (
    <section>
      <h1>我的帳號</h1>
      <div className="cms-panel">
        <h2>{user.username}</h2>
        <p>{user.role === "ADMIN" ? "管理員" : "編輯者"}</p>
        <p>
          {params.get("linked") === "1"
            ? "Google 綁定已完成。"
            : "登入後可主動綁定 Google 身分。"}
        </p>
        <ErrorNotice error={op.error} />
        <button
          disabled={op.pending}
          onClick={() =>
            void op.run(async () => {
              const { url } = await linkGoogle();
              if (isAdminMock) {
                op.setMessage("示範 Google 綁定已完成。");
              } else window.location.assign(url);
            })
          }
        >
          綁定 Google
        </button>
        <p role="status">{op.message}</p>
      </div>
    </section>
  );
}
