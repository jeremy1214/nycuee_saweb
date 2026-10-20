import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { activities } from "../../activities/data/activities";
import { calendarEvents } from "../data/home";
import { EventCalendar } from "./EventCalendar";

vi.mock("../data/home", async (importOriginal) => {
  const original = await importOriginal<typeof import("../data/home")>();
  return {
    ...original,
    calendarEvents: [...original.calendarEvents, {
      id: "calendar-fallback", title: "活動資訊測試", date: "2026-10-28",
      categoryId: "other", category: "其他活動", summary: "摘要", details: "完整活動介紹",
    }],
  };
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Taiwan is already October 20 while UTC is still October 19.
  vi.setSystemTime(new Date("2026-10-19T16:00:00.000Z"));
});

afterEach(() => vi.useRealTimers());

function renderCalendar(onEvent = vi.fn()) {
  return render(<MemoryRouter><EventCalendar onEvent={onEvent} /></MemoryRouter>);
}

it("shows every published dated activity in the visible month, including multiple events on one day", () => {
  renderCalendar();
  const calendar = screen.getByRole("region", { name: "行事曆" });
  for (const event of activities.filter((activity) => activity.date?.startsWith("2026-10"))) {
    expect(within(calendar).getByRole("link", { name: `${event.title}，查看活動詳細頁` }))
      .toHaveAttribute("href", `/activities/${event.id}`);
  }
  const freshman = within(calendar).getByRole("link", { name: "新生晚會，查看活動詳細頁" });
  const lightDance = within(calendar).getByRole("link", { name: /光舞.*查看活動詳細頁/ });
  expect(freshman.parentElement).toBe(lightDance.parentElement);
  expect(calendar.querySelector('time[aria-current="date"]')).toHaveAttribute("datetime", "2026-10-20");
  expect(within(calendar).queryByText("智慧電機專題講座")).not.toBeInTheDocument();
});

it("opens information for an activity without a detailed page", async () => {
  const user = userEvent.setup();
  const onEvent = vi.fn();
  renderCalendar(onEvent);
  await user.click(screen.getByRole("button", { name: "活動資訊測試，查看活動詳情" }));
  expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ id: "calendar-fallback", details: "完整活動介紹" }));
});

it("navigates across a year boundary and returns to the actual Taiwan month", async () => {
  vi.setSystemTime(new Date("2026-12-31T16:00:00.000Z"));
  const user = userEvent.setup();
  renderCalendar();
  expect(screen.getByText("2027年1月")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "上一個月" }));
  expect(screen.getByText("2026年12月")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "本月" }));
  expect(screen.getByText("2027年1月")).toBeInTheDocument();
});

it("uses the same complete activity list for calendar import", async () => {
  const user = userEvent.setup();
  renderCalendar();
  await user.click(screen.getByRole("button", { name: "匯入 Google 日曆" }));
  expect(screen.getByRole("dialog")).toHaveTextContent(`全部 ${calendarEvents.length} 筆活動`);
});
