import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EventCalendar, HeroCarousel, NewsSection, QuickLinks } from "../components/HomeSections";
import { Modal, PageContainer } from "../components/SiteChrome";
import type { CalendarEvent } from "../types";
import type { AppOutletContext } from "../App";

export default function HomePage() {
  const { openPlaceholder } = useOutletContext<AppOutletContext>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <>
      <main>
        <PageContainer>
          <HeroCarousel />
          <NewsSection onPlaceholder={openPlaceholder} />
          <QuickLinks onPlaceholder={openPlaceholder} />
          <EventCalendar onEvent={setSelectedEvent} />
        </PageContainer>
      </main>
      <Modal open={selectedEvent !== null} title={selectedEvent?.title ?? "活動資訊"} onClose={() => setSelectedEvent(null)}>
        <p className="dialog-copy">{selectedEvent?.date}｜此活動為月曆版面示意，正式活動時間與報名方式請以系所公告為準。</p>
      </Modal>
    </>
  );
}
