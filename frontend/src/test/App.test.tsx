import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe("NYCU EE website", () => {
  it("renders and advances the hero carousel", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole("heading", { name: "以電機，連結未來。" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一張" }));
    expect(screen.getByRole("heading", { name: "探索科技的下一步。" })).toBeInTheDocument();
  });

  it("automatically loops through every hero slide", () => {
    vi.useFakeTimers();
    const view = renderApp();

    try {
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole("heading", { name: "探索科技的下一步。" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole("heading", { name: "讓想法，成為實力。" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole("heading", { name: "在分享中，學會更多。" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole("heading", { name: "與夥伴，一起找到方向。" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole("heading", { name: "讓每一步，走向下一程。" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole("heading", { name: "以電機，連結未來。" })).toBeInTheDocument();
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });

  it("searches site resources and follows a result", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "搜尋網站" }));
    const input = screen.getByRole("searchbox", { name: "關鍵字" });
    await user.type(input, "交換");
    await user.click(within(screen.getByRole("dialog")).getByRole("link", { name: /交換資訊/ }));

    expect(await screen.findByRole("heading", { name: /交換申請拆成一條可管理的時間軸/ })).toBeInTheDocument();
  });

  it("changes the calendar month", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByText("2026年10月")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一個月" }));
    expect(screen.getByText("2026年11月")).toBeInTheDocument();
  });

  it("shows the four student link groups in the requested order", () => {
    renderApp();
    const quickLinks = screen.getByRole("region", { name: "網站導覽" });
    const labels = Array.from(quickLinks.querySelectorAll(".quick-main-link"), (link) => link.textContent);
    expect(labels).toEqual(["◎系學會", "⌘系上活動", "▤系隊", "↗學習資料"]);
  });

  it("shows three dated department activity updates", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "系所新訊" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看最新消息/ })).toBeInTheDocument();
    expect(screen.getAllByRole("time")).toHaveLength(3);
    expect(screen.getByText(/2026\.10\.06/)).toBeInTheDocument();
  });

  it("opens the activities page from the global navigation", async () => {
    const user = userEvent.setup();
    renderApp();

    const navigation = screen.getByRole("navigation", { name: "主要導覽" });
    await user.click(within(navigation).getByRole("link", { name: "系上活動" }));
    expect(screen.getByRole("heading", { name: "活動總覽" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(5);
  });

  it("opens the default learning resources page from the global navigation", async () => {
    const user = userEvent.setup();
    renderApp();

    const navigation = screen.getByRole("navigation", { name: "主要導覽" });
    await user.click(within(navigation).getByRole("link", { name: "學習資料" }));
    expect(screen.getByRole("heading", { name: "把四年的選擇，整理成清楚的學習路徑" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "關於修課" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the correct header item active on nested section pages", () => {
    renderApp("/resources/exchange");

    const navigation = screen.getByRole("navigation", { name: "主要導覽" });
    expect(within(navigation).getByRole("link", { name: "學習資料" })).toHaveClass("active");
  });

  it("opens the contact page and validates unavailable online submission", async () => {
    const user = userEvent.setup();
    renderApp();

    const navigation = screen.getByRole("navigation", { name: "主要導覽" });
    await user.click(within(navigation).getByRole("link", { name: "聯絡我們" }));

    expect(screen.getByRole("heading", { name: /有問題嗎/ })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /姓名/ }), "王小明");
    await user.type(screen.getByRole("textbox", { name: /Email/ }), "student@example.com");
    await user.selectOptions(screen.getByRole("combobox", { name: /問題類別/ }), "website");
    await user.type(screen.getByRole("textbox", { name: /主旨/ }), "網站內容問題");
    await user.type(screen.getByRole("textbox", { name: /問題內容/ }), "我想詢問網站上的學習資料如何更新。");
    await user.click(screen.getByRole("button", { name: /送出問題/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("線上收件服務尚未啟用");
  });

  it("provides an activities page entry in the home quick links", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "展開系上活動選單" }));
    await user.click(screen.getByRole("link", { name: /活動總覽/ }));
    expect(screen.getByRole("heading", { name: "活動總覽" })).toBeInTheDocument();
  });

  it("opens and closes a placeholder modal", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /從課堂走向實作 電機專題成果交流展/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "關閉視窗" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
