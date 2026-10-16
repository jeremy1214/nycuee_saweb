import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResourcePage from "./ResourcePage";
import { defaultResourceSlug, resourceCategories, resourceOrder } from "./data/resources";

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
  it.each(resourceOrder)("shows only official links, preparation steps and a checklist for %s", (slug) => {
    const category = resourceCategories[slug];
    renderResourcePage(`/resources/${slug}`);

    const panel = screen.getByRole("tabpanel", { name: category.tabLabel });
    const sections = within(panel).getAllByRole("region");
    expect(sections).toHaveLength(1 + category.sections.length);
    expect(sections[0]).toHaveAccessibleName("官方資訊入口");
    expect(within(sections[0]).getByRole("heading", { level: 1, name: "官方資訊入口" })).toBeInTheDocument();
    category.sections.forEach((section, index) => {
      const region = sections[index + 1];
      expect(region).toHaveAccessibleName(section.title);
      expect(within(region).getByRole("heading", { level: 2, name: section.title })).toBeInTheDocument();
      expect(within(region).getAllByRole("listitem")).toHaveLength(section.items.length);
      if (section.type === "process") expect(within(region).getAllByRole("heading", { level: 3 })).toHaveLength(section.items.length);
    });
    expect(screen.queryByText("使用提醒")).not.toBeInTheDocument();
    expect(screen.queryByText("先掌握這三件事")).not.toBeInTheDocument();
    expect(screen.queryByText(/資料核對/)).not.toBeInTheDocument();
    expect(screen.getByText("詳細規定與申請方式請以官方最新公告為準。")).toBeInTheDocument();

    expect(within(sections[0]).getAllByRole("link")).toHaveLength(category.links.length);
    for (const link of category.links) {
      const anchor = within(sections[0]).getByRole("link", { name: `${link.label} ${link.description}` });
      expect(anchor).toHaveAttribute("href", link.href);
      expect(anchor).toHaveAttribute("target", "_blank");
      expect(anchor).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("renders resource tabs and changes categories", async () => {
    const user = userEvent.setup();
    renderResourcePage("/resources/courses");

    expect(screen.getByRole("tab", { name: "關於修課" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "獎助學金" }));
    expect(await screen.findByRole("heading", { name: "申請準備節奏" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /國際事務處出國獎學金/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "獎助學金" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports arrow, Home and End navigation with keyboard focus", async () => {
    const user = userEvent.setup();
    const first = resourceCategories[resourceOrder[0]];
    const last = resourceCategories[resourceOrder.at(-1)!];
    const second = resourceCategories[resourceOrder[1] ?? resourceOrder[0]];
    renderResourcePage(`/resources/${first.slug}`);
    screen.getByRole("tab", { name: first.tabLabel }).focus();

    for (const [key, label] of [
      ["{ArrowLeft}", last.tabLabel],
      ["{ArrowRight}", first.tabLabel],
      ["{ArrowRight}", second.tabLabel],
      ["{End}", last.tabLabel],
      ["{Home}", first.tabLabel],
    ]) {
      await user.keyboard(key);
      const selected = screen.getByRole("tab", { name: label });
      expect(selected).toHaveAttribute("aria-selected", "true");
      await vi.waitFor(() => expect(selected).toHaveFocus());
    }

    await user.tab();
    const link = first.links[0];
    expect(screen.getByRole("link", { name: `${link.label} ${link.description}` })).toHaveFocus();
  });

  it("redirects an unknown resource category", async () => {
    renderResourcePage("/resources/unknown");
    expect(await screen.findByRole("heading", { name: "官方資訊入口", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: resourceCategories[defaultResourceSlug].tabLabel })).toHaveAttribute("aria-selected", "true");
  });
});
