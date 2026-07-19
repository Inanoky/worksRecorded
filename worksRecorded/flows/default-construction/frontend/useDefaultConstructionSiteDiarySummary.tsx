"use client";

import * as React from "react";
import { BarChart3, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDefaultConstructionScopeSummary } from "@/flows/default-construction/backend/site-diary-summary-actions";
import type {
  DefaultConstructionComparisonStatus,
  DefaultConstructionScopeSummary,
  DefaultConstructionSummaryScope,
} from "@/flows/default-construction/lib/site-diary-summary";
import { cn } from "@/lib/utils/utils";

type SummarySelection = {
  scope: DefaultConstructionSummaryScope;
  value: string;
};

const MESSAGES = {
  en: {
    title: "Summary",
    project: "Project",
    wholeProject: "Whole project",
    location: "Location",
    work: "Work",
    allPeriod: "All time",
    breakdownWorks: "Works summary",
    itemWork: "Work",
    unit: "Unit",
    amount: "Quantity",
    plannedHours: "Planned hours",
    actualHours: "Actual hours",
    comparedActualHours: "Actual hours",
    plannedUnitCost: "Planned unit cost",
    actualUnitCost: "Actual unit cost",
    plannedCost: "Total planned cost",
    actualCost: "Total actual cost",
    loading: "Loading summary...",
    loadFailed: "Failed to load summary.",
    close: "Close summary",
    hideProject: "Hide project summary",
    showProject: "Show project summary",
    partialComparison: (compared: number, total: number) =>
      `Productivity calculated from ${compared} of ${total} complete records.`,
    noData: "No records found for this selection.",
  },
  lv: {
    title: "Kopsavilkums",
    project: "Projekts",
    wholeProject: "Viss projekts",
    location: "Lokācija",
    work: "Darbs",
    allPeriod: "Viss periods",
    breakdownWorks: "Darbu kopsavilkums",
    itemWork: "Darbs",
    unit: "Mērv.",
    amount: "Daudzums",
    plannedHours: "Plāna stundas",
    actualHours: "Faktiskās stundas",
    comparedActualHours: "Faktiskās stundas",
    plannedUnitCost: "Plāna vienības izmaksas",
    actualUnitCost: "Faktiskās vienības izmaksas",
    plannedCost: "Kopējās plāna izmaksas",
    actualCost: "Kopējās faktiskās izmaksas",
    loading: "Ielādē kopsavilkumu...",
    loadFailed: "Neizdevās ielādēt kopsavilkumu.",
    close: "Aizvērt kopsavilkumu",
    hideProject: "Paslēpt projekta kopsavilkumu",
    showProject: "Rādīt projekta kopsavilkumu",
    partialComparison: (compared: number, total: number) =>
      `Produktivitāte aprēķināta no ${compared} no ${total} pilnīgiem ierakstiem.`,
    noData: "Šai atlasei nav atrasts neviens ieraksts.",
  },
} as const;

function formatNumber(value: number, locale: string, maximumFractionDigits = 2) {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function badgeComparisonClasses(status: DefaultConstructionComparisonStatus) {
  if (status === "behind") return "border-red-200 bg-red-50 text-red-600";
  if (status === "on_or_ahead") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-border bg-muted/30 text-foreground";
}

function SummaryPanel({
  selection,
  summary,
  loading,
  error,
  organizationLanguage,
  onClose,
}: {
  selection: SummarySelection;
  summary: DefaultConstructionScopeSummary | null;
  loading: boolean;
  error: string | null;
  organizationLanguage?: string | null;
  onClose: () => void;
}) {
  const language = String(organizationLanguage ?? "").toLowerCase().startsWith("lv")
    ? "lv"
    : "en";
  const t = MESSAGES[language];
  const locale = language === "lv" ? "lv-LV" : "en-GB";
  const selectionLabel =
    selection.scope === "project"
      ? `${t.project}: ${t.wholeProject}`
      : `${selection.scope === "location" ? t.location : t.work}: ${selection.value}`;
  const badgeTiles: Array<{
    label: string;
    value: string;
    status?: DefaultConstructionComparisonStatus;
  }> = summary
    ? [
        {
          label: t.plannedHours,
          value: summary.comparison.comparableGroups
            ? `${formatNumber(summary.comparison.plannedHours, locale)} h`
            : "—",
        },
        {
          label: t.comparedActualHours,
          value: summary.comparison.comparableGroups
            ? `${formatNumber(summary.comparison.actualHours, locale)} h`
            : "—",
          status: summary.comparison.status,
        },
        ...(selection.scope === "project"
          ? [
              {
                label: t.plannedCost,
                value: summary.comparison.costComparableGroups
                  ? formatCurrency(summary.comparison.plannedCost, locale)
                  : "—",
              },
              {
                label: t.actualCost,
                value: summary.comparison.costComparableGroups
                  ? formatCurrency(summary.comparison.actualCost, locale)
                  : "—",
                status: summary.comparison.costStatus,
              },
            ]
          : []),
      ]
    : [];
  return (
    <div className="mb-4 rounded-md border bg-background px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{t.title}</div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-1">
              {selectionLabel}
            </span>
            <span className="rounded-md bg-muted px-2 py-1">{t.allPeriod}</span>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label={selection.scope === "project" ? t.hideProject : t.close}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.loading}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!loading && !error && summary ? (
        summary.records === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t.noData}</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {badgeTiles.map((tile) => {
                const status = tile.status;
                return (
                  <div
                    key={tile.label}
                    className={cn(
                      "flex h-24 w-32 flex-col justify-center rounded-md border px-3 py-2",
                      status ? badgeComparisonClasses(status) : "bg-muted/30",
                    )}
                  >
                    <div className={cn("text-xs", status ? "opacity-80" : "text-muted-foreground")}>
                      {tile.label}
                    </div>
                    <div className="text-base font-semibold tabular-nums">{tile.value}</div>
                  </div>
                );
              })}
            </div>

            {summary.breakdown.length ? (
              <div className="mt-3 overflow-x-auto rounded-md border">
                <div className="min-w-[1320px]">
                  <div className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold">
                    {t.breakdownWorks}
                  </div>
                  <div className="grid grid-cols-[minmax(260px,1fr)_80px_100px_115px_115px_145px_145px_150px_150px] bg-muted/20 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                    <div>{t.itemWork}</div>
                    <div>{t.unit}</div>
                    <div className="text-right">{t.amount}</div>
                    <div className="text-right">{t.plannedHours}</div>
                    <div className="text-right">{t.actualHours}</div>
                    <div className="text-right">{t.plannedUnitCost}</div>
                    <div className="text-right">{t.actualUnitCost}</div>
                    <div className="text-right">{t.plannedCost}</div>
                    <div className="text-right">{t.actualCost}</div>
                  </div>
                  {summary.breakdown.map((row) => (
                    <div
                      key={`${row.label}::${row.unit}`}
                      title={
                        row.excludedRecords > 0
                          ? t.partialComparison(row.comparedRecords, row.records)
                          : undefined
                      }
                      className={cn(
                        "grid grid-cols-[minmax(260px,1fr)_80px_100px_115px_115px_145px_145px_150px_150px] border-t px-3 py-2 text-sm",
                        row.comparisonStatus === "behind" && "bg-red-50",
                        row.comparisonStatus === "on_or_ahead" && "bg-emerald-50",
                      )}
                    >
                      <div className="truncate pr-2" title={row.label}>{row.label}</div>
                      <div>{row.unit || "—"}</div>
                      <div className="text-right tabular-nums">{formatNumber(row.amount, locale)}</div>
                      <div className="text-right tabular-nums">
                        {row.plannedHours == null ? "—" : `${formatNumber(row.plannedHours, locale)} h`}
                      </div>
                      <div className="text-right tabular-nums">
                        {formatNumber(row.isComparable ? row.comparedHours : row.hours, locale)} h
                      </div>
                      <div className="text-right tabular-nums">
                        {row.plannedUnitCost == null
                          ? "—"
                          : formatCurrency(row.plannedUnitCost, locale)}
                      </div>
                      <div className="text-right tabular-nums">
                        {row.actualUnitCost == null
                          ? "—"
                          : formatCurrency(row.actualUnitCost, locale)}
                      </div>
                      <div className="text-right tabular-nums">
                        {row.plannedCost == null ? "—" : formatCurrency(row.plannedCost, locale)}
                      </div>
                      <div className={cn(
                        "text-right font-medium tabular-nums",
                        row.comparisonStatus === "behind" && "text-red-600",
                        row.comparisonStatus === "on_or_ahead" && "text-emerald-700",
                        row.comparisonStatus === "neutral" && "text-muted-foreground",
                      )}>
                        {row.actualCost == null ? "—" : formatCurrency(row.actualCost, locale)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

export function useDefaultConstructionSiteDiarySummary(args: {
  enabled: boolean;
  siteId: string | null | undefined;
  organizationLanguage?: string | null;
  refreshKey?: unknown;
  optionsRevision?: number;
  locationFilter: string;
  workFilter: string;
  setViewMode: (mode: "calendar" | "list" | "gallery") => void;
  setLocationFilter: (value: string) => void;
  setWorkFilter: (value: string) => void;
}) {
  const [selection, setSelection] = React.useState<SummarySelection | null>(null);
  const [summary, setSummary] = React.useState<DefaultConstructionScopeSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [projectSummaryVisible, setProjectSummaryVisible] = React.useState(true);
  const [projectSummary, setProjectSummary] =
    React.useState<DefaultConstructionScopeSummary | null>(null);
  const [projectLoading, setProjectLoading] = React.useState(false);
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const language = String(args.organizationLanguage ?? "").toLowerCase().startsWith("lv")
    ? "lv"
    : "en";

  React.useEffect(() => {
    if (!args.enabled || !args.siteId) {
      setProjectSummary(null);
      setProjectLoading(false);
      setProjectError(null);
      return;
    }
    if (!projectSummaryVisible) return;

    let cancelled = false;
    setProjectLoading(true);
    setProjectError(null);
    getDefaultConstructionScopeSummary({
      siteId: args.siteId,
      scope: "project",
    })
      .then((result) => {
        if (!cancelled) setProjectSummary(result);
      })
      .catch((loadError: any) => {
        if (cancelled) return;
        setProjectSummary(null);
        setProjectError(loadError?.message ?? MESSAGES[language].loadFailed);
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    args.enabled,
    args.optionsRevision,
    args.refreshKey,
    args.siteId,
    language,
    projectSummaryVisible,
  ]);

  React.useEffect(() => {
    if (!selection) return;
    const selectedFilter =
      selection.scope === "location" ? args.locationFilter : args.workFilter;
    if (selectedFilter !== selection.value) setSelection(null);
  }, [args.locationFilter, args.workFilter, selection]);

  React.useEffect(() => {
    if (!args.enabled || !args.siteId || !selection) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    getDefaultConstructionScopeSummary({
      siteId: args.siteId,
      scope: selection.scope,
      value: selection.value,
    })
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((loadError: any) => {
        if (cancelled) return;
        setSummary(null);
        setError(loadError?.message ?? MESSAGES[language].loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    args.enabled,
    args.optionsRevision,
    args.refreshKey,
    args.siteId,
    language,
    selection,
  ]);

  const openLocationSummary = React.useCallback(
    (value: string | null | undefined) => {
      const normalized = String(value ?? "").trim();
      if (!args.enabled || !normalized) return;
      args.setViewMode("list");
      args.setLocationFilter(normalized);
      args.setWorkFilter("__ALL__");
      setSelection({ scope: "location", value: normalized });
    },
    [args],
  );

  const openWorkSummary = React.useCallback(
    (value: string | null | undefined) => {
      const normalized = String(value ?? "").trim();
      if (!args.enabled || !normalized) return;
      args.setViewMode("list");
      args.setWorkFilter(normalized);
      args.setLocationFilter("__ALL__");
      setSelection({ scope: "work", value: normalized });
    },
    [args],
  );

  const clearSummary = React.useCallback(() => setSelection(null), []);

  return {
    openLocationSummary,
    openWorkSummary,
    clearSummary,
    panel: args.enabled ? (
      <>
        {projectSummaryVisible ? (
          <SummaryPanel
            selection={{ scope: "project", value: "project" }}
            summary={projectSummary}
            loading={projectLoading}
            error={projectError}
            organizationLanguage={args.organizationLanguage}
            onClose={() => setProjectSummaryVisible(false)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            className="mb-4"
            onClick={() => setProjectSummaryVisible(true)}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            {MESSAGES[language].showProject}
          </Button>
        )}
        {selection ? (
          <SummaryPanel
            selection={selection}
            summary={summary}
            loading={loading}
            error={error}
            organizationLanguage={args.organizationLanguage}
            onClose={clearSummary}
          />
        ) : null}
      </>
    ) : null,
  };
}
