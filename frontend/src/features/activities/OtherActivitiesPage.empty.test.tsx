import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OtherActivitiesPage from "./OtherActivitiesPage";

vi.mock("./data/otherActivities", () => ({ otherActivities: [] }));

it("shows an empty album when no album activities are published", () => {
  render(<MemoryRouter><OtherActivitiesPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "其他活動" })).toBeInTheDocument();
  expect(screen.getByText("目前沒有已發布的活動相簿。")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "回到活動總覽" })).toHaveAttribute("href", "/activities/overview");
});
