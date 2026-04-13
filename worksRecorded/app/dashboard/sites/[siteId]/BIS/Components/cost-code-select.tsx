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
const CUSTOM_COST_CODE_VALUE = "custom_cost_code"

export const costCodes = Object.entries(costCodesJson).map(
  ([code, description]) => ({
    code,
    description,
  })
)

export default function CostCodeSelect({
  recordId,
  value,
  availableCodes,
  disabled,
  onSave,
}: {
  recordId: string
  value?: string | null
  availableCodes?: string[]
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
            let nextValue =
              selectedValue === NO_COST_CODE_VALUE ? null : selectedValue

            if (selectedValue === CUSTOM_COST_CODE_VALUE) {
              const createdCode = window.prompt(
                "Enter new cost code",
                value ?? "",
              )

              if (!createdCode) {
                return
              }

              const normalizedCode = createdCode.trim()

              if (!normalizedCode) {
                toast.error("Cost code cannot be empty")
                return
              }

              nextValue = normalizedCode
            }

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

        {(availableCodes && availableCodes.length
          ? availableCodes.map((code) => ({ code, description: "" }))
          : costCodes).map((item) => (
          <SelectItem key={item.code} value={item.code}>
            {item.code}
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM_COST_CODE_VALUE}>+ Create custom code…</SelectItem>
      </SelectContent>
    </Select>
  )
}
