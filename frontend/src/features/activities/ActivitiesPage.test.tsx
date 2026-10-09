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
  it("shows all five upcoming activities by default and filters by category", async () => {
    const user = userEvent.setup();
    renderActivitiesPage();

    expect(screen.getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(5);

    await user.click(screen.getByRole("button", { name: "篩選光舞活動" }));
    expect(screen.getByText("目前顯示：光舞")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(1);
    expect(screen.getByText("光舞工作坊：用程式點亮舞台")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /顯示全部活動/ }));
    expect(screen.getAllByRole("button", { name: /查看活動詳情/ })).toHaveLength(5);
  });

  it("opens activity details and closes the dialog with Escape", async () => {
    const user = userEvent.setup();
    renderActivitiesPage();

    await user.click(screen.getByRole("button", { name: /智慧電機探索營/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("工程四館 101 講堂")).toBeInTheDocument();
    expect(within(dialog).getByText(/正式時間、地點與報名方式/)).toBeInTheDocument();

    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
