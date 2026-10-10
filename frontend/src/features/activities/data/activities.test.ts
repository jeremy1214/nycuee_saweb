import { activities, activityCategories } from "./activities";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("activity data", () => {
  it("uses unique, URL-safe activity ids and valid categories", () => {
    const ids = activities.map((activity) => activity.id);
    const categoryIds = new Set(activityCategories.map((category) => category.id));

    expect(new Set(ids).size).toBe(ids.length);
    activities.forEach((activity) => {
      expect(activity.id).toMatch(slugPattern);
      expect(activity.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
      const sectionIds = detail.sections.map((section) => section.id);
      const images = [
        ...detail.heroImages,
        ...detail.sections.map((section) => section.image),
      ];

      expect(new Set(sectionIds).size).toBe(sectionIds.length);
      detail.sections.forEach((section) => {
        expect(section.id).toMatch(slugPattern);
        expect(section.navLabel.trim()).not.toBe("");
        expect(section.title.trim()).not.toBe("");
        expect(section.paragraphs.length).toBeGreaterThan(0);
      });
      images.forEach((image) => {
        expect(image.src).toMatch(/^\//);
        expect(image.alt.trim()).not.toBe("");
      });
    });
  });
});
