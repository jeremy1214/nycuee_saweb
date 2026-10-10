import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ActivitiesPage from "./ActivitiesPage";

function renderActivitiesPage() {
  return render(
    <MemoryRouter>
      <ActivitiesPage />
    </MemoryRouter>,
  );
}

describe("ActivitiesPage", () => {
  it("shows detail links and compact activities, then filters by category", async () => {
    const user = userEvent.setup();
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
    expect(screen.getByRole("button", { name: "篩選光舞活動" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "篩選其他活動" })).toBeInTheDocument();
    const recentActivities = screen.getByRole("region", { name: "近期活動" });
    expect(within(recentActivities).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(3);
    expect(within(recentActivities).getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "篩選光舞活動" }));
    expect(screen.getByText("目前顯示：光舞")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(1);
    expect(screen.getByText("光舞工作坊：用程式點亮舞台")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /顯示全部活動/ }));
    expect(within(recentActivities).getAllByRole("link", { name: /查看活動詳細頁/ })).toHaveLength(3);
    expect(within(recentActivities).getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(2);
  });

  it("opens activity details and closes the dialog with Escape", async () => {
    const user = userEvent.setup();
    renderActivitiesPage();

    await user.click(screen.getByRole("button", { name: /光舞工作坊/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("活動中心二樓展演空間")).toBeInTheDocument();
    expect(within(dialog).getByText(/正式時間、地點與報名方式/)).toBeInTheDocument();

    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
