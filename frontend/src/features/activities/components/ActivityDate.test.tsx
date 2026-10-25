import { render, screen } from "@testing-library/react";
import { ActivityDate } from "./ActivityDate";

it("renders real time elements for both inclusive dates across a year boundary", () => {
  render(<ActivityDate activity={{ date: "2026-12-31", endDate: "2027-01-02" }} />);
  expect(screen.getAllByRole("time").map((time) => time.getAttribute("datetime")))
    .toEqual(["2026-12-31", "2027-01-02"]);
  expect(screen.getByText("2026.12.31")).toBeVisible();
  expect(screen.getByText("2027.01.02")).toBeVisible();
});

it.each([undefined, "2026-09-28"])("displays one date when the end date is %s", (endDate) => {
  render(<ActivityDate activity={{ date: "2026-09-28", endDate }} />);
  expect(screen.getAllByRole("time")).toHaveLength(1);
  expect(screen.getByText("2026.09.28")).toBeVisible();
});

it("omits dates when the activity is undated", () => {
  const { container } = render(<ActivityDate activity={{}} />);
  expect(container).toBeEmptyDOMElement();
});
