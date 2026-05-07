"use client"

import { useTransition } from "react"
import * as React from "react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export const NO_MATCH_VALUE = "no_match"
const CREATE_VALUE = "__create_material_configuration__"

export type MaterialConfigSelectMessages = {
  materialKindRequired: string
  measurementRequired: string
  materialTypeRequired: string
  manufacturerRequired: string
  createdAndSelected: string
  cleared: string
  updated: string
  updateFailed: string
  createFailed: string
  searchMaterialPlaceholder: string
  noConfiguration: string
  createConfigurationOption: string
  createDialogTitle: string
  createDialogDescription: string
  materialKind: string
  materialKindPlaceholder: string
  measurement: string
  selectMeasurement: string
  materialType: string
  selectMaterialType: string
  manufacturer: string
  manufacturerPlaceholder: string
  declaration: string
  filesSelected: (count: number) => string
  bisSourceLabel: string
  organizationTemplateSourceLabel: string
  templateCreatedAndSelected: string
  templateCreateFailed: string
  chooseOrganizationTemplate: string
  selectOrganizationTemplate: string
  cancel: string
  create: string
  creating: string
}

const DEFAULT_MESSAGES: MaterialConfigSelectMessages = {
  materialKindRequired: "Material kind is required",
  measurementRequired: "Measurement is required",
  materialTypeRequired: "Material type is required",
  manufacturerRequired: "Manufacturer is required",
  createdAndSelected: "Material configuration created and selected",
  cleared: "BIS material configuration cleared",
  updated: "BIS material configuration updated",
  updateFailed: "Failed to update BIS material configuration",
  createFailed: "Failed to create material configuration",
  searchMaterialPlaceholder: "Search material...",
  noConfiguration: "— No configuration —",
  createConfigurationOption: "+ Create material configuration",
  createDialogTitle: "Create BIS material configuration",
  createDialogDescription:
    "Create a new configuration and attach supporting files before sending it to BIS.",
  materialKind: "Material kind",
  materialKindPlaceholder: "E.g. Concrete C30/37",
  measurement: "Measurement",
  selectMeasurement: "Select measurement",
  materialType: "Material type",
  selectMaterialType: "Select material type",
  manufacturer: "Manufacturer",
  manufacturerPlaceholder: "Enter manufacturer",
  declaration: "Declaration",
  filesSelected: (count) => `${count} file(s) selected`,
  bisSourceLabel: "BIS",
  organizationTemplateSourceLabel: "Organization template",
  templateCreatedAndSelected: "Organization template created in BIS and selected",
  templateCreateFailed: "Failed to create BIS configuration from organization template",
  chooseOrganizationTemplate: "Organization template",
  selectOrganizationTemplate: "Select organization template",
  cancel: "Cancel",
  create: "Create",
  creating: "Creating...",
}

export type MaterialCategory = {
  id: string
  material_kind: string
  measurement: string | null
  measurement_unit: string | null
  source?: "bis" | "organization_template"
  materialType?: string | null
  manufacturer?: string | null
  attachments?: Array<{
    name: string
    mimeType: string
    base64Data: string
  }>
}

type MaterialTypeOption = {
  id: string
  name: string
  categoryName?: string | null
  isHeader?: boolean
}

export default function MaterialConfigSelect({
  siteId,
  recordId,
  value,
  disabled,
  onSave,
  onCreate,
  categories,
  organizationTemplates = [],
  measurements,
  materialTypes,
  selectConfigurationLabel = "Select configuration",
  messages = DEFAULT_MESSAGES,
}: {
  siteId: string
  recordId: string
  value?: string | null
  disabled?: boolean
  onSave: (
    recordId: string,
    config: {
      categoryId: string
      categoryName: string
      measurementUnitId: string
      measurementUnit: string
    }
  ) => Promise<{ success: true }>
  onCreate: (
    siteId: string,
    payload: {
      materialKind: string
      materialType: string
      manufacturer: string
      measurement: string
      attachments: Array<{
        name: string
        mimeType: string
        base64Data: string
      }>
    }
  ) => Promise<{
    success: true
    category: MaterialCategory
  }>
  categories: MaterialCategory[]
  organizationTemplates?: MaterialCategory[]
  measurements: Array<{ id: string; name: string }>
  materialTypes: MaterialTypeOption[]
  selectConfigurationLabel?: string
  messages?: MaterialConfigSelectMessages
}) {
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [materialKind, setMaterialKind] = React.useState("")
  const [materialType, setMaterialType] = React.useState("")
  const [manufacturer, setManufacturer] = React.useState("")
  const [measurement, setMeasurement] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])
  const [templateAttachments, setTemplateAttachments] = React.useState<NonNullable<MaterialCategory["attachments"]>>([])
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("")
  const [categorySearch, setCategorySearch] = React.useState("")

  const selectedValue =
    value && value !== NO_MATCH_VALUE ? value : NO_MATCH_VALUE
  const filteredCategories = React.useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    if (!query) return categories
    return categories.filter((category) =>
      [
        category.material_kind,
        category.measurement_unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
  }, [categories, categorySearch])

  const toBase64 = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!)
    }
    return btoa(binary)
  }

  const handleCreate = () => {
    startTransition(async () => {
      try {
        if (!materialKind.trim()) {
          toast.error(messages.materialKindRequired)
          return
        }
        if (!measurement) {
          toast.error(messages.measurementRequired)
          return
        }
        if (!materialType) {
          toast.error(messages.materialTypeRequired)
          return
        }
        if (!manufacturer.trim()) {
          toast.error(messages.manufacturerRequired)
          return
        }

        const attachments = [
          ...templateAttachments,
          ...(await Promise.all(
            files.map(async (file) => ({
              name: file.name,
              mimeType: file.type || "application/octet-stream",
              base64Data: await toBase64(file),
            })),
          )),
        ]

        const result = await onCreate(siteId, {
          materialKind: materialKind.trim(),
          materialType,
          manufacturer: manufacturer.trim(),
          measurement,
          attachments,
        })

        await onSave(recordId, {
          categoryId: result.category.id,
          categoryName: result.category.material_kind,
          measurementUnitId: result.category.measurement ?? "",
          measurementUnit: result.category.measurement_unit ?? "",
        })

        toast.success(messages.createdAndSelected)
        setDialogOpen(false)
        setMaterialKind("")
        setMaterialType("")
        setManufacturer("")
        setMeasurement("")
        setFiles([])
        setTemplateAttachments([])
        setSelectedTemplateId("")
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : messages.createFailed)
      }
    })
  }

  return (
    <>
      <Select
        value={selectedValue}
        onValueChange={(selectedId) => {
          if (selectedId === CREATE_VALUE) {
            setDialogOpen(true)
            return
          }

          startTransition(async () => {
            try {
              if (selectedId === NO_MATCH_VALUE) {
                await onSave(recordId, {
                  categoryId: NO_MATCH_VALUE,
                  categoryName: "",
                  measurementUnitId: "",
                  measurementUnit: "",
                })
                toast.success(messages.cleared)
                return
              }

              const selected = categories.find((c) => c.id === selectedId)
              if (!selected) return

              await onSave(recordId, {
                categoryId: selected.id,
                categoryName: selected.material_kind,
                measurementUnitId: selected.measurement ?? "",
                measurementUnit: selected.measurement_unit ?? "",
              })

              toast.success(messages.updated)
            } catch (error) {
              console.error(error)
              toast.error(messages.updateFailed)
            }
          })
        }}
        disabled={disabled || pending}
      >
        <SelectTrigger className="w-full min-w-0">
          <SelectValue placeholder={selectConfigurationLabel} />
        </SelectTrigger>

        <SelectContent>
          <div className="px-2 pb-2">
            <Input
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder={messages.searchMaterialPlaceholder}
            />
          </div>
          <SelectItem value={NO_MATCH_VALUE}>{messages.noConfiguration}</SelectItem>
          <SelectItem value={CREATE_VALUE}>{messages.createConfigurationOption}</SelectItem>

          {filteredCategories.map((config) => (
            <SelectItem key={config.id} value={config.id}>
              {config.material_kind}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.createDialogTitle}</DialogTitle>
            <DialogDescription>
              {messages.createDialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {organizationTemplates.length > 0 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{messages.chooseOrganizationTemplate}</label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(templateId) => {
                    setSelectedTemplateId(templateId)
                    const template = organizationTemplates.find((item) => item.id === templateId)
                    if (!template) return

                    setMaterialKind(template.material_kind)
                    setMaterialType(template.materialType ?? "")
                    setManufacturer(template.manufacturer ?? "")
                    setMeasurement(template.measurement ?? "")
                    setTemplateAttachments(template.attachments ?? [])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={messages.selectOrganizationTemplate} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.material_kind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.materialKind}</label>
              <Input
                value={materialKind}
                onChange={(event) => setMaterialKind(event.target.value)}
                placeholder={messages.materialKindPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.measurement}</label>
              <Select value={measurement} onValueChange={setMeasurement}>
                <SelectTrigger>
                  <SelectValue placeholder={messages.selectMeasurement} />
                </SelectTrigger>
                <SelectContent>
                  {measurements.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.materialType}</label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger>
                  <SelectValue placeholder={messages.selectMaterialType} />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.isHeader}>
                      {item.categoryName
                        ? `${item.categoryName} — ${item.name}`
                        : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.manufacturer}</label>
              <Input
                value={manufacturer}
                onChange={(event) => setManufacturer(event.target.value)}
                placeholder={messages.manufacturerPlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{messages.declaration}</label>
              <Input
                type="file"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
              {templateAttachments.length + files.length ? (
                <p className="text-xs text-muted-foreground">
                  {messages.filesSelected(templateAttachments.length + files.length)}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {messages.cancel}
            </Button>
            <Button onClick={handleCreate} disabled={pending}>
              {pending ? messages.creating : messages.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
