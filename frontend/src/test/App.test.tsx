import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { otherActivities } from "../features/activities/data/otherActivities";
import { activities } from "../features/activities/data/activities";
import { defaultResourceSlug, resourceCategories } from "../features/resources/data/resources";

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe("NYCU EE website", () => {
  it.each(otherActivities)("opens $title from its album link and supports direct access", async (activity) => {
    const user = userEvent.setup();
    const view = renderApp("/activities/other");
    await user.click(within(screen.getByRole("navigation", { name: "選擇其他活動" })).getByRole("button", { name: activity.title }));
    await user.click(screen.getByRole("link", { name: `${activity.title}，查看活動詳細頁` }));
    expect(screen.getByRole("heading", { level: 1, name: activity.title })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: `${activity.title}活動照片` })).toBeInTheDocument();
    expect(screen.queryAllByRole("time").map((time) => time.getAttribute("datetime")))
      .toEqual(activity.date ? [activity.date, ...(activity.endDate && activity.endDate !== activity.date ? [activity.endDate] : [])] : []);
    expect(screen.queryByLabelText("活動資訊")).not.toBeInTheDocument();
    if (activity.id === "freshman-camp") {
      for (const group of activity.groups!) {
        expect(screen.getByRole("heading", { level: 2, name: group.title })).toBeInTheDocument();
      }
    }
    view.unmount();
    renderApp(`/activities/${activity.id}`);
    expect(screen.getByRole("heading", { level: 1, name: activity.title })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: `${activity.title}活動照片` })).getAllByRole("img"))
      .toHaveLength(activity.photos.length);
    if (activity.id === "course-selection") {
      screen.getAllByRole("img", { name: /選課大會/ }).forEach((image) => expect(image).toHaveStyle({ objectFit: "contain" }));
    }
  });

  it("opens the other-activities album from the overview and supports direct access", async () => {
    const user = userEvent.setup();
    const view = renderApp("/activities/overview");
    await user.click(screen.getByRole("link", { name: "其他活動，查看活動相簿" }));
    expect(screen.getByRole("heading", { name: "其他活動" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "選課大會" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "主要導覽" })).getByRole("link", { name: "系上活動" })).toHaveClass("active");
    await user.click(screen.getByRole("link", { name: /回到活動總覽/ }));
    expect(screen.getByRole("heading", { name: "活動總覽" })).toBeInTheDocument();
    view.unmount();
    renderApp("/activities/other");
    expect(screen.getByRole("article", { name: "選課大會" })).toBeInTheDocument();
  });
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
    await user.type(input, "出國交換公告");
    await user.click(within(screen.getByRole("dialog")).getByRole("link", { name: /交換資訊/ }));

    expect(await screen.findByRole("heading", { name: "官方資訊入口", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "交換資訊" })).toHaveAttribute("aria-selected", "true");
  });

  it("changes the calendar month", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T16:00:00.000Z"));
    const user = userEvent.setup();
    try {
      renderApp();
      expect(screen.getByText("2026年10月")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "下一個月" }));
      expect(screen.getByText("2026年11月")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "本月" }));
      expect(screen.getByText("2026年10月")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens an activity from the calendar", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T16:00:00.000Z"));
    const user = userEvent.setup();
    try {
      renderApp();
      const calendar = screen.getByRole("region", { name: "行事曆" });
      await user.click(within(calendar).getByRole("link", { name: "新生晚會，查看活動詳細頁" }));
      expect(screen.getByRole("heading", { level: 1, name: "新生晚會" })).toBeInTheDocument();
      expect(screen.getByRole("time")).toHaveAttribute("datetime", activities.find((activity) => activity.title === "新生晚會")?.date);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the four student link groups in the requested order", () => {
    renderApp();
    const quickLinks = screen.getByRole("region", { name: "探索交大電機" });
    const labels = Array.from(quickLinks.querySelectorAll(".quick-main-link strong"), (label) => label.textContent);
    expect(labels).toEqual(["系學會", "系上活動", "系隊", "學習資料"]);
    expect(Array.from(quickLinks.querySelectorAll(".quick-main-link"), (link) => link.getAttribute("href"))).toEqual(["/eesa", "/activities", "/team", "/resources"]);
  });

  it("shows the next three published activities from the Taiwan date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T16:00:00.000Z"));

    try {
      renderApp();
      const section = screen.getByRole("region", { name: "首頁近期活動" });
      expect(within(section).getByRole("heading", { name: "最新消息" })).toBeInTheDocument();
      expect(within(section).getByRole("link", { name: /查看更多活動/ })).toHaveAttribute("href", "/activities/overview");
      expect(within(section).getAllByRole("link", { name: /查看活動詳細頁/ }).map((item) => item.getAttribute("href"))).toEqual([
        "/activities/smart-ee-camp", "/activities/department-camping-night", "/activities/freshman-night",
      ]);
      expect(within(section).getAllByRole("time").map((item) => item.getAttribute("dateTime"))).toEqual([
        "2026-10-14", "2026-10-18", "2026-10-28",
      ]);
      expect(within(section).getByText("電機營")).toBeInTheDocument();
      expect(within(section).getByText("系露營")).toBeInTheDocument();
      expect(within(section).getByText("新生晚會")).toBeInTheDocument();
      expect(within(section).queryByText("智慧電機探索營：從電路到未來應用")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows fewer cards when fewer upcoming activities remain", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-05-21T16:00:00.000Z"));

    try {
      renderApp();
      const section = screen.getByRole("region", { name: "首頁近期活動" });
      expect(within(section).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(1);
      expect(within(section).getByRole("link", { name: /電機週.*查看活動詳細頁/ })).toHaveAttribute("href", "/activities/ee-week-showcase");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows an empty state after the last activity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-05-22T16:00:00.000Z"));

    try {
      renderApp();
      const section = screen.getByRole("region", { name: "首頁近期活動" });
      expect(within(section).queryByRole("link", { name: /查看活動詳細頁/ })).not.toBeInTheDocument();
      expect(within(section).getByText(/目前沒有即將舉行的活動/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the activities page from the global navigation", async () => {
    const user = userEvent.setup();
    renderApp();

    const navigation = screen.getByRole("navigation", { name: "主要導覽" });
    await user.click(within(navigation).getByRole("link", { name: "系上活動" }));
    expect(screen.getByRole("heading", { name: "活動總覽" })).toBeInTheDocument();
    const recentActivities = screen.getByRole("region", { name: "近期活動" });
    expect(within(recentActivities).getAllByRole("link", { name: /查看活動詳細頁/ }))
      .toHaveLength(activities.filter((activity) => activity.date && activity.detail).length);
    expect(within(recentActivities).queryByRole("button", { name: /查看活動詳情/ })).not.toBeInTheDocument();
  });

  it("opens the default learning resources page from the global navigation", async () => {
    const user = userEvent.setup();
    renderApp();

    const navigation = screen.getByRole("navigation", { name: "主要導覽" });
    await user.click(within(navigation).getByRole("link", { name: "學習資料" }));
    expect(screen.getByRole("heading", { name: "官方資訊入口", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: resourceCategories[defaultResourceSlug].tabLabel })).toHaveAttribute("aria-selected", "true");
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
    await user.click(within(screen.getByRole("navigation", { name: "系上活動內容連結" })).getByRole("link", { name: /活動總覽/ }));
    expect(screen.getByRole("heading", { name: "活動總覽" })).toBeInTheDocument();
  });

  it("opens and closes the calendar import modal", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "匯入 Google 日曆" }));
    expect(screen.getByRole("dialog", { name: "匯入 Google 日曆" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "關閉視窗" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
