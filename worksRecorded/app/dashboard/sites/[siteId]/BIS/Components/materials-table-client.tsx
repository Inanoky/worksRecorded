"use client"

import * as React from "react"
import Image from "next/image"
import {
  Search,
  ExternalLink,
  CheckCircle2,
  Clock3,
  Filter,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import SendToBisButton from "./send-to-bis-button"
import MaterialConfigSelect, { categories } from "./material-config-select"

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
  costCode: string | null
  sourcePhoto: string | null
  BISId: string | null
}

type Props = {
  materials: MaterialRow[]
  sendToBis: (
    recordId: string,
    quantity: number,
    construction_material_id: string,
    sourcePhoto?: string
  ) => Promise<any>
  updateMaterialConfiguration: (
    recordId: string,
    config: {
      categoryId: string
      categoryName: string
      measurementUnitId: string
      measurementUnit: string
    }
  ) => Promise<{ success: true }>
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

export default function MaterialsTableClient({
  materials,
  sendToBis,
  updateMaterialConfiguration,
}: Props) {
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<"all" | "sent" | "unsent">("all")
  const [configFilter, setConfigFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState<
    "invoiceDate_desc" | "invoiceDate_asc" | "name_asc" | "quantity_desc"
  >("invoiceDate_desc")

  const filteredMaterials = React.useMemo(() => {
    const q = search.trim().toLowerCase()

    let rows = materials.filter((m) => {
      const matchesSearch =
        !q ||
        [
          m.name,
          m.categoryName,
          m.measurementUnit,
          m.invoiceNr,
          m.costCode,
          m.BISId,
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

    rows = [...rows].sort((a, b) => {
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

    return rows
  }, [materials, search, status, configFilter, sortBy])

  const stats = React.useMemo(() => {
    const total = materials.length
    const sent = materials.filter((m) => !!m.BISId).length
    const unsent = total - sent
    const totalCost = materials.reduce((sum, m) => sum + (m.cost ?? 0), 0)

    return { total, sent, unsent, totalCost }
  }, [materials])

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
              placeholder="Search material, invoice, BIS configuration..."
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
              <SelectValue placeholder="BIS material configuration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All configurations</SelectItem>
              {categories.map((config) => (
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
                  | "quantity_desc"
              )
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoiceDate_desc">Newest invoice date</SelectItem>
              <SelectItem value="invoiceDate_asc">Oldest invoice date</SelectItem>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="quantity_desc">Highest quantity</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-sm text-muted-foreground">
            Showing {filteredMaterials.length} of {materials.length}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Photo</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>BIS material configuration</TableHead>
                <TableHead>Cost code</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Invoice date</TableHead>
                <TableHead>BIS ID</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-12 text-center">
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

                  return (
                    <TableRow key={r.id} className="align-middle">
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
                        {isSent ? (
                          <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <MaterialConfigSelect
                          recordId={r.id}
                          value={r.categoryId}
                          disabled={isSent}
                          onSave={updateMaterialConfiguration}
                        />
                      </TableCell>

                      <TableCell>{r.costCode || "—"}</TableCell>
                      <TableCell>{formatQty(r.quantity)}</TableCell>
                      <TableCell>{r.measurementUnit || "—"}</TableCell>
                      <TableCell>{formatMoney(r.cost)}</TableCell>
                      <TableCell>{r.invoiceNr || "—"}</TableCell>
                      <TableCell>{formatDate(r.invoiceDate)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.BISId || "—"}</TableCell>

                      <TableCell className="text-right">
                        {!isSent ? (
                          <SendToBisButton
                            recordId={r.id}
                            quantity={r.quantity ?? 0}
                            categoryId={r.categoryId ?? ""}
                            sourcePhoto={r.sourcePhoto ?? ""}
                            action={sendToBis}
                          />
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            Already sent
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}