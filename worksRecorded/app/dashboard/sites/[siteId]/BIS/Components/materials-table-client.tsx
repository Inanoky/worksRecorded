"use client"

import * as React from "react"
import Image from "next/image"
import {
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  CalendarIcon,
  CameraOff,
  Download,
  X,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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
import MaterialConfigSelect, {
  type MaterialCategory,
  NO_MATCH_VALUE,
} from "./material-config-select"
import { toast } from "sonner"
import { getToastMessages, getWarehouseUiMessages, normalizeOrganizationLanguage } from "@/lib/dashboard-i18n"
import { UploadButton } from "@/lib/utils/UploadthingsComponents"
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url"

const MAX_MATERIAL_NAME_LENGTH = 120
const MAX_MEASUREMENT_UNIT_LENGTH = 20
const MAX_QUANTITY = 1_000_000
const MAX_COST = 10_000_000

type BisApprover = {
  memberId: string
  memberType: string | null
  level: number | null
  name: string | null
  status: string | null
}

type MaterialAttachment = {
  name: string
  mimeType: string
  base64Data?: string
  fileUrl?: string
}

type DraftMaterialAttachment = MaterialAttachment & {
  id: string
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
  supplierName: string | null
  importBatchId: string | null
  sourcePhoto: string | null
  declarationAttachment?: unknown
  agreementAttachment?: unknown
  BISId: string | null
  bisStatus: string | null
  createdAt: Date
  bisApprovers: BisApprover[]
}

type WarehouseMaterialQueryInput = {
  page?: number
  pageSize?: number
  search?: string
  status?: "all" | "sent" | "unsent"
  configFilter?: string
  sortBy?: "default" | "invoiceDate_desc" | "invoiceDate_asc" | "name_asc" | "quantity_desc"
  invoiceDateFrom?: string
  invoiceDateTo?: string
}

type WarehouseSpendInsightEntry = {
  key: string
  label: string
  totalCost: number
  count: number
}

type WarehouseSpendInsights = {
  supplierTotals: WarehouseSpendInsightEntry[]
  monthlyTotals: WarehouseSpendInsightEntry[]
}

type WarehouseMaterialPagination = {
  totalCount: number
  totalCost: number
  page: number
  pageSize: number
  totalPages: number
  spendInsights?: WarehouseSpendInsights
}

type Props = {
  siteId: string
  organizationLanguage?: string | null
  showSpendInsights: boolean
  bisEnabled: boolean
  bisBaseUrl: string
  materials: MaterialRow[]
  materialConfigurations: MaterialCategory[]
  materialMeasures: Array<{ id: string; name: string }>
  materialTypes: Array<{ id: string; name: string }>
  initialPagination: WarehouseMaterialPagination
  fetchMaterials: (
    siteId: string,
    input: WarehouseMaterialQueryInput,
  ) => Promise<WarehouseMaterialPagination & { rows: MaterialRow[] }>
  exportMaterials: (
    siteId: string,
    input: WarehouseMaterialQueryInput,
  ) => Promise<MaterialRow[]>
  sendToBis: (
    siteId: string,
    recordId: string,
    quantity: number,
    construction_material_id: string,
    sourcePhoto?: string,
    materialName?: string,
    materialDate?: Date | null
  ) => Promise<any>
  updateSentRecordInBis: (
    siteId: string,
    bisId: string,
    payload: {
      quantity: number
      constructionMaterialId: string
      materialName?: string | null
      materialDate?: Date | null
      sourcePhoto?: string | null
      declarationAttachment?: MaterialAttachment[]
      agreementAttachment?: MaterialAttachment[]
    }
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
  ) => Promise<{ success: boolean }>
  updateMaterialAttachments: (
    recordId: string,
    payload: {
      declarationAttachment?: MaterialAttachment[]
      agreementAttachment?: MaterialAttachment[]
      sourcePhoto?: string | null
    },
  ) => Promise<{ success: boolean }>
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
        base64Data?: string
        fileUrl?: string
      }>
    },
  ) => Promise<{
    success: true
    category: MaterialCategory
  }>
  updateMaterialDate: (
    recordId: string,
    materialDate: Date | null
  ) => Promise<{ success: boolean }>
  updateQuantity: (
    recordId: string,
    quantity: number | null,
  ) => Promise<{ success: boolean }>
  updateMaterialDetails: (
    recordId: string,
    payload: {
      name?: string | null
      cost?: number | null
      materialDate?: Date | null
      measurementUnit?: string | null
      invoiceDate?: Date | null
      supplierName?: string | null
    },
  ) => Promise<{ success: boolean }>
  attachCertificate: (
    siteId: string,
    materialConfigurationId: string,
    payload: {
      name: string
      mimeType: string
      base64Data: string
      code?: "compliance" | "agreement"
    },
  ) => Promise<{ success: boolean }>
  copyMaterialRecord: (siteId: string, recordId: string) => Promise<{ success: true; material: MaterialRow }>
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

function formatMonthLabel(value: string, language: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value

  const year = Number(match[1])
  const month = Number(match[2])
  const date = new Date(Date.UTC(year, month - 1, 1))
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language === "lv" ? "lv-LV" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatShortMonthLabel(value: string, language: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value

  const year = Number(match[1])
  const month = Number(match[2])
  const date = new Date(Date.UTC(year, month - 1, 1))
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language === "lv" ? "lv-LV" : "en-GB", {
    month: "short",
    timeZone: "UTC",
  }).format(date)
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

function isPreviewableImage(file: { mimeType: string; name: string }) {
  const normalizedMime = (file.mimeType || "").toLowerCase()
  if (normalizedMime.startsWith("image/")) return true
  const normalizedName = (file.name || "").toLowerCase()
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => normalizedName.endsWith(ext))
}

function getAttachmentMimeType(file: { type?: string; name?: string }) {
  if (file.type) return file.type
  if ((file.name || "").toLowerCase().endsWith(".pdf")) return "application/pdf"
  return "application/octet-stream"
}

function toAttachmentDataUrl(file: { mimeType: string; base64Data?: string; fileUrl?: string }) {
  if (file.fileUrl) return file.fileUrl
  return `data:${file.mimeType || "application/octet-stream"};base64,${file.base64Data || ""}`
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getExportStatusLabel(row: MaterialRow, messages: ReturnType<typeof getWarehouseUiMessages>) {
  const normalizedStatus = (row.bisStatus ?? "").toLowerCase()

  if (!normalizedStatus) return messages.statusWorksRecorded
  if (normalizedStatus === "draft") return messages.statusBisDraft
  if (normalizedStatus === "approved") return messages.statusBisApproved

  if ([
    "approving",
    "submitted_to_approve",
    "submitted",
    "pending",
    "pending_approval",
    "on_approval",
    "approval_in_progress",
  ].includes(normalizedStatus)) {
    return messages.statusBisPending
  }

  return row.bisStatus ? `BIS ${row.bisStatus}` : messages.statusWorksRecorded
}

export default function MaterialsTableClient({
  siteId,
  organizationLanguage,
  bisEnabled,
  bisBaseUrl,
  materials,
  materialConfigurations,
  materialMeasures,
  materialTypes,
  initialPagination,
  fetchMaterials,
  exportMaterials,
  showSpendInsights,
  sendToBis,
  updateSentRecordInBis,
  getPossibleApprovers,
  submitToApproval,
  syncBisRecords,
  updateMaterialConfiguration,
  createMaterialConfiguration,
  updateMaterialDate,
  updateQuantity,
  updateMaterialDetails,
  updateMaterialAttachments,
  attachCertificate,
  copyMaterialRecord,
  deleteRecords,
}: Props) {
  const language = normalizeOrganizationLanguage(organizationLanguage)
  const t = getWarehouseUiMessages(language)
  const toastMessages = getToastMessages(language)
  const getMaterialDisplayName = React.useCallback((row: Pick<MaterialRow, "name" | "invoiceNr">) => {
    const name = row.name?.trim()
    if (name) return name

    const invoiceNr = row.invoiceNr?.trim()
    if (invoiceNr) return t.materialFromInvoice(invoiceNr)

    return t.unnamedMaterial
  }, [t])
  const [rows, setRows] = React.useState<MaterialRow[]>(materials)
  const [pagination, setPagination] = React.useState<WarehouseMaterialPagination>(initialPagination)
  const [configurations, setConfigurations] = React.useState<MaterialCategory[]>(materialConfigurations)
  const [measures, setMeasures] = React.useState<Array<{ id: string; name: string }>>(materialMeasures)
  const [types, setTypes] = React.useState<Array<{ id: string; name: string }>>(materialTypes)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<"all" | "sent" | "unsent">("all")
  const [configFilter, setConfigFilter] = React.useState("all")
  const [invoiceDateFrom, setInvoiceDateFrom] = React.useState("")
  const [invoiceDateTo, setInvoiceDateTo] = React.useState("")
  const [sortBy, setSortBy] = React.useState<
    "default" | "invoiceDate_desc" | "invoiceDate_asc" | "name_asc" | "quantity_desc"
  >("default")
  const [page, setPage] = React.useState(initialPagination.page)
  const [pageSize, setPageSize] = React.useState(initialPagination.pageSize)
  const [tableLoading, setTableLoading] = React.useState(false)
  const [exportLoading, setExportLoading] = React.useState(false)
  const [approverDialogOpen, setApproverDialogOpen] = React.useState(false)
  const [approverDialogRow, setApproverDialogRow] = React.useState<MaterialRow | null>(null)
  const [possibleApprovers, setPossibleApprovers] = React.useState<BisApprover[]>([])
  const [selectedApproverKeys, setSelectedApproverKeys] = React.useState<string[]>([])
  const [approvalLoading, setApprovalLoading] = React.useState(false)
  const [syncLoading, setSyncLoading] = React.useState(false)
  const [selectedRowIds, setSelectedRowIds] = React.useState<string[]>([])
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [copyingRecordId, setCopyingRecordId] = React.useState<string | null>(null)
  const [editableRowIds, setEditableRowIds] = React.useState<string[]>([])
  const [pendingEdits, setPendingEdits] = React.useState<Record<string, {
    name?: string | null
    cost?: number | null
    materialDate?: Date | null
    quantity?: number | null
  }>>({})
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [editModalMode, setEditModalMode] = React.useState<"edit" | "confirm-send">("edit")
  const [editSaveLoading, setEditSaveLoading] = React.useState(false)
  const [includeDeliveryNotePhoto, setIncludeDeliveryNotePhoto] = React.useState(true)
  const [modalSourcePhoto, setModalSourcePhoto] = React.useState<string | null>(null)
  const editNameRef = React.useRef("")
  const editQuantityRef = React.useRef("")
  const editCostRef = React.useRef("")
  const editUnitRef = React.useRef("")
  const editInvoiceDateRef = React.useRef("")
  const [editDraft, setEditDraft] = React.useState<{
    id: string
    name: string
    quantity: string
    cost: string
    measurementUnit: string
    categoryId: string | null
    categoryName: string | null
    measurementUnitId: string | null
    invoiceDate: Date | null
    materialDate: Date | null
    supplierName: string | null
    declarationAttachment: DraftMaterialAttachment[]
    agreementAttachment: DraftMaterialAttachment[]
  } | null>(null)

  const bisConfigurations = React.useMemo(
    () => configurations.filter((configuration) => configuration.source !== "organization_template"),
    [configurations],
  )
  const organizationTemplateConfigurations = React.useMemo(
    () => configurations.filter((configuration) => configuration.source === "organization_template"),
    [configurations],
  )

  React.useEffect(() => {
    setRows(materials)
  }, [materials])

  React.useEffect(() => {
    setPagination(initialPagination)
    setPage(initialPagination.page)
    setPageSize(initialPagination.pageSize)
  }, [initialPagination])

  React.useEffect(() => {
    setConfigurations(materialConfigurations)
  }, [materialConfigurations])

  React.useEffect(() => {
    setMeasures(materialMeasures)
  }, [materialMeasures])

  React.useEffect(() => {
    setTypes(materialTypes)
  }, [materialTypes])

  const queryInput = React.useMemo<WarehouseMaterialQueryInput>(() => ({
    page,
    pageSize,
    search,
    status,
    configFilter,
    sortBy,
    invoiceDateFrom: showSpendInsights ? invoiceDateFrom : undefined,
    invoiceDateTo: showSpendInsights ? invoiceDateTo : undefined,
  }), [page, pageSize, search, status, configFilter, sortBy, showSpendInsights, invoiceDateFrom, invoiceDateTo])

  const loadWarehousePage = React.useCallback(async (input: WarehouseMaterialQueryInput = queryInput) => {
    setTableLoading(true)
    try {
      const result = await fetchMaterials(siteId, input)
      setRows(result.rows)
      setPagination({
        totalCount: result.totalCount,
        totalCost: result.totalCost,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        spendInsights: result.spendInsights,
      })
      setPage(result.page)
      setPageSize(result.pageSize)
      setSelectedRowIds((current) => current.filter((id) => result.rows.some((row) => row.id === id)))
    } catch (error) {
      console.error("[Warehouse BIS] Failed to load warehouse page", { siteId, input, error })
      toast.error(toastMessages.failedLoadMaterials)
    } finally {
      setTableLoading(false)
    }
  }, [fetchMaterials, queryInput, siteId, toastMessages.failedLoadMaterials])

  const didMountRef = React.useRef(false)
  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    const timeout = window.setTimeout(() => {
      void loadWarehousePage()
    }, search.trim() ? 300 : 0)

    return () => window.clearTimeout(timeout)
  }, [loadWarehousePage, search])

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

    setEditSaveLoading(true)

    try {
      await updateMaterialConfiguration(recordId, config)
      return { success: true as const }
    } catch (error) {
      console.error(error)
      setRows(previousRows)
      throw error
    }
  }

  const handleEditDraftConfigChange = async (
    _recordId: string,
    config: {
      categoryId: string
      categoryName: string
      measurementUnitId: string
      measurementUnit: string
    },
  ) => {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            categoryId: config.categoryId,
            categoryName: config.categoryName || null,
            measurementUnitId: config.measurementUnitId || null,
            measurementUnit: config.measurementUnit || current.measurementUnit,
          }
        : current,
    )
    editUnitRef.current = config.measurementUnit || editUnitRef.current
    return { success: true as const }
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
        base64Data?: string
        fileUrl?: string
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
      void loadWarehousePage()
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
    const normalizedBisBaseUrl = bisBaseUrl.replace(/\/+$/, "")
    const url = `${normalizedBisBaseUrl}/bisp/lv/portal/logbooks/received_construction_products/${bisId}/edit`
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

  const openEditModal = (row: MaterialRow, mode: "edit" | "confirm-send" = "edit") => {
    editNameRef.current = row.name ?? ""
    editQuantityRef.current = row.quantity == null ? "" : String(row.quantity)
    editCostRef.current = row.cost == null ? "" : String(row.cost)
    editUnitRef.current = row.measurementUnit ?? ""
    editInvoiceDateRef.current = row.invoiceDate ? toLocalDateInputValue(row.invoiceDate) : ""
    setEditDraft({
      id: row.id,
      name: row.name ?? "",
      quantity: row.quantity == null ? "" : String(row.quantity),
      cost: row.cost == null ? "" : String(row.cost),
      measurementUnit: row.measurementUnit ?? "",
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      measurementUnitId: row.measurementUnitId,
      invoiceDate: row.invoiceDate ? new Date(row.invoiceDate) : null,
      materialDate: row.materialDate ? new Date(row.materialDate) : null,
      supplierName: row.supplierName,
      declarationAttachment: (Array.isArray(row.declarationAttachment) ? row.declarationAttachment as MaterialAttachment[] : []).map((file, index) => ({ id: `d-${index}-${file.name}`, ...file })),
      agreementAttachment: (Array.isArray(row.agreementAttachment) ? row.agreementAttachment as MaterialAttachment[] : []).map((file, index) => ({ id: `a-${index}-${file.name}`, ...file })),
    })
    setEditModalMode(mode)
    setIncludeDeliveryNotePhoto(Boolean(row.sourcePhoto))
    setModalSourcePhoto(row.sourcePhoto ?? null)
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
    if (editSaveLoading) return
    if (!editDraft) return

    setEditSaveLoading(true)

    const trimmedName = editNameRef.current.trim()
    const trimmedMeasurementUnit = editUnitRef.current.trim()
    const quantity = editQuantityRef.current.trim() === "" ? null : Number(editQuantityRef.current)
    const cost = editCostRef.current.trim() === "" ? null : Number(editCostRef.current)

    if (trimmedName.length === 0) {
      toast.error(toastMessages.materialNameRequired)
      setEditSaveLoading(false)
      return
    }

    if (trimmedName.length > MAX_MATERIAL_NAME_LENGTH) {
      toast.error(toastMessages.materialNameMax(MAX_MATERIAL_NAME_LENGTH))
      setEditSaveLoading(false)
      return
    }

    if (quantity !== null && (Number.isNaN(quantity) || quantity <= 0 || quantity > MAX_QUANTITY)) {
      toast.error(toastMessages.quantityRange(MAX_QUANTITY))
      setEditSaveLoading(false)
      return
    }

    if (cost !== null && (Number.isNaN(cost) || cost < 0 || cost > MAX_COST)) {
      toast.error(toastMessages.costRange(MAX_COST))
      setEditSaveLoading(false)
      return
    }

    if (trimmedMeasurementUnit.length > MAX_MEASUREMENT_UNIT_LENGTH) {
      toast.error(toastMessages.unitsMax(MAX_MEASUREMENT_UNIT_LENGTH))
      setEditSaveLoading(false)
      return
    }

    const existingRow = rows.find((row) => row.id === editDraft.id)
    const hasValidDraftConfiguration = Boolean(editDraft.categoryId && editDraft.categoryId !== NO_MATCH_VALUE)
    const savedDeclarationAttachment = editDraft.declarationAttachment.map(({ id: _id, ...rest }) => rest)
    const savedAgreementAttachment = editDraft.agreementAttachment.map(({ id: _id, ...rest }) => rest)

    if ((editModalMode === "confirm-send" || existingRow?.BISId) && !hasValidDraftConfiguration) {
      toast.error(t.selectConfiguration)
      setEditSaveLoading(false)
      return
    }

    if ((editModalMode === "confirm-send" || existingRow?.BISId) && quantity == null) {
      toast.error(toastMessages.fieldRequired(t.qty))
      setEditSaveLoading(false)
      return
    }

    try {
      await updateMaterialDetails(editDraft.id, {
        name: trimmedName,
        cost: Number.isNaN(cost as number) ? null : cost,
        materialDate: editDraft.materialDate,
        measurementUnit: trimmedMeasurementUnit || null,
        invoiceDate: editInvoiceDateRef.current ? new Date(`${editInvoiceDateRef.current}T00:00:00`) : null,
        supplierName: editDraft.supplierName,
      })
      await updateQuantity(editDraft.id, Number.isNaN(quantity as number) ? null : quantity)
      await updateMaterialAttachments(editDraft.id, {
        declarationAttachment: savedDeclarationAttachment,
        agreementAttachment: savedAgreementAttachment,
        sourcePhoto: modalSourcePhoto,
      })

      if (editDraft.categoryId !== existingRow?.categoryId) {
        await updateMaterialConfiguration(editDraft.id, {
          categoryId: editDraft.categoryId ?? NO_MATCH_VALUE,
          categoryName: editDraft.categoryName ?? "",
          measurementUnitId: editDraft.measurementUnitId ?? "",
          measurementUnit: trimmedMeasurementUnit || editDraft.measurementUnit || "",
        })
      }

      if (editModalMode === "confirm-send" && hasValidDraftConfiguration && quantity != null && !Number.isNaN(quantity)) {
        const sendResult = await handleSendToBis(
          editDraft.id,
          quantity,
          editDraft.categoryId!,
          includeDeliveryNotePhoto ? modalSourcePhoto ?? undefined : undefined,
          trimmedName,
          editDraft.materialDate,
        )
        if (sendResult?.errors) {
          throw new Error(String(sendResult.errors?.[0]?.detail || "Failed to send to BIS"))
        }
      }
      if (existingRow?.BISId && hasValidDraftConfiguration && quantity != null && !Number.isNaN(quantity)) {
        await updateSentRecordInBis(siteId, existingRow.BISId, {
          quantity,
          constructionMaterialId: editDraft.categoryId!,
          materialName: trimmedName,
          materialDate: editDraft.materialDate,
          sourcePhoto: includeDeliveryNotePhoto ? modalSourcePhoto : null,
          declarationAttachment: savedDeclarationAttachment,
          agreementAttachment: savedAgreementAttachment,
        })
      }

      setRows((current) =>
        current.map((row) =>
          row.id === editDraft.id
            ? {
                ...row,
                name: trimmedName,
                quantity: Number.isNaN(quantity as number) ? null : quantity,
                cost: Number.isNaN(cost as number) ? null : cost,
                categoryId: editDraft.categoryId,
                categoryName: editDraft.categoryName,
                measurementUnitId: editDraft.measurementUnitId,
                measurementUnit: trimmedMeasurementUnit || null,
                invoiceDate: editInvoiceDateRef.current ? new Date(`${editInvoiceDateRef.current}T00:00:00`) : null,
                supplierName: editDraft.supplierName,
                materialDate: editDraft.materialDate,
                declarationAttachment: savedDeclarationAttachment,
                agreementAttachment: savedAgreementAttachment,
                sourcePhoto: modalSourcePhoto,
              }
            : row,
        ),
      )
      setEditModalOpen(false)
      toast.success(editModalMode === "confirm-send" ? toastMessages.materialConfirmedAndSent : toastMessages.materialUpdated)
      void loadWarehousePage()
    } catch (error) {
      console.error(error)
      toast.error(toastMessages.failedSaveMaterial)
    } finally {
      setEditSaveLoading(false)
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

  const copyMaterial = async (row: MaterialRow) => {
    if (copyingRecordId) return

    setCopyingRecordId(row.id)
    try {
      const result = await copyMaterialRecord(siteId, row.id)
      setRows((current) => {
        const sourceIndex = current.findIndex((item) => item.id === row.id)
        if (sourceIndex === -1) return [result.material, ...current]

        return [
          ...current.slice(0, sourceIndex + 1),
          result.material,
          ...current.slice(sourceIndex + 1),
        ]
      })
      toast.success(t.copied)
      void loadWarehousePage()
    } catch (error) {
      console.error("[Warehouse BIS] Copy material failed", { siteId, recordId: row.id, error })
      toast.error(error instanceof Error ? error.message : t.copyFailed)
    } finally {
      setCopyingRecordId(null)
    }
  }

  const deleteSelectedRows = async () => {
    if (!selectedRowIds.length) return

    setDeleteLoading(true)
    try {
      const bisBackedRowsCount = rows.filter((row) => selectedRowIds.includes(row.id) && !!row.BISId).length
      const { deletedIds } = await deleteRecords(siteId, selectedRowIds)
      setRows((current) => current.filter((row) => !deletedIds.includes(row.id)))
      setSelectedRowIds((current) => current.filter((id) => !deletedIds.includes(id)))
      toast.success(toastMessages.recordsDeleted(deletedIds.length))
      if (bisBackedRowsCount > 0) {
        toast.warning(toastMessages.someBisRecordsOnlyDeletedLocally)
      }
      void loadWarehousePage()
    } catch (error) {
      console.error("[Warehouse BIS] Delete records failed", { siteId, selectedRowIds, error })
      toast.error(error instanceof Error ? error.message : toastMessages.failedDeleteRecords)
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

      toast.success(t.recordSentForApproval)
      setApproverDialogOpen(false)
      setApproverDialogRow(null)
      setPossibleApprovers([])
      setSelectedApproverKeys([])
      void loadWarehousePage()
    } catch (error) {
      const message = error instanceof Error ? normalizeBisErrorMessage(error.message) : t.failedToSendRecordForApproval
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
      toast.success(toastMessages.changesSaved)
      void loadWarehousePage()
    } catch (error) {
      console.error(error)
      toast.error(toastMessages.failedSaveChanges)
    }
  }

  const filteredMaterials = rows

  const allVisibleSelected = filteredMaterials.length > 0 && filteredMaterials.every((row) => selectedRowIds.includes(row.id))
  const someVisibleSelected = filteredMaterials.some((row) => selectedRowIds.includes(row.id))

  const totalCost = pagination.totalCost
  const supplierTotals = pagination.spendInsights?.supplierTotals ?? []
  const monthlyTotals = pagination.spendInsights?.monthlyTotals ?? []
  const monthlyChartData = React.useMemo(() => (
    [...monthlyTotals]
      .reverse()
      .slice(-6)
      .map((month) => ({
        month: month.key,
        label: formatMonthLabel(month.key, language),
        shortLabel: formatShortMonthLabel(month.key, language),
        total: month.totalCost,
      }))
  ), [language, monthlyTotals])
  const visibleFrom = pagination.totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const visibleTo = pagination.totalCount === 0
    ? 0
    : Math.min(pagination.page * pagination.pageSize, pagination.totalCount)

  const showBisControls = bisEnabled

  const exportMaterialsToExcel = async () => {
    setExportLoading(true)
    try {
      const exportRows = await exportMaterials(siteId, queryInput)
      const XLSX = await import("xlsx")
      const worksheetHeaders = [
        t.material,
        ...(showSpendInsights ? [t.supplier] : []),
        t.status,
        t.bisMaterialConfiguration,
        t.deliveryDate,
        t.qty,
        t.unit,
        t.cost,
        t.invoice,
        t.invoiceDate,
        "BIS ID",
        t.photo,
      ]
      const worksheetData = [
        worksheetHeaders,
        ...exportRows.map((material) => [
          getMaterialDisplayName(material),
          ...(showSpendInsights ? [material.supplierName || "—"] : []),
          getExportStatusLabel(material, t),
          material.categoryName || "—",
          formatDate(material.materialDate),
          material.quantity ?? "",
          material.measurementUnit || "—",
          material.cost ?? "",
          material.invoiceNr || "—",
          formatDate(material.invoiceDate),
          material.BISId || "—",
          material.sourcePhoto || "—",
        ]),
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
      worksheet["!cols"] = [
        { wch: 36 },
        ...(showSpendInsights ? [{ wch: 28 }] : []),
        { wch: 18 },
        { wch: 32 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 40 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Materials")
      XLSX.writeFile(workbook, `WarehouseMaterials-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (error) {
      console.error("[Warehouse BIS] Export materials failed", { siteId, queryInput, error })
      toast.error(toastMessages.failedExportMaterials)
    } finally {
      setExportLoading(false)
    }
  }

  return (
                    <div className="space-y-3">
      {showSpendInsights ? (
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold">{t.spendInsights}</h2>
              <div className="mt-1 text-2xl font-semibold">{formatMoney(totalCost)}</div>
              <p className="text-sm text-muted-foreground">{t.totalCost}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t.invoiceDateFrom}
                <Input
                  type="date"
                  value={invoiceDateFrom}
                  onChange={(event) => {
                    setInvoiceDateFrom(event.target.value)
                    setPage(1)
                  }}
                  className="mt-1 h-9"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                {t.invoiceDateTo}
                <Input
                  type="date"
                  value={invoiceDateTo}
                  onChange={(event) => {
                    setInvoiceDateTo(event.target.value)
                    setPage(1)
                  }}
                  className="mt-1 h-9"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">{t.topSuppliers}</div>
              <div className="space-y-2">
                {supplierTotals.slice(0, 5).map((supplier) => (
                  <div key={supplier.key} className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0 truncate">{supplier.label || t.noSupplier}</div>
                    <div className="shrink-0 font-medium">{formatMoney(supplier.totalCost)}</div>
                  </div>
                ))}
                {supplierTotals.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{t.noRows}</div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">{t.monthlySpend}</div>
              {monthlyChartData.length > 0 ? (
                <div className="mb-3 h-40 rounded-md border bg-muted/20 px-2 py-3 text-foreground [&_.recharts-cartesian-axis-tick_text]:fill-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => monthlyChartData.find((item) => item.month === value)?.shortLabel ?? String(value)}
                      />
                      <YAxis
                        width={44}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => new Intl.NumberFormat("en-GB", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(Number(value))}
                      />
                      <Tooltip
                        cursor={{ stroke: "currentColor", strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const item = payload[0]?.payload as { label: string; total: number } | undefined
                          if (!item) return null

                          return (
                            <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-muted-foreground">{formatMoney(item.total)}</div>
                            </div>
                          )
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#16a34a", stroke: "white", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              <div className="space-y-2">
                {monthlyTotals.slice(0, 5).map((month) => (
                  <div key={month.key} className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0 truncate">{formatMonthLabel(month.key, language)}</div>
                    <div className="shrink-0 font-medium">{formatMoney(month.totalCost)}</div>
                  </div>
                ))}
                {monthlyTotals.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{t.noRows}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-background p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            {t.totalCost}: <span className="font-medium text-foreground">{formatMoney(totalCost)}</span>
          </div>
          <div className="relative w-full md:w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t.searchMaterials}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as "all" | "sent" | "unsent")
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.all}</SelectItem>
              <SelectItem value="sent">{t.sent}</SelectItem>
              <SelectItem value="unsent">{t.notSent}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={configFilter} onValueChange={(value) => {
            setConfigFilter(value)
            setPage(1)
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t.configPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allConfigurations}</SelectItem>
              {bisConfigurations.map((config) => (
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
            {t.sortBy}
          </div>

          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(
                v as
                  | "invoiceDate_desc"
                  | "invoiceDate_asc"
                  | "default"
                  | "name_asc"
                  | "quantity_desc",
              )
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">{t.sortDefault}</SelectItem>
              <SelectItem value="invoiceDate_desc">{t.sortInvoiceNewest}</SelectItem>
              <SelectItem value="invoiceDate_asc">{t.sortInvoiceOldest}</SelectItem>
              <SelectItem value="name_asc">{t.sortNameAz}</SelectItem>
              <SelectItem value="quantity_desc">{t.sortHighestQty}</SelectItem>
            </SelectContent>
          </Select>

          {selectedRowIds.length > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={deleteSelectedRows}
              disabled={deleteLoading}
            >
              {deleteLoading ? "..." : `${t.delete} (${selectedRowIds.length})`}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportMaterialsToExcel}
            disabled={pagination.totalCount === 0 || exportLoading}
            className="ml-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportLoading ? t.loading : t.exportToExcel}
          </Button>

          {showBisControls ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncRowsFromBis}
              disabled={syncLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
              {syncLoading ? "..." : t.refresh}
            </Button>
          ) : null}

          {editableRowIds.length > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={saveRowEdits}
            >
              {t.save}
            </Button>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{tableLoading ? t.loading : t.showingRows(visibleFrom, visibleTo, pagination.totalCount)}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[92px]">
                <SelectValue aria-label={t.pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={tableLoading || pagination.page <= 1}
            >
              {t.previousPage}
            </Button>
            <span>
              {pagination.page}/{pagination.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              disabled={tableLoading || pagination.page >= pagination.totalPages}
            >
              {t.nextPage}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table className={`${showSpendInsights ? "min-w-[1360px]" : "min-w-[1240px]"} text-sm`}>
            <TableHeader>
              <TableRow className="bg-muted/40 [&_th]:px-3 [&_th]:py-3">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(value) => toggleAllVisibleRows(Boolean(value))}
                    aria-label={t.selectAllRows}
                  />
                </TableHead>
                <TableHead className="w-[76px]">{t.photo}</TableHead>
                <TableHead className="w-[18%]">{t.material}</TableHead>
                {showSpendInsights ? <TableHead className="w-[12%]">{t.supplier}</TableHead> : null}
                <TableHead className="w-[9%]">{t.status}</TableHead>
                {showBisControls ? <TableHead className="w-[16%]">{t.bisMaterialConfiguration}</TableHead> : null}
                <TableHead className="w-[11%]">{t.deliveryDate}</TableHead>
                <TableHead className="w-[6%]">{t.qty}</TableHead>
                <TableHead className="w-[5%]">{t.unit}</TableHead>
                <TableHead className="w-[7%]">{t.cost}</TableHead>
                <TableHead className="w-[7%]">{t.invoice}</TableHead>
                <TableHead className="w-[9%]">{t.invoiceDate}</TableHead>
                <TableHead className="w-[11%] text-right">{t.action}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showBisControls ? 13 : 12} className="py-12 text-center">
                    <div className="space-y-1">
                      <p className="font-medium">{t.noRows}</p>
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
                          aria-label={`Select warehouse record ${getMaterialDisplayName(r)}`}
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        {r.sourcePhoto ? (
                          <a href={r.sourcePhoto} target="_blank" rel="noreferrer">
                            <div className="relative h-14 w-14 overflow-hidden rounded-lg border bg-muted">
                              <Image
                                src={r.sourcePhoto}
                                alt={getMaterialDisplayName(r)}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          </a>
                        ) : (
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
                            aria-label={t.noPhoto}
                            title={t.noPhoto}
                          >
                            <CameraOff className="h-5 w-5" aria-hidden="true" />
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
                            placeholder={t.unnamedMaterial}
                            className="h-9 min-w-0"
                          />
                        ) : (
                          <div className="whitespace-normal break-words leading-snug">{getMaterialDisplayName(r)}</div>
                        )}
                      </TableCell>

                      {showSpendInsights ? (
                        <TableCell className="min-w-0">
                          <div className="whitespace-normal break-words leading-snug">{r.supplierName || "—"}</div>
                        </TableCell>
                      ) : null}

                      <TableCell>
                        {!normalizedStatus ? (
                          <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                            {t.statusWorksRecorded}
                          </Badge>
                        ) : isDraft ? (
                          <Badge className="rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                            {t.statusBisDraft}
                          </Badge>
                        ) : isApproved ? (
                          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                            {t.statusBisApproved}
                          </Badge>
                        ) : isAwaitingApproval ? (
                          <Badge className="rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                            {t.statusBisPending}
                          </Badge>
                        ) : (
                          <Badge className="rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                            {t.statusBisDraft}
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
                            categories={bisConfigurations}
                            organizationTemplates={organizationTemplateConfigurations}
                            measurements={measures}
                            materialTypes={types}
                            selectConfigurationLabel={t.selectConfiguration}
                            messages={t.materialConfigSelect}
                          />
                        </TableCell>
                      ) : null}

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
                                  : t.pickDate}
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
                                  : t.pickDate}
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
                              <Button
                                size="sm"
                                onClick={() => openEditModal(r, "confirm-send")}
                                disabled={!hasValidConfiguration}
                                title={!hasValidConfiguration ? t.selectConfiguration : ""}
                              >
                                {t.sendToBis}
                              </Button>
                            ) : showBisControls && !isApproved && !isAwaitingApproval ? (
                              <Button
                                size="sm"
                                onClick={() => openApproverDialog(r)}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                              >
                                {t.sendForApproval}
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
                                {isApproved ? t.approved : t.sentForApproval}
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
                                    {t.openInBis}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  onClick={() => copyMaterial(r)}
                                  disabled={copyingRecordId !== null}
                                >
                                  {copyingRecordId === r.id ? t.copying : t.copy}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditModal(r)}>
                                  {t.edit}
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
            <DialogTitle>{t.sendRecordForApprovalTitle}</DialogTitle>
            <DialogDescription>
              {t.selectApproversForApprovalDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {possibleApprovers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noBisApprovers}
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
                        {approver.name || `${t.member} ${approver.memberId}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {approver.memberType || t.unknownType}
                        {approver.level != null ? ` • ${t.level} ${approver.level}` : ""}
                      </div>
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproverDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={submitApproval}
              disabled={approvalLoading || selectedApproverKeys.length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {approvalLoading ? t.submitting : t.sendForApproval}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editModalMode === "confirm-send" ? "Apstiprināt" : t.editMaterial}</DialogTitle>
            <DialogDescription>
              {editModalMode === "confirm-send" ? "Pirms sūtīšanas uz BIS pārskatiet materiāla datus un pielikumus." : "Update material details and attachments."}
            </DialogDescription>
          </DialogHeader>
          {editDraft ? (
            <div className="space-y-5">
              <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">{t.materialName}</div>
                <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t.materialName}</label>
                <Input
                  key={`name-${editDraft.id}`}
                  defaultValue={editDraft.name}
                  onChange={(event) => { editNameRef.current = event.target.value }}
                  placeholder={t.materialName}
                  maxLength={MAX_MATERIAL_NAME_LENGTH}
                />
              </div>
              {showSpendInsights ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t.supplier}</label>
                    <Input
                      value={editDraft.supplierName ?? ""}
                      onChange={(event) => setEditDraft({ ...editDraft, supplierName: event.target.value || null })}
                      placeholder={t.supplier}
                      maxLength={160}
                    />
                  </div>
                </div>
              ) : null}
              {showBisControls ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.selectConfiguration}</label>
                  <MaterialConfigSelect
                    siteId={siteId}
                    recordId={editDraft.id}
                    value={editDraft.categoryId && editDraft.categoryId !== NO_MATCH_VALUE ? editDraft.categoryId : null}
                    onSave={handleEditDraftConfigChange}
                    onCreate={handleCreateMaterialConfiguration}
                    categories={bisConfigurations}
                    organizationTemplates={organizationTemplateConfigurations}
                    measurements={measures}
                    materialTypes={types}
                    selectConfigurationLabel={t.selectConfiguration}
                    messages={t.materialConfigSelect}
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.qty}</label>
                  <Input key={`qty-${editDraft.id}`} type="number" min="0.01" step="0.01" defaultValue={editDraft.quantity} onChange={(event) => { editQuantityRef.current = event.target.value }} placeholder={t.qty} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.cost}</label>
                  <Input key={`cost-${editDraft.id}`} type="number" min="0" step="0.01" defaultValue={editDraft.cost} onChange={(event) => { editCostRef.current = event.target.value }} placeholder={t.cost} />
                </div>
              </div>
              <div className="space-y-1 max-w-xs">
                <label className="text-xs font-medium text-muted-foreground">{t.units}</label>
                <Select
                  key={`unit-${editDraft.id}`}
                  value={editDraft.measurementUnit || undefined}
                  onValueChange={(value) => {
                    editUnitRef.current = value
                    setEditDraft({ ...editDraft, measurementUnit: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.units} />
                  </SelectTrigger>
                  <SelectContent>
                    {measures.map((measure) => (
                      <SelectItem key={measure.id} value={measure.name}>
                        {measure.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.deliveryDate}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                        {editDraft.materialDate ? formatDate(editDraft.materialDate) : t.pickDeliveryDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editDraft.materialDate ?? undefined} onSelect={(value) => setEditDraft({ ...editDraft, materialDate: value ?? null })} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t.invoiceDate}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                        {editDraft.invoiceDate ? formatDate(editDraft.invoiceDate) : t.pickInvoiceDate}
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
                  {editModalMode === "confirm-send" ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeDeliveryNotePhoto && Boolean(modalSourcePhoto)}
                        disabled={!modalSourcePhoto}
                        onCheckedChange={(value) => setIncludeDeliveryNotePhoto(Boolean(value))}
                      />
                      Pievienot pavadzīmes fotoattēlu
                    </label>
                  ) : null}
                  <div className="space-y-4">
                      <div className="space-y-2 rounded-lg border bg-background p-3">
                        <div className="text-xs font-medium text-muted-foreground">Pielikums</div>
                        <div className="flex flex-wrap gap-2">
                          <div className="h-[135px] w-[135px] overflow-hidden rounded-md border border-dashed border-muted bg-muted/40 p-2">
                            <UploadButton endpoint="imageUploader" appearance={{button:"h-full w-full text-xs"}} content={{button:"Augšupielādēt"}} onClientUploadComplete={(res)=>{const url=getUploadThingFileUrl(res?.[0]); if(url){setModalSourcePhoto(url); setIncludeDeliveryNotePhoto(true)}}} />
                          </div>
                          {modalSourcePhoto ? ([{ id: "source-photo", name: "Pielikums", mimeType: "image/*", base64Data: "", kind: "sourcePhoto" as const }]).map((file) => (
                            <div key={`${file.kind}-${file.id}`} className="group relative h-[135px] w-[135px] overflow-hidden rounded-md border border-muted bg-background">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1 z-10 hidden h-6 w-6 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 md:flex md:group-hover:opacity-100"
                                onClick={() => {
                                  setModalSourcePhoto(null)
                                  setIncludeDeliveryNotePhoto(false)
                                }}
                                title={t.delete}
                                aria-label={t.delete}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <img
                                src={modalSourcePhoto}
                                alt={file.name}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[11px] text-white line-clamp-1">{file.name}</div>
                            </div>
                          )) : null}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border bg-background p-3">
                        <div className="text-xs font-medium text-muted-foreground">{t.declarationDocument}</div>
                        <div className="flex flex-wrap gap-2">
                          <div className="h-[135px] w-[135px] overflow-hidden rounded-md border border-dashed border-muted bg-muted/40 p-2">
                            <UploadButton endpoint="materialAttachmentUploader" appearance={{button:"h-full w-full text-xs"}} content={{button:"Augšupielādēt"}} onClientUploadComplete={(res)=>{const file=res?.[0]; const fileUrl=getUploadThingFileUrl(file); if(file&&fileUrl){setEditDraft({...editDraft,declarationAttachment:[...editDraft.declarationAttachment,{id:crypto.randomUUID(),name:file.name,mimeType:getAttachmentMimeType(file),fileUrl}]})}}} />
                          </div>
                          {editDraft.declarationAttachment.map((file) => ({ ...file, kind: "declaration" as const })).map((file) => (
                            <div key={`${file.kind}-${file.id}`} className="group relative h-[135px] w-[135px] overflow-hidden rounded-md border border-muted bg-background">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1 z-10 hidden h-6 w-6 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 md:flex md:group-hover:opacity-100"
                                onClick={() => setEditDraft({
                                  ...editDraft,
                                  declarationAttachment: editDraft.declarationAttachment.filter((item) => item.id !== file.id),
                                })}
                                title={t.delete}
                                aria-label={t.delete}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              {isPreviewableImage(file) ? (
                                <img
                                  src={toAttachmentDataUrl(file)}
                                  alt={file.name}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted px-2 text-center text-xs text-muted-foreground">
                                  {file.name}
                                </div>
                              )}
                              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[11px] text-white line-clamp-1">{file.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border bg-background p-3">
                        <div className="text-xs font-medium text-muted-foreground">{t.agreement}</div>
                        <div className="flex flex-wrap gap-2">
                          <div className="h-[135px] w-[135px] overflow-hidden rounded-md border border-dashed border-muted bg-muted/40 p-2">
                            <UploadButton endpoint="materialAttachmentUploader" appearance={{button:"h-full w-full text-xs"}} content={{button:"Augšupielādēt"}} onClientUploadComplete={(res)=>{const file=res?.[0]; const fileUrl=getUploadThingFileUrl(file); if(file&&fileUrl){setEditDraft({...editDraft,agreementAttachment:[...editDraft.agreementAttachment,{id:crypto.randomUUID(),name:file.name,mimeType:getAttachmentMimeType(file),fileUrl}]})}}} />
                          </div>
                          {editDraft.agreementAttachment.map((file) => ({ ...file, kind: "agreement" as const })).map((file) => (
                            <div key={`${file.kind}-${file.id}`} className="group relative h-[135px] w-[135px] overflow-hidden rounded-md border border-muted bg-background">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 top-1 z-10 hidden h-6 w-6 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 md:flex md:group-hover:opacity-100"
                                onClick={() => setEditDraft({
                                  ...editDraft,
                                  agreementAttachment: editDraft.agreementAttachment.filter((item) => item.id !== file.id),
                                })}
                                title={t.delete}
                                aria-label={t.delete}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              {isPreviewableImage(file) ? (
                                <img
                                  src={toAttachmentDataUrl(file)}
                                  alt={file.name}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted px-2 text-center text-xs text-muted-foreground">
                                  {file.name}
                                </div>
                              )}
                              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[11px] text-white line-clamp-1">{file.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                </>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaveLoading}>
              {t.cancel}
            </Button>
            <Button onClick={saveEditModal} disabled={editSaveLoading} aria-busy={editSaveLoading}>
              {editSaveLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {editModalMode === "confirm-send" ? "Sūta..." : "..."}
                </>
              ) : (
                editModalMode === "confirm-send" ? "Apstiprināt un sūtīt" : t.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
