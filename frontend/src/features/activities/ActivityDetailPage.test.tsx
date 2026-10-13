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

  it.each(["/activities/ee-week-showcase", "/activities/ee-week-showcase/intro"])(
    "redirects %s to the first EE week page", (path) => {
      renderDetailPage(path);
      expect(screen.getByTestId("pathname")).toHaveTextContent("/activities/ee-week-showcase/groups");
      expect(screen.getByRole("link", { name: "各組介紹" })).toHaveAttribute("aria-current", "page");
    },
  );

  it.each([
    ["groups", "各組介紹", ["公關部", "宣傳部", "課學部", "活動部", "場器部", "Open Lab"], ["擺攤", "儀隊"]],
    ["events", "細項活動", ["擺攤", "圓桌分享", "Open Lab", "企業參訪", "麻將大賽", "電競比賽", "人氣王", "養樂多大賽"], ["公關部", "儀隊"]],
    ["performances", "電夜表演", ["儀隊", "光球", "光棍", "光舞", "樂團", "長劇"], ["公關部", "擺攤"]],
  ])("opens the EE week %s page with a shared introduction", (tabId, label, titles, absentTitles) => {
    renderDetailPage(`/activities/ee-week-showcase/${tabId}`);
    const navigation = screen.getByRole("navigation", { name: "活動內容分頁" });
    const hero = document.getElementById("activity-intro")!;
    expect(screen.getByRole("heading", { level: 1, name: "電機週" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual(["各組介紹", "細項活動", "電夜表演"]);
    expect(hero).toBeInTheDocument();
    expect(hero.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(hero).getAllByRole("img")).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(titles.length);
    titles.forEach((title) => expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument());
    absentTitles.forEach((title) => expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "主題展區" })).not.toBeInTheDocument();
  });

  it("renders activities without photos as text without an empty frame", () => {
    renderDetailPage("/activities/ee-week-showcase/events");
    const booth = document.getElementById("booths")!;
    expect(booth).toHaveClass("activity-detail-section-text-only");
    expect(booth.querySelector("figure")).toBeNull();
    expect(within(booth).queryByRole("img")).not.toBeInTheDocument();
    expect(within(document.getElementById("open-lab")!).getByRole("img")).toHaveAttribute("loading", "lazy");
  });

  it("navigates between EE week pages and supports history and scroll reset", async () => {
    const user = userEvent.setup();
    renderDetailPage("/activities/ee-week-showcase/groups");
    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole("link", { name: "細項活動" }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/activities/ee-week-showcase/events");
    expect(screen.getByRole("heading", { name: "擺攤" })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "auto" });
    await user.click(screen.getByRole("link", { name: "電夜表演" }));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/activities/ee-week-showcase/performances");
    expect(screen.getByRole("heading", { name: "儀隊" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "擺攤" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "上一頁" }));
    expect(screen.getByRole("link", { name: "細項活動" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "上一頁" }));
    expect(screen.getByRole("link", { name: "各組介紹" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "下一頁" }));
    expect(screen.getByRole("link", { name: "細項活動" })).toHaveAttribute("aria-current", "page");
  }, 15000);

  it.each([
    "/activities/light-dance-workshop",
    "/activities/unknown/intro",
    "/activities/smart-ee-camp/unknown",
    "/activities/smart-ee-camp/hardware-course",
    "/activities/department-camping-night/intro",
    "/activities/ee-week-showcase/unknown",
  ])("shows the not-found page for unsupported activity or tab %s", (path) => {
    renderDetailPage(path);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "這個頁面還沒有接上電路。" })).toBeInTheDocument();
  });
});
