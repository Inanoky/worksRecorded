"use client"

import * as React from "react"
import Image from "next/image"
import {
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  CalendarIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import SendToBisButton from "./send-to-bis-button"
import MaterialConfigSelect, {
  type MaterialCategory,
  NO_MATCH_VALUE,
} from "./material-config-select"
import CostCodeSelect from "./cost-code-select"
import { toast } from "sonner"

type BisApprover = {
  memberId: string
  memberType: string | null
  level: number | null
  name: string | null
  status: string | null
}

type MaterialRow = {
  id: string
  name: string | null
  quantity: number | null
  categoryId: string | null
  categoryName: string | null
  measurementUnitId: string | null
  measurementUnit: string | null
  cost: number | null
  invoiceNr: string | null
  invoiceDate: Date | null
  materialDate: Date | null
  costCode: string | null
  sourcePhoto: string | null
  declarationAttachment?: Array<{ name: string; mimeType: string; base64Data: string }>
  agreementAttachment?: Array<{ name: string; mimeType: string; base64Data: string }>
  BISId: string | null
  bisStatus: string | null
  bisApprovers: BisApprover[]
}

type Props = {
  siteId: string
  bisEnabled: boolean
  materials: MaterialRow[]
  materialConfigurations: MaterialCategory[]
  materialMeasures: Array<{ id: string; name: string }>
  materialTypes: Array<{ id: string; name: string }>
  sendToBis: (
    siteId: string,
    recordId: string,
    quantity: number,
    construction_material_id: string,
    sourcePhoto?: string,
    materialName?: string,
    materialDate?: Date | null
  ) => Promise<any>
  getPossibleApprovers: (siteId: string, bisId: string) => Promise<BisApprover[]>
  submitToApproval: (
    siteId: string,
    bisId: string,
    approvers: Array<{
      memberId: string
      memberType: string | null
      level: number | null
    }>
  ) => Promise<{ status: string }>
  syncBisRecords: (siteId: string) => Promise<{
    rows: MaterialRow[]
    materialConfigurations: MaterialCategory[]
    materialMeasures: Array<{ id: string; name: string }>
    materialTypes: Array<{ id: string; name: string }>
  }>
  updateMaterialConfiguration: (
    recordId: string,
    config: {
      categoryId: string
      categoryName: string
      measurementUnitId: string
      measurementUnit: string
    }
  ) => Promise<{ success: true }>
  updateMaterialAttachments: (
    recordId: string,
    payload: {
      declarationAttachment?: Array<{ name: string; mimeType: string; base64Data: string }>
      agreementAttachment?: Array<{ name: string; mimeType: string; base64Data: string }>
    },
  ) => Promise<{ success: true }>
  createMaterialConfiguration: (
    siteId: string,
    payload: {
      materialKind: string
      materialType: string
      manufacturer: string
      measurement: string
      attachments: Array<{
        name: string
        mimeType: string
        base64Data: string
      }>
    },
  ) => Promise<{
    success: true
    category: MaterialCategory
  }>
  updateCostCode: (
    recordId: string,
    costCode: string | null
  ) => Promise<{ success: true }>
  updateMaterialDate: (
    recordId: string,
    materialDate: Date | null
  ) => Promise<{ success: true }>
  updateQuantity: (
    recordId: string,
    quantity: number | null,
  ) => Promise<{ success: true }>
  updateMaterialDetails: (
    recordId: string,
    payload: {
      name?: string | null
      cost?: number | null
      materialDate?: Date | null
      costCode?: string | null
      measurementUnit?: string | null
      invoiceDate?: Date | null
    },
  ) => Promise<{ success: true }>
  attachCertificate: (
    siteId: string,
    materialConfigurationId: string,
    payload: {
      name: string
      mimeType: string
      base64Data: string
      code?: "compliance" | "agreement"
    },
  ) => Promise<{ success: true }>
  deleteRecords: (siteId: string, recordIds: string[]) => Promise<{ deletedIds: string[] }>
}

function formatDate(value: Date | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB").format(new Date(value))
}

function formatMoney(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

function getApprovalStateStatus(status: string | null | undefined) {
  const normalizedStatus = (status ?? "").toLowerCase()

  return normalizedStatus === "approved"
    ? "approved"
    : "pending"
}

function toLocalDateInputValue(value: Date | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeBisErrorMessage(message: string) {
  if (message.includes("Izvēlētajam materiālam nav norādīts neviens atbilstību apliecinošs dokuments")) {
    return "BIS rejected this material because no declaration document is attached. Please attach a certificate to this material configuration and try again."
  }

  return message
}

export default function MaterialsTableClient({
  siteId,
  bisEnabled,
  materials,
  materialConfigurations,
  materialMeasures,
  materialTypes,
  sendToBis,
  getPossibleApprovers,
  submitToApproval,
  syncBisRecords,
  updateMaterialConfiguration,
  createMaterialConfiguration,
  updateCostCode,
  updateMaterialDate,
  updateQuantity,
  updateMaterialDetails,
  updateMaterialAttachments,
  attachCertificate,
  deleteRecords,
}: Props) {
  const [rows, setRows] = React.useState<MaterialRow[]>(materials)
  const [configurations, setConfigurations] = React.useState<MaterialCategory[]>(materialConfigurations)
  const [measures, setMeasures] = React.useState<Array<{ id: string; name: string }>>(materialMeasures)
  const [types, setTypes] = React.useState<Array<{ id: string; name: string }>>(materialTypes)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<"all" | "sent" | "unsent">("all")
  const [configFilter, setConfigFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState<
    "default" | "invoiceDate_desc" | "invoiceDate_asc" | "name_asc" | "quantity_desc"
  >("default")
  const [approverDialogOpen, setApproverDialogOpen] = React.useState(false)
  const [approverDialogRow, setApproverDialogRow] = React.useState<MaterialRow | null>(null)
  const [possibleApprovers, setPossibleApprovers] = React.useState<BisApprover[]>([])
  const [selectedApproverKeys, setSelectedApproverKeys] = React.useState<string[]>([])
  const [approvalLoading, setApprovalLoading] = React.useState(false)
  const [syncLoading, setSyncLoading] = React.useState(false)
  const [selectedRowIds, setSelectedRowIds] = React.useState<string[]>([])
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [editableRowIds, setEditableRowIds] = React.useState<string[]>([])
  const [pendingEdits, setPendingEdits] = React.useState<Record<string, {
    name?: string | null
    cost?: number | null
    materialDate?: Date | null
    quantity?: number | null
  }>>({})
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const editNameRef = React.useRef("")
  const editQuantityRef = React.useRef("")
  const editCostRef = React.useRef("")
  const editCostCodeRef = React.useRef("")
  const editUnitRef = React.useRef("")
  const editInvoiceDateRef = React.useRef("")
  const [editDraft, setEditDraft] = React.useState<{
    id: string
    name: string
    quantity: string
    cost: string
    costCode: string
    measurementUnit: string
    invoiceDate: Date | null
    materialDate: Date | null
    declarationAttachment: Array<{ id: string; name: string; mimeType: string; base64Data: string }>
    agreementAttachment: Array<{ id: string; name: string; mimeType: string; base64Data: string }>
  } | null>(null)

  React.useEffect(() => {
    setRows(materials)
  }, [materials])

  React.useEffect(() => {
    setConfigurations(materialConfigurations)
  }, [materialConfigurations])

  React.useEffect(() => {
    setMeasures(materialMeasures)
  }, [materialMeasures])

  React.useEffect(() => {
    setTypes(materialTypes)
  }, [materialTypes])

  const approverKey = React.useCallback(
    (approver: BisApprover) =>
      `${approver.memberId}:${approver.memberType ?? ""}:${approver.level ?? ""}`,
    [],
  )

  const defaultApproverKeys = React.useCallback(
    (approvers: BisApprover[]) => {
      const firstPerLevel = new Map<string, string>()

      for (const approver of approvers) {
        const levelKey = String(approver.level ?? "")
        if (!firstPerLevel.has(levelKey)) {
          firstPerLevel.set(levelKey, approverKey(approver))
        }
      }

      return Array.from(firstPerLevel.values())
    },
    [approverKey],
  )

  const handleCostCodeChange = async (
    recordId: string,
    costCode: string | null,
  ) => {
    const previousRows = rows

    setRows((current) =>
      current.map((row) =>
        row.id === recordId
          ? {
              ...row,
              costCode,
            }
          : row,
      ),
    )

    try {
      await updateCostCode(recordId, costCode)
      return { success: true as const }
    } catch (error) {
      console.error(error)
      setRows(previousRows)
      throw error
    }
  }

  const handleConfigChange = async (
    recordId: string,
    config: {
      categoryId: string
      categoryName: string
      measurementUnitId: string
      measurementUnit: string
    },
  ) => {
    const previousRows = rows

    setRows((current) =>
      current.map((row) =>
        row.id === recordId
          ? {
              ...row,
              categoryId: config.categoryId,
              categoryName: config.categoryName || null,
              measurementUnitId: config.measurementUnitId || null,
              measurementUnit: config.measurementUnit || null,
            }
          : row,
      ),
    )

    try {
      await updateMaterialConfiguration(recordId, config)
      return { success: true as const }
    } catch (error) {
      console.error(error)
      setRows(previousRows)
      throw error
    }
  }

  const handleCreateMaterialConfiguration = async (
    selectedSiteId: string,
    payload: {
      materialKind: string
      materialType: string
      manufacturer: string
      measurement: string
      attachments: Array<{
        name: string
        mimeType: string
        base64Data: string
      }>
    },
  ) => {
    const result = await createMaterialConfiguration(selectedSiteId, payload)

    setConfigurations((current) => {
      if (current.some((item) => item.id === result.category.id)) {
        return current
      }

      return [...current, result.category].sort((a, b) =>
        a.material_kind.localeCompare(b.material_kind),
      )
    })

    return result
  }

  const handleSendToBis = async (
    recordId: string,
    quantity: number,
    categoryId: string,
    sourcePhoto?: string,
    materialName?: string,
    materialDate?: Date | null,
  ) => {
    const result = await sendToBis(siteId, recordId, quantity, categoryId, sourcePhoto, materialName, materialDate)
    const bisId = result?.data?.id
    const bisStatus = result?.data?.attributes?.status ?? "draft"

    if (bisId) {
      setRows((current) =>
        current.map((row) =>
          row.id === recordId
            ? {
                ...row,
                BISId: String(bisId),
                bisStatus: String(bisStatus),
                bisApprovers: [],
              }
            : row,
        ),
      )
    }

    return result
  }

  const openApproverDialog = async (row: MaterialRow) => {
    if (!row.BISId) return

    const approvers = await getPossibleApprovers(siteId, row.BISId)
    setPossibleApprovers(approvers)
    setSelectedApproverKeys(defaultApproverKeys(approvers))
    setApproverDialogRow(row)
    setApproverDialogOpen(true)
  }

  const syncRowsFromBis = async () => {
    console.log("[Warehouse BIS] Refresh from BIS started", { siteId })
    setSyncLoading(true)
    try {
      const {
        rows: syncedRows,
        materialConfigurations: syncedConfigurations,
        materialMeasures: syncedMeasures,
        materialTypes: syncedTypes,
      } = await syncBisRecords(siteId)
      console.log("[Warehouse BIS] Refresh from BIS returned rows", {
        siteId,
        syncedRowCount: syncedRows.length,
        syncedRows: syncedRows.map((row) => ({
          id: row.id,
          BISId: row.BISId,
          bisStatus: row.bisStatus,
        })),
      })
      setConfigurations(syncedConfigurations)
      setMeasures(syncedMeasures)
      setTypes(syncedTypes)
      const syncedMap = new Map(syncedRows.map((row) => [row.id, row]))

      setRows((current) => {
        const nextRows = current.map((row) => syncedMap.get(row.id) ?? row)
        console.log("[Warehouse BIS] Refresh from BIS merged rows", {
          siteId,
          currentRowCount: current.length,
          nextRows: nextRows.map((row) => ({
            id: row.id,
            BISId: row.BISId,
            bisStatus: row.bisStatus,
          })),
        })
        return nextRows
      })
    } catch (error) {
      console.error("[Warehouse BIS] Refresh from BIS failed", {
        siteId,
        error,
      })
      throw error
    } finally {
      setSyncLoading(false)
      console.log("[Warehouse BIS] Refresh from BIS finished", { siteId })
    }
  }

  const openWarehouseRecordInBis = (bisId: string | null | undefined) => {
    if (!bisId) return
    const url = `https://test.bis.gov.lv/bisp/lv/portal/logbooks/received_construction_products/${bisId}/edit`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const isRowEditable = (recordId: string) => editableRowIds.includes(recordId)
  const toggleRowEditable = (recordId: string) => {
    setEditableRowIds((current) =>
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId],
    )
  }

  const toggleRowSelection = (recordId: string, checked: boolean) => {
    setSelectedRowIds((current) =>
      checked ? Array.from(new Set([...current, recordId])) : current.filter((id) => id !== recordId),
    )
  }

  const openEditModal = (row: MaterialRow) => {
    editNameRef.current = row.name ?? ""
    editQuantityRef.current = row.quantity == null ? "" : String(row.quantity)
    editCostRef.current = row.cost == null ? "" : String(row.cost)
    editCostCodeRef.current = row.costCode ?? ""
    editUnitRef.current = row.measurementUnit ?? ""
    editInvoiceDateRef.current = row.invoiceDate ? toLocalDateInputValue(row.invoiceDate) : ""
    setEditDraft({
      id: row.id,
      name: row.name ?? "",
      quantity: row.quantity == null ? "" : String(row.quantity),
      cost: row.cost == null ? "" : String(row.cost),
      costCode: row.costCode ?? "",
      measurementUnit: row.measurementUnit ?? "",
      invoiceDate: row.invoiceDate ? new Date(row.invoiceDate) : null,
      materialDate: row.materialDate ? new Date(row.materialDate) : null,
      declarationAttachment: (row.declarationAttachment ?? []).map((file, index) => ({ id: `d-${index}-${file.name}`, ...file })),
      agreementAttachment: (row.agreementAttachment ?? []).map((file, index) => ({ id: `a-${index}-${file.name}`, ...file })),
    })
    setEditModalOpen(true)
  }

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result ?? "")
        resolve(result.includes(",") ? result.split(",")[1] : result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const saveEditModal = async () => {
    if (!editDraft) return
    const quantity = editQuantityRef.current.trim() === "" ? null : Number(editQuantityRef.current)
    const cost = editCostRef.current.trim() === "" ? null : Number(editCostRef.current)

    try {
      await updateMaterialDetails(editDraft.id, {
        name: editNameRef.current.trim() || null,
        cost: Number.isNaN(cost as number) ? null : cost,
        materialDate: editDraft.materialDate,
        costCode: editCostCodeRef.current.trim() || null,
        measurementUnit: editUnitRef.current.trim() || null,
        invoiceDate: editInvoiceDateRef.current ? new Date(`${editInvoiceDateRef.current}T00:00:00`) : null,
      })
      await updateQuantity(editDraft.id, Number.isNaN(quantity as number) ? null : quantity)
      await updateMaterialAttachments(editDraft.id, {
        declarationAttachment: editDraft.declarationAttachment.map(({ id: _id, ...rest }) => rest),
        agreementAttachment: editDraft.agreementAttachment.map(({ id: _id, ...rest }) => rest),
      })

      setRows((current) =>
        current.map((row) =>
          row.id === editDraft.id
            ? {
                ...row,
                name: editNameRef.current,
                quantity: Number.isNaN(quantity as number) ? null : quantity,
                cost: Number.isNaN(cost as number) ? null : cost,
                costCode: editCostCodeRef.current.trim() || null,
                measurementUnit: editUnitRef.current.trim() || null,
                invoiceDate: editInvoiceDateRef.current ? new Date(`${editInvoiceDateRef.current}T00:00:00`) : null,
                materialDate: editDraft.materialDate,
                declarationAttachment: editDraft.declarationAttachment.map(({ id: _id, ...rest }) => rest),
                agreementAttachment: editDraft.agreementAttachment.map(({ id: _id, ...rest }) => rest),
              }
            : row,
        ),
      )
      setEditModalOpen(false)
      toast.success("Material updated")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save material")
    }
  }

  const toggleAllVisibleRows = (checked: boolean) => {
    const visibleIds = filteredMaterials.map((row) => row.id)
    setSelectedRowIds((current) =>
      checked
        ? Array.from(new Set([...current, ...visibleIds]))
        : current.filter((id) => !visibleIds.includes(id)),
    )
  }

  const deleteSelectedRows = async () => {
    if (!selectedRowIds.length) return

    setDeleteLoading(true)
    try {
      const bisBackedRowsCount = rows.filter((row) => selectedRowIds.includes(row.id) && !!row.BISId).length
      const { deletedIds } = await deleteRecords(siteId, selectedRowIds)
      setRows((current) => current.filter((row) => !deletedIds.includes(row.id)))
      setSelectedRowIds((current) => current.filter((id) => !deletedIds.includes(id)))
      toast.success(deletedIds.length === 1 ? "Record deleted" : `${deletedIds.length} records deleted`)
      if (bisBackedRowsCount > 0) {
        toast.warning("Some deleted records were already sent to BIS. They were removed only from WorksRecorded and stay in BIS.")
      }
    } catch (error) {
      console.error("[Warehouse BIS] Delete records failed", { siteId, selectedRowIds, error })
      toast.error(error instanceof Error ? error.message : "Failed to delete records")
    } finally {
      setDeleteLoading(false)
    }
  }

  const submitApproval = async () => {
    if (!approverDialogRow?.BISId) return

    const approvers = possibleApprovers.filter((approver) =>
      selectedApproverKeys.includes(approverKey(approver)),
    )

    setApprovalLoading(true)
    try {
      const result = await submitToApproval(
        siteId,
        approverDialogRow.BISId,
        approvers.map((approver) => ({
          memberId: approver.memberId,
          memberType: approver.memberType,
          level: approver.level,
        })),
      )
      const nextBisStatus = getApprovalStateStatus(result?.status)

      setRows((current) =>
        current.map((row) =>
          row.id === approverDialogRow.id
            ? {
                ...row,
                bisStatus: nextBisStatus,
                bisApprovers: approvers.map((approver) => ({
                  ...approver,
                  status: "pending",
                })),
              }
            : row,
        ),
      )

      toast.success("Record sent for approval")
      setApproverDialogOpen(false)
      setApproverDialogRow(null)
      setPossibleApprovers([])
      setSelectedApproverKeys([])
    } catch (error) {
      const message = error instanceof Error ? normalizeBisErrorMessage(error.message) : "Failed to send record for approval"
      console.error("[Warehouse BIS] Send for approval failed", {
        siteId,
        bisId: approverDialogRow.BISId,
        error,
      })
      toast.error(message)
    } finally {
      setApprovalLoading(false)
    }
  }

  const handleMaterialDateChange = (recordId: string, nextValue: string) => {
    const materialDate = nextValue ? new Date(`${nextValue}T00:00:00`) : null

    setRows((current) =>
      current.map((row) =>
        row.id === recordId
          ? {
              ...row,
              materialDate,
            }
          : row,
      ),
    )
    setPendingEdits((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] ?? {}),
        materialDate,
      },
    }))
  }

  const handleMaterialNameChange = (recordId: string, nextValue: string) => {
    setPendingEdits((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] ?? {}),
        name: nextValue.trim() || null,
      },
    }))
  }

  const handleMaterialCostChange = (recordId: string, nextValue: string) => {
    const parsedValue = nextValue === "" ? null : Number(nextValue)
    setRows((current) =>
      current.map((row) =>
        row.id === recordId
          ? {
              ...row,
              cost:
                parsedValue == null || Number.isNaN(parsedValue)
                  ? null
                  : parsedValue,
            }
          : row,
      ),
    )
  }

  const handleMaterialCostBlur = (recordId: string, nextValue: string) => {
    const parsedValue = nextValue.trim() === "" ? null : Number(nextValue)
    const normalizedCost =
      parsedValue == null || Number.isNaN(parsedValue) ? null : parsedValue

    setPendingEdits((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] ?? {}),
        cost: normalizedCost,
      },
    }))
  }

  const handleQuantityChange = (recordId: string, nextValue: string) => {
    const parsedValue = nextValue === "" ? null : Number(nextValue)
    setRows((current) =>
      current.map((row) =>
        row.id === recordId
          ? {
              ...row,
              quantity:
                parsedValue == null || Number.isNaN(parsedValue)
                  ? null
                  : parsedValue,
            }
          : row,
      ),
    )
  }

  const handleQuantityBlur = (recordId: string, nextValue: string) => {
    const parsedValue = nextValue.trim() === "" ? null : Number(nextValue)
    const normalizedQuantity =
      parsedValue == null || Number.isNaN(parsedValue) ? null : parsedValue

    setPendingEdits((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] ?? {}),
        quantity: normalizedQuantity,
      },
    }))
  }

  const saveRowEdits = async () => {
    const editIds = Object.keys(pendingEdits).filter((id) => editableRowIds.includes(id))
    if (!editIds.length) {
      setEditableRowIds([])
      return
    }

    try {
      await Promise.all(editIds.map(async (recordId) => {
        const draft = pendingEdits[recordId] ?? {}
        if ("name" in draft || "cost" in draft || "materialDate" in draft) {
          await updateMaterialDetails(recordId, {
            name: draft.name,
            cost: draft.cost,
            materialDate: draft.materialDate,
          })
        }
        if ("quantity" in draft) {
          await updateQuantity(recordId, draft.quantity ?? null)
        }
      }))
      setPendingEdits((current) => {
        const next = { ...current }
        editIds.forEach((id) => delete next[id])
        return next
      })
      setEditableRowIds([])
      toast.success("Changes saved")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save changes")
    }
  }

  const filteredMaterials = React.useMemo(() => {
    const q = search.trim().toLowerCase()

    let filtered = rows.filter((m) => {
      const matchesSearch =
        !q ||
        [
          m.name,
          m.categoryName,
          m.measurementUnit,
          m.invoiceNr,
          m.costCode,
          m.BISId,
          m.bisStatus,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))

      const matchesStatus =
        status === "all" ||
        (status === "sent" && !!m.BISId) ||
        (status === "unsent" && !m.BISId)

      const matchesConfig =
        configFilter === "all" || (m.categoryId ?? "") === configFilter

      return matchesSearch && matchesStatus && matchesConfig
    })

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "invoiceDate_asc":
          return (
            new Date(a.invoiceDate ?? 0).getTime() -
            new Date(b.invoiceDate ?? 0).getTime()
          )
        case "default": {
          const aDate = new Date(a.materialDate ?? a.invoiceDate ?? 0).getTime()
          const bDate = new Date(b.materialDate ?? b.invoiceDate ?? 0).getTime()
          if (bDate !== aDate) return bDate - aDate
          return String(b.id).localeCompare(String(a.id))
        }
        case "name_asc":
          return (a.name ?? "").localeCompare(b.name ?? "")
        case "quantity_desc":
          return (b.quantity ?? 0) - (a.quantity ?? 0)
        case "invoiceDate_desc":
        default:
          return (
            new Date(b.invoiceDate ?? 0).getTime() -
            new Date(a.invoiceDate ?? 0).getTime()
          )
      }
    })

    return filtered
  }, [rows, search, status, configFilter, sortBy])

  const allVisibleSelected = filteredMaterials.length > 0 && filteredMaterials.every((row) => selectedRowIds.includes(row.id))
  const someVisibleSelected = filteredMaterials.some((row) => selectedRowIds.includes(row.id))

  const totalCost = React.useMemo(
    () => rows.reduce((sum, m) => sum + (m.cost ?? 0), 0),
    [rows],
  )

  const showBisControls = bisEnabled

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-background p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Total cost: <span className="font-medium text-foreground">{formatMoney(totalCost)}</span>
          </div>
          <div className="relative w-full md:w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search material, invoice, warehouse or BIS data..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "all" | "sent" | "unsent")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent to BIS</SelectItem>
              <SelectItem value="unsent">Not sent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={configFilter} onValueChange={setConfigFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Warehouse material configuration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All configurations</SelectItem>
              {configurations.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.material_kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Sort by
          </div>

          <Select
            value={sortBy}
            onValueChange={(v) =>
              setSortBy(
                v as
                  | "invoiceDate_desc"
                  | "invoiceDate_asc"
                  | "default"
                  | "name_asc"
                  | "quantity_desc",
              )
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                Default (Date + ID)
              </SelectItem>
              <SelectItem value="invoiceDate_desc">
                Newest invoice date
              </SelectItem>
              <SelectItem value="invoiceDate_asc">
                Oldest invoice date
              </SelectItem>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="quantity_desc">Highest quantity</SelectItem>
            </SelectContent>
          </Select>

          {selectedRowIds.length > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteSelectedRows}
              disabled={deleteLoading}
              className={showBisControls ? "" : "ml-auto"}
            >
              {deleteLoading ? "Deleting..." : `Delete selected (${selectedRowIds.length})`}
            </Button>
          ) : null}

          {showBisControls ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncRowsFromBis}
              disabled={syncLoading}
              className="ml-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
              {syncLoading ? "Refreshing..." : "Refresh from BIS"}
            </Button>
          ) : null}

          {editableRowIds.length > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={saveRowEdits}
            >
              Save changes
            </Button>
          ) : null}

          <div className="text-sm text-muted-foreground">
            Showing {filteredMaterials.length} of {rows.length}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed text-sm">
            <TableHeader>
              <TableRow className="bg-muted/40 [&_th]:px-3 [&_th]:py-3">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(value) => toggleAllVisibleRows(Boolean(value))}
                    aria-label="Select all visible warehouse records"
                  />
                </TableHead>
                <TableHead className="w-[76px]">Photo</TableHead>
                <TableHead className="w-[20%]">Material</TableHead>
                <TableHead className="w-[9%]">Status</TableHead>
                {showBisControls ? <TableHead className="w-[16%]">BIS material configuration</TableHead> : null}
                <TableHead className="w-[10%]">Cost code</TableHead>
                <TableHead className="w-[11%]">Delivery Date</TableHead>
                <TableHead className="w-[6%]">Qty</TableHead>
                <TableHead className="w-[5%]">Unit</TableHead>
                <TableHead className="w-[7%]">Cost</TableHead>
                <TableHead className="w-[7%]">Invoice</TableHead>
                <TableHead className="w-[9%]">Invoice date</TableHead>
                <TableHead className="w-[11%] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center">
                    <div className="space-y-1">
                      <p className="font-medium">No materials found</p>
                      <p className="text-sm text-muted-foreground">
                        Try changing filters or search query.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((r) => {
                  const isSent = !!r.BISId
                  const hasValidConfiguration =
                    !!r.categoryId && r.categoryId !== NO_MATCH_VALUE
                  const normalizedStatus = (r.bisStatus ?? "").toLowerCase()
                  const isDraft = normalizedStatus === "draft"
                  const isApproved = normalizedStatus === "approved"
                  const isAwaitingApproval = [
                    "approving",
                    "submitted_to_approve",
                    "submitted",
                    "pending",
                    "pending_approval",
                    "on_approval",
                    "approval_in_progress",
                  ].includes(normalizedStatus)

                  return (
                    <TableRow key={r.id} className="align-middle [&_td]:px-3 [&_td]:py-3">
                      <TableCell>
                        <Checkbox
                          checked={selectedRowIds.includes(r.id)}
                          onCheckedChange={(value) => toggleRowSelection(r.id, Boolean(value))}
                          aria-label={`Select warehouse record ${r.name || r.id}`}
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        {r.sourcePhoto ? (
                          <a href={r.sourcePhoto} target="_blank" rel="noreferrer">
                            <div className="relative h-14 w-14 overflow-hidden rounded-lg border bg-muted">
                              <Image
                                src={r.sourcePhoto}
                                alt={r.name ?? "Material photo"}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          </a>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                            No photo
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="min-w-0">
                        {isRowEditable(r.id) ? (
                          <Input
                            value={r.name ?? ""}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((row) =>
                                  row.id === r.id
                                    ? {
                                        ...row,
                                        name: event.target.value,
                                      }
                                    : row,
                                ),
                              )
                            }
                            onBlur={(event) => handleMaterialNameChange(r.id, event.target.value)}
                            placeholder="Unnamed material"
                            className="h-9 min-w-0"
                          />
                        ) : (
                          <div className="whitespace-normal break-words leading-snug">{r.name || "Unnamed material"}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        {!normalizedStatus ? (
                          <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                            WorksRecorded
                          </Badge>
                        ) : isDraft ? (
                          <Badge className="rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                            BIS draft
                          </Badge>
                        ) : isApproved ? (
                          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                            BIS approved
                          </Badge>
                        ) : isAwaitingApproval ? (
                          <Badge className="rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                            BIS pending
                          </Badge>
                        ) : (
                          <Badge className="rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                            BIS draft
                          </Badge>
                        )}
                      </TableCell>

                      {showBisControls ? (
                        <TableCell className="min-w-0">
                          <MaterialConfigSelect
                            siteId={siteId}
                            recordId={r.id}
                            value={hasValidConfiguration ? r.categoryId : null}
                            disabled={isSent}
                            onSave={handleConfigChange}
                            onCreate={handleCreateMaterialConfiguration}
                            categories={configurations}
                            measurements={measures}
                            materialTypes={types}
                          />
                        </TableCell>
                      ) : null}

                      <TableCell className="min-w-0">
                        <CostCodeSelect
                          recordId={r.id}
                          value={r.costCode}
                          disabled={isSent}
                          onSave={handleCostCodeChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            {isRowEditable(r.id) ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full min-w-0 justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                                {toLocalDateInputValue(r.materialDate)
                                  ? formatDate(r.materialDate)
                                  : "Pick date"}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                disabled
                                className="w-full min-w-0 justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                                {toLocalDateInputValue(r.materialDate)
                                  ? formatDate(r.materialDate)
                                  : "Pick date"}
                              </Button>
                            )}
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={r.materialDate ? new Date(r.materialDate) : undefined}
                              onSelect={(value) =>
                                handleMaterialDateChange(
                                  r.id,
                                  toLocalDateInputValue(value),
                                )
                              }
                              className="bg-green-50/40"
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={r.quantity ?? ""}
                          onChange={(event) => handleQuantityChange(r.id, event.target.value)}
                          onBlur={(event) => handleQuantityBlur(r.id, event.target.value)}
                          disabled={!isRowEditable(r.id) || isSent}
                          className="w-full min-w-0"
                        />
                      </TableCell>
                      <TableCell>{r.measurementUnit || "—"}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={r.cost ?? ""}
                          onChange={(event) => handleMaterialCostChange(r.id, event.target.value)}
                          onBlur={(event) => handleMaterialCostBlur(r.id, event.target.value)}
                          disabled={!isRowEditable(r.id)}
                          className="w-full min-w-0"
                        />
                      </TableCell>
                      <TableCell className="truncate">{r.invoiceNr || "—"}</TableCell>
                      <TableCell>{formatDate(r.invoiceDate)}</TableCell>
                      <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {showBisControls && !isSent ? (
                              <SendToBisButton
                                siteId={siteId}
                                recordId={r.id}
                                quantity={r.quantity ?? 0}
                                categoryId={hasValidConfiguration ? r.categoryId ?? "" : ""}
                                sourcePhoto={r.sourcePhoto ?? ""}
                                materialName={r.name ?? ""}
                                materialDate={r.materialDate}
                                onAttachCertificate={attachCertificate}
                                action={handleSendToBis}
                              />
                            ) : showBisControls && !isApproved && !isAwaitingApproval ? (
                              <Button
                                size="sm"
                                onClick={() => openApproverDialog(r)}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Send for approval
                              </Button>
                            ) : showBisControls ? (
                              <Button
                                size="sm"
                                disabled
                                className={
                                  isApproved
                                    ? "bg-green-600 text-white hover:bg-green-600"
                                    : "cursor-not-allowed border border-border bg-muted text-muted-foreground hover:bg-muted"
                                }
                              >
                                {isApproved ? "Approved" : "Sent for approval"}
                              </Button>
                            ) : null}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {showBisControls ? (
                                  <DropdownMenuItem
                                    onClick={() => openWarehouseRecordInBis(r.BISId)}
                                    disabled={!r.BISId}
                                  >
                                    Open in BIS
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => openEditModal(r)}>
                                  Edit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={approverDialogOpen}
        onOpenChange={(open) => {
          setApproverDialogOpen(open)
          if (!open) {
            setApproverDialogRow(null)
            setPossibleApprovers([])
            setSelectedApproverKeys([])
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send record for approval</DialogTitle>
            <DialogDescription>
              Select one or more approvers for this warehouse record before sending it into the BIS approval flow.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {possibleApprovers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No BIS approvers were returned for this record.
              </p>
            ) : (
              possibleApprovers.map((approver) => {
                const key = approverKey(approver)
                const checked = selectedApproverKeys.includes(key)

                return (
                  <label key={key} className="flex items-start gap-3 rounded-lg border p-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelectedApproverKeys((current) =>
                          value
                            ? [...current, key]
                            : current.filter((item) => item !== key),
                        )
                      }}
                    />
                    <div className="space-y-1">
                      <div className="font-medium">
                        {approver.name || `Member ${approver.memberId}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {approver.memberType || "Unknown type"}
                        {approver.level != null ? ` • Level ${approver.level}` : ""}
                      </div>
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproverDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitApproval}
              disabled={approvalLoading || selectedApproverKeys.length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {approvalLoading ? "Submitting..." : "Send for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit material</DialogTitle>
            <DialogDescription>
              Update material details and attachments.
            </DialogDescription>
          </DialogHeader>
          {editDraft ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Material Name</label>
                <Input key={`name-${editDraft.id}`} defaultValue={editDraft.name} onChange={(event) => { editNameRef.current = event.target.value }} placeholder="Material Name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input key={`qty-${editDraft.id}`} defaultValue={editDraft.quantity} onChange={(event) => { editQuantityRef.current = event.target.value }} placeholder="Qty" />
                <Input key={`cost-${editDraft.id}`} defaultValue={editDraft.cost} onChange={(event) => { editCostRef.current = event.target.value }} placeholder="Cost" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input key={`costcode-${editDraft.id}`} defaultValue={editDraft.costCode} onChange={(event) => { editCostCodeRef.current = event.target.value }} placeholder="Cost code" />
                <Input key={`unit-${editDraft.id}`} defaultValue={editDraft.measurementUnit} onChange={(event) => { editUnitRef.current = event.target.value }} placeholder="Units" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Delivery Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                        {editDraft.materialDate ? formatDate(editDraft.materialDate) : "Pick delivery date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editDraft.materialDate ?? undefined} onSelect={(value) => setEditDraft({ ...editDraft, materialDate: value ?? null })} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Invoice Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                        {editDraft.invoiceDate ? formatDate(editDraft.invoiceDate) : "Pick invoice date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editDraft.invoiceDate ?? undefined}
                        onSelect={(value) => {
                          const local = value ? toLocalDateInputValue(value) : ""
                          editInvoiceDateRef.current = local
                          setEditDraft({ ...editDraft, invoiceDate: value ?? null })
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {showBisControls ? (
                <>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Atbilstību apliecinošs dokuments</div>
                    <Input type="file" onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const base64Data = await fileToBase64(file)
                      setEditDraft({
                        ...editDraft,
                        declarationAttachment: [...editDraft.declarationAttachment, { id: crypto.randomUUID(), name: file.name, mimeType: file.type || "application/octet-stream", base64Data }],
                      })
                      event.currentTarget.value = ""
                    }} />
                    {editDraft.declarationAttachment.map((file) => (
                      <div key={file.id} className="flex items-center justify-between text-sm">
                        <span>{file.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditDraft({ ...editDraft, declarationAttachment: editDraft.declarationAttachment.filter((item) => item.id !== file.id) })}>Remove</Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Vienošanās</div>
                    <Input type="file" onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const base64Data = await fileToBase64(file)
                      setEditDraft({
                        ...editDraft,
                        agreementAttachment: [...editDraft.agreementAttachment, { id: crypto.randomUUID(), name: file.name, mimeType: file.type || "application/octet-stream", base64Data }],
                      })
                      event.currentTarget.value = ""
                    }} />
                    {editDraft.agreementAttachment.map((file) => (
                      <div key={file.id} className="flex items-center justify-between text-sm">
                        <span>{file.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditDraft({ ...editDraft, agreementAttachment: editDraft.agreementAttachment.filter((item) => item.id !== file.id) })}>Remove</Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={saveEditModal}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
