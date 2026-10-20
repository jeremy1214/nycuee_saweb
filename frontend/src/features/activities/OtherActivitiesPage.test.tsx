import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OtherActivitiesPage from "./OtherActivitiesPage";

function renderPage() {
  return render(<MemoryRouter><OtherActivitiesPage /></MemoryRouter>);
}
function choose(title: string) {
  fireEvent.click(within(screen.getByRole("navigation", { name: "選擇其他活動" })).getByRole("button", { name: new RegExp(title) }));
}
function story(title: string) {
  return screen.getByRole("article", { name: title });
}

describe("OtherActivitiesPage", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("shows seven activities and at most five visible cards, with the first story selected", () => {
    const view = renderPage();
    expect(screen.getByRole("heading", { name: "其他活動" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "選擇其他活動" })).getAllByRole("button")).toHaveLength(7);
    expect(screen.getAllByRole("button", { name: /^選擇/ })).toHaveLength(5);
    expect(story("選課大會")).toBeInTheDocument();
    expect(view.container.querySelectorAll('.activity-album-card[aria-hidden="true"]')).toHaveLength(2);
    view.container.querySelectorAll('.activity-album-card[aria-hidden="true"]').forEach((card) => expect(card).toHaveAttribute("tabindex", "-1"));
    expect(within(story("選課大會")).getAllByRole("img")).toHaveLength(2);
  });

  it("switches the story and group photos without scrolling or retaining the previous content", () => {
    renderPage();
    vi.mocked(window.scrollTo).mockClear();
    choose("宿營");
    expect(within(story("宿營")).getAllByRole("heading", { level: 4 })).toHaveLength(5);
    expect(within(story("宿營")).getAllByRole("img")).toHaveLength(7);
    choose("小畢典");
    expect(within(story("小畢典")).queryByRole("heading", { level: 4 })).not.toBeInTheDocument();
    expect(within(story("小畢典")).queryByText("生活組")).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "宿營" })).not.toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("wraps arrows and switches using side cards and the keyboard", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "上一個活動" }));
    expect(story("小畢典")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一個活動" }));
    expect(story("選課大會")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "選擇破冰大會" }));
    expect(story("破冰大會")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("region", { name: "其他活動相簿" }), { key: "ArrowRight" });
    expect(story("分家大會")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "活動照片，使用左右方向鍵切換" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("region", { name: "其他活動相簿" }), { key: "ArrowLeft" });
    expect(story("破冰大會")).toBeInTheDocument();
    for (let index = 0; index < 5; index++) {
      fireEvent.keyDown(screen.getByRole("group", { name: "活動照片，使用左右方向鍵切換" }), { key: "ArrowRight" });
    }
    expect(story("小畢典")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "活動照片，使用左右方向鍵切換" })).toHaveFocus();
  });

  it("swipes horizontally but does not treat vertical scrolling or cancelled gestures as a selection", () => {
    const view = renderPage();
    const stage = view.container.querySelector(".activity-album-stage")!;
    fireEvent.touchStart(stage, { touches: [{ clientX: 250, clientY: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 120, clientY: 110 }] });
    expect(story("破冰大會")).toBeInTheDocument();
    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 180, clientY: 300 }] });
    expect(story("破冰大會")).toBeInTheDocument();
    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchCancel(stage);
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 220, clientY: 100 }] });
    expect(story("破冰大會")).toBeInTheDocument();
    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 220, clientY: 105 }] });
    expect(story("選課大會")).toBeInTheDocument();
  });

  it("automatically rotates every six seconds and loops through all seven activities", () => {
    vi.useFakeTimers();
    const view = renderPage();
    for (const title of ["破冰大會", "分家大會", "新生晚會", "宿營", "系烤", "小畢典", "選課大會"]) {
      act(() => vi.advanceTimersByTime(6000));
      expect(story(title)).toBeInTheDocument();
    }
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses while hovered or reading, and manual selection stays paused until play is pressed", () => {
    vi.useFakeTimers();
    const view = renderPage();
    const stage = view.container.querySelector(".activity-album-stage")!;
    fireEvent.mouseEnter(stage);
    act(() => vi.advanceTimersByTime(12000));
    expect(story("選課大會")).toBeInTheDocument();
    fireEvent.mouseLeave(stage);
    fireEvent.focus(story("選課大會"));
    act(() => vi.advanceTimersByTime(12000));
    expect(story("選課大會")).toBeInTheDocument();
    fireEvent.blur(story("選課大會"));
    act(() => vi.advanceTimersByTime(6000));
    expect(story("破冰大會")).toBeInTheDocument();
    choose("系烤");
    act(() => vi.advanceTimersByTime(12000));
    expect(story("系烤")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "播放活動相簿" }));
    act(() => vi.advanceTimersByTime(6000));
    expect(story("小畢典")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "暫停自動播放" }));
    act(() => vi.advanceTimersByTime(6000));
    expect(story("小畢典")).toBeInTheDocument();
    view.unmount();
  });

  it("stops on keyboard focus and honors reduced motion, including preference changes", () => {
    vi.useFakeTimers();
    let change: (() => void) | undefined;
    const media = { matches: true, addEventListener: vi.fn((_name: string, listener: () => void) => { change = listener; }), removeEventListener: vi.fn() };
    vi.stubGlobal("matchMedia", vi.fn(() => media));
    const view = renderPage();
    expect(screen.getByRole("button", { name: "播放活動相簿" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(12000));
    expect(story("選課大會")).toBeInTheDocument();
    act(() => { media.matches = false; change?.(); });
    act(() => vi.advanceTimersByTime(6000));
    expect(story("破冰大會")).toBeInTheDocument();
    fireEvent.focus(screen.getByRole("button", { name: "下一個活動" }));
    act(() => vi.advanceTimersByTime(12000));
    expect(story("破冰大會")).toBeInTheDocument();
    view.unmount();
    expect(media.removeEventListener).toHaveBeenCalled();
  });
});
