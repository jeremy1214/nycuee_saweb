import { useEffect, useState } from "react";
import { EventCalendar, HeroCarousel, RecentActivitiesSection, QuickLinks } from "./components/index";
import { Modal, PageContainer } from "../../shared/components/index";
import { HomeHero } from "./components/HomeHero";
import { HomeAbout } from "./components/HomeAbout";
import { AddToGoogleCalendar } from "./components/CalendarImport";
import type { CalendarEvent } from "./homeTypes";

import "./home.css";

export default function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !window.IntersectionObserver) return;
    const sections = document.querySelectorAll<HTMLElement>(".home-page [data-home-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    sections.forEach((section) => {
      section.classList.add("will-reveal");
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <main className="home-page">
        <HomeHero />
        <PageContainer>
          <HomeAbout />
          <QuickLinks />
          <RecentActivitiesSection />
          <HeroCarousel />
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
