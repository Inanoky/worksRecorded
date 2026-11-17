import { act, render, screen } from "@testing-library/react";
import { DiaryReviewPanel } from "./DiaryReviewPanel";

const originalFetch = globalThis.fetch;
const request = jest.fn();
function data(status = "completed") {
  return {
    enabled: true,
    runs: [
      {
        id: "run",
        status,
        recordIds: ["row"],
        createdAt: "2026-11-16T08:00:00Z",
        sourceText: "Betonēti 12,5 m3",
        reply: "Saglabāts",
        errorCode: null,
        records: [
          {
            id: "row",
            Works: "Betonēšana",
            Amounts: 12.5,
            Comments_Custom_1: null,
            Units: "m3",
            WorkersInvolved: null,
            TimeInvolved: null,
            positionId: "concrete",
          },
        ],
        positions: [{ id: "concrete", code: "1.1", name: "Pamatu betonēšana" }],
        metrics: {
          steps: [
            { name: "read_source_message", at: "2026-11-16T08:00:00Z" },
            { name: "search_forma2_positions", at: "2026-11-16T08:00:01Z" },
          ],
        },
      },
    ],
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = request;
  request.mockResolvedValue({ ok: true, json: async () => data() });
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});
it("shows source, executed steps and actual saved records without approval or launch buttons", async () => {
  render(<DiaryReviewPanel siteId="site" />);
  await screen.findByText("Ieraksti saglabāti");
  expect(screen.getByText("Betonēti 12,5 m3")).toBeInTheDocument();
  expect(screen.getByLabelText("Aģenta izpildes soļi")).toHaveTextContent(
    "Meklē Forma2 pozīcijas",
  );
  expect(screen.getByText("1.1 Pamatu betonēšana")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
});
it("polls only the read endpoint while a run is active", async () => {
  jest.useFakeTimers();
  try {
    render(<DiaryReviewPanel siteId="site" />);
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(
      request.mock.calls.every(([, options]) => options.method === undefined),
    ).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});
