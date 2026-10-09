import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResourcePage from "./ResourcePage";

function renderResourcePage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="resources/:category" element={<ResourcePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResourcePage", () => {
  it("renders resource tabs and changes categories", async () => {
    const user = userEvent.setup();
    renderResourcePage("/resources/courses");

    expect(screen.getByRole("tab", { name: "關於修課" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "獎助學金" }));
    expect(await screen.findByRole("heading", { name: /先分清類型/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "獎助學金" })).toHaveAttribute("aria-selected", "true");
  });

  it("redirects an unknown resource category", async () => {
    renderResourcePage("/resources/unknown");
    expect(await screen.findByRole("heading", { name: /把四年的選擇/ })).toBeInTheDocument();
  });
});
