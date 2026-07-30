"use client";

import * as React from "react";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDefaultConstructionSiteDiaryOptions,
  saveDefaultConstructionSiteDiaryOptions,
} from "@/flows/default-construction/backend/site-diary-options-actions";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSiteDiaryDialogMessages,
  normalizeOrganizationLanguage,
} from "@/lib/dashboard-i18n";
import { matchesPersistedWorkSearch } from "@/flows/default-construction/lib/site-diary-options-search";
import { compareSiteDiaryWorks } from "@/flows/default-construction/lib/site-diary-work-order";

const MAX_OPTION_LENGTH = 200;
type ManagedField = "Location" | "Works";
type WorkDraft = {
  id: string;
  savedWork: string;
  work: string;
  unit: string;
  laborNormHoursPerUnit: string;
  hourlyCost: string;
  costCalculationMode: "hourly" | "output";
  source?: {
    type: "forma2";
    documentId: string;
    positionId: string;
    ownedByForma2: boolean;
  };
};

const PRODUCTIVITY_MESSAGES = {
  en: {
    workName: "Work",
    unit: "Unit",
    timeNorm: "Time norm",
    normHint: "hours / unit",
    hourlyCost: "Hourly cost",
    hourlyCostHint: "EUR / hour",
    costMode: "Payment method",
    hourlyMode: "Hourly",
    outputMode: "Output",
    forma2Managed:
      "This work name is managed by the active Forma 2. Replace or remove the Forma 2 document to change it.",
    costModeHint:
      "Output: planned and factual costs both follow completed quantity × output rate. Hourly rate: factual cost follows recorded hours × hourly rate.",
    selectUnit: "No unit",
    addWork: "Add work",
    invalidNorm: "Time norm must be a number greater than zero.",
    invalidHourlyCost:
      "Hourly cost must be a number equal to or greater than zero.",
    unitRequired: "Select a unit when a time norm is set.",
  },
  lv: {
    workName: "Darbs",
    unit: "Mērv.",
    timeNorm: "Laika norma",
    normHint: "stundas / mērv.",
    hourlyCost: "Stundas likme",
    hourlyCostHint: "EUR / stundā",
    costMode: "Apmaksas veids",
    hourlyMode: "Stundas likme",
    outputMode: "Izpilde",
    forma2Managed:
      "Šī darba nosaukumu pārvalda aktīvā Forma 2. Lai to mainītu, aizstājiet vai noņemiet Formas 2 dokumentu.",
    costModeHint:
      "Izpilde: plāna un faktiskās izmaksas = izpildītais daudzums × izpildes likme. Stundas likme: faktiskās izmaksas = reģistrētās stundas × stundas likme.",
    selectUnit: "Nav norādīta",
    addWork: "Pievienot darbu",
    invalidNorm: "Laika normai jābūt skaitlim, kas lielāks par nulli.",
    invalidHourlyCost:
      "Stundas likmei jābūt skaitlim, kas nav mazāks par nulli.",
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
  const [activeField, setActiveField] =
    React.useState<ManagedField>("Location");
  const [locations, setLocations] = React.useState<string[]>([]);
  const [works, setWorks] = React.useState<WorkDraft[]>([]);
  const [unitOptions, setUnitOptions] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [newLocation, setNewLocation] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const nextWorkDraftId = React.useRef(0);

  const createWorkDraftId = React.useCallback(() => {
    const id = `site-diary-work-draft-${nextWorkDraftId.current}`;
    nextWorkDraftId.current += 1;
    return id;
  }, []);

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
            id: createWorkDraftId(),
            savedWork: row.work,
            work: row.work,
            unit: row.unit,
            laborNormHoursPerUnit:
              row.laborNormHoursPerUnit == null
                ? ""
                : String(row.laborNormHoursPerUnit),
            hourlyCost: row.hourlyCost == null ? "" : String(row.hourlyCost),
            costCalculationMode: row.costCalculationMode ?? "output",
            source: row.source,
          })),
        );
      })
      .catch((error: any) => {
        if (!cancelled)
          toast.error(error?.message ?? t.failedUpdateDropdownOptions);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    createWorkDraftId,
    open,
    resetEditor,
    siteId,
    t.failedUpdateDropdownOptions,
  ]);

  const normalizedSearch = search.trim().toLocaleLowerCase("lv");
  const visibleLocations = locations
    .map((option, index) => ({ option, index }))
    .filter(({ option }) =>
      option.toLocaleLowerCase("lv").includes(normalizedSearch),
    );
  const visibleWorks = works
    .map((work, index) => ({ work, index }))
    .filter(({ work }) => matchesPersistedWorkSearch(work, normalizedSearch))
    .sort((left, right) =>
      compareSiteDiaryWorks(left.work.work, right.work.work),
    );

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
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
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
      hourlyCost: number | null;
      costCalculationMode: "hourly" | "output";
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
      const parsedNorm =
        rawNorm === "" ? null : Number(rawNorm.replace(",", "."));
      if (
        rawNorm !== "" &&
        (!Number.isFinite(parsedNorm) || Number(parsedNorm) <= 0)
      ) {
        toast.error(p.invalidNorm);
        return;
      }
      if (parsedNorm != null && !unit) {
        toast.error(p.unitRequired);
        return;
      }
      const rawHourlyCost = row.hourlyCost.trim();
      const parsedHourlyCost =
        rawHourlyCost === "" ? null : Number(rawHourlyCost.replace(",", "."));
      if (
        rawHourlyCost !== "" &&
        (!Number.isFinite(parsedHourlyCost) || Number(parsedHourlyCost) < 0)
      ) {
        toast.error(p.invalidHourlyCost);
        return;
      }
      normalizedWorks.push({
        work,
        unit,
        laborNormHoursPerUnit: parsedNorm,
        hourlyCost: parsedHourlyCost,
        costCalculationMode: row.costCalculationMode,
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
        <DialogContent className="flex h-[75vh] max-h-[75vh] w-[96vw] max-w-[1120px] flex-col overflow-hidden sm:max-w-[1120px]">
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
              <Button
                type="button"
                variant="outline"
                onClick={appendLocation}
                disabled={loading}
              >
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
                  {
                    id: createWorkDraftId(),
                    savedWork: "",
                    work: "",
                    unit: "",
                    laborNormHoursPerUnit: "",
                    hourlyCost: "",
                    costCalculationMode: "output",
                    source: undefined,
                  },
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
                        onChange={(event) =>
                          setEditingValue(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditedLocation();
                        }}
                        maxLength={MAX_OPTION_LENGTH}
                        className="h-8"
                      />
                    ) : (
                      <p className="truncate text-sm" title={option}>
                        {option}
                      </p>
                    )}
                    <div className="flex items-center gap-1">
                      {editingIndex === index ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={saveEditedLocation}
                            aria-label={t.saveOption}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingIndex(null)}
                            aria-label={t.cancelEditingOption}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditingValue(option);
                          }}
                          aria-label={t.editOption}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setLocations((current) =>
                            current.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                        aria-label={t.deleteOption}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!visibleLocations.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t.noOptionsFound}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[minmax(220px,1fr)_120px_135px_135px_220px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground">
                  <div>{p.workName}</div>
                  <div>{p.unit}</div>
                  <div>{p.timeNorm}</div>
                  <div>{p.hourlyCost}</div>
                  <div title={p.costModeHint}>{p.costMode}</div>
                  <div />
                </div>
                {visibleWorks.map(({ work, index }) => {
                  const availableUnits = Array.from(
                    new Set([...unitOptions, work.unit].filter(Boolean)),
                  );
                  return (
                    <div
                      key={work.id}
                      className="grid grid-cols-[minmax(220px,1fr)_120px_135px_135px_220px_40px] items-center gap-2 rounded-md border p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Input
                          value={work.work}
                          maxLength={MAX_OPTION_LENGTH}
                          disabled={work.source?.ownedByForma2}
                          title={
                            work.source?.ownedByForma2
                              ? p.forma2Managed
                              : undefined
                          }
                          onChange={(event) =>
                            updateWork(index, { work: event.target.value })
                          }
                        />
                        {work.source?.ownedByForma2 ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0"
                            title={p.forma2Managed}
                          >
                            Forma 2
                          </Badge>
                        ) : null}
                      </div>
                      <select
                        value={work.unit}
                        onChange={(event) =>
                          updateWork(index, { unit: event.target.value })
                        }
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">{p.selectUnit}</option>
                        {availableUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={work.laborNormHoursPerUnit}
                        inputMode="decimal"
                        placeholder={p.normHint}
                        onChange={(event) =>
                          updateWork(index, {
                            laborNormHoursPerUnit: event.target.value,
                          })
                        }
                      />
                      <Input
                        value={work.hourlyCost}
                        inputMode="decimal"
                        placeholder={p.hourlyCostHint}
                        onChange={(event) =>
                          updateWork(index, { hourlyCost: event.target.value })
                        }
                      />
                      <div
                        className="flex h-10 items-center justify-center gap-2 rounded-md border border-input px-2"
                        title={p.costModeHint}
                      >
                        <span
                          className={`text-xs transition-colors ${
                            work.costCalculationMode === "output"
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {p.outputMode}
                        </span>
                        <Switch
                          checked={work.costCalculationMode === "hourly"}
                          onCheckedChange={(checked) =>
                            updateWork(index, {
                              costCalculationMode: checked
                                ? "hourly"
                                : "output",
                            })
                          }
                          aria-label={`${p.costMode}: ${
                            work.costCalculationMode === "hourly"
                              ? p.hourlyMode
                              : p.outputMode
                          }`}
                        />
                        <span
                          className={`text-xs transition-colors ${
                            work.costCalculationMode === "hourly"
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {p.hourlyMode}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setWorks((current) =>
                            current.filter((_, rowIndex) => rowIndex !== index),
                          )
                        }
                        disabled={work.source?.ownedByForma2}
                        title={
                          work.source?.ownedByForma2
                            ? p.forma2Managed
                            : undefined
                        }
                        aria-label={t.deleteOption}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                {!visibleWorks.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t.noOptionsFound}
                  </p>
                ) : null}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              onClick={saveOptions}
              disabled={loading || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
