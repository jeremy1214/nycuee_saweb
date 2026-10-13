import rawCamp from "../../../content/activities/events/smart-ee-camp.json";

type CampFixture = typeof rawCamp;

afterEach(() => {
  vi.doUnmock("../../../content/activities/events/smart-ee-camp.json");
  vi.resetModules();
});

describe("activity tab validation", () => {
  it.each<[string, (camp: CampFixture) => void, string]>([
    ["empty tabs", (camp) => { camp.detail.tabs = []; }, "tabs: must be a non-empty array"],
    ["duplicate tab ids", (camp) => { camp.detail.tabs[1].id = "groups"; }, "tabs[].id: contains duplicate values"],
    ["reserved intro id", (camp) => { camp.detail.tabs[0].id = "intro"; }, "intro is reserved"],
    ["invalid tab id", (camp) => { camp.detail.tabs[0].id = "Groups"; }, "must use lowercase letters"],
    ["empty tab label", (camp) => { camp.detail.tabs[0].navLabel = " "; }, "navLabel: must be a non-empty string"],
    ["empty tab sections", (camp) => { camp.detail.tabs[0].sections = []; }, "sections: must be a non-empty array"],
    ["duplicate section ids", (camp) => {
      camp.detail.tabs[0].sections[1].id = camp.detail.tabs[0].sections[0].id;
    }, "sections[].id: contains duplicate values"],
    ["empty image alt", (camp) => { camp.detail.tabs[0].sections[0].image.alt = ""; }, "image.alt: must be a non-empty string"],
  ])("rejects %s with a content error", async (_name, mutate, error) => {
    const camp = structuredClone(rawCamp);
    mutate(camp);
    vi.resetModules();
    vi.doMock("../../../content/activities/events/smart-ee-camp.json", () => ({ default: camp }));

    await expect(import("./activityRepository")).rejects.toThrow(error);
  });
});
