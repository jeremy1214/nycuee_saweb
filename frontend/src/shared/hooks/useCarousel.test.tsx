import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useCarousel } from "./useCarousel";

function Carousel({ pauseOnHover, autoplayEnabled }: { pauseOnHover?: boolean; autoplayEnabled?: boolean }) {
  const { current, handlers } = useCarousel(3, 5000, { pauseOnHover, autoplayEnabled });
  return <section aria-label="Test carousel" {...handlers}><output aria-label="Current slide">{current}</output><button>Focus</button></section>;
}

describe("carousel playback options", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("preserves hover and focus pauses for existing callers", () => {
    render(<Carousel />);
    const carousel = screen.getByRole("region", { name: "Test carousel" });
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByLabelText("Current slide")).toHaveTextContent("0");
    fireEvent.focus(screen.getByRole("button"));
    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByLabelText("Current slide")).toHaveTextContent("0");
    fireEvent.blur(screen.getByRole("button"), { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByLabelText("Current slide")).toHaveTextContent("1");
  });

  it("cancels pending autoplay and restarts the full interval when enabled", () => {
    const view = render(<Carousel />);
    act(() => vi.advanceTimersByTime(4500));
    view.rerender(<Carousel autoplayEnabled={false} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByLabelText("Current slide")).toHaveTextContent("0");
    view.rerender(<Carousel autoplayEnabled />);
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByLabelText("Current slide")).toHaveTextContent("0");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByLabelText("Current slide")).toHaveTextContent("1");
  });
});
