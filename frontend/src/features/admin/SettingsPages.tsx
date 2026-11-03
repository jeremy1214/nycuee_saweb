import { useState } from "react";
import {
  listCategories,
  saveCategory,
  loadActivities,
  listAudit,
} from "./cmsApi";
import type { Category } from "./cmsApi";
import {
  useResource,
  ResourceState,
  Field,
  ErrorNotice,
  useOperation,
  Empty,
} from "./cmsUi";
export function CategoryManager() {
  const resource = useResource(async () => ({
    categories: (await listCategories()).items,
    activities: await loadActivities(),
  }));
  const [selected, setSelected] = useState<Category>();
  const [creating, setCreating] = useState(false);
  const op = useOperation();
  return (
    <section>
      <div className="cms-page-heading">
        <h1>分類設定</h1>
        <button
          className="admin-button"
          onClick={() => {
            setCreating(true);
            setSelected({
              id: "",
              label: "",
              shortLabel: "",
              order: resource.data?.categories.length ?? 0,
              version: 1,
            });
          }}
        >
          新增分類
        </button>
      </div>
      <ErrorNotice
        error={op.error}
        retry={() => {
          setSelected(undefined);
          resource.reload();
        }}
      />
      <p role="status">{op.message}</p>
      <ResourceState {...resource} retry={resource.reload}>
        <div className="cms-records">
          {resource.data?.categories
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <article className="cms-record" key={c.id}>
                <div>
                  <strong>{c.label}</strong>
                  <p>
                    {c.shortLabel} · 順序 {c.order} · 精選{" "}
                    {c.featuredActivityId ?? "未設定"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCreating(false);
                    setSelected({ ...c });
                  }}
                >
                  設定 {c.label}
                </button>
              </article>
            ))}
        </div>
        {selected && (
          <form
            className="cms-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void op.run(async () => {
                await saveCategory(selected, creating);
                setSelected(undefined);
                resource.reload();
                op.setMessage("分類已儲存。");
              });
            }}
          >
            <h2>{creating ? "新增分類" : "編輯分類"}</h2>
            <fieldset disabled={op.pending}>
              <div className="cms-form-grid">
                <Field label="分類識別值">
                  <input
                    required
                    value={selected.id}
                    readOnly={!creating}
                    onChange={(e) =>
                      setSelected({ ...selected, id: e.target.value })
                    }
                  />
                </Field>
                <Field label="分類名稱">
                  <input
                    required
                    value={selected.label}
                    onChange={(e) =>
                      setSelected({ ...selected, label: e.target.value })
                    }
                  />
                </Field>
                <Field label="短標籤">
                  <input
                    required
                    value={selected.shortLabel}
                    onChange={(e) =>
                      setSelected({ ...selected, shortLabel: e.target.value })
                    }
                  />
                </Field>
                <Field label="順序">
                  <input
                    type="number"
                    min={0}
                    required
                    value={selected.order}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        order: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                {!creating && (
                  <Field label="精選活動">
                    <select
                      value={selected.featuredActivityId ?? ""}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          featuredActivityId: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">不設定精選</option>
                      {resource.data?.activities
                        .filter((a) =>
                          a.revisions.some(
                            (v) =>
                              v.id === a.activity.publishedRevisionId &&
                              v.content.categoryId === selected.id &&
                              v.content.detail,
                          ),
                        )
                        .map((a) => (
                          <option key={a.activity.id} value={a.activity.id}>
                            {a.content.title}
                          </option>
                        ))}
                    </select>
                  </Field>
                )}
              </div>
              <button className="admin-button" disabled={op.pending}>
                儲存分類
              </button>
            </fieldset>
          </form>
        )}
      </ResourceState>
    </section>
  );
}
export function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [filter, setFilter] = useState({ type: "", id: "" });
  const resource = useResource(
    () => listAudit(page, filter.type, filter.id),
    [page, filter],
  );
  return (
    <section>
      <h1>操作紀錄</h1>
      <form
        className="cms-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter({ type: entityType, id: entityId });
          setPage(1);
        }}
      >
        <Field label="目標類型">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">全部類型</option>
            {["Activity", "ActivityCategory", "EesaOverview", "Department", "Team", "User", "Media"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="目標識別值">
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
        </Field>
        <button>查詢紀錄</button>
      </form>
      <ResourceState {...resource} retry={resource.reload}>
        {!resource.data?.items.length && (
          <Empty>目前沒有符合條件的紀錄。</Empty>
        )}
        <ol className="cms-history">
          {resource.data?.items.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.action}</strong>
                <p>
                  {a.entityType} · {a.entityId}
                </p>
                <small>
                  {new Date(a.createdAt).toLocaleString("zh-TW")} · 操作者{" "}
                  {a.actorId ?? "已移除帳號"}
                </small>
                {a.details && <pre>{JSON.stringify(a.details, null, 2)}</pre>}
              </div>
            </li>
          ))}
        </ol>
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一頁
          </button>
          <span>
            第 {page} 頁 · 共 {resource.data?.total ?? 0} 筆
          </span>
          <button
            disabled={page * 20 >= (resource.data?.total ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            下一頁
          </button>
        </div>
      </ResourceState>
    </section>
  );
}
