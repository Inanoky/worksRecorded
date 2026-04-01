"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { NO_MATCH_VALUE } from "./material-config-select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function normalizeBisErrorMessage(message: string) {
  if (
    message.includes("Izvēlētajam materiālam nav norādīts neviens atbilstību apliecinošs dokuments")
  ) {
    return "BIS rejected this material because no declaration document is attached. Please attach a certificate to this material configuration and try again."
  }

  return message
}

export default function SendToBisButton({
  recordId,
  quantity,
  categoryId,
  sourcePhoto,
  materialName,
  materialDate,
  siteId,
  onAttachCertificate,
  action,
}: {
  siteId: string
  recordId: string
  quantity: number
  categoryId: string
  sourcePhoto?: string
  materialName?: string
  materialDate?: Date | null
  onAttachCertificate: (
    siteId: string,
    categoryId: string,
    payload: {
      name: string
      mimeType: string
      base64Data: string
      code?: "compliance" | "agreement"
    }
  ) => Promise<{ success: true }>
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
  const [attachDialogOpen, setAttachDialogOpen] = useState(false)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [attachPending, startAttachTransition] = useTransition()

  const hasConfiguration =
    !!categoryId?.trim() && categoryId !== NO_MATCH_VALUE

  const isDisabled = pending || !hasConfiguration

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result ?? "")
        const base64 = result.includes(",") ? result.split(",")[1] : result
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleClick = () => {
    if (isDisabled) return

    startTransition(async () => {
      try {
        const result = await action(recordId, quantity, categoryId, sourcePhoto, materialName, materialDate)

        if (result?.errors) {
          const detail = result.errors?.[0]?.detail || "Failed to send to BIS"
          const normalized = normalizeBisErrorMessage(String(detail))
          toast.error(normalized)
          if (normalized.includes("attach a certificate")) {
            setAttachDialogOpen(true)
          }
          return
        }

        toast.success("Sent successfully")
      } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : "Failed to send to BIS"
        const normalized = normalizeBisErrorMessage(message)
        toast.error(normalized)
        if (normalized.includes("attach a certificate")) {
          setAttachDialogOpen(true)
        }
      }
    })
  }

  const handleAttachCertificate = () => {
    if (!certificateFile) {
      toast.error("Please select a certificate file.")
      return
    }

    startAttachTransition(async () => {
      try {
        const base64Data = await toBase64(certificateFile)
        await onAttachCertificate(siteId, categoryId, {
          name: certificateFile.name,
          mimeType: certificateFile.type || "application/octet-stream",
          base64Data,
          code: "compliance",
        })

        toast.success("Certificate attached. Please click Send to BIS again.")
        setAttachDialogOpen(false)
        setCertificateFile(null)
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "Failed to attach certificate.")
      }
    })
  }

  const label = pending
    ? "Sending..."
    : hasConfiguration
      ? "Send to BIS"
      : "Select configuration"

  return (
    <>
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

      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach certificate</DialogTitle>
            <DialogDescription>
              BIS requires a declaration document for this material configuration. Attach a certificate, then send to BIS again.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(event) => setCertificateFile(event.target.files?.[0] ?? null)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAttachCertificate} disabled={attachPending}>
              {attachPending ? "Attaching..." : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
