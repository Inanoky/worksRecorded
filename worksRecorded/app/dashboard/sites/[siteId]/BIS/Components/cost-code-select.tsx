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
import costCodesJson from "@/server/actions/OneTimeScripts/CostCodes.json"

export const NO_COST_CODE_VALUE = "no_cost_code"

export const costCodes = Object.entries(costCodesJson).map(
  ([code, description]) => ({
    code,
    description,
  })
)

export default function CostCodeSelect({
  recordId,
  value,
  disabled,
  onSave,
}: {
  recordId: string
  value?: string | null
  disabled?: boolean
  onSave: (
    recordId: string,
    costCode: string | null
  ) => Promise<{ success: true }>
}) {
  const [pending, startTransition] = useTransition()

  const selectedValue =
    value && value.trim() ? value : NO_COST_CODE_VALUE

  return (
    <Select
      value={selectedValue}
      onValueChange={(selectedValue) => {
        startTransition(async () => {
          try {
            const nextValue =
              selectedValue === NO_COST_CODE_VALUE ? null : selectedValue

            await onSave(recordId, nextValue)

            toast.success(
              nextValue ? "Cost code updated" : "Cost code cleared"
            )
          } catch (error) {
            console.error(error)
            toast.error("Failed to update cost code")
          }
        })
      }}
      disabled={disabled || pending}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select cost code" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={NO_COST_CODE_VALUE}>— No cost code —</SelectItem>

        {costCodes.map((item) => (
          <SelectItem key={item.code} value={item.code}>
            {item.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
