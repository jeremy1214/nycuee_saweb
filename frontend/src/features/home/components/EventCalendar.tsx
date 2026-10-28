import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useActivityContent, ActivityContentStatus } from "../../activities/data/ActivityContentProvider";
import { activityOccursOn, formatActivityDateRange, todayInTaiwan } from "../../activities/data/activityDates";
import { SectionHeading } from "../../../shared/components/index";
import type { CalendarEvent } from "../homeTypes";
import CalendarImport from "./CalendarImport";

export function EventCalendar({ onEvent }: { onEvent: (event: CalendarEvent) => void }) {
  const { activityCategories, calendarEvents, status } = useActivityContent();
  const todayKey = todayInTaiwan();
  const today = new Date(`${todayKey}T00:00:00`);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const formatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" });

  function changeMonth(offset: number) {
    setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  }

  return (
    <section className="calendar-section" id="calendar" aria-label="行事曆" data-home-reveal>
      <SectionHeading eyebrow="UPCOMING EVENTS" title="行事曆" action={
        <div className="calendar-header-actions">
          <CalendarImport events={calendarEvents} />
        </div>
      } />
      {status !== "ready" ? <ActivityContentStatus /> : <div className="calendar">
        <div className="calendar-toolbar">
          <div className="month-controls">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="上一個月">‹</button>
            <strong aria-live="polite">{formatter.format(viewDate)}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="下一個月">›</button>
            <button className="today-button" type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}>本月</button>
          </div>
          <div className="calendar-legend">{activityCategories.map((category) => <span className={`calendar-category-${category.id}`} key={category.id}>{category.label}</span>)}</div>
        </div>
        <div className="weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-days">
          {cells.map(({ date, key, outside }) => {
            const events = calendarEvents.filter((item) => activityOccursOn(item, key));
            return (
              <div className={`calendar-day ${outside ? "is-outside" : ""} ${key === todayKey ? "is-today" : ""}`} key={key}>
                <time className="day-number" dateTime={key} aria-current={key === todayKey ? "date" : undefined}>{date.getDate()}</time>
                {events.map((event) => event.detail ? (
                  <Link className={`calendar-event calendar-category-${event.categoryId}`} key={event.id} to={`/activities/${event.id}`} title={`${event.category}｜${event.title}｜${formatActivityDateRange(event)}`} aria-label={`${event.title}，查看活動詳細頁`}>{event.title}</Link>
                ) : (
                  <button className={`calendar-event calendar-category-${event.categoryId}`} key={event.id} type="button" onClick={() => onEvent(event)} title={`${event.category}｜${event.title}｜${formatActivityDateRange(event)}`} aria-label={`${event.title}，查看活動詳情`}>{event.title}</button>
                ))}
              </div>
            );
          })}
        </div>
      </div>}
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
