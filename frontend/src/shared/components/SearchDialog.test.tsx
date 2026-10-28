import { render } from "../../test/render";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SearchDialog } from "./SearchDialog";

describe("SearchDialog activity content", () => {
  it("finds 光舞 and its detail page", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchDialog open onClose={() => {}} /></MemoryRouter>);

    await user.type(screen.getByRole("searchbox", { name: "關鍵字" }), "光舞");

    const links = within(screen.getByRole("dialog")).getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/activities/light-dance-workshop/intro")).toBe(true);
  });

  it("finds text inside an activity tab and links to that tab", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SearchDialog open onClose={() => {}} /></MemoryRouter>);

    await user.type(screen.getByRole("searchbox", { name: "關鍵字" }), "實驗室聯繫");

    const links = within(screen.getByRole("dialog")).getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/activities/ee-week-showcase/groups")).toBe(true);
  });
});
