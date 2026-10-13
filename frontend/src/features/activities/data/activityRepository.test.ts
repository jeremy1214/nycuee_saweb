import rawCamp from "../../../content/activities/events/smart-ee-camp.json";
import type { ActivityDetail } from "../activityTypes";

type CampFixture = Omit<typeof rawCamp, "detail"> & {
  detail: Omit<ActivityDetail, "heroImages"> & { heroImages: typeof rawCamp.detail.heroImages };
};

afterEach(() => {
  vi.doUnmock("../../../content/activities/events/smart-ee-camp.json");
  vi.resetModules();
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
