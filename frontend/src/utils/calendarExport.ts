import type { CalendarEvent } from "../types";

export const googleCalendarImportUrl = "https://calendar.google.com/calendar/u/0/r/settings/export";
const eventDescription = "交大電機行事曆｜此活動為網站示意內容，正式活動時間與報名方式請以系所公告為準。";
const categories = { department: "系所活動", academic: "學術交流" };

function dateRange(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return { start: date.replaceAll("-", ""), end: nextDay.toISOString().slice(0, 10).replaceAll("-", "") };
}

export function googleCalendarEventUrl(event: CalendarEvent) {
  const dates = dateRange(event.date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${dates.start}/${dates.end}`,
    details: `${categories[event.type]}\n${eventDescription}`,
    ctz: "Asia/Taipei",
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}

function escapeText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

// RFC 5545 limits each physical line to 75 UTF-8 octets.
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let output = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      output += "\r\n ";
      bytes = 1;
    }
    output += character;
    bytes += size;
  }
  return output;
}

function eventUid(event: CalendarEvent) {
  let hash = 2166136261;
  for (const character of `${event.date}|${event.title}|${event.type}`) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  }
  return `${event.date}-${(hash >>> 0).toString(16)}@nycuee-saweb.local`;
}

export function createCalendarFile(events: CalendarEvent[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NYCU EE//Department Calendar//ZH-TW",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:交大電機行事曆",
    ...events.flatMap((event) => {
      const dates = dateRange(event.date);
      return [
        "BEGIN:VEVENT",
        `UID:${eventUid(event)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dates.start}`,
        `DTEND;VALUE=DATE:${dates.end}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(eventDescription)}`,
        `CATEGORIES:${escapeText(categories[event.type])}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function downloadCalendar(events: CalendarEvent[]) {
  const blob = new Blob([createCalendarFile(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nycu-ee-calendar.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
