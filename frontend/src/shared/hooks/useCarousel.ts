import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type TouchEvent } from "react";

export function useCarousel(count: number, interval = 5000) {
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false));
  const touchStart = useRef<number | null>(null);
  const isPaused = hovered || focused || reducedMotion;

  function goTo(index: number) {
    if (count > 0) setCurrent((index + count) % count);
  }
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (isPaused || count < 2) return;
    const timer = window.setTimeout(() => setCurrent((index) => (index + 1) % count), interval);
    return () => window.clearTimeout(timer);
  }, [current, count, interval, isPaused]);

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current + (event.key === "ArrowLeft" ? -1 : 1));
      }
    },
    onTouchStart: (event: TouchEvent<HTMLElement>) => { touchStart.current = event.touches[0].clientX; },
    onTouchEnd: (event: TouchEvent<HTMLElement>) => {
      if (touchStart.current !== null) {
        const distance = event.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(distance) >= 50) goTo(current + (distance < 0 ? 1 : -1));
      }
      touchStart.current = null;
    },
    onTouchCancel: () => { touchStart.current = null; },
  };
  return { current, isPaused, goTo, handlers };
}
