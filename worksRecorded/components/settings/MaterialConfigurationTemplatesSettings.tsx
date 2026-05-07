"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrganizationMaterialConfigurationTemplates } from "@/server/actions/material-configuration-template-actions";
import type { OrganizationMaterialConfigurationTemplate } from "@/lib/bis/material-configuration-templates";

type Props = {
  orgId: string;
  templates: OrganizationMaterialConfigurationTemplate[];
  organizationLanguage?: string | null;
};

type DraftTemplate = OrganizationMaterialConfigurationTemplate;

function createTemplateId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const emptyTemplate = (): DraftTemplate => ({
  id: createTemplateId(),
  materialKind: "",
  materialType: "",
  manufacturer: "",
  measurement: "",
  measurementUnit: "",
});

function copyTemplate(template: OrganizationMaterialConfigurationTemplate): DraftTemplate {
  return {
    id: template.id,
    materialKind: template.materialKind,
    materialType: template.materialType,
    manufacturer: template.manufacturer,
    measurement: template.measurement,
    measurementUnit: template.measurementUnit ?? "",
  };
}

export function MaterialConfigurationTemplatesSettings({
  orgId,
  templates,
  organizationLanguage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [drafts, setDrafts] = React.useState<DraftTemplate[]>(() => templates.map(copyTemplate));
  const isLatvian = organizationLanguage === "lv";

  React.useEffect(() => {
    setDrafts(templates.map(copyTemplate));
  }, [templates]);

  const text = {
    title: isLatvian ? "BIS materiālu konfigurāciju veidnes" : "BIS material configuration templates",
    description: isLatvian
      ? "Saglabājiet organizācijas līmeņa konfigurāciju veidnes, kuras var izmantot visos projektos. Izvēloties veidni noliktavā, WorksRecorded izveidos atbilstošu BIS konfigurāciju konkrētajā projektā."
      : "Save organization-wide configuration templates that can be reused across projects. When selected in the warehouse, WorksRecorded creates the matching BIS configuration for that project.",
    add: isLatvian ? "Pievienot veidni" : "Add template",
    save: isLatvian ? "Saglabāt veidnes" : "Save templates",
    saving: isLatvian ? "Saglabā..." : "Saving...",
    saved: isLatvian ? "Veidnes saglabātas" : "Templates saved",
    saveFailed: isLatvian ? "Neizdevās saglabāt veidnes" : "Failed to save templates",
    materialKind: isLatvian ? "Materiāla veids" : "Material kind",
    materialType: isLatvian ? "BIS materiāla tipa kods" : "BIS material type code",
    manufacturer: isLatvian ? "Ražotājs" : "Manufacturer",
    measurement: isLatvian ? "BIS mērvienības kods" : "BIS measurement code",
    measurementUnit: isLatvian ? "Mērvienības nosaukums" : "Measurement label",
    remove: isLatvian ? "Dzēst veidni" : "Remove template",
    required: isLatvian
      ? "Aizpildiet materiāla veidu, BIS materiāla tipu, ražotāju un BIS mērvienības kodu."
      : "Fill material kind, BIS material type, manufacturer, and BIS measurement code.",
    empty: isLatvian
      ? "Nav saglabātu veidņu. Pievienojiet pirmo organizācijas veidni."
      : "No templates saved. Add the first organization template.",
  };

  const updateDraft = (id: string, field: keyof DraftTemplate, value: string) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  const saveTemplates = () => {
    const normalizedDrafts = drafts.map((draft) => ({
      ...draft,
      materialKind: draft.materialKind.trim(),
      materialType: draft.materialType.trim(),
      manufacturer: draft.manufacturer.trim(),
      measurement: draft.measurement.trim(),
      measurementUnit: draft.measurementUnit?.trim() || null,
    }));

    const hasInvalidDraft = normalizedDrafts.some(
      (draft) => !draft.materialKind || !draft.materialType || !draft.manufacturer || !draft.measurement,
    );

    if (hasInvalidDraft) {
      toast.error(text.required);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateOrganizationMaterialConfigurationTemplates(orgId, normalizedDrafts);
        setDrafts(result.templates.map(copyTemplate));
        toast.success(text.saved);
        router.refresh();
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
        {drafts.length === 0 ? <p className="text-sm text-muted-foreground">{text.empty}</p> : null}

        {drafts.map((draft, index) => (
          <div key={draft.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium">#{index + 1}</div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDraft(draft.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {text.remove}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2 lg:col-span-2">
                <Label>{text.materialKind}</Label>
                <Input
                  value={draft.materialKind}
                  onChange={(event) => updateDraft(draft.id, "materialKind", event.target.value)}
                  placeholder="Betons C30/37"
                />
              </div>
              <div className="space-y-2">
                <Label>{text.materialType}</Label>
                <Input
                  value={draft.materialType}
                  onChange={(event) => updateDraft(draft.id, "materialType", event.target.value)}
                  placeholder="101"
                />
              </div>
              <div className="space-y-2">
                <Label>{text.manufacturer}</Label>
                <Input
                  value={draft.manufacturer}
                  onChange={(event) => updateDraft(draft.id, "manufacturer", event.target.value)}
                  placeholder="Ražotājs"
                />
              </div>
              <div className="space-y-2">
                <Label>{text.measurement}</Label>
                <Input
                  value={draft.measurement}
                  onChange={(event) => updateDraft(draft.id, "measurement", event.target.value)}
                  placeholder="12"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label>{text.measurementUnit}</Label>
                <Input
                  value={draft.measurementUnit ?? ""}
                  onChange={(event) => updateDraft(draft.id, "measurementUnit", event.target.value)}
                  placeholder="m3"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, emptyTemplate()])}>
            <Plus className="mr-2 h-4 w-4" />
            {text.add}
          </Button>
          <Button type="button" onClick={saveTemplates} disabled={isPending}>
            {isPending ? text.saving : text.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
