import { otherActivities } from "./otherActivities";
import { activities } from "./activities";

const publicImagePaths = new Set(
  Object.keys(import.meta.glob("../../../../public/activities/other/*.webp"))
    .map((path) => path.replace("../../../../public", "")),
);

describe("other activities content", () => {
  it("derives the seven album entries from the same published activity JSON in their original order", () => {
    expect(otherActivities.map((item) => item.title)).toEqual(["選課大會", "破冰大會", "分家大會", "新生晚會", "宿營", "系烤", "小畢典"]);
    for (const item of otherActivities) {
      const activity = activities.find((activity) => activity.id === item.id)!;
      expect(activity.categoryId).toBe("other");
      expect(item.intro).toEqual(activity.detail?.intro);
      expect(item.photos).toEqual(activity.album?.photos);
      expect(item.cover).toEqual(activity.album?.cover);
      expect(activity.detail?.heroImages).toEqual(item.photos.slice(0, 2));
    }
    expect(otherActivities.find((item) => item.id === "freshman-camp")?.groups).toHaveLength(5);
    expect(activities.find((item) => item.id === "freshman-camp")?.detail?.sections.map((section) => section.title))
      .toEqual(["活動組", "美宣組", "公關組", "場控組", "生活組"]);
  });

  it("retains existing local images, descriptive alt text and slide image fit", () => {
    for (const item of otherActivities) {
      for (const image of [item.cover, ...item.photos, ...(item.groups?.map((group) => group.image) ?? [])]) {
        expect(publicImagePaths.has(image.src), image.src).toBe(true);
        expect(image.alt.trim().length).toBeGreaterThan(5);
      }
      expect(item.intro.join(" ")).not.toMatch(/2024|2025|三天兩夜|免費宵夜/);
    }
    expect(otherActivities[0].cover.fit).toBe("contain");
  });
});
