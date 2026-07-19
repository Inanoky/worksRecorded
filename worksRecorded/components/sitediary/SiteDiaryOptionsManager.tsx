"use client";

import * as React from "react";
import { Check, Loader2, Pencil, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
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
import {
  getConfig,
  updateSiteDiaryDropdownOptions,
} from "@/server/actions/site-diary-actions";

const MANAGED_FIELDS = ["Location", "Works"] as const;
const MAX_OPTION_LENGTH = 200;

type ManagedField = (typeof MANAGED_FIELDS)[number];
type OptionsByField = Record<ManagedField, string[]>;

function readOptions(config: Record<string, any>, field: ManagedField): string[] {
  const dropdownOptions = config?.[field]?.DropDownOptions;
  if (!dropdownOptions || typeof dropdownOptions !== "object") return [];

  return Array.from(
    new Set(
      Object.values(dropdownOptions)
        .map((option) => String(option ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function SiteDiaryOptionsManager({
  siteId,
  organizationLanguage,
  onSaved,
}: {
  siteId: string;
  organizationLanguage?: string | null;
  onSaved?: () => void;
}) {
  const t = getSiteDiaryDialogMessages(
    normalizeOrganizationLanguage(organizationLanguage),
  );
  const [open, setOpen] = React.useState(false);
  const [activeField, setActiveField] = React.useState<ManagedField>("Location");
  const [options, setOptions] = React.useState<OptionsByField>({ Location: [], Works: [] });
  const [search, setSearch] = React.useState("");
  const [newOption, setNewOption] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const resetEditor = React.useCallback(() => {
    setSearch("");
    setNewOption("");
    setEditingIndex(null);
    setEditingValue("");
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    resetEditor();

    getConfig(siteId)
      .then((savedConfig) => {
        if (cancelled) return;
        const config = (savedConfig ?? defaultConfig) as Record<string, any>;
        setOptions({
          Location: readOptions(config, "Location"),
          Works: readOptions(config, "Works"),
        });
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

  const activeOptions = options[activeField];
  const normalizedSearch = search.trim().toLocaleLowerCase("lv");
  const visibleOptions = activeOptions
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.toLocaleLowerCase("lv").includes(normalizedSearch));

  const updateActiveOptions = (updater: (current: string[]) => string[]) => {
    setOptions((current) => ({
      ...current,
      [activeField]: updater(current[activeField]),
    }));
  };

  const validateOption = (rawValue: string, ignoredIndex?: number) => {
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
      activeOptions.some(
        (option, index) =>
          index !== ignoredIndex && option.toLocaleLowerCase("lv") === value.toLocaleLowerCase("lv"),
      )
    ) {
      toast.error(t.optionAlreadyExists);
      return null;
    }
    return value;
  };

  const appendOption = () => {
    const value = validateOption(newOption);
    if (!value) return;
    updateActiveOptions((current) => [...current, value]);
    setNewOption("");
  };

  const saveEditedOption = () => {
    if (editingIndex == null) return;
    const value = validateOption(editingValue, editingIndex);
    if (!value) return;
    updateActiveOptions((current) =>
      current.map((option, index) => (index === editingIndex ? value : option)),
    );
    setEditingIndex(null);
    setEditingValue("");
  };

  const saveOptions = async () => {
    const normalized = Object.fromEntries(
      MANAGED_FIELDS.map((field) => [
        field,
        Array.from(new Set(options[field].map((option) => option.trim()).filter(Boolean))),
      ]),
    ) as OptionsByField;

    if (MANAGED_FIELDS.some((field) => normalized[field].length === 0)) {
      toast.error(t.atLeastOneOptionRequired);
      return;
    }
    if (
      MANAGED_FIELDS.some((field) =>
        normalized[field].some((option) => option.length > MAX_OPTION_LENGTH),
      )
    ) {
      toast.error(t.eachOptionMaxLength(MAX_OPTION_LENGTH));
      return;
    }

    setSaving(true);
    try {
      for (const fieldKey of MANAGED_FIELDS) {
        await updateSiteDiaryDropdownOptions({
          siteId,
          fieldKey,
          options: normalized[fieldKey],
        });
      }
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
        <DialogContent className="flex h-[75vh] max-h-[75vh] w-[96vw] max-w-[860px] flex-col overflow-hidden sm:max-w-[860px]">
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

          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(event) => setNewOption(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  appendOption();
                }
              }}
              maxLength={MAX_OPTION_LENGTH}
              placeholder={t.addNewOption}
              disabled={loading}
            />
            <Button type="button" variant="outline" onClick={appendOption} disabled={loading}>
              {t.add}
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-6">
            {loading ? (
              <div className="flex h-full min-h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {visibleOptions.map(({ option, index }) => (
                  <div
                    key={`${option}-${index}`}
                    className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0 overflow-hidden">
                      {editingIndex === index ? (
                        <Input
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveEditedOption();
                            }
                          }}
                          maxLength={MAX_OPTION_LENGTH}
                          className="h-8 min-w-0 w-full"
                        />
                      ) : (
                        <p className="block max-w-full truncate text-sm" title={option}>
                          {option}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {editingIndex === index ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={saveEditedOption}
                            aria-label={t.saveOption}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingIndex(null);
                              setEditingValue("");
                            }}
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
                          updateActiveOptions((current) =>
                            current.filter((_, optionIndex) => optionIndex !== index),
                          )
                        }
                        aria-label={t.deleteOption}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {visibleOptions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t.noOptionsFound}
                  </p>
                ) : null}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
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
