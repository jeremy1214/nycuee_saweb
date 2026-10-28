import { render } from "../../test/render";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../../App";
import { sectionMenus } from "../../shared/data/navigation";
import { searchItems } from "../../shared/data/search";

vi.mock("./data/resourceRepository", async () => {
  const { createResourceRepository } = await import("./data/resourceContent");
  const { expandedResourceFixture } = await import("./data/__fixtures__/resources");
  const { config, modules } = expandedResourceFixture();
  return createResourceRepository(config, modules);
});

function renderResources(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
}

describe("extensible resource content", () => {
  it("renders a fifth category with four links and repeated section types in JSON order", () => {
    renderResources("/resources/additional");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(tabs[4]).toHaveAccessibleName("延伸學習");
    expect(tabs[4]).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: "延伸學習" });
    const sections = within(panel).getAllByRole("region");
    expect(sections.map((section) => section.getAttribute("aria-labelledby"))).toEqual([
      "official-links-title",
      "resource-additional-first-checklist-title",
      "resource-additional-long-process-title",
      "resource-additional-second-checklist-title",
      "resource-additional-second-process-title",
    ]);
    expect(within(sections[0]).getAllByRole("link")).toHaveLength(4);
    expect(within(sections[2]).getAllByRole("listitem")).toHaveLength(6);
    expect(within(sections[4]).getAllByRole("listitem")).toHaveLength(1);
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes published categories in menus and search and hides draft and archived content everywhere", () => {
    expect(sectionMenus["/resources"].map((item) => item.label)).toEqual(["關於修課", "獎助學金", "交換資訊", "研究所", "延伸學習"]);
    expect(searchItems.find((item) => item.to === "/resources/additional")).toMatchObject({ label: "延伸學習", description: "延伸學習測試摘要" });
    for (const hidden of ["draft-category", "archived-category"]) {
      expect(sectionMenus["/resources"].some((item) => item.to === `/resources/${hidden}`)).toBe(false);
      expect(searchItems.some((item) => item.to === `/resources/${hidden}`)).toBe(false);
    }
    renderResources("/resources/additional");
    expect(screen.queryByRole("tab", { name: "草稿分類" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "封存分類" })).not.toBeInTheDocument();
  });

  it.each(["/resources", "/resources/missing", "/resources/draft-category", "/resources/archived-category"])("uses the configured default for %s", (route) => {
    renderResources(route);
    expect(screen.getByRole("tab", { name: "延伸學習" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "六步流程" })).toBeInTheDocument();
  });

  it("supports keyboard navigation to a dynamically added category", async () => {
    const user = userEvent.setup();
    renderResources("/resources/courses");
    screen.getByRole("tab", { name: "關於修課" }).focus();
    await user.keyboard("{End}");
    await vi.waitFor(() => expect(screen.getByRole("tab", { name: "延伸學習" })).toHaveFocus());
    expect(screen.getByRole("tab", { name: "延伸學習" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(screen.getByRole("tab", { name: "關於修課" })).toHaveFocus());
  });

  it("renders only the official entrance when all optional sections are removed", async () => {
    const { ResourceContentSections, OfficialLinks } = await import("./components/ResourceSections");
    const { resourceCategories } = await import("./data/resources");
    const category = { ...resourceCategories.additional, sections: [] };
    render(<><OfficialLinks category={category} /><ResourceContentSections category={category} /></>);
    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "官方資訊入口" })).toBeInTheDocument();
  });
});
