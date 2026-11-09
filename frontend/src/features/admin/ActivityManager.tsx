import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadActivities, listCategories } from "./cmsApi";
import {
  useResource,
  ResourceState,
  Field,
  Empty,
  useCms,
  RevisionBadges,
} from "./cmsUi";
export function WorkOverview() {
  const { user } = useCms();
  const resource = useResource(loadActivities);
  const records = resource.data ?? [];
  const groups = [
    {
      title: "可編輯草稿",
      records: records.filter(
        (a) => a.activity.workingRevision?.status === "DRAFT",
      ),
    },
    {
      title: "待審項目",
      records: records.filter(
        (a) => a.activity.workingRevision?.status === "SUBMITTED",
      ),
    },
    {
      title: "退回提醒",
      records: records.filter((a) => a.activity.workingRevision?.rejectionNote),
    },
  ];
  return (
    <section className="cms-overview">
      <span className="eyebrow">CONTENT WORKSPACE</span>
      <h1>今天要更新哪些內容？</h1>
      <p className="admin-description">
        歡迎，{user.username}。從草稿、審核或退回事項繼續工作。
      </p>
      <ResourceState {...resource} retry={resource.reload}>
        <div className="cms-summary-grid">
          {groups.map((group) => (
            <section className="cms-panel" key={group.title}>
              <span className="cms-count">{group.records.length}</span>
              <h2>{group.title}</h2>
              {group.records.length ? (
                <ul className="cms-work-list">
                  {group.records.map((a) => (
                    <li key={a.activity.id}>
                      <Link to={`/admin/activities/${a.activity.id}`}>
                        {a.content.title}
                      </Link>
                      {group.title === "退回提醒" && (
                        <p>{a.activity.workingRevision?.rejectionNote}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>目前沒有待辦。</p>
              )}
            </section>
          ))}
        </div>
      </ResourceState>
    </section>
  );
}
export default function ActivityManager({
  other = false,
}: {
  other?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const category = other ? "other" : (params.get("category") ?? "");
  const status = params.get("status") ?? "";
  const resource = useResource(async () => ({
    records: await loadActivities(),
    categories: (await listCategories()).items,
  }));
  const [page, setPage] = useState(1);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(name, value) : next.delete(name);
    setParams(next);
    setPage(1);
  }
  const rows =
    resource.data?.records.filter(
      (a) =>
        (!category || a.content.categoryId === category) &&
        (!search ||
          `${a.content.title} ${a.activity.id}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!status ||
          (status === "published"
            ? !!a.activity.publishedRevisionId
            : status === "unpublished"
              ? !a.activity.publishedRevisionId
              : status === "rejected"
                ? !!a.activity.workingRevision?.rejectionNote
                : a.activity.workingRevision?.status === status)),
    ) ?? [];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 20)));
  return (
    <section>
      <div className="cms-page-heading">
        <div>
          <span className="eyebrow">ACTIVITY LIBRARY</span>
          <h1>{other ? "其他活動介紹" : "活動管理"}</h1>
        </div>
        <Link
          className="admin-button"
          to={`/admin/activities/new${other ? "?category=other" : ""}`}
        >
          ＋ 新增活動
        </Link>
      </div>
      <div className="cms-toolbar cms-filters">
        <Field label="搜尋活動">
          <input
            value={search}
            placeholder="活動標題或識別值"
            onChange={(e) => filter("q", e.target.value)}
          />
        </Field>
        {!other && (
          <Field label="分類">
            <select
              value={category}
              onChange={(e) => filter("category", e.target.value)}
            >
              <option value="">全部分類</option>
              {resource.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="狀態">
          <select
            value={status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">全部狀態</option>
            <option value="DRAFT">草稿</option>
            <option value="SUBMITTED">待審核</option>
            <option value="rejected">已退回</option>
            <option value="published">已公開</option>
            <option value="unpublished">未公開</option>
          </select>
        </Field>
      </div>
      <ResourceState {...resource} retry={resource.reload}>
        <p className="cms-muted">共 {rows.length} 筆活動</p>
        {!rows.length && <Empty>沒有符合條件的活動。</Empty>}
        <div className="cms-records">
          {rows.slice((currentPage - 1) * 20, currentPage * 20).map((a) => (
            <article className="cms-record" key={a.activity.id}>
              <div>
                <Link
                  className="cms-record-title"
                  to={`/admin/activities/${a.activity.id}`}
                >
                  {a.content.title}
                </Link>
                <p className="cms-muted">
                  {a.activity.id} ·{" "}
                  {
                    resource.data?.categories.find(
                      (c) => c.id === a.content.categoryId,
                    )?.label
                  }{" "}
                  ·{" "}
                  {a.content.date
                    ? `${a.content.date}${a.content.endDate ? " ～ " + a.content.endDate : ""}`
                    : "無日期介紹"}
                </p>
              </div>
              <RevisionBadges resource={a.activity} />
              <Link to={`/admin/activities/${a.activity.id}`}>
                {a.activity.workingRevision?.status === "SUBMITTED"
                  ? "檢視送審版本"
                  : "開啟編輯"}{" "}
                →
              </Link>
            </article>
          ))}
        </div>
        <div className="admin-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            上一頁
          </button>
          <span>第 {currentPage} 頁</span>
          <button
            disabled={currentPage * 20 >= rows.length}
            onClick={() => setPage(currentPage + 1)}
          >
            下一頁
          </button>
        </div>
      </ResourceState>
    </section>
  );
}
