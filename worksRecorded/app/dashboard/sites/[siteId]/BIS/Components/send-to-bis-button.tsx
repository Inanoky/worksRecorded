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
  action,
}: {
  recordId: string
  quantity: number
  categoryId: string
  sourcePhoto?: string
  action: (
    recordId: string,
    quantity: number,
    categoryId: string,
    sourcePhoto?: string
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
        const result = await action(recordId, quantity, categoryId, sourcePhoto)

        if (result?.errors) {
          toast.error("Failed to send to BIS")
          return
        }

        toast.success("Sent successfully")
      } catch (error) {
        console.error(error)
        toast.error("Failed to send to BIS")
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