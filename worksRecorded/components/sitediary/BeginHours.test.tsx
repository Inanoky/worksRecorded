jest.mock("@/server/actions/begin-hours-actions", () => ({
  getBeginHours: jest.fn(),
  importBeginHours: jest.fn(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { BEGIN_STORAGE_MARKER, type BeginDay } from "@/lib/begin-hours";
import { BeginHoursCost } from "./BeginHours";

const day: BeginDay = {
  kind: BEGIN_STORAGE_MARKER,
  version: 1,
  date: "2026-08-31",
  rateCents: 1250,
  sourceCompany: "Test",
  capturedOn: "2026-09-10",
  importedAt: "2026-09-10T09:00:00Z",
  importedBy: "test",
  objects: ["Site"],
  history: [],
  entries: [
    {
      worker: "Worker",
      date: "2026-08-31",
      start: "07:00",
      end: "22:24",
      minutes: 924,
      object: "Site",
      status: "unapproved",
      comment: "Recorded work",
    },
  ],
};
test("click exposes calculation, status and comment", () => {
  render(<BeginHoursCost day={day} />);
  fireEvent.click(screen.getByRole("button", { name: /Stundas izmaksas/ }));
  expect(screen.getByText(/15h 24m ×/)).toBeInTheDocument();
  expect(screen.getByText(/Neapstiprināts Begin/)).toBeInTheDocument();
  expect(screen.getByText("Recorded work")).toBeInTheDocument();
});
test("hover does not open details and clicking toggles them", () => {
  render(<BeginHoursCost day={day} />);
  fireEvent.mouseEnter(
    screen.getByRole("button", { name: /Stundas izmaksas/ }),
  );
  expect(screen.queryByText(/15h 24m ×/)).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Stundas izmaksas/ }),
  ).toHaveTextContent("Stundas izmaksas: 15h 24m, 192,50");
  fireEvent.click(screen.getByRole("button", { name: /Stundas izmaksas/ }));
  expect(screen.getByText(/15h 24m ×/)).toBeInTheDocument();
  fireEvent.mouseLeave(screen.getByRole("dialog"));
  expect(screen.getByText(/15h 24m ×/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Stundas izmaksas/ }));
  expect(screen.queryByText(/15h 24m ×/)).not.toBeInTheDocument();
});
test("unknown duration is not displayed as zero cost", () => {
  render(
    <BeginHoursCost
      day={{
        ...day,
        entries: [
          { ...day.entries[0], minutes: null, end: "?", status: "missing-end" },
        ],
      }}
    />,
  );
  expect(screen.getByRole("button")).toHaveTextContent(
    "Stundas izmaksas: — (nepilnīgi)",
  );
});
test("no import is explicit", () => {
  render(<BeginHoursCost />);
  expect(screen.getByRole("button")).toHaveTextContent("Nav stundu datu");
});
