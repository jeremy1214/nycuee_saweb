import { activities, activityCategories } from "./activities";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const publicImagePaths = new Set(
  Object.keys(import.meta.glob("../../../../public/**/*.{jpg,jpeg,png,webp,svg}"))
    .map((path) => path.replace("../../../../public", "")),
);

describe("activity data", () => {
  it("uses unique, URL-safe activity ids and valid categories", () => {
    const ids = activities.map((activity) => activity.id);
    const categoryIds = new Set(activityCategories.map((category) => category.id));

    expect(new Set(ids).size).toBe(ids.length);
    activities.forEach((activity) => {
      expect(activity.id).toMatch(slugPattern);
      if (activity.date !== undefined) expect(activity.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(categoryIds.has(activity.categoryId)).toBe(true);
      expect(activityCategories.find((category) => category.id === activity.categoryId)?.label).toBe(
        activity.category,
      );
    });
  });

  it("maps every featured category to its own published detail page", () => {
    activityCategories.filter((category) => category.featuredActivityId).forEach((category) => {
      const featuredActivity = activities.find((activity) => activity.id === category.featuredActivityId);

      expect(featuredActivity?.categoryId).toBe(category.id);
      expect(featuredActivity?.detail).toBeDefined();
    });
  });

  it("keeps detail sections unique and every image accessible", () => {
    activities.filter((activity) => activity.detail).forEach((activity) => {
      const detail = activity.detail!;
      const sectionCollections = [detail.sections, ...(detail.tabs?.map((tab) => tab.sections) ?? [])];
      const sections = sectionCollections.flat();
      const images = [
        ...detail.heroImages,
        ...sections.flatMap((section) => section.image ? [section.image] : []),
        ...(activity.album ? [activity.album.cover, ...activity.album.photos] : []),
      ];

      sectionCollections.forEach((collection) => {
        const sectionIds = collection.map((section) => section.id);
        expect(new Set(sectionIds).size).toBe(sectionIds.length);
      });
      sections.forEach((section) => {
        expect(section.id).toMatch(slugPattern);
        expect(section.navLabel.trim()).not.toBe("");
        expect(section.title.trim()).not.toBe("");
        expect(section.paragraphs.length).toBeGreaterThan(0);
      });
      images.forEach((image) => {
        expect(image.src).toMatch(/^\//);
        expect(image.alt.trim()).not.toBe("");
        expect(publicImagePaths.has(image.src), `Missing public image: ${image.src}`).toBe(true);
      });
      if (detail.tabs) {
        const tabIds = detail.tabs.map((tab) => tab.id);
        expect(new Set(tabIds).size).toBe(tabIds.length);
        expect(tabIds).not.toContain("intro");
        detail.tabs.forEach((tab) => {
          expect(tab.id).toMatch(slugPattern);
          expect(tab.navLabel.trim()).not.toBe("");
          expect(tab.sections.length).toBeGreaterThan(0);
        });
      }
    });
  });

  it("provides six groups and five practices for the camp", () => {
    const camp = activities.find((activity) => activity.id === "smart-ee-camp")!;
    expect(camp.detail?.tabs?.map((tab) => [tab.id, tab.sections.length])).toEqual([
      ["groups", 6],
      ["practice", 5],
    ]);
    expect(camp.detail?.sections).toEqual([]);
  });

  it("provides the shared introduction and all three EE week pages", () => {
    const week = activities.find((activity) => activity.id === "ee-week-showcase")!;
    expect(week.detail?.introMode).toBe("shared");
    expect(week.detail?.tabs?.map((tab) => [tab.id, tab.sections.length])).toEqual([
      ["groups", 6], ["events", 8], ["performances", 6],
    ]);
    expect(week.detail?.sections).toEqual([]);
  });
});
