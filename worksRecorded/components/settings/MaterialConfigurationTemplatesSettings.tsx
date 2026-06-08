"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrganizationMaterialConfigurationTemplates } from "@/server/actions/material-configuration-template-actions";
import type {
  MaterialConfigurationTemplateAttachment,
  OrganizationMaterialConfigurationTemplate,
} from "@/lib/bis/material-configuration-templates";
import { UploadButton } from "@/lib/utils/UploadthingsComponents";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";

type MaterialTypeOption = {
  id: string;
  name: string;
  categoryName?: string | null;
  isHeader?: boolean;
};

type Props = {
  orgId: string;
  templates: OrganizationMaterialConfigurationTemplate[];
  materialMeasures: Array<{ id: string; name: string }>;
  materialTypes: MaterialTypeOption[];
  organizationLanguage?: string | null;
};

type TemplateDraft = OrganizationMaterialConfigurationTemplate;

function createTemplateId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyTemplate(): TemplateDraft {
  return {
    id: createTemplateId(),
    materialKind: "",
    materialType: "",
    manufacturer: "",
    measurement: "",
    measurementUnit: "",
    attachments: [],
  };
}

function copyTemplate(template: OrganizationMaterialConfigurationTemplate): TemplateDraft {
  return {
    id: template.id,
    materialKind: template.materialKind,
    materialType: template.materialType,
    manufacturer: template.manufacturer,
    measurement: template.measurement,
    measurementUnit: template.measurementUnit ?? "",
    attachments: template.attachments ?? [],
  };
}

function getAttachmentMimeType(file: { type?: string; name?: string }) {
  if (file.type) return file.type;
  if ((file.name || "").toLowerCase().endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export function MaterialConfigurationTemplatesSettings({
  orgId,
  templates,
  materialMeasures,
  materialTypes,
  organizationLanguage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [drafts, setDrafts] = React.useState<TemplateDraft[]>(() => templates.map(copyTemplate));
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formDraft, setFormDraft] = React.useState<TemplateDraft>(() => emptyTemplate());
  const isLatvian = organizationLanguage === "lv";

  React.useEffect(() => {
    setDrafts(templates.map(copyTemplate));
  }, [templates]);

  const text = {
    title: isLatvian ? "BIS materiālu konfigurāciju veidnes" : "BIS material configuration templates",
    description: isLatvian
      ? "Izveidojiet organizācijas līmeņa veidnes ar tādiem pašiem laukiem kā noliktavas dialogā “Izveidot BIS materiāla konfigurāciju”. Veidnes pēc tam ir pieejamas visos projektos."
      : "Create organization-level templates with the same fields as the warehouse “Create BIS material configuration” dialog. Templates are then available across projects.",
    add: isLatvian ? "Izveidot materiāla konfigurācijas veidni" : "Create material configuration template",
    edit: isLatvian ? "Rediģēt" : "Edit",
    remove: isLatvian ? "Dzēst" : "Delete",
    saveAll: isLatvian ? "Saglabāt veidnes" : "Save templates",
    saving: isLatvian ? "Saglabā..." : "Saving...",
    saved: isLatvian ? "Veidnes saglabātas" : "Templates saved",
    saveFailed: isLatvian ? "Neizdevās saglabāt veidnes" : "Failed to save templates",
    dialogTitle: isLatvian ? "Izveidot BIS materiāla konfigurācijas veidni" : "Create BIS material configuration template",
    editDialogTitle: isLatvian ? "Rediģēt BIS materiāla konfigurācijas veidni" : "Edit BIS material configuration template",
    dialogDescription: isLatvian
      ? "Aizpildiet tos pašus laukus, ko izmantojat noliktavā, veidojot BIS materiāla konfigurāciju."
      : "Fill the same fields used in the warehouse when creating a BIS material configuration.",
    materialKindRequired: isLatvian ? "Materiāla veids ir obligāts" : "Material kind is required",
    measurementRequired: isLatvian ? "Mērvienība ir obligāta" : "Measurement is required",
    materialTypeRequired: isLatvian ? "Materiāla tips ir obligāts" : "Material type is required",
    manufacturerRequired: isLatvian ? "Ražotājs ir obligāts" : "Manufacturer is required",
    materialKind: isLatvian ? "Materiāla veids" : "Material kind",
    materialKindPlaceholder: isLatvian ? "Piem., Betons C30/37" : "E.g. Concrete C30/37",
    measurement: isLatvian ? "Mērvienība" : "Measurement",
    selectMeasurement: isLatvian ? "Izvēlieties mērvienību" : "Select measurement",
    materialType: isLatvian ? "Materiāla tips" : "Material type",
    selectMaterialType: isLatvian ? "Izvēlieties materiāla tipu" : "Select material type",
    manufacturer: isLatvian ? "Ražotājs" : "Manufacturer",
    manufacturerPlaceholder: isLatvian ? "Ievadiet ražotāju" : "Enter manufacturer",
    declaration: isLatvian ? "Deklarācija" : "Declaration",
    filesSelected: (count: number) => (isLatvian ? `Izvēlēti faili: ${count}` : `${count} file(s) selected`),
    storedFiles: (count: number) => (isLatvian ? `Saglabāti faili: ${count}` : `${count} saved file(s)`),
    cancel: isLatvian ? "Atcelt" : "Cancel",
    saveTemplate: isLatvian ? "Saglabāt veidni" : "Save template",
    empty: isLatvian
      ? "Nav saglabātu veidņu. Izveidojiet pirmo organizācijas veidni."
      : "No templates saved. Create the first organization template.",
    noBisOptions: isLatvian
      ? "BIS klasifikatori nav pieejami. Pieslēdziet BIS, lai izmantotu izvēlnes."
      : "BIS classifiers are unavailable. Connect BIS to use dropdown options.",
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormDraft(emptyTemplate());
    setDialogOpen(true);
  };

  const openEditDialog = (template: TemplateDraft) => {
    setEditingId(template.id);
    setFormDraft(copyTemplate(template));
    setDialogOpen(true);
  };

  const updateFormDraft = (field: keyof TemplateDraft, value: string) => {
    setFormDraft((current) => ({ ...current, [field]: value }));
  };

  const persistTemplates = async (nextTemplates: TemplateDraft[]) => {
    const result = await updateOrganizationMaterialConfigurationTemplates(orgId, nextTemplates);
    setDrafts(result.templates.map(copyTemplate));
    toast.success(text.saved);
    router.refresh();
  };

  const saveFormDraft = () => {
    startTransition(async () => {
      const normalizedDraft: TemplateDraft = {
        ...formDraft,
        materialKind: formDraft.materialKind.trim(),
        materialType: formDraft.materialType.trim(),
        manufacturer: formDraft.manufacturer.trim(),
        measurement: formDraft.measurement.trim(),
        measurementUnit:
          materialMeasures.find((item) => item.id === formDraft.measurement)?.name ??
          formDraft.measurementUnit?.trim() ??
          null,
        attachments: formDraft.attachments ?? [],
      };

      if (!normalizedDraft.materialKind) {
        toast.error(text.materialKindRequired);
        return;
      }
      if (!normalizedDraft.measurement) {
        toast.error(text.measurementRequired);
        return;
      }
      if (!normalizedDraft.materialType) {
        toast.error(text.materialTypeRequired);
        return;
      }
      if (!normalizedDraft.manufacturer) {
        toast.error(text.manufacturerRequired);
        return;
      }

      try {
        const nextTemplates = editingId
          ? drafts.map((draft) => (draft.id === editingId ? normalizedDraft : draft))
          : [...drafts, normalizedDraft];

        await persistTemplates(nextTemplates);
        setDialogOpen(false);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : text.saveFailed);
      }
    });
  };

  const removeTemplate = (id: string) => {
    startTransition(async () => {
      try {
        await persistTemplates(drafts.filter((draft) => draft.id !== id));
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : text.saveFailed);
      }
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{text.title}</h2>
          <p className="text-sm text-muted-foreground">{text.description}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!materialMeasures.length || !materialTypes.length ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {text.noBisOptions}
          </p>
        ) : null}

        {drafts.length === 0 ? <p className="text-sm text-muted-foreground">{text.empty}</p> : null}

        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="font-medium">{draft.materialKind}</div>
                <div className="text-sm text-muted-foreground">
                  {draft.manufacturer} • {draft.measurementUnit || draft.measurement} • {draft.materialType}
                  {draft.attachments.length ? ` • ${text.storedFiles(draft.attachments.length)}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(draft)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {text.edit}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTemplate(draft.id)} disabled={isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {text.remove}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {text.add}
        </Button>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? text.editDialogTitle : text.dialogTitle}</DialogTitle>
            <DialogDescription>{text.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{text.materialKind}</Label>
              <Input
                value={formDraft.materialKind}
                onChange={(event) => updateFormDraft("materialKind", event.target.value)}
                placeholder={text.materialKindPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label>{text.measurement}</Label>
              <Select value={formDraft.measurement} onValueChange={(value) => updateFormDraft("measurement", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={text.selectMeasurement} />
                </SelectTrigger>
                <SelectContent>
                  {materialMeasures.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{text.materialType}</Label>
              <Select value={formDraft.materialType} onValueChange={(value) => updateFormDraft("materialType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={text.selectMaterialType} />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.isHeader}>
                      {item.categoryName ? `${item.categoryName} — ${item.name}` : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{text.manufacturer}</Label>
              <Input
                value={formDraft.manufacturer}
                onChange={(event) => updateFormDraft("manufacturer", event.target.value)}
                placeholder={text.manufacturerPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label>{text.declaration}</Label>
              <div className="rounded-md border border-dashed bg-muted/40 p-3">
                <UploadButton
                  endpoint="materialAttachmentUploader"
                  appearance={{ button: "w-full text-xs" }}
                  content={{ button: text.declaration }}
                  onClientUploadComplete={(res) => {
                    const uploaded = res
                      .map((file): MaterialConfigurationTemplateAttachment | null => {
                        const fileUrl = getUploadThingFileUrl(file);
                        if (!fileUrl) return null;

                        return {
                          name: file.name,
                          mimeType: getAttachmentMimeType(file),
                          fileUrl,
                        };
                      })
                      .filter((file): file is MaterialConfigurationTemplateAttachment => Boolean(file));

                    if (!uploaded.length) return;

                    setFormDraft((current) => ({
                      ...current,
                      attachments: [...current.attachments, ...uploaded],
                    }));
                  }}
                />
              </div>
              {formDraft.attachments.length ? (
                <p className="text-xs text-muted-foreground">{text.storedFiles(formDraft.attachments.length)}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {text.cancel}
            </Button>
            <Button onClick={saveFormDraft} disabled={isPending}>
              {isPending ? text.saving : text.saveTemplate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
