import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../shared/components/layout/AppShell";
import ActivityDetailPage from "./ActivityDetailPage";

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="pathname">{location.pathname}</output>
      <button onClick={() => navigate(-1)}>上一頁</button>
      <button onClick={() => navigate(1)}>下一頁</button>
    </>
  );
}

function renderDetailPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationProbe />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/activities/:activityId" element={<ActivityDetailPage />} />
          <Route path="/activities/:activityId/:tabId" element={<ActivityDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ActivityDetailPage", () => {
  it.each([
    ["/activities/department-camping-night", "系露營", "小隊任務", "晚間交流"],
    ["/activities/ee-week-showcase", "電機週", "主題展區", "設計成果"],
  ])("renders the activity and its expandable sections", (path, title, firstSection, lastSection) => {
    renderDetailPage(path);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: firstSection })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: lastSection })).toBeInTheDocument();
    expect(screen.getByText(/本頁為第一版內容草稿/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /回到活動總覽/ })).toHaveAttribute("href", "/activities/overview");
  });

  it("scrolls to a selected section", async () => {
    const user = userEvent.setup();
    renderDetailPage("/activities/department-camping-night");

    const section = document.getElementById("team-challenges");
    const scrollIntoView = vi.spyOn(section!, "scrollIntoView");
    await user.click(screen.getByRole("button", { name: "小隊任務" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("redirects the existing camp URL to the introduction", () => {
    renderDetailPage("/activities/smart-ee-camp");

    expect(screen.getByTestId("pathname")).toHaveTextContent("/activities/smart-ee-camp/intro");
    expect(screen.getByRole("link", { name: "活動介紹" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: "電機營" })).toBeInTheDocument();
    expect(screen.getByText(/本頁為第一版內容草稿/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /回到活動總覽/ })).toHaveAttribute("href", "/activities/overview");
    expect(screen.queryByText("硬體課程")).not.toBeInTheDocument();
    expect(screen.queryByText("軟體課程")).not.toBeInTheDocument();
  });

  it.each([
    ["intro", "活動介紹", [], ["招生", "火球"]],
    ["groups", "各組介紹", ["招生", "活動", "課程", "場器", "美宣", "生活"], ["火球", "火棍"]],
    ["practice", "共練介紹", ["火球", "火棍", "香扇", "小旗", "蛇舞"], ["招生", "生活"]],
  ])("opens the %s page directly and only renders its content", (tabId, label, titles, absentTitles) => {
    renderDetailPage(`/activities/smart-ee-camp/${tabId}`);

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "活動內容分頁" }).querySelectorAll("a")).toHaveLength(3);
    titles.forEach((title) => expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument());
    absentTitles.forEach((title) => expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument());
    expect(document.getElementById("activity-intro") !== null).toBe(tabId === "intro");
    if (tabId === "intro") {
      expect(screen.getByLabelText("電機營活動照片").querySelectorAll("img")).toHaveLength(2);
    } else {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });

  it("navigates between camp pages, resets scroll, and supports back and forward", async () => {
    const user = userEvent.setup();
    renderDetailPage("/activities/smart-ee-camp/intro");
    const page = within(screen.getByRole("main"));
    vi.mocked(window.scrollTo).mockClear();

    await user.click(page.getByRole("link", { name: "各組介紹" }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/activities/smart-ee-camp/groups");
    expect(page.getByRole("heading", { name: "招生" })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "auto" });

    await user.click(page.getByRole("link", { name: "共練介紹" }));
    expect(page.getByRole("heading", { name: "火球" })).toBeInTheDocument();
    expect(page.queryByRole("heading", { name: "招生" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "上一頁" }));
    expect(page.getByRole("link", { name: "各組介紹" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "上一頁" }));
    expect(page.getByRole("link", { name: "活動介紹" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "下一頁" }));
    expect(page.getByRole("link", { name: "各組介紹" })).toHaveAttribute("aria-current", "page");
  }, 15000);

  it.each([
    "/activities/light-dance-workshop",
    "/activities/unknown/intro",
    "/activities/smart-ee-camp/unknown",
    "/activities/smart-ee-camp/hardware-course",
    "/activities/department-camping-night/intro",
  ])("shows the not-found page for unsupported activity or tab %s", (path) => {
    renderDetailPage(path);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "這個頁面還沒有接上電路。" })).toBeInTheDocument();
  });
});
