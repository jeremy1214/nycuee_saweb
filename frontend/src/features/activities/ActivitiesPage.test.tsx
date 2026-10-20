import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ActivitiesPage from "./ActivitiesPage";
import { activities } from "./data/activities";

const datedDetailActivities = activities.filter((activity) => activity.date && activity.detail);

function renderActivitiesPage(route = "/activities/overview") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ActivitiesPage />
    </MemoryRouter>,
  );
}

describe("ActivitiesPage", () => {
  it("shows detail links and the other-activities album entry", () => {
    renderActivitiesPage();

    expect(screen.getByRole("link", { name: "電機營，查看活動詳細頁" })).toHaveAttribute(
      "href",
      "/activities/smart-ee-camp",
    );
    expect(screen.getByRole("link", { name: "系露營，查看活動詳細頁" })).toHaveAttribute(
      "href",
      "/activities/department-camping-night",
    );
    expect(screen.getByRole("link", { name: "電機週，查看活動詳細頁" })).toHaveAttribute(
      "href",
      "/activities/ee-week-showcase",
    );
    expect(screen.getByRole("link", { name: "光舞，查看活動詳細頁" })).toHaveAttribute(
      "href",
      "/activities/light-dance-workshop",
    );
    expect(screen.getByRole("link", { name: "其他活動，查看活動相簿" })).toHaveAttribute("href", "/activities/other");
    const recentActivities = screen.getByRole("region", { name: "近期活動" });
    expect(within(recentActivities).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(datedDetailActivities.length);
    expect(within(recentActivities).getByRole("link", { name: "光舞：用科技點亮舞台，查看活動詳細頁" })).toHaveAttribute("href", "/activities/light-dance-workshop");
    expect(within(recentActivities).queryByRole("button", { name: /查看活動詳情/ })).not.toBeInTheDocument();
  });

  it("preserves existing category-filter URLs and can show all activities again", async () => {
    const user = userEvent.setup();
    renderActivitiesPage("/activities/overview?category=other");
    const recentActivities = screen.getByRole("region", { name: "近期活動" });
    expect(screen.getByText("目前顯示：其他活動")).toBeInTheDocument();
    const otherActivities = datedDetailActivities.filter((activity) => activity.categoryId === "other");
    expect(within(recentActivities).getByText(`${otherActivities.length} 項`)).toBeInTheDocument();
    expect(within(recentActivities).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(otherActivities.length);
    expect(within(recentActivities).queryByRole("button", { name: /查看活動詳情/ })).not.toBeInTheDocument();
    expect(within(recentActivities).queryByRole("link", { name: /光舞/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /顯示全部活動/ }));
    expect(within(recentActivities).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(datedDetailActivities.length);
    expect(within(recentActivities).queryByRole("button", { name: /查看活動詳情/ })).not.toBeInTheDocument();
  });
});
