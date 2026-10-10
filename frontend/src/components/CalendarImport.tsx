import { useState } from "react";
import { Modal } from "./SiteChrome";
import type { CalendarEvent } from "../types";
import { downloadCalendar, googleCalendarEventUrl, googleCalendarImportUrl } from "../utils/calendarExport";
import styles from "./CalendarImport.module.css";

function CalendarIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-9 3v5m-2-2h4" /></svg>;
}

export function AddToGoogleCalendar({ event }: { event: CalendarEvent }) {
  return <a className={styles.primaryButton} href={googleCalendarEventUrl(event)} target="_blank" rel="noopener noreferrer"><CalendarIcon />加入 Google 日曆<span aria-hidden="true">↗</span></a>;
}

export default function CalendarImport({ events }: { events: CalendarEvent[] }) {
  const [open, setOpen] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  return <>
    <button type="button" className={styles.primaryButton} disabled={events.length === 0} onClick={() => { setDownloadStarted(false); setOpen(true); }}>
      <CalendarIcon />匯入 Google 日曆
    </button>
    <Modal open={open} title="匯入 Google 日曆" onClose={() => setOpen(false)}>
      <p className={styles.intro}>將電機行事曆的全部 {events.length} 筆活動加入你的 Google 日曆。</p>
      <ol className={styles.steps}>
        <li><strong>下載活動檔案</strong><span>點擊下方按鈕，下載 nycu-ee-calendar.ics。</span></li>
        <li><strong>開啟 Google 日曆匯入頁面</strong><span>登入你的 Google 帳號，點選「從電腦中選取檔案」，選擇剛下載的檔案。</span></li>
        <li><strong>選擇日曆並匯入</strong><span>選擇要加入的日曆，再點擊 Google 頁面上的「匯入」。</span></li>
      </ol>
      <div className={styles.actions}>
        <button className={styles.primaryButton} type="button" onClick={() => { downloadCalendar(events); setDownloadStarted(true); }}><CalendarIcon />下載全部活動</button>
        <a className={styles.secondaryButton} href={googleCalendarImportUrl} target="_blank" rel="noopener noreferrer">開啟 Google 匯入頁面<span aria-hidden="true">↗</span></a>
      </div>
      <p className={styles.downloadStatus} role="status">{downloadStarted ? "已開始下載。接著開啟 Google 匯入頁面，選取下載的檔案。" : ""}</p>
      <div className={styles.note}>
        <p>批次匯入請使用電腦版 Google 日曆。手機可點選月曆中的活動，再按「加入 Google 日曆」。</p>
        <p>目前活動為示意資料，匯入後會顯示為全天活動。這次匯入不會自動同步後續更新。</p>
        <a href="https://support.google.com/calendar/answer/37118?hl=zh-Hant" target="_blank" rel="noopener noreferrer">Google 官方匯入說明 ↗</a>
      </div>
    </Modal>
  </>;
}
