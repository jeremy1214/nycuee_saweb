import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QuickLinks } from "./QuickLinks";

function renderQuickLinks() {
  render(<MemoryRouter><QuickLinks /></MemoryRouter>);
}

describe("home team menu", () => {
  it("keeps the menu open and focus on the toggle when showing all teams", async () => {
    const user = userEvent.setup();
    renderQuickLinks();
    const opener = screen.getByRole("button", { name: "展開系隊選單" });
    await user.click(opener);
    const menu = screen.getByRole("navigation", { name: "系隊內容連結" });
    expect(within(menu).getAllByRole("link")).toHaveLength(5);

    const toggle = within(menu).getByRole("button", { name: /顯示更多系隊/ });
    await user.click(toggle);
    expect(within(menu).getAllByRole("link")).toHaveLength(9);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(opener).toHaveAttribute("aria-expanded", "true");

    // Expanding changes the dropdown's geometry beneath the desktop pointer.
    fireEvent.mouseLeave(opener.closest(".quick-item")!);
    expect(within(menu).getAllByRole("link")).toHaveLength(9);
    expect(opener).toHaveAttribute("aria-expanded", "true");

    await user.click(within(menu).getByRole("button", { name: /收合系隊/ }));
    expect(within(menu).getAllByRole("link")).toHaveLength(5);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("supports keyboard expansion and resets after leaving the menu", async () => {
    const user = userEvent.setup();
    renderQuickLinks();
    const opener = screen.getByRole("button", { name: "展開系隊選單" });
    await user.click(opener);
    const menu = screen.getByRole("navigation", { name: "系隊內容連結" });
    const toggle = within(menu).getByRole("button", { name: /顯示更多系隊/ });
    act(() => toggle.focus());
    await user.keyboard("{Enter}");
    expect(within(menu).getAllByRole("link")).toHaveLength(9);
    await user.keyboard(" ");
    expect(within(menu).getAllByRole("link")).toHaveLength(5);
    await user.keyboard("{Enter}{Tab}");
    expect(opener).toHaveAttribute("aria-expanded", "false");
    expect(within(menu).getAllByRole("link")).toHaveLength(5);
  });
});
