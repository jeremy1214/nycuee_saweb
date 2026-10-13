import { otherActivities, parseOtherActivities } from "./otherActivities";
import { activities } from "./activities";

const publicImagePaths = new Set(
  Object.keys(import.meta.glob("../../../../public/activities/other/*.webp"))
    .map((path) => path.replace("../../../../public", "")),
);

describe("other activities content", () => {
  it("contains the eight requested evergreen activities in order, separate from the upcoming feed", () => {
    expect(otherActivities.map((item) => item.title)).toEqual(["選課大會", "破冰大會", "分家大會", "新生晚會", "宿營", "系烤", "抓馬盃", "小畢典"]);
    for (const item of otherActivities) {
      expect(activities.some((activity) => activity.id === item.id)).toBe(false);
      expect(item).not.toHaveProperty("date");
    }
    expect(otherActivities.find((item) => item.id === "freshman-camp")?.groups).toHaveLength(5);
    expect(otherActivities.find((item) => item.id === "drama")?.groups).toHaveLength(4);
  });

  it("has existing local images, descriptive alt text, and no obsolete dates or copied camp text in drama", () => {
    for (const item of otherActivities) {
      for (const image of [item.cover, ...item.photos, ...(item.groups?.map((group) => group.image) ?? [])]) {
        expect(publicImagePaths.has(image.src), image.src).toBe(true);
        expect(image.alt.trim().length).toBeGreaterThan(5);
      }
      expect(item.intro.join(" ")).not.toMatch(/2024|2025|三天兩夜|免費宵夜/);
    }
    expect(otherActivities.find((item) => item.id === "drama")?.intro.join(" ")).not.toContain("營隊");
    expect(otherActivities[0].cover.fit).toBe("contain");
  });

  it("rejects duplicate IDs, missing introductions, empty photos, malformed groups and invalid image metadata", () => {
    expect(() => parseOtherActivities([otherActivities[0], otherActivities[0]])).toThrow("activities[].id");
    for (const change of [{ id: "INVALID" }, { intro: [] }, { photos: [] }, { cover: { ...otherActivities[0].cover, alt: "" } }, { cover: { ...otherActivities[0].cover, fit: "stretch" } }, { cover: { ...otherActivities[0].cover, src: "https://example.com/a.jpg" } }]) {
      expect(() => parseOtherActivities([{ ...otherActivities[0], ...change }])).toThrow("[other activity content]");
    }
    const camp = otherActivities.find((item) => item.id === "freshman-camp")!;
    expect(() => parseOtherActivities([{ ...camp, groups: [camp.groups![0], camp.groups![0]] }])).toThrow("groups[].id");
  });
});
