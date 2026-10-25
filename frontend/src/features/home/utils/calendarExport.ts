import type { CalendarEvent } from "../homeTypes";
import { activityEndDate } from "../../activities/data/activityDates";

export const googleCalendarImportUrl = "https://calendar.google.com/calendar/u/0/r/settings/export";
function activityUrl(event: CalendarEvent) {
  return new URL(`#/activities/${event.id}`, window.location.href).href;
}

function eventDescription(event: CalendarEvent) {
  return `${event.category}\n${event.details}\n\n活動詳情：${activityUrl(event)}`;
}

function dateRange(event: CalendarEvent) {
  const [year, month, day] = activityEndDate(event).split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return { start: event.date.replaceAll("-", ""), end: nextDay.toISOString().slice(0, 10).replaceAll("-", "") };
}

export function googleCalendarEventUrl(event: CalendarEvent) {
  const dates = dateRange(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${dates.start}/${dates.end}`,
    details: eventDescription(event),
    ...(event.location ? { location: event.location } : {}),
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
  return `${event.id}@nycuee-saweb.local`;
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
      const dates = dateRange(event);
      return [
        "BEGIN:VEVENT",
        `UID:${eventUid(event)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dates.start}`,
        `DTEND;VALUE=DATE:${dates.end}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(eventDescription(event))}`,
        `CATEGORIES:${escapeText(event.category)}`,
        ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
        `URL:${activityUrl(event)}`,
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
