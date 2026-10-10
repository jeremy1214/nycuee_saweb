import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ActivityDetailPage from "./ActivityDetailPage";

function renderDetailPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/activities/:activityId" element={<ActivityDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ActivityDetailPage", () => {
  it.each([
    ["/activities/smart-ee-camp", "電機營", "硬體課程", "軟體課程"],
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
    renderDetailPage("/activities/smart-ee-camp");

    const section = document.getElementById("hardware-course");
    const scrollIntoView = vi.spyOn(section!, "scrollIntoView");
    await user.click(screen.getByRole("button", { name: "硬體課程" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("shows the not-found page for an unknown or unsupported activity", () => {
    renderDetailPage("/activities/light-dance-workshop");

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "這個頁面還沒有接上電路。" })).toBeInTheDocument();
  });
});
