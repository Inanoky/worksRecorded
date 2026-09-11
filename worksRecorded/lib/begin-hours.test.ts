import {
  BEGIN_ORGANIZATION_ID,
  beginPeriodDates,
  parseBeginSnapshot,
  summarizeBeginEntries,
} from "./begin-hours";

const snapshotFixture = () => ({
  source: "https://app.begin.ee/en/new-timesheets",
  company: "Test company",
  targetOrganizationId: BEGIN_ORGANIZATION_ID,
  from: "2026-08-31",
  through: "2026-08-31",
  capturedOn: "2026-09-10",
  workers: ["Test worker"],
  objects: ["Test site"],
  columns: [
    "workerIndex",
    "date",
    "start",
    "end",
    "durationMinutes",
    "objectIndex",
    "status",
    "comment",
  ],
  rows: [[0, "31.08.2026", "07:00", "15:00", 480, 0, "approved", ""]],
});

test("calculates money from minutes and rounds after summing", () => {
  const row = parseBeginSnapshot(JSON.stringify(snapshotFixture())).entries[0];
  expect(summarizeBeginEntries([{ ...row, minutes: 924 }]).costCents).toBe(
    19250,
  );
  expect(
    summarizeBeginEntries([
      { ...row, minutes: 1 },
      { ...row, minutes: 1 },
      { ...row, minutes: 1 },
    ]).costCents,
  ).toBe(63);
});

test("preserves zero, unknown duration, duplicate-looking rows and notes", () => {
  const input = snapshotFixture();
  input.rows = [
    [0, "31.08.2026", "15:00", "15:00", 0, 0, "approved", "2h braukšana"],
    [0, "31.08.2026", "15:00", "15:00", 0, 0, "approved", "2h braukšana"],
  ];
  const parsed = parseBeginSnapshot(JSON.stringify(input));
  expect(parsed.entries).toHaveLength(2);
  expect(summarizeBeginEntries(parsed.entries).costCents).toBe(0);
  const incomplete = {
    ...parsed.entries[0],
    minutes: null,
    status: "missing-end" as const,
  };
  expect(summarizeBeginEntries([incomplete])).toMatchObject({
    minutes: 0,
    missing: 1,
  });
});

test("rejects cross-organization, invalid dates, indices and inconsistent statuses", () => {
  expect(() =>
    parseBeginSnapshot(
      JSON.stringify({ ...snapshotFixture(), targetOrganizationId: "other" }),
    ),
  ).toThrow();
  expect(() =>
    parseBeginSnapshot(
      JSON.stringify({ ...snapshotFixture(), from: "2026-02-30" }),
    ),
  ).toThrow();
  const input = snapshotFixture();
  input.rows[0][0] = 99;
  expect(() => parseBeginSnapshot(JSON.stringify(input))).toThrow();
  input.rows[0][0] = 0;
  input.rows[0][6] = "ongoing";
  expect(() => parseBeginSnapshot(JSON.stringify(input))).toThrow();
});

test("period includes boundary days", () => {
  expect(beginPeriodDates("2026-08-31", "2026-09-02")).toEqual([
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
  ]);
});
