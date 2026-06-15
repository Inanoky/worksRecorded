"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/utils";
import {
  getZtcDefaultTaskRates,
  updateZtcPayrollFields,
  type ZtcProjectTaskRates,
} from "@/components/sitediary/ZTC/actions";
import { ZtcDefaultRatesDialog } from "@/components/sitediary/ZTC/ZtcDefaultRatesDialog";
import { ZtcRelatedImageGallery } from "@/components/sitediary/ZTC/ZtcRelatedImageGallery";
import {
  buildZtcImageDialogState,
  exportZtcPayrollToExcel,
  isZtcQualityRow,
  type ZtcDiaryRow,
  type ZtcImageDialogState,
} from "@/components/sitediary/ZTC/ztc-site-diary-utils";

type ZtcPayrollField = "rate" | "coefficient" | "bonus";

type UseZtcSiteDiaryFlowArgs<Row extends ZtcDiaryRow> = {
  enabled: boolean;
  siteId: string | null | undefined;
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  currentYear: number;
  currentMonth: number;
  setViewMode: (mode: "calendar" | "list" | "gallery") => void;
  setElementFilter: (value: string) => void;
};

export function useZtcSiteDiaryFlow<Row extends ZtcDiaryRow>({
  enabled,
  siteId,
  rows,
  setRows,
  currentYear,
  currentMonth,
  setViewMode,
  setElementFilter,
}: UseZtcSiteDiaryFlowArgs<Row>) {
  const [payrollSavingRowId, setPayrollSavingRowId] = React.useState<string | null>(null);
  const [payrollDirtyRowIds, setPayrollDirtyRowIds] = React.useState<Set<string>>(new Set());
  const [imageDialog, setImageDialog] = React.useState<ZtcImageDialogState>(null);
  const [rateDialogOpen, setRateDialogOpen] = React.useState(false);
  const [defaultRates, setDefaultRates] = React.useState<ZtcProjectTaskRates[]>([]);

  React.useEffect(() => {
    if (!enabled || !siteId) {
      setDefaultRates([]);
      return;
    }

    let cancelled = false;
    getZtcDefaultTaskRates(siteId)
      .then((rates) => {
        if (cancelled) return;
        setDefaultRates(rates);
      })
      .catch((error: any) => {
        if (!cancelled) {
          toast.error(error?.message ?? "Neizdevās ielādēt darbu likmes.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, siteId]);

  const rateProjectOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => String(row.Location ?? "").trim())
            .filter((project) => project && project !== "Papilddarbi"),
        ),
      ).sort((a, b) => a.localeCompare(b, "lv")),
    [rows],
  );

  const updatePayrollDraft = React.useCallback(
    (recordId: string, field: ZtcPayrollField, value: string) => {
      const dbField =
        field === "rate"
          ? "Location_Custom_2"
          : field === "coefficient"
            ? "Works_Custom_2"
            : "WorkersInvolved";

      setRows((prev) =>
        prev.map((row) =>
          row.id === recordId
            ? {
                ...row,
                [dbField]: value,
              } as Row
            : row,
        ),
      );
      setPayrollDirtyRowIds((prev) => new Set(prev).add(recordId));
    },
    [setRows],
  );

  const savePayrollDraft = React.useCallback(
    async (row: Row) => {
      if (!enabled || !siteId || !row.id) return;

      const rateValue = String(row.Location_Custom_2 ?? "").trim();
      const coefficientValue = String(row.Works_Custom_2 ?? "").trim();
      const bonusValue = String(row.WorkersInvolved ?? "").trim();
      const payrollFieldLabels: Record<string, string> = {
        rate: "likmei",
        coefficient: "koeficientam",
        bonus: "bonusam",
      };

      const invalid = [
        ["rate", rateValue],
        ["coefficient", coefficientValue],
        ["bonus", bonusValue],
      ].find(
        ([_, value]) =>
          value && !Number.isFinite(Number(String(value).replace(",", "."))),
      );

      if (invalid) {
        toast.error(
          `Algas ${payrollFieldLabels[invalid[0]] ?? "laukam"} jābūt derīgam skaitlim.`,
        );
        return;
      }

      try {
        setPayrollSavingRowId(row.id);
        const result = await updateZtcPayrollFields({
          siteId,
          id: row.id,
          rate: rateValue,
          coefficient: coefficientValue,
          bonus: bonusValue,
        });

        if (!result?.ok) {
          toast.error(result?.message ?? "Neizdevās saglabāt algas laukus.");
        } else {
          setPayrollDirtyRowIds((prev) => {
            const next = new Set(prev);
            next.delete(row.id as string);
            return next;
          });
        }
      } catch (error: any) {
        toast.error(error?.message ?? "Neizdevās saglabāt algas laukus.");
      } finally {
        setPayrollSavingRowId(null);
      }
    },
    [enabled, siteId],
  );

  const renderPayrollInput = React.useCallback(
    (
      row: Row,
      field: ZtcPayrollField,
      value: unknown,
      widthClass = "w-20",
    ) => {
      if (!row.id || isZtcQualityRow(row)) return "—";
      const saving = payrollSavingRowId === row.id;
      return (
        <Input
          inputMode="decimal"
          className={cn("h-8 px-2 text-right tabular-nums", widthClass)}
          disabled={saving}
          value={String(value ?? "")}
          onChange={(event) =>
            updatePayrollDraft(row.id as string, field, event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
        />
      );
    },
    [payrollSavingRowId, updatePayrollDraft],
  );

  const handlePayrollExcelExport = React.useCallback(
    () => exportZtcPayrollToExcel({ rows, currentYear, currentMonth }),
    [currentMonth, currentYear, rows],
  );

  const openRowImages = React.useCallback((row: Row) => {
    const dialogState = buildZtcImageDialogState(row);
    if (!dialogState) {
      toast.error("Šim ierakstam nav pievienotu foto.");
      return;
    }

    setImageDialog(dialogState);
  }, []);

  const openElementDetails = React.useCallback(
    (elementName: string | null | undefined) => {
      const normalizedElement = String(elementName ?? "").trim();
      if (!normalizedElement) return;

      setViewMode("list");
      setElementFilter(normalizedElement);
    },
    [setElementFilter, setViewMode],
  );

  const dialogs = enabled ? (
    <>
      <ZtcDefaultRatesDialog
        open={rateDialogOpen}
        siteId={siteId ?? null}
        rates={defaultRates}
        projectOptions={rateProjectOptions}
        onOpenChange={setRateDialogOpen}
        onSaved={setDefaultRates}
      />

      {imageDialog ? (
        <ZtcRelatedImageGallery
          title={imageDialog.title}
          subtitle={imageDialog.subtitle}
          photos={imageDialog.photos}
          onClose={() => setImageDialog(null)}
        />
      ) : null}
    </>
  ) : null;

  return {
    payrollSavingRowId,
    payrollDirtyRowIds,
    savePayrollDraft,
    renderPayrollInput,
    handlePayrollExcelExport,
    openRateDialog: () => setRateDialogOpen(true),
    openRowImages,
    openElementDetails,
    dialogs,
  };
}
