"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { NO_MATCH_VALUE } from "./material-config-select"

export default function SendToBisButton({
  recordId,
  quantity,
  categoryId,
  sourcePhoto,
  materialName,
  materialDate,
  action,
}: {
  recordId: string
  quantity: number
  categoryId: string
  sourcePhoto?: string
  materialName?: string
  materialDate?: Date | null
  action: (
    recordId: string,
    quantity: number,
    categoryId: string,
    sourcePhoto?: string,
    materialName?: string,
    materialDate?: Date | null
  ) => Promise<any>
}) {
  const [pending, startTransition] = useTransition()

  const hasConfiguration =
    !!categoryId?.trim() && categoryId !== NO_MATCH_VALUE

  const isDisabled = pending || !hasConfiguration

  const handleClick = () => {
    if (isDisabled) return

    startTransition(async () => {
      try {
        const result = await action(recordId, quantity, categoryId, sourcePhoto, materialName, materialDate)

        if (result?.errors) {
          const detail =
            result?.errors?.[0]?.detail ||
            result?.errors?.[0]?.title ||
            "Failed to send to BIS"
          if (String(detail).includes("Izvēlētajam materiālam nav norādīts neviens atbilstību apliecinošs dokuments")) {
            toast.error(`${detail}. Add a certificate/attachment to this BIS material configuration and try again.`)
          } else {
            toast.error(String(detail))
          }
          return
        }

        toast.success("Sent successfully")
      } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : "Failed to send to BIS"
        if (message.includes("Izvēlētajam materiālam nav norādīts neviens atbilstību apliecinošs dokuments")) {
          toast.error(`${message}. Add a certificate/attachment to this BIS material configuration and try again.`)
        } else {
          toast.error(message)
        }
      }
    })
  }

  const label = pending
    ? "Sending..."
    : hasConfiguration
      ? "Send to BIS"
      : "Select configuration"

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
      title={!hasConfiguration ? "Select BIS material configuration first" : ""}
      className={
        !hasConfiguration
          ? "cursor-not-allowed border border-border bg-muted text-muted-foreground hover:bg-muted"
          : "transition active:scale-95"
      }
    >
      {label}
    </Button>
  )
}
