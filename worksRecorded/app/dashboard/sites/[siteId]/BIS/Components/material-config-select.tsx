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

export type MaterialCategory = {
  id: string
  material_kind: string
  measurement: string | null
  measurement_unit: string | null
}

export default function MaterialConfigSelect({
  siteId,
  recordId,
  value,
  disabled,
  onSave,
  onCreate,
  categories,
  measurements,
  materialTypes,
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
  measurements: Array<{ id: string; name: string }>
  materialTypes: Array<{ id: string; name: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [materialKind, setMaterialKind] = React.useState("")
  const [materialType, setMaterialType] = React.useState("")
  const [measurement, setMeasurement] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])

  const selectedValue =
    value && value !== NO_MATCH_VALUE ? value : NO_MATCH_VALUE

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
          toast.error("Material kind is required")
          return
        }
        if (!measurement) {
          toast.error("Measurement is required")
          return
        }
        if (!materialType) {
          toast.error("Material type is required")
          return
        }

        const attachments = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            base64Data: await toBase64(file),
          })),
        )

        const result = await onCreate(siteId, {
          materialKind: materialKind.trim(),
          materialType,
          measurement,
          attachments,
        })

        await onSave(recordId, {
          categoryId: result.category.id,
          categoryName: result.category.material_kind,
          measurementUnitId: result.category.measurement ?? "",
          measurementUnit: result.category.measurement_unit ?? "",
        })

        toast.success("Material configuration created and selected")
        setDialogOpen(false)
        setMaterialKind("")
        setMaterialType("")
        setMeasurement("")
        setFiles([])
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "Failed to create material configuration")
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
                toast.success("BIS material configuration cleared")
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

              toast.success("BIS material configuration updated")
            } catch (error) {
              console.error(error)
              toast.error("Failed to update BIS material configuration")
            }
          })
        }}
        disabled={disabled || pending}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select configuration" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={NO_MATCH_VALUE}>— No configuration —</SelectItem>
          <SelectItem value={CREATE_VALUE}>+ Create material configuration</SelectItem>

          {categories.map((config) => (
            <SelectItem key={config.id} value={config.id}>
              {config.material_kind}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create BIS material configuration</DialogTitle>
            <DialogDescription>
              Create a new configuration and attach supporting files before sending it to BIS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Material kind</label>
              <Input
                value={materialKind}
                onChange={(event) => setMaterialKind(event.target.value)}
                placeholder="E.g. Concrete C30/37"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Measurement</label>
              <Select value={measurement} onValueChange={setMeasurement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select measurement" />
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
              <label className="text-sm font-medium">Material type</label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material type" />
                </SelectTrigger>
                <SelectContent>
                  {materialTypes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Attachments</label>
              <Input
                type="file"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              />
              {files.length ? (
                <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={pending}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
