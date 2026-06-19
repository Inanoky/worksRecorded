"use client";

import * as React from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateZtcDefaultTaskRates,
  type ZtcDefaultTaskRate,
  type ZtcProjectTaskRates,
  type ZtcRateCategory,
} from "@/components/sitediary/ZTC/actions";
import {
  isZtcComplexityCoefficientTask,
} from "@/components/sitediary/ZTC/ztc-rate-constants";
import {
  ZTC_RATE_UNITS,
  type ZtcRateUnit,
} from "@/components/sitediary/ZTC/ztc-rate-units";

type ZtcDefaultRatesDialogProps = {
  open: boolean;
  siteId: string | null;
  rates: ZtcProjectTaskRates[];
  projectOptions: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: (rates: ZtcProjectTaskRates[]) => void;
};

const ZTC_ALL_PROJECTS_RATE_NAME = "Visi projekti";
const ZTC_RATE_CATEGORY_LABELS: Record<ZtcRateCategory, string> = {
  works: "Darbi",
  additionalDetails: "Papilddetāļas",
  additionalWorks: "Papilddarbi",
};
const ZTC_RATE_CATEGORIES: ZtcRateCategory[] = [
  "works",
  "additionalDetails",
  "additionalWorks",
];
const ZTC_ADD_PROJECT_SELECT_VALUE = "__ztc_add_project__";
const ZTC_RATE_CATEGORY_UNITS: Record<ZtcRateCategory, string> = {
  works: "m2",
  additionalDetails: "gab.",
  additionalWorks: "st.",
};

function emptyZtcProjectRates(projectName: string, manual = false): ZtcProjectTaskRates {
  return {
    projectName,
    manual,
    works: [],
    additionalDetails: [],
    additionalWorks: [],
  };
}

function emptyZtcTaskRate(category: ZtcRateCategory = "additionalWorks"): ZtcDefaultTaskRate {
  return {
    task: "",
    rate: "",
    unit:
      category === "works"
        ? "m2"
        : category === "additionalDetails"
          ? "gab"
          : "st",
  };
}

function normalizeZtcProjectRatesForUi(
  rates: ZtcProjectTaskRates[],
  projectOptions: string[],
): ZtcProjectTaskRates[] {
  const availableProjects = new Set(
    projectOptions
      .map((project) => project.trim())
      .filter(Boolean)
      .map((project) => project.toLowerCase()),
  );
  const names = Array.from(
    new Set([
      ZTC_ALL_PROJECTS_RATE_NAME,
      ...projectOptions.map((project) => project.trim()).filter(Boolean),
      ...rates
        .map((project) => project.projectName)
        .filter(
          (project) =>
            project &&
            (project === ZTC_ALL_PROJECTS_RATE_NAME ||
              rates.find((rateProject) => rateProject.projectName === project)?.manual === true ||
              availableProjects.has(project.toLowerCase())),
        ),
    ]),
  );

  return names.map((name) => {
    const existing = rates.find((project) => project.projectName === name);
    return existing
      ? { ...emptyZtcProjectRates(name), ...existing }
      : emptyZtcProjectRates(name);
  });
}

export const ZtcDefaultRatesDialog = React.memo(function ZtcDefaultRatesDialog({
  open,
  siteId,
  rates,
  projectOptions,
  onOpenChange,
  onSaved,
}: ZtcDefaultRatesDialogProps) {
  const [draft, setDraft] = React.useState<ZtcProjectTaskRates[]>([
    emptyZtcProjectRates(ZTC_ALL_PROJECTS_RATE_NAME),
  ]);
  const [selectedProject, setSelectedProject] = React.useState(
    ZTC_ALL_PROJECTS_RATE_NAME,
  );
  const [selectedCategory, setSelectedCategory] =
    React.useState<ZtcRateCategory>("works");
  const [addingProject, setAddingProject] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [rateSearch, setRateSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const newProjectInputRef = React.useRef<HTMLInputElement | null>(null);
  const ratesFormRef = React.useRef<HTMLDivElement | null>(null);
  const draftRef = React.useRef<ZtcProjectTaskRates[]>(draft);

  React.useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  React.useEffect(() => {
    if (!open) return;
    const nextDraft = normalizeZtcProjectRatesForUi(rates, projectOptions);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSelectedProject((current) =>
      nextDraft.some((project) => project.projectName === current)
        ? current
        : ZTC_ALL_PROJECTS_RATE_NAME,
    );
  }, [open, projectOptions, rates]);

  const allProjects =
    draft.find((project) => project.projectName === ZTC_ALL_PROJECTS_RATE_NAME) ??
    emptyZtcProjectRates(ZTC_ALL_PROJECTS_RATE_NAME);
  const selectedProjectRates =
    draft.find((project) => project.projectName === selectedProject) ??
    emptyZtcProjectRates(selectedProject);
  const isAllProjects = selectedProject === ZTC_ALL_PROJECTS_RATE_NAME;
  const visibleRows = isAllProjects
    ? selectedProjectRates[selectedCategory]
    : allProjects[selectedCategory]
        .map((master) => {
          const override = selectedProjectRates[selectedCategory].find(
            (entry) => entry.task.toLowerCase() === master.task.toLowerCase(),
          );
          return {
            task: master.task,
            rate: override?.rate ?? master.rate,
            unit: override?.unit ?? master.unit,
          };
        });
  const normalizedRateSearch = rateSearch.trim().toLowerCase();
  const filteredRows = visibleRows
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (!normalizedRateSearch) return true;
      return `${entry.task} ${entry.rate}`
        .toLowerCase()
        .includes(normalizedRateSearch);
    });
  const categoryCount = selectedProjectRates[selectedCategory]?.length ?? 0;
  const masterCategoryCount = allProjects[selectedCategory]?.length ?? 0;
  const recordProjectNameSet = React.useMemo(
    () =>
      new Set(
        projectOptions
          .map((project) => project.trim().toLowerCase())
          .filter(Boolean),
      ),
    [projectOptions],
  );
  const canDeleteSelectedProject =
    !isAllProjects && !recordProjectNameSet.has(selectedProject.toLowerCase());
  const suggestedProjectNames = React.useMemo(
    () =>
      Array.from(
        new Set(
          projectOptions
            .map((project) => project.trim())
            .filter(
              (project) => project && project !== ZTC_ALL_PROJECTS_RATE_NAME,
            ),
        ),
      ).sort((a, b) => a.localeCompare(b, "lv")),
    [projectOptions],
  );

  const setProjectCategoryRows = React.useCallback(
    (
      projectName: string,
      category: ZtcRateCategory,
      rows: ZtcDefaultTaskRate[],
    ) => {
      setDraft((current) => {
        const next = current.map((project) =>
          project.projectName === projectName
            ? { ...project, [category]: rows }
            : project,
        );
        draftRef.current = next;
        return next;
      });
    },
    [],
  );

  const commitVisibleRateInputs = React.useCallback(() => {
    const form = ratesFormRef.current;
    const source = draftRef.current;
    if (!form) return source;

    const next = source.map((project) => ({
      ...project,
      works: project.works.map((entry) => ({ ...entry })),
      additionalDetails: project.additionalDetails.map((entry) => ({ ...entry })),
      additionalWorks: project.additionalWorks.map((entry) => ({ ...entry })),
    }));

    form
      .querySelectorAll<HTMLInputElement>("input[data-ztc-rate-field]")
      .forEach((input) => {
        const projectName = input.dataset.ztcProject ?? "";
        const category = input.dataset.ztcCategory as ZtcRateCategory | undefined;
        const field = input.dataset.ztcRateField as keyof ZtcDefaultTaskRate | undefined;
        const index = Number(input.dataset.ztcIndex);
        const masterTask = input.dataset.ztcTask ?? "";
        if (!projectName || !category || !field || !Number.isFinite(index)) return;

        const project = next.find((entry) => entry.projectName === projectName);
        if (!project) return;

        if (projectName === ZTC_ALL_PROJECTS_RATE_NAME) {
          const rows = project[category];
          if (!rows[index]) rows[index] = emptyZtcTaskRate(category);
          rows[index] = { ...rows[index], [field]: input.value };
          return;
        }

        if (field !== "rate" || !masterTask) return;
        const rows = project[category];
        const existingIndex = rows.findIndex(
          (entry) => entry.task.toLowerCase() === masterTask.toLowerCase(),
        );
        if (existingIndex >= 0) {
          rows[existingIndex] = { ...rows[existingIndex], rate: input.value };
        } else {
          const masterUnit =
            next
              .find((entry) => entry.projectName === ZTC_ALL_PROJECTS_RATE_NAME)
              ?.[category].find(
                (entry) => entry.task.toLowerCase() === masterTask.toLowerCase(),
              )?.unit ?? "st";
          rows.push({ task: masterTask, rate: input.value, unit: masterUnit });
        }
      });

    draftRef.current = next;
    setDraft(next);
    return next;
  }, []);

  const removeDraftRow = React.useCallback(
    (index: number) => {
      if (!isAllProjects) return;
      const committedDraft = commitVisibleRateInputs();
      const committedProject = committedDraft.find(
        (project) => project.projectName === selectedProject,
      );
      const committedRows = committedProject?.[selectedCategory] ?? visibleRows;
      if (isZtcComplexityCoefficientTask(committedRows[index]?.task ?? "")) return;
      const rows =
        committedRows.length <= 1
          ? [emptyZtcTaskRate(selectedCategory)]
          : committedRows.filter((_, entryIndex) => entryIndex !== index);
      setProjectCategoryRows(selectedProject, selectedCategory, rows);
    },
    [
      isAllProjects,
      selectedCategory,
      selectedProject,
      commitVisibleRateInputs,
      setProjectCategoryRows,
      visibleRows,
    ],
  );

  const addTypedProject = React.useCallback(() => {
    const currentDraft = commitVisibleRateInputs();
    const projectName = newProjectName.trim();
    if (!projectName) {
      toast.error("Ievadiet projekta nosaukumu.");
      return;
    }

    const existingProject = currentDraft.find(
      (project) =>
        project.projectName.toLowerCase() === projectName.toLowerCase(),
    );
    if (existingProject) {
      setSelectedProject(existingProject.projectName);
      setAddingProject(false);
      setNewProjectName("");
      return;
    }

    setDraft((current) => [...current, emptyZtcProjectRates(projectName, true)]);
    setSelectedProject(projectName);
    setAddingProject(false);
    setNewProjectName("");
  }, [commitVisibleRateInputs, newProjectName]);

  const handleProjectChange = React.useCallback((value: string) => {
    commitVisibleRateInputs();
    if (value === ZTC_ADD_PROJECT_SELECT_VALUE) {
      setAddingProject(true);
      window.setTimeout(() => newProjectInputRef.current?.focus(), 0);
      return;
    }

    setSelectedProject(value);
    setAddingProject(false);
  }, [commitVisibleRateInputs]);

  const deleteSelectedProject = React.useCallback(() => {
    if (isAllProjects) return;
    if (recordProjectNameSet.has(selectedProject.toLowerCase())) {
      toast.error("Projektu nevar dzēst, jo tam ir žurnāla ieraksti.");
      return;
    }

    const committedDraft = commitVisibleRateInputs();
    const nextDraft = committedDraft.filter(
      (project) => project.projectName !== selectedProject,
    );
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSelectedProject(ZTC_ALL_PROJECTS_RATE_NAME);
    setAddingProject(false);
    setNewProjectName("");
  }, [
    commitVisibleRateInputs,
    isAllProjects,
    recordProjectNameSet,
    selectedProject,
  ]);

  React.useEffect(() => {
    setRateSearch("");
  }, [selectedCategory, selectedProject]);

  const setAdditionalWorkUnit = React.useCallback(
    (index: number, task: string, unit: ZtcRateUnit) => {
      const committedDraft = commitVisibleRateInputs();
      const next = committedDraft.map((project) => {
        if (project.projectName !== selectedProject) return project;

        const rows = [...project.additionalWorks];
        if (isAllProjects) {
          rows[index] = {
            ...(rows[index] ?? emptyZtcTaskRate("additionalWorks")),
            unit,
          };
        } else {
          const existingIndex = rows.findIndex(
            (entry) => entry.task.toLowerCase() === task.toLowerCase(),
          );
          if (existingIndex >= 0) {
            rows[existingIndex] = { ...rows[existingIndex], unit };
          } else {
            rows.push({
              task,
              rate: visibleRows[index]?.rate ?? "",
              unit,
            });
          }
        }

        return { ...project, additionalWorks: rows };
      });

      draftRef.current = next;
      setDraft(next);
    },
    [commitVisibleRateInputs, isAllProjects, selectedProject, visibleRows],
  );

  const saveDraft = React.useCallback(async () => {
    if (!siteId) return;

    const committedDraft = commitVisibleRateInputs();
    const normalizedRates = committedDraft.map((project) => ({
      projectName: project.projectName.trim() || ZTC_ALL_PROJECTS_RATE_NAME,
      manual: project.manual === true,
      works: project.works
        .map((entry) => ({
          task: entry.task.trim(),
          rate: entry.rate.trim().replace(",", "."),
          unit: entry.unit,
        }))
        .filter((entry) => entry.task || entry.rate),
      additionalDetails: project.additionalDetails
        .map((entry) => ({
          task: entry.task.trim(),
          rate: entry.rate.trim().replace(",", "."),
          unit: entry.unit,
        }))
        .filter((entry) => entry.task || entry.rate),
      additionalWorks: project.additionalWorks
        .map((entry) => ({
          task: entry.task.trim(),
          rate: entry.rate.trim().replace(",", "."),
          unit: entry.unit,
        }))
        .filter((entry) => entry.task || entry.rate),
    }));

    const invalid = normalizedRates
      .flatMap((project) => [
        ...project.works,
        ...project.additionalDetails,
        ...project.additionalWorks,
      ])
      .find(
        (entry) =>
          !entry.task ||
          !entry.rate ||
          !Number.isFinite(Number(entry.rate)),
      );
    if (invalid) {
      toast.error("Katrai darbu likmei jānorāda darbs un derīga likme.");
      return;
    }

    try {
      setSaving(true);
      const result = await updateZtcDefaultTaskRates({
        siteId,
        rates: normalizedRates,
      });
      if (!result?.ok) {
        toast.error("Neizdevās saglabāt darbu likmes.");
        return;
      }

      onSaved(result.rates);
      onOpenChange(false);
      toast.success("Darbu likmes saglabātas.");
    } catch (error: any) {
      toast.error(error?.message ?? "Neizdevās saglabāt darbu likmes.");
    } finally {
      setSaving(false);
    }
  }, [commitVisibleRateInputs, onOpenChange, onSaved, siteId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] w-[96vw] max-w-none flex-col overflow-hidden p-0 sm:max-w-[940px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Darbu likmes</DialogTitle>
          <DialogDescription className="sr-only">
            Pārvaldīt ZTC projektu, darbu, papilddetāļu un papilddarbu likmes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Projekts
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Select value={selectedProject} onValueChange={handleProjectChange}>
                  <SelectTrigger className="h-9 min-w-0 max-w-full overflow-hidden">
                    <SelectValue
                      className="min-w-0 flex-1 truncate text-left"
                      placeholder="Projekts"
                    />
                  </SelectTrigger>
                  <SelectContent className="max-w-[min(90vw,32rem)]">
                    {draft.map((project) => (
                      <SelectItem
                        key={project.projectName}
                        value={project.projectName}
                        className="whitespace-normal break-words"
                      >
                        {project.projectName}
                      </SelectItem>
                    ))}
                    <SelectItem value={ZTC_ADD_PROJECT_SELECT_VALUE}>
                      Pievienot projektu
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={saving || !canDeleteSelectedProject}
                  title={
                    isAllProjects
                      ? "Visi projekti nav dzēšams."
                      : canDeleteSelectedProject
                        ? "Dzēst projektu no likmēm"
                        : "Projektu nevar dzēst, jo tam ir žurnāla ieraksti."
                  }
                  onClick={deleteSelectedProject}
                  aria-label="Dzēst projektu"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {addingProject ? (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    ref={newProjectInputRef}
                    value={newProjectName}
                    list="ztc-rate-project-suggestions"
                    maxLength={120}
                    placeholder="Projekta nosaukums"
                    onChange={(event) => setNewProjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTypedProject();
                      }
                      if (event.key === "Escape") {
                        setAddingProject(false);
                        setNewProjectName("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTypedProject}
                    disabled={saving}
                  >
                    Pievienot
                  </Button>
                  <datalist id="ztc-rate-project-suggestions">
                    {suggestedProjectNames.map((project) => (
                      <option key={project} value={project} />
                    ))}
                  </datalist>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Meklēt
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={rateSearch}
                  className="h-9 pl-8"
                  placeholder="Meklēt likmi..."
                  onChange={(event) => {
                    commitVisibleRateInputs();
                    setRateSearch(event.target.value);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b pb-2">
            <Tabs
              value={selectedCategory}
              onValueChange={(value) => {
                commitVisibleRateInputs();
                setSelectedCategory(value as ZtcRateCategory);
              }}
            >
              <TabsList className="h-9">
                {ZTC_RATE_CATEGORIES.map((category) => (
                  <TabsTrigger key={category} value={category} className="h-8">
                    {ZTC_RATE_CATEGORY_LABELS[category]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="shrink-0 text-xs text-muted-foreground">
              {isAllProjects
                ? `${categoryCount} likmes`
                : `${masterCategoryCount} likmes, ${categoryCount} korekcijas`}
            </div>
          </div>

          <div ref={ratesFormRef} className="min-h-0 flex-1 overflow-hidden rounded-md border">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_72px_44px] border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div>{selectedCategory === "additionalDetails" ? "Detaļa" : "Darbs"}</div>
              <div className="text-right">Likme</div>
              <div className="text-center">Mērv.</div>
              <div />
            </div>

            <div className="h-full overflow-y-auto pb-9">
              {filteredRows.length ? (
                filteredRows.map(({ entry, index }) => (
                  <div
                    key={`${entry.task}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_120px_72px_44px] gap-2 border-b p-2 last:border-b-0"
                  >
                    <Input
                      defaultValue={entry.task}
                      key={`${selectedProject}-${selectedCategory}-${index}-task-${entry.task}`}
                      data-ztc-rate-field="task"
                      data-ztc-project={selectedProject}
                      data-ztc-category={selectedCategory}
                      data-ztc-index={index}
                      data-ztc-task={entry.task}
                      maxLength={180}
                      disabled={
                        !isAllProjects ||
                        saving ||
                        isZtcComplexityCoefficientTask(entry.task)
                      }
                      placeholder={
                        selectedCategory === "additionalDetails"
                          ? "Detaļa, piemēram Kronšteins"
                          : selectedCategory === "additionalWorks"
                            ? "Papilddarbs, piemēram Izkraušana"
                            : "Darbs, piemēram R2 - Batten, 45x45mm"
                      }
                    />
                    <Input
                      defaultValue={entry.rate}
                      key={`${selectedProject}-${selectedCategory}-${index}-rate-${entry.task}-${entry.rate}`}
                      data-ztc-rate-field="rate"
                      data-ztc-project={selectedProject}
                      data-ztc-category={selectedCategory}
                      data-ztc-index={index}
                      data-ztc-task={entry.task}
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="Likme"
                      className="text-right"
                    />
                    {selectedCategory === "additionalWorks" &&
                    !isZtcComplexityCoefficientTask(entry.task) ? (
                      <Select
                        value={entry.unit}
                        disabled={saving}
                        onValueChange={(unit) =>
                          setAdditionalWorkUnit(
                            index,
                            entry.task,
                            unit as ZtcRateUnit,
                          )
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Mērv." />
                        </SelectTrigger>
                        <SelectContent>
                          {ZTC_RATE_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-9 items-center justify-center rounded-md border bg-muted/40 px-2 text-sm font-medium text-muted-foreground">
                        {isZtcComplexityCoefficientTask(entry.task)
                          ? "x"
                          : ZTC_RATE_CATEGORY_UNITS[selectedCategory]}
                      </div>
                    )}
                    {isZtcComplexityCoefficientTask(entry.task) ? (
                      <div />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={saving || !isAllProjects}
                        onClick={() => removeDraftRow(index)}
                        aria-label="Dzēst likmi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-32 items-center justify-center px-3 py-8 text-sm text-muted-foreground">
                  {rateSearch
                    ? "Nav atbilstošu likmju."
                    : "Šajā sadaļā vēl nav likmju."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving || !isAllProjects}
            onClick={() => {
              const committedDraft = commitVisibleRateInputs();
              const committedProject = committedDraft.find(
                (project) => project.projectName === selectedProject,
              );
              const committedRows = committedProject?.[selectedCategory] ?? visibleRows;
              setProjectCategoryRows(selectedProject, selectedCategory, [
                ...committedRows,
                emptyZtcTaskRate(selectedCategory),
              ]);
            }}
          >
            Pievienot likmi
          </Button>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Atcelt
            </Button>
            <Button type="button" disabled={saving} onClick={saveDraft}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Saglabāt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
