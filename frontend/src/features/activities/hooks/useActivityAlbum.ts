import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type TouchEvent } from "react";

export function useActivityAlbum(count: number, initialIndex = 0) {
  const [current, setCurrent] = useState(initialIndex);
  const [playing, setPlaying] = useState(initialIndex === 0);
  const [hovered, setHovered] = useState(false);
  const [reading, setReading] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const rotating = playing && !hovered && !reading && !hidden && !reducedMotion && count > 1;

  useEffect(() => {
    setCurrent(initialIndex);
    if (initialIndex !== 0) setPlaying(false);
  }, [initialIndex, count]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media?.matches ?? false);
    const visibility = () => setHidden(document.hidden);
    media?.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setCurrent((index) => (index + 1) % count), 6000);
    return () => window.clearTimeout(timer);
  }, [current, count, rotating]);

  function select(index: number) {
    setPlaying(false);
    if (count > 0) setCurrent(((index % count) + count) % count);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select(current + (event.key === "ArrowLeft" ? -1 : 1));
    // Keep focus on a stable surface when the previously selected card moves out of view.
    event.currentTarget.querySelector<HTMLElement>(".activity-album-stage")?.focus({ preventScroll: true });
  }

  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
  const readingHandlers = {
    ...hoverHandlers,
    onFocus: () => setReading(true),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setReading(false);
    },
  };
  const touchHandlers = {
    onTouchStart: (event: TouchEvent<HTMLElement>) => {
      if (event.touches.length !== 1) { touchStart.current = null; return; }
      touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      setPlaying(false);
    },
    onTouchEnd: (event: TouchEvent<HTMLElement>) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) select(current + (dx < 0 ? 1 : -1));
    },
    onTouchCancel: () => { touchStart.current = null; },
  };

  return {
    current: count ? Math.min(current, count - 1) : 0, select, playing: playing && !reducedMotion, rotating, reducedMotion,
    togglePlaying: () => setPlaying((value) => !value),
    pause: () => setPlaying(false),
    hoverHandlers, readingHandlers, touchHandlers, onKeyDown,
  };
}
