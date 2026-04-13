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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, Pencil, Trash2, X } from "lucide-react"
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
  const [search, setSearch] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState("")

  const selectedValue =
    value && value.trim() ? value : NO_COST_CODE_VALUE
  const resolvedCodes = (availableCodes && availableCodes.length
    ? availableCodes
    : costCodes).map((item) => (typeof item === "string" ? item : item.code))

  const openManageDialog = () => {
    setLocalCodes(resolvedCodes)
    setNewCode("")
    setSearch("")
    setEditingIndex(null)
    setEditingValue("")
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
    if (editingIndex === index) {
      cancelEditingCode()
    }
    setLocalCodes((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  const startEditingCode = (index: number) => {
    setEditingIndex(index)
    setEditingValue(localCodes[index] ?? "")
  }

  const cancelEditingCode = () => {
    setEditingIndex(null)
    setEditingValue("")
  }

  const saveEditedCode = () => {
    if (editingIndex == null) return

    const normalizedValue = editingValue.trim()
    if (!normalizedValue) {
      toast.error("Cost code cannot be empty")
      return
    }

    const duplicateExists = localCodes.some((code, index) =>
      index !== editingIndex &&
      code.toLowerCase() === normalizedValue.toLowerCase()
    )

    if (duplicateExists) {
      toast.error("Cost code already exists")
      return
    }

    updateCode(editingIndex, normalizedValue)
    cancelEditingCode()
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

  const filteredCodes = localCodes
    .map((code, index) => ({ code, index }))
    .filter(({ code }) =>
      code.toLowerCase().includes(search.trim().toLowerCase()),
    )

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
        <DialogContent className="flex h-[80vh] max-h-[80vh] w-[min(92vw,680px)] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage cost codes</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {localCodes.length} cost code{localCodes.length === 1 ? "" : "s"} configured for this site.
          </p>

          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cost codes"
            />
          </div>

          <div className="flex shrink-0 gap-2">
            <Input
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
              placeholder="Add new cost code"
            />
            <Button type="button" variant="outline" onClick={appendCode}>
              Add
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-2">
            <div className="space-y-2">
              {!filteredCodes.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No cost codes found.
                </p>
              ) : null}

              {filteredCodes.map(({ code, index }) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                  key={`${code}-${index}`}
                >
                  {editingIndex === index ? (
                    <Input
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <p className="truncate text-sm">{code}</p>
                  )}

                  <div className="flex items-center gap-1">
                    {editingIndex === index ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={saveEditedCode}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={cancelEditingCode}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditingCode(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCode(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 border-t pt-3">
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
