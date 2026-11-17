import type { ReviewedDiaryCase } from "./reviewed-diary-cases";

export type ReviewedDiaryActualRow = {
  id: string;
  dateISO: string | null;
  work: string | null;
  location: string | null;
  comment: string | null;
  amount: number | null;
  unit: string | null;
  workers: number | null;
  hours: number | null;
  forma2PositionId: string | null;
};
type Check = {
  name: string;
  status: "pass" | "fail";
  severity: "critical";
  message: string;
};
export function reviewedDiaryUnit(value: string | null) {
  const unit = (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("lv")
    .replace(/[\s.^]/g, "");
  if (["kompl", "komplekts", "komplekti", "kpl", "set", "sets"].includes(unit))
    return "kompl";
  if (["gab", "gb", "pcs", "pc"].includes(unit)) return "gab";
  return unit;
}
function numberMatches(actual: number | null, expected: number | null) {
  return expected === null
    ? actual === null
    : typeof actual === "number" &&
        Number.isFinite(actual) &&
        Math.abs(actual - expected) < 0.005;
}
function rowMatches(
  actual: ReviewedDiaryActualRow,
  expected: ReviewedDiaryCase["expectedRecords"][number],
) {
  return (
    actual.dateISO === expected.dateISO &&
    actual.forma2PositionId === expected.forma2PositionId &&
    numberMatches(actual.amount, expected.amount) &&
    numberMatches(actual.workers, expected.workers) &&
    numberMatches(actual.hours, expected.hours) &&
    reviewedDiaryUnit(actual.unit) === reviewedDiaryUnit(expected.unit) &&
    expected.commentSignals.every((signal) =>
      (actual.comment ?? "")
        .toLocaleLowerCase("lv")
        .includes(signal.toLocaleLowerCase("lv")),
    )
  );
}
export function validateReviewedDiaryCase(
  evalCase: ReviewedDiaryCase,
  rows: ReviewedDiaryActualRow[],
  positions: Array<{ id: string }>,
) {
  const results: Check[] = [];
  const check = (name: string, passed: boolean, message: string): void => {
    results.push({
      name,
      status: passed ? "pass" : "fail",
      severity: "critical",
      message,
    });
  };
  check(
    "record-count",
    rows.length === evalCase.expectedRecords.length,
    `Sagaidīti ${evalCase.expectedRecords.length} ieraksti, saņemti ${rows.length}.`,
  );
  const knownPositions = new Set(positions.map((position) => position.id));
  check(
    "catalog-position-scope",
    rows.every(
      (row) =>
        row.forma2PositionId === null ||
        knownPositions.has(row.forma2PositionId),
    ),
    "Forma2 piesaistes drīkst norādīt tikai uz fiksētā projekta katalogu.",
  );
  const owner = new Map<number, number>();
  const assign = (expectedIndex: number, seen: Set<number>): boolean => {
    for (const [actualIndex, row] of rows.entries()) {
      if (
        seen.has(actualIndex) ||
        !rowMatches(row, evalCase.expectedRecords[expectedIndex])
      )
        continue;
      seen.add(actualIndex);
      const previous = owner.get(actualIndex);
      if (previous === undefined || assign(previous, seen)) {
        owner.set(actualIndex, expectedIndex);
        return true;
      }
    }
    return false;
  };
  for (const index of evalCase.expectedRecords.keys()) assign(index, new Set());
  const matched = new Set(owner.values());
  for (const [index, expected] of evalCase.expectedRecords.entries()) {
    check(
      `expected-record:${index + 1}`,
      matched.has(index),
      matched.has(index)
        ? `Atrasts ${expected.work}: ${expected.amount ?? "null"} ${expected.unit ?? ""}, ${expected.dateISO}.`
        : `Nav atrasts viennozīmīgi atbilstošs ieraksts: ${JSON.stringify({ work: expected.work, date: expected.dateISO, amount: expected.amount, unit: expected.unit, workers: expected.workers, hours: expected.hours, position: expected.forma2PositionId })}. Saņemts: ${JSON.stringify(rows)}.`,
    );
  }
  const criticalFailures = results.filter(
    (result) => result.status === "fail",
  ).length;
  return {
    caseId: evalCase.id,
    status: criticalFailures ? ("fail" as const) : ("pass" as const),
    criticalFailures,
    warnings: 0,
    results,
  };
}
