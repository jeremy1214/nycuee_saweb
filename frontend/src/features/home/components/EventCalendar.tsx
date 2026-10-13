import { useMemo, useState } from "react";
import { SectionHeading } from "../../../shared/components/index";
import type { CalendarEvent } from "../homeTypes";
import { calendarEvents } from "../data/home";
import CalendarImport from "./CalendarImport";

export function EventCalendar({ onEvent }: { onEvent: (event: CalendarEvent) => void }) {
  const today = new Date(2026, 9, 10);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const formatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" });

  function changeMonth(offset: number) {
    setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  }

  return (
    <section className="calendar-section" id="calendar">
      <SectionHeading eyebrow="UPCOMING EVENTS" title="電機行事曆" action={
        <div className="calendar-header-actions">
          <span className="calendar-note">示意活動 · 正式資訊請見系網</span>
          <CalendarImport events={calendarEvents} />
        </div>
      } />
      <div className="calendar">
        <div className="calendar-toolbar">
          <div className="month-controls">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="上一個月">‹</button>
            <strong aria-live="polite">{formatter.format(viewDate)}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="下一個月">›</button>
            <button className="today-button" type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}>本月</button>
          </div>
          <div className="calendar-legend"><span>系所活動</span><span>學術交流</span></div>
        </div>
        <div className="weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-days">
          {cells.map(({ date, key, outside }) => {
            const event = calendarEvents.find((item) => item.date === key);
            return (
              <div className={`calendar-day ${outside ? "is-outside" : ""} ${key === "2026-10-10" ? "is-today" : ""}`} key={key}>
                <span className="day-number">{date.getDate()}</span>
                {event && <button className={`calendar-event ${event.type}`} type="button" onClick={() => onEvent(event)}>{event.title}</button>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function buildCalendarCells(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const start = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((start + count) / 7);
  return Array.from({ length: rows * 7 }, (_, index) => {
    const date = new Date(year, month, 1 - start + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key, outside: date.getMonth() !== month };
  });
}
