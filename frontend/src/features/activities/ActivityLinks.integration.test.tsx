import { render } from "../../test/render";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ActivityDetailPage from "./ActivityDetailPage";
import OtherActivitiesPage from "./OtherActivitiesPage";
import ActivitiesPage from "./ActivitiesPage";
import { activities } from "./data/activities";
import { otherActivities } from "./data/otherActivities";
import { ActivityLinks } from "./components/ActivityLinks";

const links = [
  { label: "立即報名", url: "https://forms.gle/example" },
  { label: "Facebook 粉專", url: "https://www.facebook.com/example" },
  { label: "自訂活動官網", url: "https://example.com/event" },
];
const originalActivities = structuredClone(activities);
const originalAlbums = structuredClone(otherActivities);

beforeEach(() => {
  activities.forEach((activity) => { activity.links = structuredClone(links); });
  otherActivities.forEach((activity) => { activity.links = structuredClone(links); });
});

afterEach(() => {
  activities.splice(0, activities.length, ...structuredClone(originalActivities));
  otherActivities.splice(0, otherActivities.length, ...structuredClone(originalAlbums));
});

function expectLinks() {
  const navigation = screen.getByRole("navigation", { name: "活動相關連結" });
  expect(within(navigation).getAllByRole("link").map((link) => link.getAttribute("href")))
    .toEqual(links.map((link) => link.url));
  links.forEach(({ label, url }) => {
    const link = within(navigation).getByRole("link", { name: `${label} （另開分頁）` });
    expect(link).toHaveAttribute("href", url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
}

it.each([
  "/activities/smart-ee-camp/intro",
  "/activities/ee-week-showcase/groups",
  "/activities/course-selection",
])("shows shared custom links in the introduction at %s", (path) => {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/activities/:activityId/:tabId?" element={<ActivityDetailPage />} />
  </Routes></MemoryRouter>);
  expectLinks();
});

it("keeps introduction links off separate group tabs", () => {
  render(<MemoryRouter initialEntries={["/activities/smart-ee-camp/groups"]}><Routes>
    <Route path="/activities/:activityId/:tabId?" element={<ActivityDetailPage />} />
  </Routes></MemoryRouter>);
  expect(screen.queryByRole("navigation", { name: "活動相關連結" })).not.toBeInTheDocument();
});

it("shows links on detail pages without rich introduction content", () => {
  const activity = activities.find((activity) => activity.id === "smart-ee-camp")!;
  delete activity.detail;
  render(<MemoryRouter initialEntries={["/activities/smart-ee-camp"]}><Routes>
    <Route path="/activities/:activityId" element={<ActivityDetailPage />} />
  </Routes></MemoryRouter>);
  expectLinks();
});

it("shows the selected album activity's links", async () => {
  activities.find(activity => activity.id === otherActivities[1].id)!.links = [{ label: "第二個活動報名", url: "https://example.com/second" }];
  render(<MemoryRouter><OtherActivitiesPage /></MemoryRouter>);
  expectLinks();
  await userEvent.click(screen.getByRole("button", { name: otherActivities[1].title }));
  expect(screen.getByRole("link", { name: "第二個活動報名 （另開分頁）" })).toHaveAttribute("href", "https://example.com/second");
  expect(screen.queryByRole("link", { name: "立即報名 （另開分頁）" })).not.toBeInTheDocument();
});

it("shows links in the overview information dialog", async () => {
  const activity = activities.find((activity) => activity.id === "smart-ee-camp")!;
  delete activity.detail;
  render(<MemoryRouter><ActivitiesPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: `${activity.title}，查看活動詳情` }));
  expectLinks();
});

it.each([[undefined], [[]]])("renders no link block for %j", (emptyLinks) => {
  const { container } = render(<ActivityLinks links={emptyLinks} />);
  expect(container).toBeEmptyDOMElement();
});

it("identifies the camp's real website and Instagram with the visible account", () => {
  const camp = originalActivities.find((activity) => activity.id === "smart-ee-camp")!;
  render(<ActivityLinks links={camp.links} />);
  expect(screen.getByRole("link", { name: /電機營官方網站/ }))
    .toHaveAttribute("href", "https://eesa.dece.nycu.edu.tw/EECAMP/");
  const instagram = screen.getByRole("link", { name: /電機營 Instagram/ });
  expect(instagram).toHaveAttribute("href", "https://www.instagram.com/nycueecamp/");
  expect(within(instagram).getByText("@nycueecamp")).toBeVisible();
  expect(within(instagram).getByText("Instagram")).toBeVisible();
  expect(instagram).toHaveClass("activity-links-instagram");
});

it("recognizes real platform domains while keeping lookalike domains as websites", () => {
  render(<ActivityLinks links={[
    { label: "假網域", url: "https://instagram.com.example.org/account" },
    { label: "貼文", url: "https://www.instagram.com/p/abc/" },
    { label: "報名", url: "https://docs.google.com/forms/d/example/viewform" },
    { label: "粉專", url: "https://m.facebook.com/example" },
  ]} />);
  expect(screen.getByRole("link", { name: /假網域/ })).toHaveClass("activity-links-website");
  const post = screen.getByRole("link", { name: /貼文/ });
  expect(post).toHaveClass("activity-links-instagram");
  expect(within(post).queryByText("@p")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /報名/ })).toHaveClass("activity-links-registration");
  expect(screen.getByRole("link", { name: /粉專/ })).toHaveClass("activity-links-facebook");
});
