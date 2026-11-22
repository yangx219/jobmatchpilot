import { screen } from "@testing-library/react";
import { renderInEnglish as render } from "./helpers/render-English";
import userEvent from "@testing-library/user-event";
import ActivityCalendar from "@/components/dashboard/ActivityCalendar";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@nivo/calendar", () => ({
  ResponsiveCalendar: (props: any) => (
    <div data-testid="calendar" data-from={props.from} data-to={props.to}>
      {props.data.map((d: any) => (
        <div key={d.day} data-testid={`day-${d.day}`}>
          {props.tooltip(d)}
        </div>
      ))}
    </div>
  ),
}));

describe("ActivityCalendar", () => {
  const user = userEvent.setup();

  const dataByYear = {
    "2025": [{ day: "2025-03-01", value: 1, hours: 1 }],
    "2026": [{ day: "2026-06-15", value: 2, hours: 2.5 }],
  };
  const years = ["2025", "2026"];

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  it("defaults to the most recent year and shows its data", () => {
    render(<ActivityCalendar years={years} dataByYear={dataByYear} />);

    expect(screen.getByText("Activity Calendar")).toBeInTheDocument();
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-from", "2026-01-01");
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-to", "2026-12-31");
    expect(screen.getByLabelText("Select year")).toHaveTextContent("2026");
    expect(screen.getByTestId("day-2026-06-15")).toBeInTheDocument();
    expect(screen.queryByTestId("day-2025-03-01")).not.toBeInTheDocument();
  });

  it("lists every year as a select option", async () => {
    render(<ActivityCalendar years={years} dataByYear={dataByYear} />);

    await user.click(screen.getByLabelText("Select year"));

    expect(screen.getByRole("option", { name: "2025" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2026" })).toBeInTheDocument();
  });

  it("switches the calendar data when a different year is selected", async () => {
    render(<ActivityCalendar years={years} dataByYear={dataByYear} />);

    await user.click(screen.getByLabelText("Select year"));
    await user.click(screen.getByRole("option", { name: "2025" }));

    expect(screen.getByLabelText("Select year")).toHaveTextContent("2025");
    expect(screen.getByTestId("day-2025-03-01")).toBeInTheDocument();
    expect(screen.queryByTestId("day-2026-06-15")).not.toBeInTheDocument();
  });

  it("shows the actual job and hour totals in localized tooltips", () => {
    render(
      <ActivityCalendar
        years={["2026"]}
        dataByYear={{
          "2026": [
            { day: "2026-01-01", value: 1, hours: 1 },
            { day: "2026-01-02", value: 2, hours: 2.5 },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("day-2026-01-01")).toHaveTextContent(
      "Jobs applied: 1",
    );
    expect(screen.getByTestId("day-2026-01-01")).toHaveTextContent(
      "Activity: 1 h",
    );
    expect(screen.getByTestId("day-2026-01-02")).toHaveTextContent(
      "Jobs applied: 2",
    );
    expect(screen.getByTestId("day-2026-01-02")).toHaveTextContent(
      "Activity: 2.5 h",
    );
  });
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
