import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomeHero } from "./HomeHero";
import { slides } from "../data/home";

describe("homepage hero motion", () => {
  let notifyIntersection: (entries: { isIntersecting: boolean }[]) => void;
  let media: EventTarget & { matches: boolean };
  const disconnect = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    disconnect.mockClear();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof notifyIntersection) { notifyIntersection = callback; }
      observe = vi.fn();
      disconnect = disconnect;
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mount() {
    const view = render(<MemoryRouter><HomeHero /></MemoryRouter>);
    const hero = screen.getByRole("region", { name: "交大電機首頁主視覺" });
    act(() => notifyIntersection([{ isIntersecting: true }]));
    return { ...view, hero };
  }

  function expectTitle(index: number) {
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(`從交大電機出發，${slides[index].title}`);
  }

  it("keeps the complete accessible title and cycles all six titles while hovered", () => {
    const { hero } = mount();
    fireEvent.mouseEnter(hero);
    expectTitle(0);
    act(() => vi.advanceTimersByTime(4799));
    expectTitle(0);
    act(() => vi.advanceTimersByTime(1));
    expectTitle(1);
    for (let index = 2; index <= slides.length; index++) {
      act(() => vi.advanceTimersByTime(4800));
      expectTitle(index % slides.length);
    }
    expect(hero).toHaveAttribute("data-motion-paused", "false");
  });

  it("pauses switching on keyboard focus without pausing the visual animation", () => {
    const { hero } = mount();
    const link = screen.getByRole("link", { name: /探索交大電機/ });
    fireEvent.focus(link);
    act(() => vi.advanceTimersByTime(15000));
    expectTitle(0);
    expect(hero).toHaveAttribute("data-motion-paused", "false");
    fireEvent.blur(link, { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(4800));
    expectTitle(1);
  });

  it("stops outside the viewport and resumes with a fresh interval", () => {
    const { hero, unmount } = mount();
    act(() => vi.advanceTimersByTime(4000));
    act(() => notifyIntersection([{ isIntersecting: false }]));
    expect(hero).toHaveAttribute("data-motion-paused", "true");
    act(() => vi.advanceTimersByTime(30000));
    expectTitle(0);
    act(() => notifyIntersection([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(4799));
    expectTitle(0);
    act(() => vi.advanceTimersByTime(1));
    expectTitle(1);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not resume in a hidden tab even when the viewport observer fires", () => {
    const { hero } = mount();
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    act(() => notifyIntersection([{ isIntersecting: true }]));
    act(() => vi.advanceTimersByTime(30000));
    expectTitle(0);
    expect(hero).toHaveAttribute("data-motion-paused", "true");
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(4799));
    expectTitle(0);
    act(() => vi.advanceTimersByTime(1));
    expectTitle(1);
  });

  it("honors reduced motion on mount and when the preference changes", () => {
    media.matches = true;
    mount();
    act(() => vi.advanceTimersByTime(10000));
    expectTitle(0);
    act(() => { media.matches = false; media.dispatchEvent(new Event("change")); });
    act(() => vi.advanceTimersByTime(4800));
    expectTitle(1);
    act(() => { media.matches = true; media.dispatchEvent(new Event("change")); });
    act(() => vi.advanceTimersByTime(10000));
    expectTitle(1);
  });

  it("still rotates without IntersectionObserver support", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<MemoryRouter><HomeHero /></MemoryRouter>);
    act(() => vi.advanceTimersByTime(4800));
    expectTitle(1);
  });
});
