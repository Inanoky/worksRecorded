import type {
  DefaultConstructionWorkCostMode,
  DefaultConstructionWorkProductivitySetting,
} from "./site-diary-productivity-settings";
import {
  compareSiteDiaryWorkPrefixes,
  compareSiteDiaryWorks,
} from "./site-diary-work-order";

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
  costCalculationMode: DefaultConstructionWorkCostMode;
  plannedCost: number | null;
  actualCost: number | null;
  costDifference: number | null;
  comparedPlannedCost: number | null;
  comparedActualCost: number | null;
  isCostComparable: boolean;
  plannedUnitCost: number | null;
  actualUnitCost: number | null;
  hasActualHours: boolean;
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
    plannedGroups: number;
    actualGroups: number;
    plannedHours: number;
    actualHours: number;
    hoursDifference: number;
    status: DefaultConstructionComparisonStatus;
    costComparableGroups: number;
    plannedCostGroups: number;
    actualCostGroups: number;
    plannedCost: number;
    actualCost: number;
    costDifference: number;
    costStatus: DefaultConstructionComparisonStatus;
  };
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const normalizedKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("lv");

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPresentFiniteNumber(value: unknown) {
  return (
    value !== null && value !== undefined && Number.isFinite(Number(value))
  );
}

function addQuantity(
  map: Map<string, number>,
  unitValue: unknown,
  amountValue: unknown,
) {
  if (!isPresentFiniteNumber(amountValue)) return;
  const unit = String(unitValue ?? "").trim() || "—";
  map.set(unit, (map.get(unit) ?? 0) + Number(amountValue));
}

function quantityRows(
  map: Map<string, number>,
): DefaultConstructionQuantityTotal[] {
  return Array.from(map.entries())
    .map(([unit, amount]) => ({ unit, amount: round(amount) }))
    .sort((a, b) => a.unit.localeCompare(b.unit, "lv"));
}

function comparisonStatus(
  difference: number,
): DefaultConstructionComparisonStatus {
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
    if (
      isPresentFiniteNumber(row.Amounts) &&
      isPresentFiniteNumber(row.TimeInvolved)
    ) {
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
      const costCalculationMode: DefaultConstructionWorkCostMode =
        setting?.costCalculationMode === "hourly" ? "hourly" : "output";
      const hasHourlyCost =
        setting?.hourlyCost != null &&
        Number.isFinite(hourlyCost) &&
        hourlyCost >= 0;
      const unitMatches =
        Boolean(setting?.unit) &&
        normalizedKey(setting?.unit) === normalizedKey(row.unit);
      const hasConfiguredPlan =
        unitMatches && Number.isFinite(plannedNorm) && plannedNorm > 0;
      const hasPlannedAmount = hasConfiguredPlan && row.amount > 0;
      const hasActualHours = row.hoursRecords > 0;
      const isComparable =
        hasConfiguredPlan && row.comparedAmount > 0 && row.comparedRecords > 0;
      const plannedHours = hasPlannedAmount ? row.amount * plannedNorm : null;
      const plannedCost =
        plannedHours != null && hasHourlyCost
          ? plannedHours * hourlyCost
          : null;
      const actualCost =
        costCalculationMode === "output"
          ? plannedCost
          : hasHourlyCost && hasActualHours
            ? row.hours * hourlyCost
            : null;
      const outputCostComparable =
        costCalculationMode === "output" &&
        plannedCost != null &&
        actualCost != null;

      if (!isComparable) {
        return {
          label: row.label,
          unit: row.unit,
          amount: round(row.amount),
          records: row.records,
          workers: round(row.workers),
          hours: round(row.hours),
          plannedHours: plannedHours == null ? null : round(plannedHours),
          plannedNorm: hasConfiguredPlan ? round(plannedNorm, 4) : null,
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
          costCalculationMode,
          plannedCost: plannedCost == null ? null : round(plannedCost),
          actualCost: actualCost == null ? null : round(actualCost),
          costDifference: outputCostComparable ? 0 : null,
          comparedPlannedCost: outputCostComparable ? round(plannedCost) : null,
          comparedActualCost: outputCostComparable ? round(actualCost) : null,
          isCostComparable: outputCostComparable,
          plannedUnitCost:
            hasConfiguredPlan && hasHourlyCost
              ? round(plannedNorm * hourlyCost)
              : null,
          actualUnitCost:
            costCalculationMode === "output" &&
            hasConfiguredPlan &&
            hasHourlyCost
              ? round(plannedNorm * hourlyCost)
              : actualCost != null && row.amount > 0
                ? round(actualCost / row.amount)
                : null,
          hasActualHours,
          isComparable: false,
        };
      }

      const comparedPlannedHours = row.comparedAmount * plannedNorm;
      const actualNorm = row.comparedHours / row.comparedAmount;
      const hoursDifference = row.comparedHours - comparedPlannedHours;
      const normDifference = actualNorm - plannedNorm;
      const comparedPlannedCost = hasHourlyCost
        ? comparedPlannedHours * hourlyCost
        : null;
      const comparedActualCost = hasHourlyCost
        ? costCalculationMode === "output"
          ? comparedPlannedCost
          : row.comparedHours * hourlyCost
        : null;
      return {
        label: row.label,
        unit: row.unit,
        amount: round(row.amount),
        records: row.records,
        workers: round(row.workers),
        hours: round(row.hours),
        plannedHours: plannedHours == null ? null : round(plannedHours),
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
        costCalculationMode,
        plannedCost: plannedCost == null ? null : round(plannedCost),
        actualCost: actualCost == null ? null : round(actualCost),
        costDifference:
          comparedPlannedCost == null || comparedActualCost == null
            ? null
            : round(comparedActualCost - comparedPlannedCost),
        comparedPlannedCost:
          comparedPlannedCost == null ? null : round(comparedPlannedCost),
        comparedActualCost:
          comparedActualCost == null ? null : round(comparedActualCost),
        isCostComparable:
          comparedPlannedCost != null && comparedActualCost != null,
        plannedUnitCost: hasHourlyCost ? round(plannedNorm * hourlyCost) : null,
        actualUnitCost:
          costCalculationMode === "output" && hasHourlyCost
            ? round(plannedNorm * hourlyCost)
            : actualCost != null && row.amount > 0
              ? round(actualCost / row.amount)
              : null,
        hasActualHours,
        isComparable: true,
      };
    })
    .sort((a, b) => {
      const prefixOrder = compareSiteDiaryWorkPrefixes(a.label, b.label);
      if (prefixOrder !== 0) return prefixOrder;
      if (
        args.scope === "project" &&
        a.hasConfiguredPlan !== b.hasConfiguredPlan
      ) {
        return a.hasConfiguredPlan ? -1 : 1;
      }
      return (
        compareSiteDiaryWorks(a.label, b.label) ||
        a.unit.localeCompare(b.unit, "lv")
      );
    });

  const comparableRows = breakdownRows.filter((row) => row.isComparable);
  const plannedRows = breakdownRows.filter((row) => row.plannedHours != null);
  const actualRows = breakdownRows.filter((row) => row.hasActualHours);
  const plannedHours = plannedRows.reduce(
    (sum, row) => sum + Number(row.plannedHours ?? 0),
    0,
  );
  const actualHours = actualRows.reduce((sum, row) => sum + row.hours, 0);
  const comparedPlannedHours = comparableRows.reduce(
    (sum, row) => sum + row.comparedAmount * Number(row.plannedNorm ?? 0),
    0,
  );
  const comparedActualHours = comparableRows.reduce(
    (sum, row) => sum + row.comparedHours,
    0,
  );
  const hoursDifference = comparedActualHours - comparedPlannedHours;
  const plannedCostRows = breakdownRows.filter(
    (row) => row.plannedCost != null,
  );
  const actualCostRows = breakdownRows.filter((row) => row.actualCost != null);
  const costComparableRows = breakdownRows.filter(
    (row) => row.isCostComparable,
  );
  const plannedCost = plannedCostRows.reduce(
    (sum, row) => sum + Number(row.plannedCost ?? 0),
    0,
  );
  const actualCost = actualCostRows.reduce(
    (sum, row) => sum + Number(row.actualCost ?? 0),
    0,
  );
  const comparedPlannedCost = costComparableRows.reduce(
    (sum, row) => sum + Number(row.comparedPlannedCost ?? 0),
    0,
  );
  const comparedActualCost = costComparableRows.reduce(
    (sum, row) => sum + Number(row.comparedActualCost ?? 0),
    0,
  );
  const costDifference = comparedActualCost - comparedPlannedCost;

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
      plannedGroups: plannedRows.length,
      actualGroups: actualRows.length,
      plannedHours: round(plannedHours),
      actualHours: round(actualHours),
      hoursDifference: round(hoursDifference),
      status: comparableRows.length
        ? comparisonStatus(hoursDifference)
        : "neutral",
      costComparableGroups: costComparableRows.length,
      plannedCostGroups: plannedCostRows.length,
      actualCostGroups: actualCostRows.length,
      plannedCost: round(plannedCost),
      actualCost: round(actualCost),
      costDifference: round(costDifference),
      costStatus: costComparableRows.length
        ? comparisonStatus(costDifference)
        : "neutral",
    },
  };
}
