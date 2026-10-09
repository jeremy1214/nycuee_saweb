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
    const quickLinks = screen.getByRole("region", { name: "常用資訊" });
    const labels = Array.from(quickLinks.querySelectorAll("summary"), (summary) => summary.textContent?.replace("＋", ""));
    expect(labels).toEqual(["◎系上活動", "⌘系隊", "▤系學會", "↗學習資料"]);
  });

  it("shows three dated department activity updates", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "系上活動" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看最新消息/ })).toBeInTheDocument();
    expect(screen.getAllByRole("time")).toHaveLength(3);
    expect(screen.getByText("2026.10.28")).toBeInTheDocument();
  });

  it("opens and closes a placeholder modal", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /學生專題成果展：讓創意走進真實世界/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "關閉視窗" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
