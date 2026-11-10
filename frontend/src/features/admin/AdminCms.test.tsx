import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  within,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import AdminRoutes from "./AdminRoutes";
import { resetMock, setMockRole } from "./cmsMock";
import { loadActivity, saveDraft } from "./cmsApi";
vi.mock("./api", async (original) => ({
  ...(await original<object>()),
  isAdminMock: true,
}));
const NativeRequest = Request;
beforeEach(() => {
  vi.stubGlobal(
    "Request",
    class extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, { ...init, signal: undefined });
      }
    },
  );
  vi.stubEnv("VITE_ADMIN_SOURCE", "mock");
  resetMock();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function open(path = "/admin/activities/new", previous?: string) {
  const router = createMemoryRouter(
    [{ path: "/admin/*", element: <AdminRoutes /> }],
    { initialEntries: previous ? [previous, path] : [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
it("creates, previews, submits and publishes an activity through normal routes", async () => {
  const router = open();
  await screen.findByLabelText("活動識別值");
  await screen.findByLabelText("活動標題");
  for (const [label, value] of [
    ["活動識別值", "new-ui-event"],
    ["活動標題", "介面驗收活動"],
    ["活動摘要", "這是活動摘要"],
    ["活動資訊", "這是活動資訊"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "預覽" }));
  expect(
    await screen.findByText("內容預覽 · 使用目前表單內容"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "返回編輯" }));
  expect(screen.getByLabelText("活動標題")).toHaveValue("介面驗收活動");
  fireEvent.click(screen.getByRole("button", { name: "儲存並送審" }));
  await screen.findByRole("button", { name: "發布送審版本" });
  expect(router.state.location.pathname).toBe("/admin/activities/new-ui-event");
  expect(await screen.findByLabelText("活動標題")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "發布送審版本" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "發布送審版本" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    (await loadActivity("new-ui-event")).activity.publishedRevisionId,
  ).toBeTruthy();
});
it("preserves edits after a conflict and asks before discarding them", async () => {
  open("/admin/activities/smart-ee-camp");
  const field = await screen.findByLabelText("活動標題");
  fireEvent.change(field, { target: { value: "保留此修改" } });
  const latest = await loadActivity("smart-ee-camp");
  await saveDraft("smart-ee-camp", latest.activity.version, {
    ...latest.content,
    title: "另一位編輯者的更新",
  });
  fireEvent.click(screen.getByRole("button", { name: "儲存草稿" }));
  await screen.findByText("內容已被更新，請重新載入最新版本。");
  expect(field).toHaveValue("保留此修改");
  vi.mocked(window.confirm).mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
  expect(field).toHaveValue("保留此修改");
  vi.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
  await waitFor(() => expect(field).toHaveValue("另一位編輯者的更新"));
});
it("blocks navigation with unsaved changes, including browser-style back navigation", async () => {
  const router = open("/admin/activities/new", "/admin/activities");
  fireEvent.change(await screen.findByLabelText("活動標題"), {
    target: { value: "未儲存" },
  });
  await waitFor(() => expect(screen.getByText("尚未儲存")).toBeInTheDocument());
  vi.mocked(window.confirm).mockReturnValue(false);
  fireEvent.click(screen.getByRole("link", { name: "媒體管理" }));
  await waitFor(() => expect(window.confirm).toHaveBeenCalled());
  expect(router.state.location.pathname).toBe("/admin/activities/new");
  await act(async () => {
    await router.navigate(-1);
  });
  expect(router.state.location.pathname).toBe("/admin/activities/new");
  vi.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(screen.getByRole("link", { name: "媒體管理" }));
  await screen.findByRole("heading", { name: "媒體管理" });
});
it("shows field errors and preserves form values", async () => {
  open();
  fireEvent.change(await screen.findByLabelText("活動標題"), {
    target: { value: "保留標題" },
  });
  fireEvent.click(screen.getByRole("button", { name: "儲存草稿" }));
  expect(await screen.findByText(/content.summary/)).toBeInTheDocument();
  expect(screen.getByLabelText("活動標題")).toHaveValue("保留標題");
  await waitFor(() => expect(screen.getByLabelText("活動摘要")).toHaveFocus());
});
it("restricts editor navigation and direct administrative routes", async () => {
  setMockRole("EDITOR");
  open("/admin/users");
  expect(
    await screen.findByRole("heading", { name: "無法存取此功能" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "帳號與授權" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "聯絡收件匣" }),
  ).not.toBeInTheDocument();
});
it("uses scoped media and supports keyboard accessible section controls", async () => {
  open("/admin/activities/smart-ee-camp");
  await screen.findByLabelText("活動標題");
  fireEvent.click(screen.getByRole("button", { name: "介紹與主圖" }));
  fireEvent.click(screen.getByRole("button", { name: "從媒體庫選取主圖 1" }));
  expect(
    await screen.findByRole("dialog", { name: "選擇圖片" }),
  ).toBeInTheDocument();
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { bubbles: true, cancelable: true }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("shows failed requests with retry and sends expired sessions to login", async () => {
  vi.stubEnv("VITE_ADMIN_SOURCE", "api");
  let failing = true;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = String(input);
    if (path.includes("auth/me"))
      return Response.json({
        user: { id: "a", username: "管理員", role: "ADMIN" },
      });
    if (path.includes("activity-categories"))
      return Response.json({ items: [] });
    return failing
      ? Response.json({ message: "failure" }, { status: 503 })
      : Response.json({ message: "expired" }, { status: 401 });
  });
  open("/admin/activities");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "服務暫時無法使用",
  );
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
  expect(
    await screen.findByRole("heading", { name: "後台登入" }),
  ).toBeInTheDocument();
});
it("creates an account, delivers a one-time link and saves scoped grants", async () => {
  open("/admin/users");
  fireEvent.change(await screen.findByLabelText("新帳號名稱"), {
    target: { value: "test-editor" },
  });
  fireEvent.click(screen.getByRole("button", { name: "建立並產生啟用連結" }));
  expect(
    ((await screen.findByLabelText("設定密碼連結")) as HTMLInputElement).value,
  ).toContain("/#/admin/set-password?token=");
  fireEvent.click(
    await screen.findByRole("button", { name: "管理 test-editor" }),
  );
  const categoryGrants = await screen.findByRole("group", { name: "分類授權" });
  fireEvent.click(within(categoryGrants).getByLabelText("電機營"));
  fireEvent.click(screen.getByRole("button", { name: "儲存授權範圍" }));
  expect(await screen.findByText("編輯範圍已更新。")).toBeInTheDocument();
});
