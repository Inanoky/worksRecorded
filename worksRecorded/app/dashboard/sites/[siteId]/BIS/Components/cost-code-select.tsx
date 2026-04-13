"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import costCodesJson from "@/server/actions/OneTimeScripts/CostCodes.json"

export const NO_COST_CODE_VALUE = "no_cost_code"
const MANAGE_COST_CODES_VALUE = "manage_cost_codes"

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
  onCodesChange,
  disabled,
  onSave,
}: {
  recordId: string
  value?: string | null
  availableCodes?: string[]
  onCodesChange?: (codes: string[]) => void
  disabled?: boolean
  onSave: (
    recordId: string,
    costCode: string | null
  ) => Promise<{ success: true }>
}) {
  const [pending, startTransition] = useTransition()
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [localCodes, setLocalCodes] = useState<string[]>([])
  const [newCode, setNewCode] = useState("")

  const selectedValue =
    value && value.trim() ? value : NO_COST_CODE_VALUE
  const resolvedCodes = (availableCodes && availableCodes.length
    ? availableCodes
    : costCodes).map((item) => (typeof item === "string" ? item : item.code))

  const openManageDialog = () => {
    setLocalCodes(resolvedCodes)
    setNewCode("")
    setManageDialogOpen(true)
  }

  const updateCode = (index: number, nextValue: string) => {
    setLocalCodes((current) =>
      current.map((code, currentIndex) =>
        currentIndex === index ? nextValue : code
      ),
    )
  }

  const removeCode = (index: number) => {
    setLocalCodes((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  const appendCode = () => {
    const normalizedValue = newCode.trim()
    if (!normalizedValue) {
      toast.error("Cost code cannot be empty")
      return
    }

    if (
      localCodes.some(
        (code) => code.toLowerCase() === normalizedValue.toLowerCase(),
      )
    ) {
      toast.error("Cost code already exists")
      return
    }

    setLocalCodes((current) => [...current, normalizedValue])
    setNewCode("")
  }

  const saveManagedCodes = () => {
    const normalized = localCodes
      .map((item) => item.trim())
      .filter(Boolean)
    const deduplicated = Array.from(new Set(normalized))

    if (!deduplicated.length) {
      toast.error("At least one cost code is required")
      return
    }

    onCodesChange?.(deduplicated)
    setManageDialogOpen(false)
    toast.success("Cost codes updated")
  }

  return (
    <>
      <Select
        value={selectedValue}
        onValueChange={(selectedValue) => {
          if (selectedValue === MANAGE_COST_CODES_VALUE) {
            openManageDialog()
            return
          }

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
          <SelectItem value={MANAGE_COST_CODES_VALUE}>⚙ Manage cost codes…</SelectItem>
          <SelectItem value={NO_COST_CODE_VALUE}>— No cost code —</SelectItem>

          {resolvedCodes.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage cost codes</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {localCodes.map((code, index) => (
              <div className="flex gap-2" key={`${code}-${index}`}>
                <Input
                  value={code}
                  onChange={(event) => updateCode(index, event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeCode(index)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
              placeholder="Add new cost code"
            />
            <Button type="button" variant="outline" onClick={appendCode}>
              Add
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveManagedCodes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
