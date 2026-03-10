"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

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

  const handleClick = () => {
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

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={pending || !categoryId}
      className="transition active:scale-95"
    >
      {pending ? "Sending..." : "Send to BIS"}
    </Button>
  )
}