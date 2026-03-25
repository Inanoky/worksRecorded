"use client"

import * as React from "react"
import Image from "next/image"
import {
  Search,
  ExternalLink,
  Clock3,
  Filter,
  ShieldCheck,
  RefreshCw,
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

function formatQty(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value)
}

function getApprovalStateStatus(status: string | null | undefined) {
  const normalizedStatus = (status ?? "").toLowerCase()

  return normalizedStatus === "approved"
    ? "approved"
    : "submitted_to_approve"
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
    "invoiceDate_desc" | "invoiceDate_asc" | "name_asc" | "quantity_desc"
  >("invoiceDate_desc")
  const [approverDialogOpen, setApproverDialogOpen] = React.useState(false)
  const [approverDialogRow, setApproverDialogRow] = React.useState<MaterialRow | null>(null)
  const [possibleApprovers, setPossibleApprovers] = React.useState<BisApprover[]>([])
  const [selectedApproverKeys, setSelectedApproverKeys] = React.useState<string[]>([])
  const [approvalLoading, setApprovalLoading] = React.useState(false)
  const [syncLoading, setSyncLoading] = React.useState(false)
  const [selectedRowIds, setSelectedRowIds] = React.useState<string[]>([])
  const [deleteLoading, setDeleteLoading] = React.useState(false)

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

  const toggleRowSelection = (recordId: string, checked: boolean) => {
    setSelectedRowIds((current) =>
      checked ? Array.from(new Set([...current, recordId])) : current.filter((id) => id !== recordId),
    )
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
      const { deletedIds } = await deleteRecords(siteId, selectedRowIds)
      setRows((current) => current.filter((row) => !deletedIds.includes(row.id)))
      setSelectedRowIds((current) => current.filter((id) => !deletedIds.includes(id)))
      toast.success(deletedIds.length === 1 ? "Record deleted" : `${deletedIds.length} records deleted`)
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
      const message = error instanceof Error ? error.message : "Failed to send record for approval"
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

  const toDateInputValue = (value: Date | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toISOString().slice(0, 10)
  }

  const handleMaterialDateChange = async (recordId: string, nextValue: string) => {
    const previousRows = rows
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

    try {
      await updateMaterialDate(recordId, materialDate)
    } catch (error) {
      console.error(error)
      setRows(previousRows)
      toast.error("Failed to update material date")
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

  const stats = React.useMemo(() => {
    const total = rows.length
    const sent = rows.filter((m) => !!m.BISId).length
    const unsent = total - sent
    const totalCost = rows.reduce((sum, m) => sum + (m.cost ?? 0), 0)

    return { total, sent, unsent, totalCost }
  }, [rows])

  const showBisControls = bisEnabled

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total records</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Sent to BIS</div>
          <div className="mt-1 text-2xl font-semibold">{stats.sent}</div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="mt-1 text-2xl font-semibold">{stats.unsent}</div>
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total cost</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatMoney(stats.totalCost)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search material, invoice, warehouse or BIS data..."
              className="pl-9"
            />
          </div>

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
                  | "name_asc"
                  | "quantity_desc",
              )
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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

          <div className="text-sm text-muted-foreground">
            Showing {filteredMaterials.length} of {rows.length}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(value) => toggleAllVisibleRows(Boolean(value))}
                    aria-label="Select all visible warehouse records"
                  />
                </TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Status</TableHead>
                {showBisControls ? <TableHead>BIS material configuration</TableHead> : null}
                <TableHead className="w-[150px]">Cost code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Invoice date</TableHead>
                <TableHead>BIS ID</TableHead>
                {showBisControls ? <TableHead className="text-right">Action</TableHead> : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showBisControls ? 14 : 12} className="py-12 text-center">
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
                    <TableRow key={r.id} className="align-middle">
                      <TableCell>
                        <Checkbox
                          checked={selectedRowIds.includes(r.id)}
                          onCheckedChange={(value) => toggleRowSelection(r.id, Boolean(value))}
                          aria-label={`Select warehouse record ${r.name || r.id}`}
                        />
                      </TableCell>

                      <TableCell>
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

                      <TableCell>
                        <div className="font-medium">{r.name || "Unnamed material"}</div>
                        {r.sourcePhoto && (
                          <a
                            href={r.sourcePhoto}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                          >
                            Open photo <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </TableCell>

                      <TableCell>
                        {!normalizedStatus ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Pending
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="secondary" className="gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Draft
                          </Badge>
                        ) : isApproved ? (
                          <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Approved
                          </Badge>
                        ) : isAwaitingApproval ? (
                          <Badge className="gap-1 bg-blue-600 text-white hover:bg-blue-600">
                            <Clock3 className="h-3.5 w-3.5" />
                            Waiting for approval
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {normalizedStatus}
                          </Badge>
                        )}
                      </TableCell>

                      {showBisControls ? (
                        <TableCell>
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

                      <TableCell>
                        <CostCodeSelect
                          recordId={r.id}
                          value={r.costCode}
                          disabled={isSent}
                          onSave={handleCostCodeChange}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={toDateInputValue(r.materialDate)}
                          onChange={(event) => handleMaterialDateChange(r.id, event.target.value)}
                          disabled={isSent}
                          className="w-[160px]"
                        />
                      </TableCell>
                      <TableCell>{formatQty(r.quantity)}</TableCell>
                      <TableCell>{r.measurementUnit || "—"}</TableCell>
                      <TableCell>{formatMoney(r.cost)}</TableCell>
                      <TableCell>{r.invoiceNr || "—"}</TableCell>
                      <TableCell>{formatDate(r.invoiceDate)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.BISId || "—"}</TableCell>

                      {showBisControls ? (
                        <TableCell className="text-right">
                          {!isSent ? (
                            <div className="flex flex-col items-end gap-1">
                              <SendToBisButton
                                recordId={r.id}
                                quantity={r.quantity ?? 0}
                                categoryId={hasValidConfiguration ? r.categoryId ?? "" : ""}
                                sourcePhoto={r.sourcePhoto ?? ""}
                                materialName={r.name ?? ""}
                                materialDate={r.materialDate}
                                action={handleSendToBis}
                              />
                            </div>
                          ) : !isApproved && !isAwaitingApproval ? (
                            <Button
                              size="sm"
                              onClick={() => openApproverDialog(r)}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Send for approval
                            </Button>
                          ) : (
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
                          )}
                        </TableCell>
                      ) : null}
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
    </div>
  )
}
