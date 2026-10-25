import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ActivityDetailPage from "./ActivityDetailPage";
import ActivitiesPage from "./ActivitiesPage";
import OtherActivitiesPage from "./OtherActivitiesPage";

it("shows the camp's inclusive range on its detail page", () => {
  render(<MemoryRouter initialEntries={["/activities/freshman-camp"]}><Routes>
    <Route path="/activities/:activityId" element={<ActivityDetailPage />} />
  </Routes></MemoryRouter>);
  expect(screen.getAllByRole("time").map((time) => time.getAttribute("datetime")))
    .toEqual(["2026-09-28", "2026-09-30"]);
});

it("shows the same range in the selected album introduction", () => {
  render(<MemoryRouter initialEntries={["/activities/other?activity=freshman-camp"]}><OtherActivitiesPage /></MemoryRouter>);
  const introduction = screen.getByRole("article", { name: "宿營" });
  expect(within(introduction).getAllByRole("time").map((time) => time.getAttribute("datetime")))
    .toEqual(["2026-09-28", "2026-09-30"]);
});

it("shows the full range on the overview activity card", () => {
  render(<MemoryRouter><ActivitiesPage /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "宿營，查看活動詳細頁" }))
    .toHaveTextContent("2026.09.28 – 2026.09.30");
});
