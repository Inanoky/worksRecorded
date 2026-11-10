"use client"

import { ChevronDown, ExternalLink, FileText, Loader2 } from "lucide-react"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { WarehouseMaterialQueryInput, WarehouseMaterialRow } from "@/lib/bis/warehouse-material-query"
import type {
  WarehouseInvoiceLocator,
  WarehouseInvoicePage,
  WarehouseInvoiceSummary,
} from "@/server/actions/warehouse-invoice-view-actions"

const INVOICE_PAGE_SIZE = 30

type WarehouseInvoiceMaterialRow = Pick<
  WarehouseMaterialRow,
  "id" | "name" | "quantity" | "measurementUnit" | "cost" | "materialDate" | "BISId"
>

type Props = {
  siteId: string
  language: "lv" | "en"
  query: WarehouseMaterialQueryInput
  active: boolean
  refreshKey: number
  selectedRowIds: string[]
  onSelectionChange: (recordIds: string[]) => void
  fetchInvoices: (
    siteId: string,
    input: WarehouseMaterialQueryInput,
    pagination?: { offset?: number; limit?: number },
  ) => Promise<WarehouseInvoicePage>
  fetchInvoiceRows: (
    siteId: string,
    locator: WarehouseInvoiceLocator,
  ) => Promise<WarehouseInvoiceMaterialRow[]>
}

const messages = {
  en: {
    invoice: "Invoice",
    supplier: "Supplier",
    invoiceDate: "Invoice date",
    uploaded: "Uploaded",
    items: "Items",
    total: "Total",
    status: "Status",
    sent: "sent to BIS",
    details: "Invoice rows",
    material: "Material",
    quantity: "Quantity",
    unit: "Unit",
    deliveryDate: "Delivery date",
    cost: "Cost",
    openDocument: "Open invoice document",
    noInvoices: "No invoices found for these filters.",
    noRows: "No rows were found for this invoice.",
    loadFailed: "Invoice data could not be loaded.",
    loading: "Loading invoices...",
    unnamedInvoice: "Invoice without number",
    unnamedMaterial: "Unnamed material",
    selectInvoice: "Select all movable rows in this invoice",
    selectRow: "Select warehouse row",
    sentCannotMove: "Rows already sent to BIS cannot be moved",
    loadMore: "Load more invoices",
    showing: (visible: number, total: number) => `Showing ${visible} of ${total} invoices`,
  },
  lv: {
    invoice: "Rēķins",
    supplier: "Piegādātājs",
    invoiceDate: "Rēķina datums",
    uploaded: "Augšupielādēts",
    items: "Pozīcijas",
    total: "Kopā",
    status: "Statuss",
    sent: "nosūtītas uz BIS",
    details: "Rēķina pozīcijas",
    material: "Materiāls",
    quantity: "Daudzums",
    unit: "Vienība",
    deliveryDate: "Piegādes datums",
    cost: "Izmaksas",
    openDocument: "Skatīt rēķinu",
    noInvoices: "Šiem filtriem rēķini nav atrasti.",
    noRows: "Šim rēķinam pozīcijas nav atrastas.",
    loadFailed: "Neizdevās ielādēt rēķina datus.",
    loading: "Ielādē rēķinus...",
    unnamedInvoice: "Rēķins bez numura",
    unnamedMaterial: "Nenorādīts materiāls",
    selectInvoice: "Atlasīt visas pārvietojamās rēķina pozīcijas",
    selectRow: "Atlasīt noliktavas ierakstu",
    sentCannotMove: "Uz BIS nosūtītās pozīcijas nevar pārvietot",
    loadMore: "Ielādēt vairāk rēķinu",
    showing: (visible: number, total: number) => `Parādīti ${visible} no ${total} rēķiniem`,
  },
} as const

function formatDate(value: Date | string | null, language: "lv" | "en") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(language === "lv" ? "lv-LV" : "en-GB").format(date)
}

function formatMoney(value: number, language: "lv" | "en") {
  return new Intl.NumberFormat(language === "lv" ? "lv-LV" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

function hasInvoiceFilters(query: WarehouseMaterialQueryInput) {
  return Boolean(
    query.search?.trim() ||
      query.invoiceNumber?.trim() ||
      query.supplierName?.trim() ||
      (query.status && query.status !== "all") ||
      (query.configFilter && query.configFilter !== "all") ||
      query.invoiceDateFrom ||
      query.invoiceDateTo,
  )
}

export function WarehouseInvoiceView({
  siteId,
  language,
  query,
  active,
  refreshKey,
  selectedRowIds,
  onSelectionChange,
  fetchInvoices,
  fetchInvoiceRows,
}: Props) {
  const t = messages[language]
  const [invoices, setInvoices] = React.useState<WarehouseInvoiceSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [loadError, setLoadError] = React.useState(false)
  const [nextOffset, setNextOffset] = React.useState<number | null>(null)
  const [totalCount, setTotalCount] = React.useState(0)
  const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
  const [rowsByInvoice, setRowsByInvoice] = React.useState<Record<string, WarehouseInvoiceMaterialRow[]>>({})
  const [loadingKeys, setLoadingKeys] = React.useState<string[]>([])
  const requestIdRef = React.useRef(0)
  const loadedQueryRef = React.useRef("")
  const unfilteredPageCountRef = React.useRef(1)
  const rowRequestsRef = React.useRef<Record<string, Promise<WarehouseInvoiceMaterialRow[]>>>({})
  const queryIsFiltered = hasInvoiceFilters(query)
  const queryKey = React.useMemo(
    () => JSON.stringify([siteId, query, refreshKey]),
    [query, refreshKey, siteId],
  )

  React.useEffect(() => {
    if (!active || loadedQueryRef.current === queryKey) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadingMore(false)
    setLoadError(false)
    setNextOffset(null)
    setTotalCount(0)
    setExpandedKeys([])
    setRowsByInvoice({})
    setLoadingKeys([])
    rowRequestsRef.current = {}
    const pageCount = queryIsFiltered ? 1 : unfilteredPageCountRef.current
    const timeout = window.setTimeout(() => {
      const loadPages = async () => {
        const loadedInvoices: WarehouseInvoiceSummary[] = []
        let offset = 0
        let result: WarehouseInvoicePage | null = null
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          result = await fetchInvoices(siteId, query, {
            offset,
            limit: INVOICE_PAGE_SIZE,
          })
          const knownKeys = new Set(loadedInvoices.map((invoice) => invoice.key))
          loadedInvoices.push(
            ...result.invoices.filter((invoice) => !knownKeys.has(invoice.key)),
          )
          if (result.nextOffset === null) break
          offset = result.nextOffset
        }
        return {
          invoices: loadedInvoices,
          nextOffset: result?.nextOffset ?? null,
          totalCount: result?.totalCount ?? 0,
        }
      }
      loadPages()
        .then((result) => {
          if (requestId === requestIdRef.current) {
            loadedQueryRef.current = queryKey
            setInvoices(result.invoices)
            setNextOffset(result.nextOffset)
            setTotalCount(result.totalCount)
          }
        })
        .catch((error) => {
          if (requestId !== requestIdRef.current) return
          console.error("[Warehouse invoices] Failed to load invoice view", { siteId, error })
          setInvoices([])
          setLoadError(true)
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false)
        })
    }, query.search?.trim() || query.invoiceNumber?.trim() ? 300 : 0)

    return () => window.clearTimeout(timeout)
  }, [active, fetchInvoices, query, queryIsFiltered, queryKey, siteId])

  const loadMoreInvoices = async () => {
    if (nextOffset === null || loadingMore) return
    const expectedQueryKey = queryKey
    setLoadingMore(true)
    try {
      const result = await fetchInvoices(siteId, query, {
        offset: nextOffset,
        limit: INVOICE_PAGE_SIZE,
      })
      if (loadedQueryRef.current !== expectedQueryKey) return
      setInvoices((current) => {
        const knownKeys = new Set(current.map((invoice) => invoice.key))
        const nextInvoices = [
          ...current,
          ...result.invoices.filter((invoice) => !knownKeys.has(invoice.key)),
        ]
        if (!queryIsFiltered) unfilteredPageCountRef.current += 1
        return nextInvoices
      })
      setNextOffset(result.nextOffset)
      setTotalCount(result.totalCount)
    } catch (error) {
      console.error("[Warehouse invoices] Failed to load more invoices", {
        siteId,
        error,
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const loadInvoiceRows = React.useCallback(
    (invoice: WarehouseInvoiceSummary) => {
      const cached = rowsByInvoice[invoice.key]
      if (cached) return Promise.resolve(cached)
      const pending = rowRequestsRef.current[invoice.key]
      if (pending) return pending
      setLoadingKeys((current) => [...current, invoice.key])
      const request = fetchInvoiceRows(siteId, invoice.locator)
        .then((rows) => {
          setRowsByInvoice((current) => ({ ...current, [invoice.key]: rows }))
          return rows
        })
        .catch((error) => {
          console.error("[Warehouse invoices] Failed to load invoice rows", {
            siteId,
            invoiceKey: invoice.key,
            error,
          })
          setRowsByInvoice((current) => ({ ...current, [invoice.key]: [] }))
          return []
        })
        .finally(() => {
          delete rowRequestsRef.current[invoice.key]
          setLoadingKeys((current) => current.filter((key) => key !== invoice.key))
        })
      rowRequestsRef.current[invoice.key] = request
      return request
    },
    [fetchInvoiceRows, rowsByInvoice, siteId],
  )

  const toggleInvoice = async (invoice: WarehouseInvoiceSummary) => {
    if (expandedKeys.includes(invoice.key)) {
      setExpandedKeys((current) => current.filter((key) => key !== invoice.key))
      return
    }

    setExpandedKeys((current) => [...current, invoice.key])
    await loadInvoiceRows(invoice)
  }

  const selectInvoice = (invoice: WarehouseInvoiceSummary, checked: boolean) => {
    const ids = invoice.movableRowIds
    onSelectionChange(
      checked
        ? Array.from(new Set([...selectedRowIds, ...ids]))
        : selectedRowIds.filter((id) => !ids.includes(id)),
    )
  }

  const selectRow = (row: WarehouseInvoiceMaterialRow, checked: boolean) => {
    if (row.BISId) return
    onSelectionChange(
      checked
        ? Array.from(new Set([...selectedRowIds, row.id]))
        : selectedRowIds.filter((id) => id !== row.id),
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border bg-background text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.loading}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border bg-background px-4 py-12 text-center text-sm text-destructive shadow-sm">
        {t.loadFailed}
      </div>
    )
  }

  if (!invoices.length) {
    return (
      <div className="rounded-2xl border bg-background px-4 py-12 text-center text-sm text-muted-foreground shadow-sm">
        {t.noInvoices}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => {
        const expanded = expandedKeys.includes(invoice.key)
        const rowsLoading = loadingKeys.includes(invoice.key)
        const invoiceRows = rowsByInvoice[invoice.key]
        const selectedMovableCount = invoice.movableRowIds.filter((id) => selectedRowIds.includes(id)).length
        const allMovableSelected = invoice.movableRowIds.length > 0 && selectedMovableCount === invoice.movableRowIds.length

        return (
          <div key={invoice.key} className="overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="flex items-stretch hover:bg-muted/30">
              <div className="flex w-12 shrink-0 items-center justify-center border-r">
                <Checkbox
                  checked={allMovableSelected ? true : selectedMovableCount > 0 ? "indeterminate" : false}
                  disabled={invoice.movableRowIds.length === 0}
                  aria-label={`${t.selectInvoice}: ${invoice.invoiceNumber || t.unnamedInvoice}`}
                  title={invoice.movableRowIds.length === 0 ? t.sentCannotMove : t.selectInvoice}
                  onCheckedChange={(value) => selectInvoice(invoice, value === true)}
                />
              </div>
              <button
                type="button"
                className="grid min-w-0 flex-1 gap-3 px-4 py-4 text-left md:grid-cols-[minmax(150px,1.2fr)_minmax(140px,1fr)_110px_90px_110px_130px_32px] md:items-center"
                aria-expanded={expanded}
                onClick={() => void toggleInvoice(invoice)}
              >
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{t.invoice}</div>
                <div className="truncate font-semibold">{invoice.invoiceNumber || t.unnamedInvoice}</div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{t.supplier}</div>
                <div className="truncate">{invoice.supplierName || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t.invoiceDate}</div>
                <div>{formatDate(invoice.invoiceDate, language)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t.items}</div>
                <div>{invoice.itemCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t.total}</div>
                <div className="font-medium">{formatMoney(invoice.totalCost, language)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t.status}</div>
                <Badge variant="outline">
                  {invoice.sentCount}/{invoice.itemCount} {t.sent}
                </Badge>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {expanded ? (
              <div className="border-t bg-muted/10">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{t.details}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.uploaded}: {formatDate(invoice.createdAt, language)}
                    </div>
                  </div>
                  {invoice.sourcePhoto ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={invoice.sourcePhoto} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t.openDocument}
                      </a>
                    </Button>
                  ) : null}
                </div>
                {rowsLoading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loading}
                  </div>
                ) : invoiceRows?.length ? (
                  <div className="overflow-x-auto border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12" />
                          <TableHead>{t.material}</TableHead>
                          <TableHead>{t.quantity}</TableHead>
                          <TableHead>{t.unit}</TableHead>
                          <TableHead>{t.deliveryDate}</TableHead>
                          <TableHead>{t.cost}</TableHead>
                          <TableHead>{t.status}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRowIds.includes(row.id)}
                                disabled={Boolean(row.BISId)}
                                aria-label={`${t.selectRow}: ${row.name || t.unnamedMaterial}`}
                                title={row.BISId ? t.sentCannotMove : t.selectRow}
                                onCheckedChange={(value) => selectRow(row, value === true)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{row.name || t.unnamedMaterial}</TableCell>
                            <TableCell>{row.quantity ?? "—"}</TableCell>
                            <TableCell>{row.measurementUnit || "—"}</TableCell>
                            <TableCell>{formatDate(row.materialDate, language)}</TableCell>
                            <TableCell>{row.cost == null ? "—" : formatMoney(row.cost, language)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.BISId ? "BIS" : "WorksRecorded"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-5 w-5" />
                    {t.noRows}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="text-xs text-muted-foreground">
          {t.showing(invoices.length, totalCount)}
        </div>
        {nextOffset !== null ? (
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadMoreInvoices()}
          >
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t.loadMore}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
