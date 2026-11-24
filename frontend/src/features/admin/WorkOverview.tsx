import { Link } from "react-router-dom";
import type { OrganizationResource } from "../../../../shared/organization-content";
import { siteContentKinds, type SiteContentKind, type SiteResource } from "../../../../shared/site-content";
import { apiRequest, AuthError, isAdminMock } from "./api";
import { listActivities } from "./cmsApi";
import { ResourceState, useCms, useResource } from "./cmsUi";
import { listOrganizations, organizationAdminLink } from "./organizationApi";

const siteLabels: Record<SiteContentKind, string> = {
  home: "首頁內容",
  resources: "學習資源",
  settings: "全站聯絡設定",
};

const groups = [
  { id: "draft", title: "可編輯草稿" },
  { id: "submitted", title: "待審項目" },
  { id: "returned", title: "退回提醒" },
] as const;

type WorkItem = {
  to: string;
  title: string;
  source?: string;
  revision: { status: string; rejectionNote: string | null } | null;
};

async function optionalContent<T>(path: string) {
  try {
    return await apiRequest<T>(path);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) return null;
    throw error;
  }
}

async function loadWorkItems(isAdmin: boolean): Promise<WorkItem[]> {
  const [activities, departments, teams, overview, site] = await Promise.all([
    listActivities(),
    listOrganizations("department"),
    listOrganizations("team"),
    isAdmin ? optionalContent<OrganizationResource>("admin/eesa/overview") : null,
    isAdmin && !isAdminMock
      ? Promise.all(siteContentKinds.map((kind) =>
          optionalContent<SiteResource>(`admin/site-content/${kind}`),
        ))
      : [],
  ]);

  return [
    ...activities.items.map(({ id, workingRevision }) => ({
      to: `/admin/activities/${encodeURIComponent(id)}`,
      title: workingRevision?.content.title ?? id,
      source: "活動",
      revision: workingRevision,
    })),
    ...departments.items.map(({ id, workingRevision }) => ({
      to: organizationAdminLink("department", id),
      title: workingRevision && "title" in workingRevision.content ? workingRevision.content.title : id,
      source: "系學會部門",
      revision: workingRevision,
    })),
    ...teams.items.map(({ id, workingRevision }) => ({
      to: organizationAdminLink("team", id),
      title: workingRevision && "name" in workingRevision.content ? workingRevision.content.name : id,
      source: "系隊",
      revision: workingRevision,
    })),
    ...(overview ? [{
      to: organizationAdminLink("overview", overview.id),
      title: "系學會總覽",
      revision: overview.workingRevision,
    }] : []),
    ...site.flatMap((resource) => resource ? [{
      to: `/admin/site-content/${resource.id}`,
      title: siteLabels[resource.id],
      revision: resource.workingRevision,
    }] : []),
  ];
}

export function WorkOverview() {
  const { user } = useCms();
  const resource = useResource(() => loadWorkItems(user.role === "ADMIN"), [user.id, user.role]);
  const itemsByStatus: Record<(typeof groups)[number]["id"], WorkItem[]> = {
    draft: [],
    submitted: [],
    returned: [],
  };

  for (const item of resource.data ?? []) {
    const { revision } = item;
    if (revision?.status === "SUBMITTED") {
      itemsByStatus.submitted.push(item);
    } else if (revision?.status === "DRAFT") {
      itemsByStatus[revision.rejectionNote ? "returned" : "draft"].push(item);
    }
  }

  return (
    <section className="cms-overview">
      <span className="eyebrow">CONTENT WORKSPACE</span>
      <h1>今天要更新哪些內容？</h1>
      <p className="admin-description">
        歡迎，{user.username}。從草稿、審核或退回事項繼續工作。
      </p>
      <ResourceState {...resource} retry={resource.reload}>
        <div className="cms-summary-grid">
          {groups.map(({ id, title }) => {
            const items = itemsByStatus[id];
            return (
              <section className="cms-panel" key={id}>
                <span className="cms-count">{items.length}</span>
                <h2>{title}</h2>
                {items.length ? (
                  <ul className="cms-work-list">
                    {items.map((item) => (
                      <li key={item.to}>
                        <div className="cms-work-item">
                          {item.source && <span className="cms-muted">{item.source}</span>}
                          <Link className="admin-action-link" to={item.to}>{item.title}</Link>
                        </div>
                        {id === "returned" && <p>{item.revision?.rejectionNote}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>目前沒有待辦。</p>
                )}
              </section>
            );
          })}
        </div>
      </ResourceState>
    </section>
  );
}
