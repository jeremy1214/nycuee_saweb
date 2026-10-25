import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminRoutes from "./AdminRoutes";
import type { ContactMessage } from "./contactApi";

const messages: ContactMessage[] = Array.from({ length: 21 }, (_, index) => ({
  id: String(index), name: "王小明", email: "student@example.com", category: "website",
  subject: `網站問題 ${index}`, message: "第一行\n<script>alert('test')</script>",
  createdAt: "2026-10-25T01:30:00.000Z", readAt: null,
}));
let stored: ContactMessage[];
let unauthorized: boolean;
let detailStatus: number;
let failList: boolean;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  stored = messages.map((message) => ({ ...message }));
  unauthorized = false; detailStatus = 200; failList = false;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/v1/auth/me") return json({ user: { id: "admin", username: "admin", role: "ADMIN" } });
    if (unauthorized) return json({ message: "請先登入。" }, 401);
    if (url.pathname === "/api/v1/auth/csrf") return json({ csrfToken: "csrf-test" });
    if (url.pathname === "/api/v1/admin/contact-messages") {
      if (failList) return json({}, 500);
      const filtered = url.searchParams.get("read") === "unread" ? stored.filter((message) => !message.readAt) : stored;
      const page = Number(url.searchParams.get("page") || 1);
      return json({ items: filtered.slice((page - 1) * 20, page * 20), total: filtered.length,
        unreadCount: stored.filter((message) => !message.readAt).length, page, pageSize: 20 });
    }
    const id = url.pathname.split("/")[5];
    const message = stored.find((item) => item.id === id);
    if (detailStatus !== 200 || !message) return json({ message: "找不到這則聯絡訊息。" }, detailStatus === 200 ? 404 : detailStatus);
    if (options?.method === "PATCH") {
      expect(options.headers).toEqual(expect.objectContaining({ "X-CSRF-Token": "csrf-test" }));
      message.readAt ||= "2026-10-25T02:00:00.000Z";
    }
    return json(message);
  });
});
afterEach(() => vi.restoreAllMocks());

function open(path = "/admin/contact-messages") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="admin/*" element={<AdminRoutes />} /></Routes></MemoryRouter>);
}

it("shows unread counts on the dashboard and opens the inbox", async () => {
  open("/admin");
  expect(await screen.findByText("21")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: /開啟收件匣/ }));
  expect(await screen.findByText("共 21 則 · 未讀 21 則")).toBeInTheDocument();
});

it("paginates, filters, preserves the return location and updates counts after marking read", async () => {
  stored[0].readAt = "2026-10-25T02:00:00Z";
  open();
  expect(await screen.findByText("共 21 則 · 未讀 20 則")).toBeInTheDocument();
  expect(screen.queryByText("網站問題 20")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "下一頁" }));
  fireEvent.click(await screen.findByRole("link", { name: /網站問題 20/ }));
  expect(await screen.findByRole("heading", { name: "網站問題 20" })).toBeInTheDocument();
  expect(screen.getByText("第一行 <script>alert('test')</script>")).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
  expect(screen.getByText("2026/10/25 09:30（台灣時間）")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "標記已讀" }));
  expect(await screen.findByText("這則訊息已標記為已讀。")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: /返回收件匣/ }));
  expect(await screen.findByText("第 2 / 2 頁")).toBeInTheDocument();
  expect(screen.getByText("共 21 則 · 未讀 19 則")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "unread" } });
  expect(await screen.findByText("共 19 則 · 未讀 19 則")).toBeInTheDocument();
  expect(screen.queryByText("網站問題 20")).not.toBeInTheDocument();
  expect(screen.queryByText("網站問題 0")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: /管理總覽/ }));
  expect(await screen.findByText("19")).toBeInTheDocument();
});

it("recovers from an empty last page after the last unread message is marked", async () => {
  open("/admin/contact-messages?page=2&read=unread");
  fireEvent.click(await screen.findByRole("link", { name: /網站問題 20/ }));
  fireEvent.click(await screen.findByRole("button", { name: "標記已讀" }));
  await screen.findByText("這則訊息已標記為已讀。");
  fireEvent.click(screen.getByRole("link", { name: /返回收件匣/ }));
  expect(await screen.findByText("第 1 / 1 頁")).toBeInTheDocument();
  expect(screen.getByText("共 20 則 · 未讀 20 則")).toBeInTheDocument();
});

it("shows empty states and refreshes new messages", async () => {
  stored = [];
  open();
  expect(await screen.findByText("目前尚未收到聯絡訊息。")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "unread" } });
  expect(await screen.findByText("目前沒有未讀訊息。")).toBeInTheDocument();
  stored = [messages[0]];
  fireEvent.click(screen.getByRole("button", { name: "重新整理" }));
  expect(await screen.findByText("網站問題 0")).toBeInTheDocument();
});

it("offers retry on failures and missing detail messages", async () => {
  failList = true;
  const view = open();
  expect(await screen.findByRole("alert")).toHaveTextContent("服務暫時無法使用");
  failList = false;
  fireEvent.click(screen.getByRole("button", { name: "重試" }));
  await screen.findByText("網站問題 0");
  view.unmount();
  detailStatus = 404;
  open("/admin/contact-messages/missing");
  expect(await screen.findByRole("alert")).toHaveTextContent("找不到這則聯絡訊息");
});

it.each(["list", "read"])("returns to login when a session expires during %s", async (operation) => {
  open(operation === "list" ? "/admin/contact-messages" : "/admin/contact-messages/0");
  if (operation === "list") {
    await screen.findByText("網站問題 0");
    unauthorized = true;
    fireEvent.click(screen.getByRole("button", { name: "重新整理" }));
  } else {
    await screen.findByRole("button", { name: "標記已讀" });
    unauthorized = true;
    fireEvent.click(screen.getByRole("button", { name: "標記已讀" }));
  }
  expect(await screen.findByRole("heading", { name: "後台登入" })).toBeInTheDocument();
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
});
