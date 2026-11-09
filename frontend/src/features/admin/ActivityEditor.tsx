import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ActivityContentError,
  parseActivityContent,
} from "../../../../shared/activity-content";
import type {
  ActivityContent,
  ActivityItem,
} from "../../../../shared/activity-content";
import { OtherActivitiesView } from "../activities/OtherActivitiesPage";
import { deriveOtherActivities } from "../activities/data/contentSelectors";
import { ActivityDetailView } from "../activities/ActivityDetailPage";
import {
  listCategories,
  loadActivity,
  createActivity,
  saveDraft,
  activityCommand,
} from "./cmsApi";
import type { ActivityRecord, Category, Revision, MediaScope } from "./cmsApi";
import { AuthError } from "./api";
import {
  useResource,
  ResourceState,
  ErrorNotice,
  Field,
  useCms,
  useOperation,
  RevisionBadges,
} from "./cmsUi";
import {
  ImageField,
  ListEditor,
  Paragraphs,
  Sections,
  Tabs,
  newImage,
} from "./ContentFields";
import { mediaPreview } from "./mediaPreview";
export function ActivityPreview({
  content,
  id,
  categories,
}: {
  content: ActivityContent;
  id: string;
  categories: Category[];
}) {
  const [kind, setKind] = useState("detail");
  const [tabId, setTabId] = useState(
    content.detail?.introMode === "shared"
      ? content.detail.tabs?.[0]?.id
      : "intro",
  );
  const category =
    categories.find((c) => c.id === content.categoryId)?.label ??
    content.categoryId;
  function resolveImages(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(resolveImages);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          key === "src" && typeof child === "string"
            ? mediaPreview(child)
            : resolveImages(child),
        ]),
      );
    return value;
  }
  const item = resolveImages({ ...content, id, category }) as ActivityItem;
  return (
    <div className="cms-preview">
      <p className="cms-notice">內容預覽 · 使用目前表單內容</p>
      {content.categoryId === "other" && content.album && (
        <div className="cms-toolbar">
          <button
            type="button"
            aria-pressed={kind === "detail"}
            onClick={() => setKind("detail")}
          >
            活動詳細頁預覽
          </button>
          <button
            type="button"
            aria-pressed={kind === "album"}
            onClick={() => setKind("album")}
          >
            其他活動相簿預覽
          </button>
        </div>
      )}
      {kind === "album" ? (
        <OtherActivitiesView
          otherActivities={deriveOtherActivities([item])}
          onDetail={() => setKind("detail")}
        />
      ) : (
        <ActivityDetailView
          activity={item}
          tabId={content.detail?.tabs ? tabId : undefined}
          onTabChange={setTabId}
        />
      )}
    </div>
  );
}
export default function ActivityEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = id === "new";
  const resource = useResource(
    async () => ({
      categories: (await listCategories()).items,
      record: isNew ? undefined : await loadActivity(id!),
    }),
    [id],
  );
  return (
    <ResourceState {...resource} retry={resource.reload}>
      {resource.data && (
        <ActivityForm
          key={id}
          initial={resource.data.record}
          categories={resource.data.categories}
          defaultCategory={params.get("category") ?? ""}
        />
      )}
    </ResourceState>
  );
}
function ActivityForm({
  initial,
  categories,
  defaultCategory,
}: {
  initial?: ActivityRecord;
  categories: Category[];
  defaultCategory: string;
}) {
  const [record, setRecord] = useState(initial);
  const [id, setId] = useState(initial?.activity.id ?? "");
  const [content, setContent] = useState<ActivityContent>(
    initial?.content ?? {
      title: "",
      categoryId: defaultCategory || categories[0]?.id || "",
      summary: "",
      details: "",
    },
  );
  const [saved, setSaved] = useState(JSON.stringify(content));
  const [savedId] = useState(id);
  const [section, setSection] = useState("basic");
  const [preview, setPreview] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<Revision>();
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<{
    path: string;
    message: string;
  }>();
  const { user, setDirty } = useCms();
  const navigate = useNavigate();
  const op = useOperation();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty =
    JSON.stringify(content) !== saved || (!record && id !== savedId);
  const readonly = record?.activity.workingRevision?.status === "SUBMITTED";
  const scope: MediaScope = record
    ? { activityId: id }
    : { categoryId: content.categoryId };
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
  function showFieldError(path: string, message: string) {
    setPreview(false);
    setHistoryPreview(undefined);
    setFieldError({ path, message });
    setSection(
      path.includes(".album")
        ? "album"
        : path.includes(".tabs") || path.includes(".sections")
          ? "sections"
          : path.includes(".detail")
            ? "intro"
            : "basic",
    );
  }
  useEffect(() => {
    if (!fieldError || op.pending) return;
    const path = fieldError.path.replace(/\[(\d+)\]/g, ".$1");
    const labels = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>("[data-field-path]") ?? [],
    );
    const target = labels.find((node) => node.dataset.fieldPath === path);
    (
      target?.querySelector<HTMLElement>("input,textarea,select") ??
      formRef.current?.querySelector<HTMLElement>(
        "input:not([readonly]),textarea,select",
      )
    )?.focus();
  }, [fieldError, section, op.pending]);
  useEffect(() => {
    if (op.error instanceof AuthError && op.error.fieldErrors?.length) {
      const first = op.error.fieldErrors[0];
      showFieldError(first.path, first.message);
    }
  }, [op.error]);
  function validate() {
    try {
      setFieldError(undefined);
      return parseActivityContent(content, "content");
    } catch (e) {
      if (e instanceof ActivityContentError) {
        showFieldError(
          e.path,
          "請檢查此欄位是否完整、格式正確或含重複識別值。",
        );
        throw new Error("請修正標示的欄位後再試。");
      }
      throw e;
    }
  }
  function update<K extends keyof ActivityContent>(
    key: K,
    value: ActivityContent[K],
  ) {
    setContent((c) => ({ ...c, [key]: value }));
  }
  async function save(redirect = true) {
    const normalized = validate();
    const activity = record
      ? await saveDraft(id, record.activity.version, normalized)
      : await createActivity(id, normalized);
    const loaded = await loadActivity(activity.id);
    flushSync(() => {
      setRecord(loaded);
      setContent(loaded.content);
      setSaved(JSON.stringify(loaded.content));
      setDirty(false);
    });
    op.setMessage("已儲存草稿。");
    if (!record && redirect)
      navigate(`/admin/activities/${activity.id}`, { replace: true });
    return loaded;
  }
  async function command(name: string, extra = {}) {
    let current = record;
    if (name === "submit") current = await save(false);
    if (!current) return;
    if (
      ["publish", "unpublish", "restore"].includes(name) &&
      !window.confirm(
        {
          publish: "確定發布目前送審版本？",
          unpublish: "確定下架公開活動？",
          restore: "確定將此歷史版本還原為新草稿？",
        }[name]!,
      )
    )
      return;
    await activityCommand(id, name, current.activity.version, extra);
    const loaded = await loadActivity(id);
    setRecord(loaded);
    setContent(loaded.content);
    setSaved(JSON.stringify(loaded.content));
    setHistoryPreview(undefined);
    setPreview(false);
    setReason("");
    op.setMessage("操作已完成。");
    if (!record) navigate(`/admin/activities/${id}`, { replace: true });
  }
  async function reload() {
    const loaded = await loadActivity(id);
    setRecord(loaded);
    setContent(loaded.content);
    setSaved(JSON.stringify(loaded.content));
    op.setError(undefined);
  }
  const detail = content.detail;
  function detailChange(
    value: Partial<NonNullable<ActivityContent["detail"]>>,
  ) {
    update("detail", { ...detail!, ...value });
  }
  const sections = [
    ["basic", "基本資料"],
    ["intro", "介紹與主圖"],
    ["sections", "章節與分頁"],
    ["album", "相簿"],
  ];
  const errors =
    op.error instanceof AuthError ? op.error.fieldErrors : undefined;
  return (
    <section className="cms-editor">
      <Link to="/admin/activities">← 活動管理</Link>
      <div className="cms-page-heading">
        <div>
          <h1>{record ? content.title : "新增活動"}</h1>
          <p className="cms-muted">
            {record ? id : "先設定活動識別值與內容，儲存後建立草稿。"}
          </p>
        </div>
        {record && <RevisionBadges resource={record.activity} />}
      </div>
      <div className="cms-editor-actions">
        <span role="status">
          {op.pending
            ? "處理中…"
            : dirty
              ? "尚未儲存"
              : record
                ? "已儲存"
                : "尚未建立"}
        </span>
        <div className="cms-toolbar">
          {!readonly && (
            <button
              type="button"
              className="admin-button"
              disabled={op.pending}
              onClick={() =>
                void op.run(async () => {
                  await save();
                })
              }
            >
              儲存草稿
            </button>
          )}
          <button
            type="button"
            disabled={op.pending}
            onClick={() => {
              if (preview || historyPreview) {
                setPreview(false);
                setHistoryPreview(undefined);
              } else
                void op.run(async () => {
                  validate();
                  setPreview(true);
                });
            }}
          >
            {preview || historyPreview ? "返回編輯" : "預覽"}
          </button>
          {!readonly && (
            <button
              type="button"
              disabled={op.pending}
              onClick={() => void op.run(() => command("submit"))}
            >
              儲存並送審
            </button>
          )}
          {readonly && (
            <button
              type="button"
              disabled={op.pending}
              onClick={() => void op.run(() => command("withdraw"))}
            >
              撤回送審
            </button>
          )}
          {readonly && user.role === "ADMIN" && (
            <button
              type="button"
              className="admin-button"
              disabled={op.pending}
              onClick={() => void op.run(() => command("publish"))}
            >
              發布送審版本
            </button>
          )}
        </div>
      </div>
      <ErrorNotice
        error={op.error}
        retry={
          record
            ? () => {
                if (
                  dirty &&
                  !window.confirm("重新載入會放棄未儲存的修改，確定繼續？")
                )
                  return;
                void op.run(reload);
              }
            : undefined
        }
      />
      {(fieldError || errors?.length) && (
        <div className="cms-notice cms-error" role="alert">
          {[...(fieldError ? [fieldError] : []), ...(errors ?? [])].map(
            (e, i) => (
              <p key={i}>
                {e.path} · {e.message}
              </p>
            ),
          )}
        </div>
      )}
      {op.message && (
        <p className="cms-notice" role="status">
          {op.message}
        </p>
      )}
      {record?.activity.workingRevision?.rejectionNote && (
        <p className="cms-notice cms-error">
          退回原因 · {record.activity.workingRevision.rejectionNote}
        </p>
      )}
      {readonly && (
        <p className="cms-notice">送審版本已凍結。撤回或退回後可繼續修改。</p>
      )}
      {historyPreview ? (
        <>
          <h2>歷史版本 {historyPreview.number}</h2>
          <ActivityPreview
            key={historyPreview.id}
            content={historyPreview.content}
            id={id}
            categories={categories}
          />
        </>
      ) : preview ? (
        <ActivityPreview
          content={content}
          id={id || "preview"}
          categories={categories}
        />
      ) : (
        <>
          <nav className="cms-section-tabs" aria-label="編輯區域">
            {sections.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={section === key}
                onClick={() => setSection(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
            <fieldset disabled={readonly || op.pending}>
              {section === "basic" && (
                <div className="cms-panel">
                  <h2>基本資料</h2>
                  <div className="cms-form-grid">
                    <Field label="活動識別值" path="content.id">
                      <input
                        required
                        value={id}
                        readOnly={!!record}
                        placeholder="例如 ee-camp-2027"
                        onChange={(e) => setId(e.target.value)}
                      />
                    </Field>
                    <Field label="活動標題" path="content.title">
                      <input
                        required
                        value={content.title}
                        onChange={(e) => update("title", e.target.value)}
                      />
                    </Field>
                    <Field label="分類" path="content.categoryId">
                      <select
                        value={content.categoryId}
                        onChange={(e) => update("categoryId", e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="地點（選填）" path="content.location">
                      <input
                        value={content.location ?? ""}
                        onChange={(e) =>
                          update("location", e.target.value || undefined)
                        }
                      />
                    </Field>
                    <Field
                      label="開始日期（留白為無日期介紹）"
                      path="content.date"
                    >
                      <input
                        type="date"
                        value={content.date ?? ""}
                        onChange={(e) => {
                          update("date", e.target.value || undefined);
                          if (!e.target.value) update("endDate", undefined);
                        }}
                      />
                    </Field>
                    <Field
                      label="結束日期（包含當天，單日可留白）"
                      path="content.endDate"
                    >
                      <input
                        type="date"
                        min={content.date}
                        disabled={!content.date || readonly || op.pending}
                        value={content.endDate ?? ""}
                        onChange={(e) =>
                          update("endDate", e.target.value || undefined)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="活動摘要" path="content.summary">
                    <textarea
                      rows={3}
                      value={content.summary}
                      onChange={(e) => update("summary", e.target.value)}
                    />
                  </Field>
                  <Field label="活動資訊" path="content.details">
                    <textarea
                      rows={5}
                      value={content.details}
                      onChange={(e) => update("details", e.target.value)}
                    />
                  </Field>
                  <ListEditor
                    label="外部連結"
                    items={content.links ?? []}
                    onChange={(links) => update("links", links)}
                    create={() => ({ label: "", url: "" })}
                    render={(link, change, index) => (
                      <div className="cms-form-grid">
                        <Field
                          label="連結文字"
                          path={`content.links.${index}.label`}
                        >
                          <input
                            value={link.label}
                            onChange={(e) =>
                              change({ ...link, label: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label="連結網址"
                          path={`content.links.${index}.url`}
                        >
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) =>
                              change({ ...link, url: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                    )}
                  />
                </div>
              )}
              {section === "intro" && (
                <div className="cms-panel">
                  <h2>介紹與主圖</h2>
                  <label className="cms-check">
                    <input
                      type="checkbox"
                      checked={!!detail}
                      onChange={(e) => {
                        update(
                          "detail",
                          e.target.checked
                            ? {
                                eyebrow: "EE LIFE",
                                intro: [""],
                                heroImages: [newImage(), newImage()],
                                sections: [],
                              }
                            : undefined,
                        );
                        if (!e.target.checked) update("album", undefined);
                      }}
                    />
                    使用完整介紹版型
                  </label>
                  {detail && (
                    <>
                      <Field label="英文小標" path="content.detail.eyebrow">
                        <input
                          value={detail.eyebrow}
                          onChange={(e) =>
                            detailChange({ eyebrow: e.target.value })
                          }
                        />
                      </Field>
                      <Paragraphs
                        value={detail.intro}
                        path="content.detail.intro"
                        onChange={(intro) => detailChange({ intro })}
                      />
                      <div className="cms-form-grid">
                        {detail.heroImages.map((image, index) => (
                          <ImageField
                            key={index}
                            label={`主圖 ${index + 1}`}
                            path={`content.detail.heroImages.${index}`}
                            value={image}
                            scope={scope}
                            onChange={(value) => {
                              const images = [
                                ...detail.heroImages,
                              ] as typeof detail.heroImages;
                              images[index] = value;
                              detailChange({ heroImages: images });
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {section === "sections" && (
                <div className="cms-panel">
                  <h2>章節與分頁</h2>
                  {!detail ? (
                    <p>請先在「介紹與主圖」啟用完整介紹版型。</p>
                  ) : (
                    <>
                      <Sections
                        items={detail.sections}
                        onChange={(sections) => detailChange({ sections })}
                        scope={scope}
                      />
                      <label className="cms-check">
                        <input
                          type="checkbox"
                          checked={!!detail.tabs}
                          onChange={(e) =>
                            detailChange({
                              tabs: e.target.checked
                                ? [{ id: "tab-1", navLabel: "", sections: [] }]
                                : undefined,
                              introMode: e.target.checked ? "tab" : undefined,
                            })
                          }
                        />
                        啟用內容分頁
                      </label>
                      {detail.tabs && (
                        <>
                          <Field
                            label="介紹顯示方式"
                            path="content.detail.introMode"
                          >
                            <select
                              value={detail.introMode ?? "tab"}
                              onChange={(e) =>
                                detailChange({
                                  introMode: e.target.value as "tab" | "shared",
                                })
                              }
                            >
                              <option value="tab">獨立介紹分頁</option>
                              <option value="shared">每個分頁共用簡介</option>
                            </select>
                          </Field>
                          <Tabs
                            items={detail.tabs}
                            onChange={(tabs) => detailChange({ tabs })}
                            scope={scope}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {section === "album" && (
                <div className="cms-panel">
                  <h2>相簿</h2>
                  {!detail ? (
                    <p>請先啟用完整介紹版型，再設定相簿。</p>
                  ) : (
                    <>
                      <label className="cms-check">
                        <input
                          type="checkbox"
                          checked={!!content.album}
                          onChange={(e) =>
                            update(
                              "album",
                              e.target.checked
                                ? { order: 0, cover: newImage(), photos: [] }
                                : undefined,
                            )
                          }
                        />
                        啟用活動相簿
                      </label>
                      {content.album && (
                        <>
                          <Field label="相簿順序" path="content.album.order">
                            <input
                              type="number"
                              min={0}
                              value={content.album.order}
                              onChange={(e) =>
                                update("album", {
                                  ...content.album!,
                                  order: Number(e.target.value),
                                })
                              }
                            />
                          </Field>
                          <ImageField
                            label="相簿封面"
                            path="content.album.cover"
                            value={content.album.cover}
                            scope={scope}
                            onChange={(cover) =>
                              update("album", { ...content.album!, cover })
                            }
                          />
                          <ListEditor
                            label="照片"
                            items={content.album.photos}
                            create={newImage}
                            onChange={(photos) =>
                              update("album", { ...content.album!, photos })
                            }
                            render={(image, change, index) => (
                              <ImageField
                                value={image}
                                onChange={change}
                                scope={scope}
                              />
                            )}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </fieldset>
          </form>
        </>
      )}
      {readonly && user.role === "ADMIN" && (
        <section className="cms-panel">
          <h2>退回修改</h2>
          <Field label="退回原因">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </Field>
          <button
            type="button"
            disabled={op.pending || !reason.trim()}
            onClick={() => void op.run(() => command("reject", { reason }))}
          >
            退回編輯者
          </button>
        </section>
      )}
      {record && (
        <section className="cms-panel">
          <div className="cms-toolbar">
            <h2>歷史版本</h2>
            {user.role === "ADMIN" && record.activity.publishedRevisionId && (
              <button
                type="button"
                disabled={op.pending || dirty}
                onClick={() => void op.run(() => command("unpublish"))}
              >
                下架公開活動
              </button>
            )}
          </div>
          <ul className="cms-history">
            {record.revisions.map((v) => (
              <li key={v.id}>
                <div>
                  <strong>版本 {v.number}</strong>
                  <span className="cms-badge">
                    {v.status === "PUBLISHED"
                      ? "發布版本"
                      : v.status === "SUBMITTED"
                        ? "送審版本"
                        : "草稿"}
                  </span>
                  <p className="cms-muted">
                    {v.publishedAt
                      ? `發布於 ${new Date(v.publishedAt).toLocaleString("zh-TW")}`
                      : v.submittedAt
                        ? `送審於 ${new Date(v.submittedAt).toLocaleString("zh-TW")}`
                        : "尚無送審或發布時間"}
                  </p>
                </div>
                <div className="cms-toolbar">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryPreview(v);
                      setPreview(false);
                    }}
                  >
                    預覽版本 {v.number}
                  </button>
                  <button
                    type="button"
                    disabled={
                      op.pending || !!record.activity.workingRevisionId || dirty
                    }
                    onClick={() =>
                      void op.run(() =>
                        command("restore", { revisionId: v.id }),
                      )
                    }
                  >
                    還原為新草稿
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
