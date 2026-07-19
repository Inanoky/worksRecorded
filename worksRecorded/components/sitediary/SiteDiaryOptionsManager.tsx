"use client";

import * as React from "react";
import { Check, Loader2, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  getDefaultConstructionSiteDiaryOptions,
  saveDefaultConstructionSiteDiaryOptions,
} from "@/flows/default-construction/backend/site-diary-options-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSiteDiaryDialogMessages,
  normalizeOrganizationLanguage,
} from "@/lib/dashboard-i18n";

const MAX_OPTION_LENGTH = 200;
type ManagedField = "Location" | "Works";
type WorkDraft = {
  work: string;
  unit: string;
  laborNormHoursPerUnit: string;
};

const PRODUCTIVITY_MESSAGES = {
  en: {
    workName: "Work",
    unit: "Unit",
    timeNorm: "Time norm",
    normHint: "hours / unit",
    selectUnit: "No unit",
    addWork: "Add work",
    invalidNorm: "Time norm must be a number greater than zero.",
    unitRequired: "Select a unit when a time norm is set.",
  },
  lv: {
    workName: "Darbs",
    unit: "Mērv.",
    timeNorm: "Laika norma",
    normHint: "stundas / mērv.",
    selectUnit: "Nav norādīta",
    addWork: "Pievienot darbu",
    invalidNorm: "Laika normai jābūt skaitlim, kas lielāks par nulli.",
    unitRequired: "Ja norādīta laika norma, izvēlieties mērvienību.",
  },
} as const;

export function SiteDiaryOptionsManager({
  siteId,
  organizationLanguage,
  onSaved,
}: {
  siteId: string;
  organizationLanguage?: string | null;
  onSaved?: () => void;
}) {
  const language = normalizeOrganizationLanguage(organizationLanguage);
  const t = getSiteDiaryDialogMessages(language);
  const p = PRODUCTIVITY_MESSAGES[language === "lv" ? "lv" : "en"];
  const [open, setOpen] = React.useState(false);
  const [activeField, setActiveField] = React.useState<ManagedField>("Location");
  const [locations, setLocations] = React.useState<string[]>([]);
  const [works, setWorks] = React.useState<WorkDraft[]>([]);
  const [unitOptions, setUnitOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [newLocation, setNewLocation] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const resetEditor = React.useCallback(() => {
    setSearch("");
    setNewLocation("");
    setEditingIndex(null);
    setEditingValue("");
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    resetEditor();

    getDefaultConstructionSiteDiaryOptions(siteId)
      .then((result) => {
        if (cancelled) return;
        setLocations(result.locations);
        setUnitOptions(result.units);
        setWorks(
          result.productivity.works.map((row) => ({
            work: row.work,
            unit: row.unit,
            laborNormHoursPerUnit:
              row.laborNormHoursPerUnit == null
                ? ""
                : String(row.laborNormHoursPerUnit),
          })),
        );
      })
      .catch((error: any) => {
        if (!cancelled) toast.error(error?.message ?? t.failedUpdateDropdownOptions);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resetEditor, siteId, t.failedUpdateDropdownOptions]);

  const normalizedSearch = search.trim().toLocaleLowerCase("lv");
  const visibleLocations = locations
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.toLocaleLowerCase("lv").includes(normalizedSearch));
  const visibleWorks = works
    .map((work, index) => ({ work, index }))
    .filter(({ work }) => work.work.toLocaleLowerCase("lv").includes(normalizedSearch));

  const validateLocation = (rawValue: string, ignoredIndex?: number) => {
    const value = rawValue.trim();
    if (!value) {
      toast.error(t.optionCannotBeEmpty);
      return null;
    }
    if (value.length > MAX_OPTION_LENGTH) {
      toast.error(t.optionMaxLength(MAX_OPTION_LENGTH));
      return null;
    }
    if (
      locations.some(
        (option, index) =>
          index !== ignoredIndex &&
          option.toLocaleLowerCase("lv") === value.toLocaleLowerCase("lv"),
      )
    ) {
      toast.error(t.optionAlreadyExists);
      return null;
    }
    return value;
  };

  const appendLocation = () => {
    const value = validateLocation(newLocation);
    if (!value) return;
    setLocations((current) => [...current, value]);
    setNewLocation("");
  };

  const saveEditedLocation = () => {
    if (editingIndex == null) return;
    const value = validateLocation(editingValue, editingIndex);
    if (!value) return;
    setLocations((current) =>
      current.map((option, index) => (index === editingIndex ? value : option)),
    );
    setEditingIndex(null);
    setEditingValue("");
  };

  const updateWork = (index: number, patch: Partial<WorkDraft>) => {
    setWorks((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  };

  const saveOptions = async () => {
    if (!locations.length || !works.length) {
      toast.error(t.atLeastOneOptionRequired);
      return;
    }

    const seenWorks = new Set<string>();
    const normalizedWorks: Array<{
      work: string;
      unit: string;
      laborNormHoursPerUnit: number | null;
    }> = [];
    for (const row of works) {
      const work = row.work.trim();
      const unit = row.unit.trim();
      if (!work) {
        toast.error(t.optionCannotBeEmpty);
        return;
      }
      if (work.length > MAX_OPTION_LENGTH) {
        toast.error(t.optionMaxLength(MAX_OPTION_LENGTH));
        return;
      }
      const key = work.toLocaleLowerCase("lv");
      if (seenWorks.has(key)) {
        toast.error(t.optionAlreadyExists);
        return;
      }
      seenWorks.add(key);

      const rawNorm = row.laborNormHoursPerUnit.trim();
      const parsedNorm = rawNorm === "" ? null : Number(rawNorm.replace(",", "."));
      if (rawNorm !== "" && (!Number.isFinite(parsedNorm) || Number(parsedNorm) <= 0)) {
        toast.error(p.invalidNorm);
        return;
      }
      if (parsedNorm != null && !unit) {
        toast.error(p.unitRequired);
        return;
      }
      normalizedWorks.push({
        work,
        unit,
        laborNormHoursPerUnit: parsedNorm,
      });
    }

    setSaving(true);
    try {
      await saveDefaultConstructionSiteDiaryOptions({
        siteId,
        locations: locations.map((value) => value.trim()),
        works: normalizedWorks,
      });
      toast.success(t.dropdownOptionsUpdated);
      setOpen(false);
      onSaved?.();
    } catch (error: any) {
      toast.error(error?.message ?? t.failedUpdateDropdownOptions);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="mr-2 h-4 w-4" />
        {t.locationsWorks}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[75vh] max-h-[75vh] w-[96vw] max-w-[980px] flex-col overflow-hidden sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>{t.manageOptionsTitle}</DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeField}
            onValueChange={(value) => {
              setActiveField(value as ManagedField);
              resetEditor();
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="Location">{t.locationsTab}</TabsTrigger>
              <TabsTrigger value="Works">{t.worksTab}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchOption}
            disabled={loading}
          />

          {activeField === "Location" ? (
            <div className="flex gap-2">
              <Input
                value={newLocation}
                onChange={(event) => setNewLocation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    appendLocation();
                  }
                }}
                maxLength={MAX_OPTION_LENGTH}
                placeholder={t.addNewOption}
                disabled={loading}
              />
              <Button type="button" variant="outline" onClick={appendLocation} disabled={loading}>
                {t.add}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={loading}
              onClick={() => {
                setSearch("");
                setWorks((current) => [
                  ...current,
                  { work: "", unit: "", laborNormHoursPerUnit: "" },
                ]);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {p.addWork}
            </Button>
          )}

          <ScrollArea className="min-h-0 flex-1 pr-6">
            {loading ? (
              <div className="flex h-full min-h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeField === "Location" ? (
              <div className="space-y-2">
                {visibleLocations.map(({ option, index }) => (
                  <div
                    key={`${option}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2"
                  >
                    {editingIndex === index ? (
                      <Input
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditedLocation();
                        }}
                        maxLength={MAX_OPTION_LENGTH}
                        className="h-8"
                      />
                    ) : (
                      <p className="truncate text-sm" title={option}>{option}</p>
                    )}
                    <div className="flex items-center gap-1">
                      {editingIndex === index ? (
                        <>
                          <Button type="button" size="icon" variant="ghost" onClick={saveEditedLocation} aria-label={t.saveOption}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setEditingIndex(null)} aria-label={t.cancelEditingOption}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button type="button" size="icon" variant="ghost" onClick={() => { setEditingIndex(index); setEditingValue(option); }} aria-label={t.editOption}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button type="button" size="icon" variant="ghost" onClick={() => setLocations((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label={t.deleteOption}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!visibleLocations.length ? <p className="py-4 text-center text-sm text-muted-foreground">{t.noOptionsFound}</p> : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(220px,1fr)_150px_160px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground">
                  <div>{p.workName}</div>
                  <div>{p.unit}</div>
                  <div>{p.timeNorm}</div>
                  <div />
                </div>
                {visibleWorks.map(({ work, index }) => {
                  const availableUnits = Array.from(new Set([...unitOptions, work.unit].filter(Boolean)));
                  return (
                    <div key={index} className="grid grid-cols-[minmax(220px,1fr)_150px_160px_40px] items-center gap-2 rounded-md border p-2">
                      <Input value={work.work} maxLength={MAX_OPTION_LENGTH} onChange={(event) => updateWork(index, { work: event.target.value })} />
                      <select
                        value={work.unit}
                        onChange={(event) => updateWork(index, { unit: event.target.value })}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">{p.selectUnit}</option>
                        {availableUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                      <Input
                        value={work.laborNormHoursPerUnit}
                        inputMode="decimal"
                        placeholder={p.normHint}
                        onChange={(event) => updateWork(index, { laborNormHoursPerUnit: event.target.value })}
                      />
                      <Button type="button" size="icon" variant="ghost" onClick={() => setWorks((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label={t.deleteOption}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                {!visibleWorks.length ? <p className="py-4 text-center text-sm text-muted-foreground">{t.noOptionsFound}</p> : null}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button type="button" onClick={saveOptions} disabled={loading || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
