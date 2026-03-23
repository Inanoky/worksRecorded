"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const NO_MATCH_VALUE = "no_match"

export type MaterialCategory = {
  id: string
  material_kind: string
  measurement: string | null
  measurement_unit: string | null
}

export default function MaterialConfigSelect({
  recordId,
  value,
  disabled,
  onSave,
  categories,
}: {
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
  categories: MaterialCategory[]
}) {
  const [pending, startTransition] = useTransition()

  const selectedValue =
    value && value !== NO_MATCH_VALUE ? value : NO_MATCH_VALUE

  return (
    <Select
      value={selectedValue}
      onValueChange={(selectedId) => {
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

        {categories.map((config) => (
          <SelectItem key={config.id} value={config.id}>
            {config.material_kind}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}