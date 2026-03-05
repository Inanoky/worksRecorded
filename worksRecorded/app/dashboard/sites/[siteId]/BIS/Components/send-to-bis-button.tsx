"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
  action: (id: string, q: number, c: string, p?: string) => Promise<any>
}) {

  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = () => {
    startTransition(async () => {

      await action(recordId, quantity, categoryId, sourcePhoto)

      toast.success("Sent successfully")

      router.refresh()

    })
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="active:scale-95 transition"
    >
      {pending ? "Sending..." : "Send to BIS"}
    </Button>
  )
}