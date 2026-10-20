import rawCamp from "../../../content/activities/events/smart-ee-camp.json";
import rawOther from "../../../content/activities/events/course-selection.json";
import type { ActivityDetail } from "../activityTypes";

type CampFixture = Omit<typeof rawCamp, "detail"> & {
  detail: Omit<ActivityDetail, "heroImages"> & { heroImages: typeof rawCamp.detail.heroImages };
};

afterEach(() => {
  vi.doUnmock("../../../content/activities/events/smart-ee-camp.json");
  vi.doUnmock("../../../content/activities/events/course-selection.json");
  vi.resetModules();
});

describe("optional activity dates and shared album validation", () => {
  async function loadWith(change: Record<string, unknown>) {
    const content = { ...structuredClone(rawOther), ...change };
    vi.resetModules();
    vi.doMock("../../../content/activities/events/course-selection.json", () => ({ default: content }));
    return import("./activityRepository");
  }

  it("publishes an undated introduction and keeps shared image metadata", async () => {
    const { activities } = await loadWith({ date: undefined, location: undefined });
    const activity = activities.find((item) => item.id === rawOther.id)!;
    expect(activity.date).toBeUndefined();
    expect(activity.location).toBeUndefined();
    expect(activity.detail?.intro).toEqual(rawOther.detail.intro);
    expect(activity.album).toEqual(rawOther.album);
    expect(activity.detail?.heroImages[0].fit).toBe("contain");
  });

  it.each(["2026-10-20", "2028-02-29"])("accepts the real date %s without a location", async (date) => {
    const { activities } = await loadWith({ date });
    const activity = activities.find((item) => item.id === rawOther.id)!;
    expect(activity.date).toBe(date);
    expect(activity.location).toBeUndefined();
  });

  it.each(["draft", "archived"])("hides %s activities from both published content and the album", async (status) => {
    await loadWith({ status, date: "2026-10-20" });
    const { activities } = await import("./activityRepository");
    const { otherActivities } = await import("./otherActivities");
    expect(activities.some((item) => item.id === rawOther.id)).toBe(false);
    expect(otherActivities.some((item) => item.id === rawOther.id)).toBe(false);
  });

  it("sorts the album by its explicit order instead of its filename", async () => {
    await loadWith({ album: { ...rawOther.album, order: 99 } });
    const { otherActivities } = await import("./otherActivities");
    expect(otherActivities.at(-1)?.id).toBe(rawOther.id);
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["empty date", { date: "" }, ".date: must be a non-empty string"],
    ["null date", { date: null }, ".date: must be a non-empty string"],
    ["numeric date", { date: 20261020 }, ".date: must be a non-empty string"],
    ["invalid date format", { date: "2026-2-01" }, ".date: must be a valid YYYY-MM-DD date"],
    ["impossible date", { date: "2026-02-30" }, ".date: must be a valid YYYY-MM-DD date"],
    ["non-leap February", { date: "2027-02-29" }, ".date: must be a valid YYYY-MM-DD date"],
    ["invalid month", { date: "2026-13-01" }, ".date: must be a valid YYYY-MM-DD date"],
    ["blank location", { location: " " }, ".location: must be a non-empty string"],
    ["null location", { location: null }, ".location: must be a non-empty string"],
    ["invalid status", { status: "visible" }, ".status: must be draft, published, or archived"],
    ["album without detail", { detail: undefined }, ".album: requires detail content"],
    ["invalid album order", { album: { ...rawOther.album, order: -1 } }, ".album.order: must be a non-negative integer"],
    ["fractional album order", { album: { ...rawOther.album, order: 1.5 } }, ".album.order: must be a non-negative integer"],
    ["empty album photos", { album: { ...rawOther.album, photos: [] } }, ".album.photos: must be a non-empty array"],
    ["invalid cover fit", { album: { ...rawOther.album, cover: { ...rawOther.album.cover, fit: "stretch" } } }, ".cover.fit: must be cover or contain"],
    ["missing photo alt", { album: { ...rawOther.album, photos: [{ ...rawOther.album.photos[0], alt: "" }] } }, ".photos[0].alt: must be a non-empty string"],
    ["nonlocal photo", { album: { ...rawOther.album, cover: { ...rawOther.album.cover, src: "https://example.com/a.jpg" } } }, ".cover.src: must start with /"],
    ["unknown album field", { album: { ...rawOther.album, unexpected: true } }, ".album: contains unknown field(s): unexpected"],
  ])("rejects %s and identifies the field", async (_name, change, error) => {
    await expect(loadWith(change)).rejects.toThrow(error);
  });
});

describe("activity tab validation", () => {
  it.each<[string, (camp: CampFixture) => void, string]>([
    ["empty tabs", (camp) => { camp.detail.tabs = []; }, "tabs: must be a non-empty array"],
    ["duplicate tab ids", (camp) => { camp.detail.tabs![1].id = "groups"; }, "tabs[].id: contains duplicate values"],
    ["reserved intro id", (camp) => { camp.detail.tabs![0].id = "intro"; }, "intro is reserved"],
    ["invalid tab id", (camp) => { camp.detail.tabs![0].id = "Groups"; }, "must use lowercase letters"],
    ["empty tab label", (camp) => { camp.detail.tabs![0].navLabel = " "; }, "navLabel: must be a non-empty string"],
    ["empty tab sections", (camp) => { camp.detail.tabs![0].sections = []; }, "sections: must be a non-empty array"],
    ["duplicate section ids", (camp) => {
      camp.detail.tabs![0].sections[1].id = camp.detail.tabs![0].sections[0].id;
    }, "sections[].id: contains duplicate values"],
    ["empty image alt", (camp) => { camp.detail.tabs![0].sections[0].image!.alt = ""; }, "image.alt: must be a non-empty string"],
    ["null image", (camp) => { Object.assign(camp.detail.tabs![0].sections[0], { image: null }); }, "image: must be an object"],
    ["unknown intro mode", (camp) => { Object.assign(camp.detail, { introMode: "unknown" }); }, "introMode: must be tab or shared"],
    ["shared introduction without tabs", (camp) => {
      camp.detail.introMode = "shared";
      delete camp.detail.tabs;
    }, "introMode: shared requires tabs"],
  ])("rejects %s with a content error", async (_name, mutate, error) => {
    const camp: CampFixture = structuredClone(rawCamp);
    mutate(camp);
    vi.resetModules();
    vi.doMock("../../../content/activities/events/smart-ee-camp.json", () => ({ default: camp }));

    await expect(import("./activityRepository")).rejects.toThrow(error);
  });

  it.each(["tab", "shared"] as const)("accepts %s introduction mode and sections without images", async (introMode) => {
    const camp: CampFixture = structuredClone(rawCamp);
    camp.detail.introMode = introMode;
    delete camp.detail.tabs![0].sections[0].image;
    vi.resetModules();
    vi.doMock("../../../content/activities/events/smart-ee-camp.json", () => ({ default: camp }));
    const { activities } = await import("./activityRepository");
    const parsedCamp = activities.find((activity) => activity.id === "smart-ee-camp")!;
    expect(parsedCamp.detail?.introMode).toBe(introMode);
    expect(parsedCamp.detail?.tabs?.[0].sections[0].image).toBeUndefined();
  });
});
