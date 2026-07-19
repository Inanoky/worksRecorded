import type { DefaultConstructionWorkProductivitySetting } from "./site-diary-productivity-settings";

export type DefaultConstructionSummaryScope = "project" | "location" | "work";
export type DefaultConstructionComparisonStatus =
  | "on_or_ahead"
  | "behind"
  | "neutral";

export type DefaultConstructionSummarySourceRow = {
  Date?: Date | string | null;
  Location?: string | null;
  Works?: string | null;
  Units?: string | null;
  Amounts?: number | null;
  WorkersInvolved?: number | null;
  TimeInvolved?: number | null;
};

export type DefaultConstructionQuantityTotal = {
  unit: string;
  amount: number;
};

export type DefaultConstructionSummaryBreakdownRow = {
  label: string;
  unit: string;
  amount: number;
  records: number;
  workers: number;
  hours: number;
  plannedHours: number | null;
  plannedNorm: number | null;
  actualNorm: number | null;
  hoursDifference: number | null;
  normDifference: number | null;
  comparisonStatus: DefaultConstructionComparisonStatus;
  matchesConfiguredUnit: boolean;
  hasConfiguredPlan: boolean;
  comparedAmount: number;
  comparedHours: number;
  comparedRecords: number;
  excludedRecords: number;
  hourlyCost: number | null;
  plannedCost: number | null;
  actualCost: number | null;
  costDifference: number | null;
  plannedUnitCost: number | null;
  actualUnitCost: number | null;
  isComparable: boolean;
};

export type DefaultConstructionScopeSummary = {
  scope: DefaultConstructionSummaryScope;
  value: string;
  records: number;
  workers: number;
  hours: number;
  dateFrom: string | null;
  dateTo: string | null;
  quantities: DefaultConstructionQuantityTotal[];
  breakdown: DefaultConstructionSummaryBreakdownRow[];
  comparison: {
    comparableGroups: number;
    totalGroups: number;
    plannedHours: number;
    actualHours: number;
    hoursDifference: number;
    status: DefaultConstructionComparisonStatus;
    costComparableGroups: number;
    plannedCost: number;
    actualCost: number;
    costDifference: number;
    costStatus: DefaultConstructionComparisonStatus;
  };
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const normalizedKey = (value: unknown) =>
  String(value ?? "").trim().toLocaleLowerCase("lv");

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPresentFiniteNumber(value: unknown) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function addQuantity(map: Map<string, number>, unitValue: unknown, amountValue: unknown) {
  if (!isPresentFiniteNumber(amountValue)) return;
  const unit = String(unitValue ?? "").trim() || "—";
  map.set(unit, (map.get(unit) ?? 0) + Number(amountValue));
}

function quantityRows(map: Map<string, number>): DefaultConstructionQuantityTotal[] {
  return Array.from(map.entries())
    .map(([unit, amount]) => ({ unit, amount: round(amount) }))
    .sort((a, b) => a.unit.localeCompare(b.unit, "lv"));
}

function comparisonStatus(difference: number): DefaultConstructionComparisonStatus {
  return difference > 0 ? "behind" : "on_or_ahead";
}

export function buildDefaultConstructionScopeSummary(args: {
  scope: DefaultConstructionSummaryScope;
  value: string;
  rows: DefaultConstructionSummarySourceRow[];
  productivitySettings?: DefaultConstructionWorkProductivitySetting[];
}): DefaultConstructionScopeSummary {
  const summaryRows = args.rows.filter((row) => String(row.Works ?? "").trim());
  const totals = { workers: 0, hours: 0 };
  const quantities = new Map<string, number>();
  const settings = new Map(
    (args.productivitySettings ?? []).map((setting) => [
      normalizedKey(setting.work),
      setting,
    ]),
  );
  const breakdown = new Map<
    string,
    {
      label: string;
      records: number;
      unit: string;
      amount: number;
      workers: number;
      hours: number;
      comparedAmount: number;
      comparedHours: number;
      comparedRecords: number;
      hoursRecords: number;
    }
  >();
  const dates: Date[] = [];

  for (const row of summaryRows) {
    const workers = finiteNumber(row.WorkersInvolved);
    const hours = finiteNumber(row.TimeInvolved);
    totals.workers += workers;
    totals.hours += hours;
    addQuantity(quantities, row.Units, row.Amounts);

    if (row.Date) {
      const date = new Date(row.Date);
      if (!Number.isNaN(date.getTime())) dates.push(date);
    }

    const label = String(row.Works ?? "").trim();
    const unit = String(row.Units ?? "").trim();
    const key = `${normalizedKey(label)}::${normalizedKey(unit)}`;
    const current = breakdown.get(key) ?? {
      label,
      records: 0,
      unit,
      amount: 0,
      workers: 0,
      hours: 0,
      comparedAmount: 0,
      comparedHours: 0,
      comparedRecords: 0,
      hoursRecords: 0,
    };
    current.records += 1;
    current.amount += finiteNumber(row.Amounts);
    current.workers += workers;
    current.hours += hours;
    if (isPresentFiniteNumber(row.TimeInvolved)) current.hoursRecords += 1;
    if (isPresentFiniteNumber(row.Amounts) && isPresentFiniteNumber(row.TimeInvolved)) {
      current.comparedAmount += Number(row.Amounts);
      current.comparedHours += Number(row.TimeInvolved);
      current.comparedRecords += 1;
    }
    breakdown.set(key, current);
  }

  dates.sort((a, b) => a.getTime() - b.getTime());

  const breakdownRows: DefaultConstructionSummaryBreakdownRow[] = Array.from(
    breakdown.values(),
  )
    .map((row) => {
      const setting = settings.get(normalizedKey(row.label));
      const plannedNorm = Number(setting?.laborNormHoursPerUnit);
      const hourlyCost = Number(setting?.hourlyCost);
      const hasHourlyCost = Number.isFinite(hourlyCost) && hourlyCost > 0;
      const unitMatches =
        Boolean(setting?.unit) && normalizedKey(setting?.unit) === normalizedKey(row.unit);
      const hasConfiguredPlan =
        unitMatches && Number.isFinite(plannedNorm) && plannedNorm > 0;
      const isComparable =
        hasConfiguredPlan &&
        row.comparedAmount > 0 &&
        row.comparedRecords > 0;

      if (!isComparable) {
        const actualCost =
          hasHourlyCost && row.hoursRecords > 0 ? row.hours * hourlyCost : null;
        return {
          label: row.label,
          unit: row.unit,
          amount: round(row.amount),
          records: row.records,
          workers: round(row.workers),
          hours: round(row.hours),
          plannedHours: null,
          plannedNorm: null,
          actualNorm: null,
          hoursDifference: null,
          normDifference: null,
          comparisonStatus: "neutral" as const,
          matchesConfiguredUnit: unitMatches,
          hasConfiguredPlan,
          comparedAmount: round(row.comparedAmount),
          comparedHours: round(row.comparedHours),
          comparedRecords: row.comparedRecords,
          excludedRecords: row.records - row.comparedRecords,
          hourlyCost: hasHourlyCost ? round(hourlyCost) : null,
          plannedCost: null,
          actualCost: actualCost == null ? null : round(actualCost),
          costDifference: null,
          plannedUnitCost:
            hasConfiguredPlan && hasHourlyCost
              ? round(plannedNorm * hourlyCost)
              : null,
          actualUnitCost:
            actualCost != null && row.amount > 0
              ? round(actualCost / row.amount)
              : null,
          isComparable: false,
        };
      }

      const plannedHours = row.comparedAmount * plannedNorm;
      const actualNorm = row.comparedHours / row.comparedAmount;
      const hoursDifference = row.comparedHours - plannedHours;
      const normDifference = actualNorm - plannedNorm;
      const plannedCost = hasHourlyCost ? plannedHours * hourlyCost : null;
      const actualCost = hasHourlyCost ? row.comparedHours * hourlyCost : null;
      return {
        label: row.label,
        unit: row.unit,
        amount: round(row.amount),
        records: row.records,
        workers: round(row.workers),
        hours: round(row.hours),
        plannedHours: round(plannedHours),
        plannedNorm: round(plannedNorm, 4),
        actualNorm: round(actualNorm, 4),
        hoursDifference: round(hoursDifference),
        normDifference: round(normDifference, 4),
        comparisonStatus: comparisonStatus(hoursDifference),
        matchesConfiguredUnit: true,
        hasConfiguredPlan: true,
        comparedAmount: round(row.comparedAmount),
        comparedHours: round(row.comparedHours),
        comparedRecords: row.comparedRecords,
        excludedRecords: row.records - row.comparedRecords,
        hourlyCost: hasHourlyCost ? round(hourlyCost) : null,
        plannedCost: plannedCost == null ? null : round(plannedCost),
        actualCost: actualCost == null ? null : round(actualCost),
        costDifference:
          plannedCost == null || actualCost == null
            ? null
            : round(actualCost - plannedCost),
        plannedUnitCost:
          hasHourlyCost ? round(plannedNorm * hourlyCost) : null,
        actualUnitCost:
          actualCost != null && row.amount > 0
            ? round(actualCost / row.amount)
            : null,
        isComparable: true,
      };
    })
    .sort((a, b) => {
      if (args.scope === "project" && a.hasConfiguredPlan !== b.hasConfiguredPlan) {
        return a.hasConfiguredPlan ? -1 : 1;
      }
      return a.label.localeCompare(b.label, "lv") || a.unit.localeCompare(b.unit, "lv");
    });

  const comparableRows = breakdownRows.filter((row) => row.isComparable);
  const plannedHours = comparableRows.reduce(
    (sum, row) => sum + Number(row.plannedHours ?? 0),
    0,
  );
  const actualHours = comparableRows.reduce((sum, row) => sum + row.comparedHours, 0);
  const hoursDifference = actualHours - plannedHours;
  const costComparableRows = comparableRows.filter(
    (row) => row.plannedCost != null && row.actualCost != null,
  );
  const plannedCost = costComparableRows.reduce(
    (sum, row) => sum + Number(row.plannedCost ?? 0),
    0,
  );
  const actualCost = costComparableRows.reduce(
    (sum, row) => sum + Number(row.actualCost ?? 0),
    0,
  );
  const costDifference = actualCost - plannedCost;

  return {
    scope: args.scope,
    value: args.value,
    records: summaryRows.length,
    workers: round(totals.workers),
    hours: round(totals.hours),
    dateFrom: dates[0]?.toISOString() ?? null,
    dateTo: dates.at(-1)?.toISOString() ?? null,
    quantities: quantityRows(quantities),
    breakdown: breakdownRows,
    comparison: {
      comparableGroups: comparableRows.length,
      totalGroups: breakdownRows.length,
      plannedHours: round(plannedHours),
      actualHours: round(actualHours),
      hoursDifference: round(hoursDifference),
      status: comparableRows.length ? comparisonStatus(hoursDifference) : "neutral",
      costComparableGroups: costComparableRows.length,
      plannedCost: round(plannedCost),
      actualCost: round(actualCost),
      costDifference: round(costDifference),
      costStatus: costComparableRows.length
        ? comparisonStatus(costDifference)
        : "neutral",
    },
  };
}
