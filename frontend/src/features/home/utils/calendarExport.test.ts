import type { CalendarEvent } from "../homeTypes";
import { createCalendarFile, googleCalendarEventUrl } from "./calendarExport";

const event: CalendarEvent = {
  id: "test-event", title: "活動，交流;分享", date: "2026-12-31",
  categoryId: "other", category: "其他活動", summary: "活動摘要",
  details: "第一段介紹\n第二段介紹，歡迎參加;一起交流\\分享", location: "工程四館，101;教室",
};

it("prefills Google Calendar with the activity date, description, location and detail URL", () => {
  const url = new URL(googleCalendarEventUrl(event));
  expect(url.searchParams.get("text")).toBe(event.title);
  expect(url.searchParams.get("dates")).toBe("20261231/20270101");
  expect(url.searchParams.get("location")).toBe(event.location);
  expect(url.searchParams.get("details")).toContain(event.details);
  expect(url.searchParams.get("details")).toContain(`${window.location.origin}/#/activities/test-event`);
  expect(url.searchParams.get("ctz")).toBe("Asia/Taipei");
});

it("exports all activities with escaped text, folded UTF-8 lines and exclusive all-day end dates", () => {
  const file = createCalendarFile([event, { ...event, id: "leap-day", date: "2028-02-29", details: "中文活動介紹".repeat(40) }]);
  const unfolded = file.replace(/\r\n /g, "");
  expect(unfolded.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(unfolded).toContain("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101");
  expect(unfolded).toContain("DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301");
  expect(unfolded).toContain("SUMMARY:活動，交流\\;分享");
  expect(unfolded).toContain("LOCATION:工程四館，101\\;教室");
  expect(unfolded).toContain("第二段介紹，歡迎參加\\;一起交流\\\\分享");
  expect(unfolded).toContain("CATEGORIES:其他活動");
  expect(unfolded).toContain(`URL:${window.location.origin}/#/activities/test-event`);
  expect(unfolded).toContain("中文活動介紹".repeat(40));
  for (const line of file.split("\r\n")) {
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  }
});

it("keeps a stable UID when an activity date or title changes and omits unknown locations", () => {
  const original = createCalendarFile([event]);
  const updated = createCalendarFile([{ ...event, title: "更新名稱", date: "2027-01-15", location: undefined }]);
  expect(original.match(/UID:.+/)?.[0]).toBe(updated.match(/UID:.+/)?.[0]);
  expect(updated).not.toContain("LOCATION:");
  expect(new URL(googleCalendarEventUrl({ ...event, location: undefined })).searchParams.has("location")).toBe(false);
});

it.each([
  ["2026-09-28", "2026-09-30", "20260928/20261001"],
  ["2026-12-31", "2027-01-02", "20261231/20270103"],
  ["2028-02-28", "2028-02-29", "20280228/20280301"],
  ["2026-09-28", "2026-09-28", "20260928/20260929"],
])("exports the inclusive range %s to %s as one all-day event", (date, endDate, expectedDates) => {
  const rangeEvent = { ...event, date, endDate };
  expect(new URL(googleCalendarEventUrl(rangeEvent)).searchParams.get("dates")).toBe(expectedDates);
  const [start, end] = expectedDates.split("/");
  const file = createCalendarFile([rangeEvent]).replace(/\r\n /g, "");
  expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(file).toContain(`DTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}`);
});
