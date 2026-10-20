import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import rawOther from "../../../content/activities/events/course-selection.json";
import { activities } from "../../activities/data/activities";
import type { ActivityItem } from "../../activities/activityTypes";
import { RecentActivitiesSection } from "./RecentActivitiesSection";

vi.mock("../../activities/data/activities", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../activities/data/activities")>(),
  activities: [],
}));

function event(id: string, date?: string): ActivityItem {
  const firstImage = { ...rawOther.detail.heroImages[0], fit: "contain" as const };
  const secondImage = { ...rawOther.detail.heroImages[1], fit: "contain" as const };
  return {
    ...rawOther,
    detail: { ...rawOther.detail, heroImages: [firstImage, secondImage] },
    album: { ...rawOther.album, cover: firstImage, photos: [firstImage, secondImage] },
    id,
    title: id === rawOther.id ? rawOther.title : id,
    category: "其他活動",
    date,
  };
}

function renderSection() {
  render(<MemoryRouter><RecentActivitiesSection /></MemoryRouter>);
  return screen.getByRole("region", { name: "首頁近期活動" });
}

beforeEach(() => {
  activities.splice(0);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T16:00:00.000Z"));
});

afterEach(() => {
  activities.splice(0);
  vi.useRealTimers();
});

describe("latest activity announcements", () => {
  it("ignores undated introductions and past dates, includes today in Taiwan, and shows only the next three", () => {
    activities.push(
      event("undated"), event("past", "2026-10-19"), event("later", "2026-11-01"),
      event("tomorrow", "2026-10-21"), event("z-today", "2026-10-20"), event("a-today", "2026-10-20"),
    );
    const section = renderSection();
    expect(within(section).getAllByRole("link", { name: /查看活動詳細頁/ }).map((link) => link.getAttribute("href")))
      .toEqual(["/activities/a-today", "/activities/z-today", "/activities/tomorrow"]);
    expect(within(section).getAllByRole("time").map((time) => time.getAttribute("dateTime")))
      .toEqual(["2026-10-20", "2026-10-20", "2026-10-21"]);
  });

  it("uses an other activity's actual title and preserves its cover fit", () => {
    activities.push(event(rawOther.id, "2026-10-20"));
    const section = renderSection();
    expect(within(section).getByText("選課大會")).toBeInTheDocument();
    expect(within(section).queryByText("其他活動")).not.toBeInTheDocument();
    expect(within(section).getByRole("link", { name: /選課大會，查看活動詳細頁/ }))
      .toHaveAttribute("href", "/activities/course-selection");
    expect(within(section).getByRole("img")).toHaveStyle({ objectFit: "contain" });
    expect(within(section).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(1);
  });

  it("shows the empty state when every activity is undated or past", () => {
    activities.push(event("undated"), event("past", "2026-10-19"));
    const section = renderSection();
    expect(within(section).getByText(/目前沒有即將舉行的活動/)).toBeInTheDocument();
    expect(within(section).queryByRole("time")).not.toBeInTheDocument();
  });
});
