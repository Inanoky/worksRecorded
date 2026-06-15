"use client";

import * as React from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

function emptyZtcProjectRates(projectName: string): ZtcProjectTaskRates {
  return {
    projectName,
    works: [],
    additionalDetails: [],
    additionalWorks: [],
  };
}

function normalizeZtcProjectRatesForUi(
  rates: ZtcProjectTaskRates[],
): ZtcProjectTaskRates[] {
  const names = Array.from(
    new Set([
      ZTC_ALL_PROJECTS_RATE_NAME,
      ...rates.map((project) => project.projectName).filter(Boolean),
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

  React.useEffect(() => {
    if (!open) return;
    const nextDraft = normalizeZtcProjectRatesForUi(rates);
    setDraft(nextDraft);
    setSelectedProject((current) =>
      nextDraft.some((project) => project.projectName === current)
        ? current
        : ZTC_ALL_PROJECTS_RATE_NAME,
    );
  }, [open, rates]);

  const allProjects =
    draft.find((project) => project.projectName === ZTC_ALL_PROJECTS_RATE_NAME) ??
    emptyZtcProjectRates(ZTC_ALL_PROJECTS_RATE_NAME);
  const selectedProjectRates =
    draft.find((project) => project.projectName === selectedProject) ??
    emptyZtcProjectRates(selectedProject);
  const isAllProjects = selectedProject === ZTC_ALL_PROJECTS_RATE_NAME;
  const visibleRows = isAllProjects
    ? selectedProjectRates[selectedCategory]
    : allProjects[selectedCategory].map((master) => {
        const override = selectedProjectRates[selectedCategory].find(
          (entry) => entry.task.toLowerCase() === master.task.toLowerCase(),
        );
        return { task: master.task, rate: override?.rate ?? master.rate };
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
      setDraft((current) =>
        current.map((project) =>
          project.projectName === projectName
            ? { ...project, [category]: rows }
            : project,
        ),
      );
    },
    [],
  );

  const updateDraft = React.useCallback(
    (index: number, field: keyof ZtcDefaultTaskRate, value: string) => {
      if (isAllProjects) {
        const rows = [...visibleRows];
        rows[index] = { ...rows[index], [field]: value };
        setProjectCategoryRows(selectedProject, selectedCategory, rows);
        return;
      }

      const master = allProjects[selectedCategory][index];
      if (!master || field !== "rate") return;
      const currentRows = selectedProjectRates[selectedCategory];
      const nextRows = currentRows.some(
        (entry) => entry.task.toLowerCase() === master.task.toLowerCase(),
      )
        ? currentRows.map((entry) =>
            entry.task.toLowerCase() === master.task.toLowerCase()
              ? { ...entry, rate: value }
              : entry,
          )
        : [...currentRows, { task: master.task, rate: value }];
      setProjectCategoryRows(selectedProject, selectedCategory, nextRows);
    },
    [
      allProjects,
      isAllProjects,
      selectedCategory,
      selectedProject,
      selectedProjectRates,
      setProjectCategoryRows,
      visibleRows,
    ],
  );

  const removeDraftRow = React.useCallback(
    (index: number) => {
      if (!isAllProjects) return;
      const rows =
        visibleRows.length <= 1
          ? [{ task: "", rate: "" }]
          : visibleRows.filter((_, entryIndex) => entryIndex !== index);
      setProjectCategoryRows(selectedProject, selectedCategory, rows);
    },
    [
      isAllProjects,
      selectedCategory,
      selectedProject,
      setProjectCategoryRows,
      visibleRows,
    ],
  );

  const addTypedProject = React.useCallback(() => {
    const projectName = newProjectName.trim();
    if (!projectName) {
      toast.error("Ievadiet projekta nosaukumu.");
      return;
    }

    const existingProject = draft.find(
      (project) =>
        project.projectName.toLowerCase() === projectName.toLowerCase(),
    );
    if (existingProject) {
      setSelectedProject(existingProject.projectName);
      setAddingProject(false);
      setNewProjectName("");
      return;
    }

    setDraft((current) => [...current, emptyZtcProjectRates(projectName)]);
    setSelectedProject(projectName);
    setAddingProject(false);
    setNewProjectName("");
  }, [draft, newProjectName]);

  const handleProjectChange = React.useCallback((value: string) => {
    if (value === ZTC_ADD_PROJECT_SELECT_VALUE) {
      setAddingProject(true);
      window.setTimeout(() => newProjectInputRef.current?.focus(), 0);
      return;
    }

    setSelectedProject(value);
    setAddingProject(false);
  }, []);

  React.useEffect(() => {
    setRateSearch("");
  }, [selectedCategory, selectedProject]);

  const saveDraft = React.useCallback(async () => {
    if (!siteId) return;

    const normalizedRates = draft.map((project) => ({
      projectName: project.projectName.trim() || ZTC_ALL_PROJECTS_RATE_NAME,
      works: project.works
        .map((entry) => ({
          task: entry.task.trim(),
          rate: entry.rate.trim().replace(",", "."),
        }))
        .filter((entry) => entry.task || entry.rate),
      additionalDetails: project.additionalDetails
        .map((entry) => ({
          task: entry.task.trim(),
          rate: entry.rate.trim().replace(",", "."),
        }))
        .filter((entry) => entry.task || entry.rate),
      additionalWorks: project.additionalWorks
        .map((entry) => ({
          task: entry.task.trim(),
          rate: entry.rate.trim().replace(",", "."),
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
          !entry.task || !entry.rate || !Number.isFinite(Number(entry.rate)),
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
  }, [draft, onOpenChange, onSaved, siteId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] w-[96vw] max-w-none flex-col overflow-hidden p-0 sm:max-w-[940px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Darbu likmes</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
          <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
            <div className="space-y-1.5">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Projekts
              </div>
              <Select value={selectedProject} onValueChange={handleProjectChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Projekts" />
                </SelectTrigger>
                <SelectContent>
                  {draft.map((project) => (
                    <SelectItem key={project.projectName} value={project.projectName}>
                      {project.projectName}
                    </SelectItem>
                  ))}
                  <SelectItem value={ZTC_ADD_PROJECT_SELECT_VALUE}>
                    Pievienot projektu
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  onChange={(event) => setRateSearch(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b pb-2">
            <Tabs
              value={selectedCategory}
              onValueChange={(value) =>
                setSelectedCategory(value as ZtcRateCategory)
              }
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

          <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_44px] border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              <div>{selectedCategory === "additionalDetails" ? "Detaļa" : "Darbs"}</div>
              <div className="text-right">Likme</div>
              <div />
            </div>

            <div className="h-full overflow-y-auto pb-9">
              {filteredRows.length ? (
                filteredRows.map(({ entry, index }) => (
                  <div
                    key={`${entry.task}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_120px_44px] gap-2 border-b p-2 last:border-b-0"
                  >
                    <Input
                      value={entry.task}
                      maxLength={180}
                      disabled={!isAllProjects || saving}
                      placeholder={
                        selectedCategory === "additionalDetails"
                          ? "Detaļa, piemēram Kronšteins"
                          : selectedCategory === "additionalWorks"
                            ? "Papilddarbs, piemēram Izkraušana"
                            : "Darbs, piemēram R2 - Batten, 45x45mm"
                      }
                      onChange={(event) =>
                        updateDraft(index, "task", event.target.value)
                      }
                    />
                    <Input
                      value={entry.rate}
                      inputMode="decimal"
                      maxLength={12}
                      placeholder="Likme"
                      className="text-right"
                      onChange={(event) =>
                        updateDraft(index, "rate", event.target.value)
                      }
                    />
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
            onClick={() =>
              setProjectCategoryRows(selectedProject, selectedCategory, [
                ...visibleRows,
                { task: "", rate: "" },
              ])
            }
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
