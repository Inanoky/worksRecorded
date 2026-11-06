"use client"

import { ChevronDown, ExternalLink, FileText, Loader2 } from "lucide-react"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  WarehouseInvoiceSummary,
} from "@/server/actions/warehouse-invoice-view-actions"

type Props = {
  siteId: string
  language: "lv" | "en"
  query: WarehouseMaterialQueryInput
  fetchInvoices: (
    siteId: string,
    input: WarehouseMaterialQueryInput,
  ) => Promise<WarehouseInvoiceSummary[]>
  fetchInvoiceRows: (
    siteId: string,
    locator: WarehouseInvoiceLocator,
  ) => Promise<WarehouseMaterialRow[]>
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

export function WarehouseInvoiceView({
  siteId,
  language,
  query,
  fetchInvoices,
  fetchInvoiceRows,
}: Props) {
  const t = messages[language]
  const [invoices, setInvoices] = React.useState<WarehouseInvoiceSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState(false)
  const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
  const [rowsByInvoice, setRowsByInvoice] = React.useState<Record<string, WarehouseMaterialRow[]>>({})
  const [loadingKeys, setLoadingKeys] = React.useState<string[]>([])
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    setExpandedKeys([])
    setRowsByInvoice({})
    const timeout = window.setTimeout(() => {
      fetchInvoices(siteId, query)
        .then((result) => {
          if (requestId === requestIdRef.current) setInvoices(result)
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
  }, [fetchInvoices, query, siteId])

  const toggleInvoice = async (invoice: WarehouseInvoiceSummary) => {
    if (expandedKeys.includes(invoice.key)) {
      setExpandedKeys((current) => current.filter((key) => key !== invoice.key))
      return
    }

    setExpandedKeys((current) => [...current, invoice.key])
    if (rowsByInvoice[invoice.key] || loadingKeys.includes(invoice.key)) return
    setLoadingKeys((current) => [...current, invoice.key])
    try {
      const rows = await fetchInvoiceRows(siteId, invoice.locator)
      setRowsByInvoice((current) => ({ ...current, [invoice.key]: rows }))
    } catch (error) {
      console.error("[Warehouse invoices] Failed to load invoice rows", {
        siteId,
        invoiceKey: invoice.key,
        error,
      })
      setRowsByInvoice((current) => ({ ...current, [invoice.key]: [] }))
    } finally {
      setLoadingKeys((current) => current.filter((key) => key !== invoice.key))
    }
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

        return (
          <div key={invoice.key} className="overflow-hidden rounded-2xl border bg-background shadow-sm">
            <button
              type="button"
              className="grid w-full gap-3 px-4 py-4 text-left hover:bg-muted/30 md:grid-cols-[minmax(150px,1.2fr)_minmax(140px,1fr)_110px_90px_110px_130px_32px] md:items-center"
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
    </div>
  )
}
