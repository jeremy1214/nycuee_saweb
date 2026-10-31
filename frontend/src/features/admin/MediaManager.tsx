import { useState } from "react";
import { Link } from "react-router-dom";
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  mediaPath,
  listCategories,
  loadActivities,
} from "./cmsApi";
import type { MediaScope, MediaDto, ActivityRecord } from "./cmsApi";
import {
  useResource,
  ResourceState,
  ErrorNotice,
  Field,
  Empty,
  useOperation,
} from "./cmsUi";
import { mediaPreview } from "./mediaPreview";
export function findReferences(records: ActivityRecord[], src: string) {
  const refs: {
    activityId: string;
    title: string;
    number: number;
    path: string;
  }[] = [];
  function visit(
    value: unknown,
    path: string,
    a: ActivityRecord,
    number: number,
  ) {
    if (!value || typeof value !== "object") return;
    if ("src" in value && value.src === src)
      refs.push({
        activityId: a.activity.id,
        title: a.content.title,
        number,
        path,
      });
    Object.entries(value).forEach(([key, child]) =>
      visit(child, path ? `${path}.${key}` : key, a, number),
    );
  }
  records.forEach((a) =>
    a.revisions.forEach((v) => visit(v.content, "", a, v.number)),
  );
  return refs;
}
export function MediaBrowser({
  scope,
  onSelect,
}: {
  scope: MediaScope;
  onSelect?: (src: string, alt: string) => void;
}) {
  const scopeKey = scope.activityId ?? scope.categoryId;
  const resource = useResource(() => listMedia(scope), [scopeKey]);
  const references = useResource(loadActivities, [scopeKey]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaDto>();
  const op = useOperation();
  async function upload(file: File) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10485760
    )
      throw new Error("請選擇 10 MiB 內的 JPEG、PNG 或 WebP。");
    await uploadMedia(scope, file);
    resource.reload();
    op.setMessage("圖片已上傳。");
  }
  const items =
    resource.data?.items.filter((m) =>
      m.originalName.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  return (
    <div className="cms-media-browser">
      <div className="cms-toolbar">
        <Field label="搜尋圖片">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="原始檔名"
          />
        </Field>
        <Field label="上傳圖片（JPEG／PNG／WebP，10 MiB 內）">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={op.pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void op.run(() => upload(file));
              e.target.value = "";
            }}
          />
        </Field>
      </div>
      <ErrorNotice error={op.error} />
      <p role="status">{op.pending ? "正在處理圖片…" : op.message}</p>
      <ResourceState {...resource} retry={resource.reload}>
        {!items.length && <Empty>此範圍尚無符合條件的圖片。</Empty>}
        <div className="cms-media-grid">
          {items.map((m) => (
            <article className="cms-media-card" key={m.id}>
              <button
                type="button"
                className="cms-image-button"
                onClick={() => setSelected(m)}
                aria-label={`檢視 ${m.originalName}`}
              >
                <img src={mediaPreview(mediaPath(m))} alt={m.originalName} />
              </button>
              <strong>{m.originalName}</strong>
              <small>
                {m.width} × {m.height} · {(m.byteSize / 1024).toFixed(0)} KiB
              </small>
              <span className="cms-badge">
                {m.visibility === "PRIVATE" ? "未公開" : "已公開"}
              </span>
              <div className="cms-toolbar">
                {onSelect && (
                  <button
                    type="button"
                    onClick={() => onSelect(mediaPath(m), m.originalName)}
                  >
                    使用圖片
                  </button>
                )}
                <button
                  type="button"
                  disabled={op.pending || m.visibility === "PUBLIC"}
                  onClick={() => {
                    if (window.confirm("確定刪除這張圖片？"))
                      void op.run(async () => {
                        await deleteMedia(m.id);
                        resource.reload();
                        setSelected(undefined);
                      });
                  }}
                >
                  刪除
                </button>
              </div>
            </article>
          ))}
        </div>
      </ResourceState>
      {selected && (
        <section className="cms-panel">
          <div className="cms-toolbar">
            <h3>{selected.originalName}</h3>
            <button type="button" onClick={() => setSelected(undefined)}>
              關閉圖片詳情
            </button>
          </div>
          <img
            className="cms-media-detail"
            src={mediaPreview(mediaPath(selected))}
            alt={selected.originalName}
          />
          <h4>可讀取版本中的引用位置</h4>
          <ResourceState {...references} retry={references.reload}>
            {(() => {
              const id = selected.id;
              const refs = [
                ...findReferences(
                  references.data ?? [],
                  `/api/v1/admin/media/${id}/file`,
                ),
                ...findReferences(
                  references.data ?? [],
                  `/api/v1/public/media/${id}`,
                ),
              ];
              return refs.length ? (
                <ul>
                  {refs.map((ref) => (
                    <li key={`${ref.activityId}-${ref.number}-${ref.path}`}>
                      <Link to={`/admin/activities/${ref.activityId}`}>
                        {ref.title}
                      </Link>{" "}
                      · 版本 {ref.number} · {ref.path}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>目前可讀取範圍內未找到引用，刪除時仍由服務檢查。</p>
              );
            })()}
          </ResourceState>
        </section>
      )}
    </div>
  );
}
export default function MediaManager() {
  const choices = useResource(async () => ({
    categories: (await listCategories()).items,
    activities: await loadActivities(),
  }));
  const [scope, setScope] = useState("");
  const selectedScope: MediaScope | null = scope.startsWith("activity:")
    ? { activityId: scope.slice(9) }
    : scope.startsWith("category:")
      ? { categoryId: scope.slice(9) }
      : null;
  return (
    <section>
      <h1>媒體管理</h1>
      <p className="admin-description">
        先選擇圖片所屬範圍，再上傳或管理圖片。
      </p>
      <ResourceState {...choices} retry={choices.reload}>
        <Field label="活動或分類範圍">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">請選擇範圍</option>
            <optgroup label="活動">
              {choices.data?.activities.map((a) => (
                <option key={a.activity.id} value={`activity:${a.activity.id}`}>
                  {a.content.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="分類">
              {choices.data?.categories.map((c) => (
                <option key={c.id} value={`category:${c.id}`}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        {selectedScope && <MediaBrowser key={scope} scope={selectedScope} />}
      </ResourceState>
    </section>
  );
}
