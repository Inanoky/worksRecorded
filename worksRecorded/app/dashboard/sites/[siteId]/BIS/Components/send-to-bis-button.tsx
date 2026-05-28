"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { NO_MATCH_VALUE } from "./material-config-select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { getToastMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n"

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
  sendLabel = "Send to BIS",
  selectConfigurationLabel = "Select configuration",
  organizationLanguage,
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
  sendLabel?: string
  selectConfigurationLabel?: string
  organizationLanguage?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [attachDialogOpen, setAttachDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [attachPending, startAttachTransition] = useTransition()
  const [draftName, setDraftName] = useState(materialName ?? "")
  const [draftQuantity, setDraftQuantity] = useState(String(quantity))
  const [includeSourcePhoto, setIncludeSourcePhoto] = useState(Boolean(sourcePhoto))
  const toastMessages = getToastMessages(normalizeOrganizationLanguage(organizationLanguage))

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

  const getAttachmentMimeType = (file: File) => {
    if (file.type) return file.type
    if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf"
    return "application/octet-stream"
  }

  const handleClick = () => {
    if (isDisabled) return
    setDraftName(materialName ?? "")
    setDraftQuantity(String(quantity))
    setIncludeSourcePhoto(Boolean(sourcePhoto))
    setConfirmDialogOpen(true)
  }

  const handleConfirmSend = () => {
    startTransition(async () => {
      try {
        const parsedQuantity = Number(draftQuantity)
        const result = await action(
          recordId,
          Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : quantity,
          categoryId,
          includeSourcePhoto ? sourcePhoto : undefined,
          draftName?.trim() || materialName,
          materialDate,
        )

        if (result?.errors) {
          const detail = result.errors?.[0]?.detail || toastMessages.failedSendToBis
          const normalized = normalizeBisErrorMessage(String(detail))
          toast.error(normalized)
          if (normalized.includes("attach a certificate")) {
            setAttachDialogOpen(true)
          }
          return
        }

        toast.success(toastMessages.sentSuccessfully)
        setConfirmDialogOpen(false)
      } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : toastMessages.failedSendToBis
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
      toast.error(toastMessages.selectCertificateFile)
      return
    }

    startAttachTransition(async () => {
      try {
        const base64Data = await toBase64(certificateFile)
        await onAttachCertificate(siteId, categoryId, {
          name: certificateFile.name,
          mimeType: getAttachmentMimeType(certificateFile),
          base64Data,
          code: "compliance",
        })

        toast.success(toastMessages.certificateAttachedSendAgain)
        setAttachDialogOpen(false)
        setCertificateFile(null)
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : toastMessages.failedAttachCertificate)
      }
    })
  }

  const label = pending
    ? "Sending..."
    : hasConfiguration
      ? sendLabel
      : selectConfigurationLabel

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
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apstiprināt</DialogTitle>
            <DialogDescription>Pirms nosūtīšanas uz BIS, pārskatiet un precizējiet materiāla datus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Materiāla nosaukums</label>
              <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Daudzums</label>
              <Input type="number" min="0.01" step="0.01" value={draftQuantity} onChange={(event) => setDraftQuantity(event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeSourcePhoto} onCheckedChange={(value) => setIncludeSourcePhoto(Boolean(value))} />
              Pievienot pavadzīmes fotoattēlu
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Atcelt</Button>
            <Button onClick={handleConfirmSend} disabled={pending}>{pending ? "Sūta..." : "Apstiprināt un sūtīt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
