import rawCategories from "../../../content/resources/categories.json";
import { createResourceRepository } from "./resourceContent";
import { defaultResourceSlug, resourceCategories, resourceOrder } from "./resources";
import { expandedResourceFixture, resourceFixture, type ResourceFixture } from "./__fixtures__/resources";

describe("resource content repository", () => {
  it("loads every published JSON file in configured order and validates the default", () => {
    const modules = import.meta.glob("../../../content/resources/pages/*.json", { eager: true, import: "default" });
    const repo = createResourceRepository(rawCategories, modules);
    expect(resourceOrder).toEqual(repo.resourceOrder);
    expect(resourceCategories).toEqual(repo.resourceCategories);
    expect(defaultResourceSlug).toBe(rawCategories.defaultCategory);
    expect(resourceOrder).toContain(defaultResourceSlug);
  });

  it("supports an additional category, ordered repeatable sections, four links and publication filtering", () => {
    const { config, modules } = expandedResourceFixture();
    config.categories.reverse();
    const repo = createResourceRepository(config, modules);
    expect(repo.defaultResourceSlug).toBe("additional");
    expect(repo.resourceOrder).toEqual(["additional", "graduate", "exchange", "scholarships", "courses"]);
    expect(repo.resourceCategories.additional.links).toHaveLength(4);
    expect(repo.resourceCategories.additional.sections.map((section) => section.type)).toEqual(["checklist", "process", "checklist", "process"]);
    expect(repo.resourceCategories.additional.sections[1].items).toHaveLength(6);
    expect(repo.resourceCategories["draft-category"]).toBeUndefined();
    expect(repo.resourceCategories["archived-category"]).toBeUndefined();
  });

  it.each(["omitted", "empty"])("accepts %s optional sections", (mode) => {
    const { config, modules } = resourceFixture();
    if (mode === "omitted") delete modules["pages/courses.json"].sections;
    else modules["pages/courses.json"].sections = [];
    expect(createResourceRepository(config, modules).resourceCategories.courses.sections).toEqual([]);
  });

  const invalid: [string, (fixture: ResourceFixture) => void, string][] = [
    ["duplicate category ids", ({ config }) => { config.categories[1].id = "courses"; }, "categories[].id: contains duplicate values"],
    ["duplicate labels", ({ config }) => { config.categories[1].label = config.categories[0].label; }, "categories[].label: contains duplicate values"],
    ["invalid slug", ({ config }) => { config.categories[0].id = "Courses"; }, "categories[0].id: must use lowercase"],
    ["empty search description", ({ config }) => { config.categories[0].searchDescription = " "; }, "categories[0].searchDescription: must be a non-empty string"],
    ["missing page", ({ modules }) => { delete modules["pages/courses.json"]; }, 'categories[0].id: missing content file for "courses"'],
    ["unconfigured page", ({ config }) => { config.categories.pop(); }, 'pages/graduate.json.id: references unknown category "graduate"'],
    ["filename mismatch", ({ modules }) => { modules["pages/wrong.json"] = modules["pages/courses.json"]; delete modules["pages/courses.json"]; }, "pages/wrong.json.id: must match the JSON filename"],
    ["duplicate page ids", ({ modules }) => { modules["pages/extra.json"] = structuredClone(modules["pages/courses.json"]); }, 'pages/extra.json.id: duplicate id "courses"'],
    ["invalid status", ({ modules }) => { modules["pages/courses.json"].status = "public"; }, "pages/courses.json.status: must be draft, published, or archived"],
    ["unpublished default", ({ modules }) => { modules["pages/courses.json"].status = "draft"; }, "defaultCategory: must reference a published category"],
    ["unknown default", ({ config }) => { config.defaultCategory = "missing"; }, "defaultCategory: must reference a published category"],
    ["no published category", ({ modules }) => { Object.values(modules).forEach((page) => { page.status = "archived"; }); }, "must contain at least one published category"],
    ["missing links", ({ modules }) => { modules["pages/courses.json"].links = []; }, "pages/courses.json.links: must be a non-empty array"],
    ["empty link label", ({ modules }) => { modules["pages/courses.json"].links[0].label = ""; }, "links[0].label: must be a non-empty string"],
    ["duplicate section ids", ({ modules }) => { modules["pages/courses.json"].sections![1].id = "preparation"; }, "sections[].id: contains duplicate values"],
    ["unknown section type", ({ modules }) => { modules["pages/courses.json"].sections![0].type = "article"; }, "sections[0].type: must be process or checklist"],
    ["empty section", ({ modules }) => { modules["pages/courses.json"].sections![0].items = []; }, "sections[0].items: must be a non-empty array"],
    ["invalid process item", ({ modules }) => { modules["pages/courses.json"].sections![0].items[0] = "text"; }, "sections[0].items[0]: must be an object"],
    ["empty checklist item", ({ modules }) => { modules["pages/courses.json"].sections![1].items[0] = " "; }, "sections[1].items[0]: must be a non-empty string"],
    ["unknown field", ({ modules }) => { Object.assign(modules["pages/courses.json"], { typo: true }); }, "pages/courses.json: contains unknown field(s): typo"],
    ["malformed sections", ({ modules }) => { Object.assign(modules["pages/courses.json"], { sections: null }); }, "pages/courses.json.sections: must be an array"],
  ];
  it.each(invalid)("rejects %s with its source and field", (_name, mutate, message) => {
    const fixture = resourceFixture();
    mutate(fixture);
    expect(() => createResourceRepository(fixture.config, fixture.modules)).toThrow(message);
  });

  it.each(["javascript:alert(1)", "/relative", "ftp://nycu.edu.tw/", "https://", "https://bad host/", " https://nycu.edu.tw/"])("rejects URL %s", (href) => {
    const { config, modules } = resourceFixture();
    modules["pages/courses.json"].links[0].href = href;
    expect(() => createResourceRepository(config, modules)).toThrow("pages/courses.json.links[0].href: must be an absolute HTTP or HTTPS URL");
  });

  it("accepts both HTTP and HTTPS official links", () => {
    const { config, modules } = resourceFixture();
    modules["pages/courses.json"].links[0].href = "http://nycu.edu.tw/";
    expect(createResourceRepository(config, modules).resourceCategories.courses.links[0].href).toBe("http://nycu.edu.tw/");
  });
});
