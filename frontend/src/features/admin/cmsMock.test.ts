import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRequest, resetMock, setMockRole } from "./cmsMock";
const call = async (path: string, method = "GET", body?: unknown) => {
  const response = await mockRequest(`/api/v1/${path}`, {
    method,
    headers: { "X-CSRF-Token": "d".repeat(64) },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
};
const content = {
  title: "驗收活動",
  categoryId: "other",
  summary: "活動摘要",
  details: "活動介紹",
  date: "2027-01-01",
  endDate: "2027-01-03",
};
beforeEach(() => {
  resetMock();
  vi.restoreAllMocks();
});
describe("CMS mock contract and transitions", () => {
  it("preserves published snapshots through save, submission, rejection and publication", async () => {
    const all = (await call("admin/activities")).data.items;
    const original = all.find((a: any) => !a.workingRevisionId);
    const revisions = (await call(`admin/activities/${original.id}/revisions`))
      .data.items;
    const oldContent = revisions[0].content;
    let a = (
      await call(`admin/activities/${original.id}/draft`, "PUT", {
        version: original.version,
        content: { ...oldContent, title: "新草稿標題" },
      })
    ).data;
    expect(a.publishedRevisionId).toBe(original.publishedRevisionId);
    a = (
      await call(`admin/activities/${a.id}/submit`, "POST", {
        version: a.version,
      })
    ).data;
    expect(a.workingRevision.status).toBe("SUBMITTED");
    expect(
      (
        await call(`admin/activities/${a.id}/draft`, "PUT", {
          version: a.version,
          content: oldContent,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(`admin/activities/${a.id}/publish`, "POST", {
          version: a.version - 1,
        })
      ).status,
    ).toBe(409);
    a = (
      await call(`admin/activities/${a.id}/reject`, "POST", {
        version: a.version,
        reason: "補照片",
      })
    ).data;
    expect(a.workingRevision.rejectionNote).toBe("補照片");
    a = (
      await call(`admin/activities/${a.id}/submit`, "POST", {
        version: a.version,
      })
    ).data;
    a = (
      await call(`admin/activities/${a.id}/publish`, "POST", {
        version: a.version,
      })
    ).data;
    expect(a.workingRevisionId).toBeNull();
    expect(a.publishedRevisionId).not.toBe(original.publishedRevisionId);
    const history = (await call(`admin/activities/${a.id}/revisions`)).data
      .items;
    expect(
      history.find((v: any) => v.id === original.publishedRevisionId).content,
    ).toEqual(oldContent);
  });
  it("creates, withdraws, publishes, unpublishes and restores a new activity", async () => {
    let a = (
      await call("admin/activities", "POST", {
        id: "acceptance-event",
        content,
      })
    ).data;
    a = (
      await call(`admin/activities/${a.id}/submit`, "POST", {
        version: a.version,
      })
    ).data;
    a = (
      await call(`admin/activities/${a.id}/withdraw`, "POST", {
        version: a.version,
      })
    ).data;
    expect(a.workingRevision.status).toBe("DRAFT");
    a = (
      await call(`admin/activities/${a.id}/submit`, "POST", {
        version: a.version,
      })
    ).data;
    a = (
      await call(`admin/activities/${a.id}/publish`, "POST", {
        version: a.version,
      })
    ).data;
    const revisionId = a.publishedRevisionId;
    a = (
      await call(`admin/activities/${a.id}/unpublish`, "POST", {
        version: a.version,
      })
    ).data;
    expect(a.publishedRevisionId).toBeNull();
    a = (
      await call(`admin/activities/${a.id}/restore`, "POST", {
        version: a.version,
        revisionId,
      })
    ).data;
    expect(a.workingRevision.number).toBe(2);
    expect(
      (
        await call(`admin/activities/${a.id}/restore`, "POST", {
          version: a.version,
          revisionId,
        })
      ).status,
    ).toBe(409);
  });
  it("rejects invalid fields, duplicate IDs and missing CSRF", async () => {
    const bad = await call("admin/activities", "POST", {
      id: "new-event",
      content: { ...content, endDate: "2026-01-01" },
    });
    expect(bad.status).toBe(400);
    expect(bad.data.fieldErrors[0].path).toBe("content.endDate");
    expect(
      (await call("admin/activities", "POST", { id: "other", content })).status,
    ).toBe(400);
    expect(
      (await mockRequest("/api/v1/admin/users", { method: "POST", body: "{}" }))
        .status,
    ).toBe(403);
  });
  it("limits editors, enforces destination categories and reflects grant revocation immediately", async () => {
    const all = (await call("admin/activities")).data.items;
    setMockRole("EDITOR");
    const permitted = (await call("admin/activities")).data.items;
    expect(permitted.length).toBeLessThan(all.length);
    const forbidden = all.find(
      (a: any) => !permitted.some((p: any) => p.id === a.id),
    );
    expect(
      (await call(`admin/activities/${forbidden.id}/revisions`)).status,
    ).toBe(403);
    expect((await call("admin/users")).status).toBe(403);
    const a = permitted[0];
    const otherCategory = (
      await call("admin/activity-categories")
    ).data.items.find((c: any) => c.id !== "other");
    expect(otherCategory).toBeTruthy();
    expect(
      (
        await call(`admin/activities/${a.id}/publish`, "POST", {
          version: a.version,
        })
      ).status,
    ).toBe(403);
    setMockRole("ADMIN");
    const categories = (await call("admin/activity-categories")).data.items;
    const denied = categories.find(
      (c: any) => !["other", otherCategory.id].includes(c.id),
    );
    setMockRole("EDITOR");
    expect(
      (
        await call("admin/activities", "POST", {
          id: "no-access",
          content: { ...content, categoryId: denied.id },
        })
      ).status,
    ).toBe(403);
    setMockRole("ADMIN");
    await call("admin/users/demo-editor/grants", "PUT", {
      version: 1,
      categoryIds: [],
      activityIds: [],
    });
    setMockRole("EDITOR");
    expect((await call("admin/activities")).data.items).toEqual([]);
  });
  it("protects the last administrator and consumes activation tokens once", async () => {
    expect(
      (
        await call("admin/users/demo-admin", "PATCH", {
          version: 1,
          role: "EDITOR",
          enabled: true,
        })
      ).status,
    ).toBe(409);
    const created = (
      await call("admin/users", "POST", {
        username: "new-editor",
        role: "EDITOR",
      })
    ).data;
    const token = new URLSearchParams(created.activation.url.split("?")[1]).get(
      "token",
    );
    expect(
      (
        await call("auth/password/consume", "POST", {
          token,
          password: "a-long-test-password",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call("auth/password/consume", "POST", {
          token,
          password: "a-long-test-password",
        })
      ).status,
    ).toBe(400);
  });
  it("keeps media scoped and blocks deletion when a saved revision references it", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 200, height: 100, close() {} })),
    );
    vi.stubGlobal("URL", URL);
    URL.createObjectURL = vi.fn(() => "blob:demo");
    URL.revokeObjectURL = vi.fn();
    const a = (
      await call("admin/activities", "POST", { id: "media-test", content })
    ).data;
    const form = new FormData();
    form.append("activityId", a.id);
    form.append(
      "file",
      new File(["pixels"], "photo.png", { type: "image/png" }),
    );
    const uploaded = await call("admin/media", "POST", form);
    expect(uploaded.status).toBe(200);
    const m = uploaded.data;
    const legacy = (await call("admin/activities/smart-ee-camp/revisions")).data
      .items[0].content;
    const changed = { ...content, detail: legacy.detail };
    changed.detail.heroImages[0] = {
      src: `/api/v1/admin/media/${m.id}/file`,
      alt: "上傳圖片",
    };
    await call(`admin/activities/${a.id}/draft`, "PUT", {
      version: a.version,
      content: changed,
    });
    expect((await call(`admin/media/${m.id}`, "DELETE")).status).toBe(409);
    const list = (await call(`admin/media?activityId=${a.id}`)).data.items;
    expect(list[0]).not.toHaveProperty("uploaderId");
    vi.unstubAllGlobals();
  });
  it("blocks a featured activity from being unpublished", async () => {
    const c = (await call("admin/activity-categories")).data.items.find(
      (c: any) => c.featuredActivityId,
    );
    const a = (await call(`admin/activities/${c.featuredActivityId}`)).data;
    expect(
      (
        await call(`admin/activities/${a.id}/unpublish`, "POST", {
          version: a.version,
        })
      ).status,
    ).toBe(409);
  });
});

it("persists inbox read state and expires password tokens", async () => {
  await call("admin/contact-messages/demo-message/read", "PATCH", {});
  expect((await call("admin/contact-messages?read=unread")).data.items).toEqual(
    [],
  );
  expect((await call("admin/contact-messages")).data.unreadCount).toBe(0);
  const created = (
    await call("admin/users", "POST", {
      username: "expired-user",
      role: "EDITOR",
    })
  ).data;
  const token = new URLSearchParams(created.activation.url.split("?")[1]).get(
    "token",
  );
  vi.useFakeTimers();
  try {
    vi.setSystemTime(Date.now() + 1800001);
    expect(
      (
        await call("auth/password/consume", "POST", {
          token,
          password: "a-long-test-password",
        })
      ).status,
    ).toBe(400);
  } finally {
    vi.useRealTimers();
  }
});
