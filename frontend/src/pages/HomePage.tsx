import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { EventCalendar, HeroCarousel, NewsSection, QuickLinks } from "../components/HomeSections";
import { Modal, PageContainer } from "../components/SiteChrome";
import { AddToGoogleCalendar } from "../components/CalendarImport";
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
          <QuickLinks />
          <EventCalendar onEvent={setSelectedEvent} />
        </PageContainer>
      </main>
      <Modal open={selectedEvent !== null} title={selectedEvent?.title ?? "活動資訊"} onClose={() => setSelectedEvent(null)}>
        <p className="dialog-copy">{selectedEvent?.date}｜此活動為月曆版面示意，正式活動時間與報名方式請以系所公告為準。</p>
        {selectedEvent && <>
          <AddToGoogleCalendar event={selectedEvent} />
          <p className="calendar-event-import-note">將開啟 Google 日曆，確認後按「儲存」即可加入。活動目前會以全天顯示。</p>
        </>}
      </Modal>
    </>
  );
}
