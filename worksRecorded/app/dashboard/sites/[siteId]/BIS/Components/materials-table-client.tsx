"use client"

import * as React from "react"
import Image from "next/image"
import { Search, ExternalLink, CheckCircle2, Clock3, Filter, RefreshCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import SendToBisButton from "./send-to-bis-button"
import MaterialConfigSelect, { categories, NO_MATCH_VALUE } from "./material-config-select"
import CostCodeSelect from "./cost-code-select"
import { toast } from "sonner"

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
  siteId: string
  materials: MaterialRow[]
  sendToBis: (recordId: string, quantity: number, construction_material_id: string, sourcePhoto?: string) => Promise<any>
  updateMaterialConfiguration: (recordId: string, config: { categoryId: string; categoryName: string; measurementUnitId: string; measurementUnit: string }) => Promise<{ success: true }>
  updateCostCode: (recordId: string, costCode: string | null) => Promise<{ success: true }>
  createMaterial: (siteId: string, payload: { name: string; quantity: number; cost?: number | null; invoiceNr?: string | null }) => Promise<{ success: true }>
  deleteMaterial: (siteId: string, recordId: string) => Promise<{ success: true }>
  syncMaterials: (siteId: string) => Promise<{ success: true }>
  approveMaterial: (siteId: string, recordId: string) => Promise<{ success: true }>
}

const formatDate = (value: Date | null) => value ? new Intl.DateTimeFormat("en-GB").format(new Date(value)) : "—"
const formatMoney = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value)
const formatQty = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value)

export default function MaterialsTableClient({ siteId, materials, sendToBis, updateMaterialConfiguration, updateCostCode, createMaterial, deleteMaterial, syncMaterials, approveMaterial }: Props) {
  const [rows, setRows] = React.useState<MaterialRow[]>(materials)
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<"all" | "sent" | "unsent">("all")
  const [configFilter, setConfigFilter] = React.useState("all")
  const [sortBy, setSortBy] = React.useState<"invoiceDate_desc" | "invoiceDate_asc" | "name_asc" | "quantity_desc">("invoiceDate_desc")
  const [newMaterial, setNewMaterial] = React.useState({ name: "", quantity: "1", cost: "", invoiceNr: "" })
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [syncing, startSync] = React.useTransition()

  React.useEffect(() => setRows(materials), [materials])

  const withRollback = async (optimistic: MaterialRow[], action: () => Promise<void>) => {
    const prev = rows
    setRows(optimistic)
    try { await action() } catch (error) { setRows(prev); throw error }
  }

  const handleConfigChange = async (recordId: string, config: { categoryId: string; categoryName: string; measurementUnitId: string; measurementUnit: string }) => {
    await withRollback(rows.map((row) => row.id === recordId ? { ...row, categoryId: config.categoryId, categoryName: config.categoryName || null, measurementUnitId: config.measurementUnitId || null, measurementUnit: config.measurementUnit || null } : row), async () => {
      await updateMaterialConfiguration(recordId, config)
    })
    return { success: true as const }
  }

  const handleCostCodeChange = async (recordId: string, costCode: string | null) => {
    await withRollback(rows.map((row) => row.id === recordId ? { ...row, costCode } : row), async () => {
      await updateCostCode(recordId, costCode)
    })
    return { success: true as const }
  }

  const handleSendToBis = async (recordId: string, quantity: number, categoryId: string, sourcePhoto?: string) => {
    const result = await sendToBis(recordId, quantity, categoryId, sourcePhoto)
    const bisId = result?.data?.id
    if (bisId) setRows((current) => current.map((row) => row.id === recordId ? { ...row, BISId: bisId } : row))
    return result
  }

  const filteredMaterials = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...rows.filter((m) => {
      const matchesSearch = !q || [m.name, m.categoryName, m.measurementUnit, m.invoiceNr, m.costCode, m.BISId].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      const matchesStatus = status === "all" || (status === "sent" && !!m.BISId) || (status === "unsent" && !m.BISId)
      const matchesConfig = configFilter === "all" || (m.categoryId ?? "") === configFilter
      return matchesSearch && matchesStatus && matchesConfig
    })].sort((a, b) => {
      switch (sortBy) {
        case "invoiceDate_asc": return new Date(a.invoiceDate ?? 0).getTime() - new Date(b.invoiceDate ?? 0).getTime()
        case "name_asc": return (a.name ?? "").localeCompare(b.name ?? "")
        case "quantity_desc": return (b.quantity ?? 0) - (a.quantity ?? 0)
        default: return new Date(b.invoiceDate ?? 0).getTime() - new Date(a.invoiceDate ?? 0).getTime()
      }
    })
  }, [rows, search, status, configFilter, sortBy])

  const stats = React.useMemo(() => ({ total: rows.length, sent: rows.filter((m) => !!m.BISId).length, unsent: rows.filter((m) => !m.BISId).length, totalCost: rows.reduce((sum, m) => sum + (m.cost ?? 0), 0) }), [rows])

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
      <Input placeholder="Material name" value={newMaterial.name} onChange={(e) => setNewMaterial((v) => ({ ...v, name: e.target.value }))} className="max-w-xs" />
      <Input placeholder="Qty" type="number" min="0" value={newMaterial.quantity} onChange={(e) => setNewMaterial((v) => ({ ...v, quantity: e.target.value }))} className="w-28" />
      <Input placeholder="Cost" type="number" min="0" value={newMaterial.cost} onChange={(e) => setNewMaterial((v) => ({ ...v, cost: e.target.value }))} className="w-32" />
      <Input placeholder="Invoice" value={newMaterial.invoiceNr} onChange={(e) => setNewMaterial((v) => ({ ...v, invoiceNr: e.target.value }))} className="max-w-xs" />
      <Button onClick={async () => {
        try {
          await createMaterial(siteId, { name: newMaterial.name, quantity: Number(newMaterial.quantity || 0), cost: newMaterial.cost ? Number(newMaterial.cost) : null, invoiceNr: newMaterial.invoiceNr || null })
          toast.success("Material created")
          setNewMaterial({ name: "", quantity: "1", cost: "", invoiceNr: "" })
        } catch (error: any) {
          toast.error(error?.message ?? "Failed to create material")
        }
      }}>Add material</Button>
      <Button variant="outline" onClick={() => startSync(async () => { try { await syncMaterials(siteId); toast.success("BIS materials synchronized") } catch (error: any) { toast.error(error?.message ?? "Failed to sync BIS materials") } })} disabled={syncing}><RefreshCcw className="mr-2 h-4 w-4" />Sync from BIS</Button>
    </div>

    <div className="grid gap-3 md:grid-cols-4">{[{ label: "Total records", value: stats.total }, { label: "Sent to BIS", value: stats.sent }, { label: "Pending", value: stats.unsent }, { label: "Total cost", value: formatMoney(stats.totalCost) }].map((item) => <div key={item.label} className="rounded-2xl border bg-background p-4 shadow-sm"><div className="text-sm text-muted-foreground">{item.label}</div><div className="mt-1 text-2xl font-semibold">{item.value}</div></div>)}</div>

    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search material, invoice, BIS configuration..." className="pl-9" /></div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="sent">Sent to BIS</SelectItem><SelectItem value="unsent">Not sent</SelectItem></SelectContent></Select>
        <Select value={configFilter} onValueChange={setConfigFilter}><SelectTrigger><SelectValue placeholder="BIS material configuration" /></SelectTrigger><SelectContent><SelectItem value="all">All configurations</SelectItem>{categories.map((config) => <SelectItem key={config.id} value={config.id}>{config.material_kind}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="h-4 w-4" />Sort by</div><Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}><SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="invoiceDate_desc">Newest invoice date</SelectItem><SelectItem value="invoiceDate_asc">Oldest invoice date</SelectItem><SelectItem value="name_asc">Name A–Z</SelectItem><SelectItem value="quantity_desc">Highest quantity</SelectItem></SelectContent></Select><div className="ml-auto text-sm text-muted-foreground">Showing {filteredMaterials.length} of {rows.length}</div></div>
    </div>

    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/40"><TableHead>Photo</TableHead><TableHead>Material</TableHead><TableHead>Status</TableHead><TableHead>BIS material configuration</TableHead><TableHead>Cost code</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Cost</TableHead><TableHead>Invoice</TableHead><TableHead>Invoice date</TableHead><TableHead>BIS ID</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>
      {filteredMaterials.length === 0 ? <TableRow><TableCell colSpan={12} className="py-12 text-center"><div className="space-y-1"><p className="font-medium">No materials found</p><p className="text-sm text-muted-foreground">Try changing filters or search query.</p></div></TableCell></TableRow> : filteredMaterials.map((r) => {
        const isSent = !!r.BISId
        const hasValidConfiguration = !!r.categoryId && r.categoryId !== NO_MATCH_VALUE
        return <TableRow key={r.id} className="align-middle"><TableCell>{r.sourcePhoto ? <a href={r.sourcePhoto} target="_blank" rel="noreferrer"><div className="relative h-14 w-14 overflow-hidden rounded-lg border bg-muted"><Image src={r.sourcePhoto} alt={r.name ?? "Material photo"} fill className="object-cover" unoptimized /></div></a> : <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">No photo</div>}</TableCell><TableCell><div className="font-medium">{r.name || "Unnamed material"}</div>{r.sourcePhoto && <a href={r.sourcePhoto} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">Open photo <ExternalLink className="h-3.5 w-3.5" /></a>}</TableCell><TableCell>{isSent ? <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Sent</Badge> : <Badge variant="secondary" className="gap-1"><Clock3 className="h-3.5 w-3.5" />Pending</Badge>}</TableCell><TableCell><MaterialConfigSelect recordId={r.id} value={hasValidConfiguration ? r.categoryId : null} disabled={isSent} onSave={handleConfigChange} /></TableCell><TableCell><CostCodeSelect recordId={r.id} value={r.costCode} disabled={isSent} onSave={handleCostCodeChange} /></TableCell><TableCell>{formatQty(r.quantity)}</TableCell><TableCell>{r.measurementUnit || "—"}</TableCell><TableCell>{formatMoney(r.cost)}</TableCell><TableCell>{r.invoiceNr || "—"}</TableCell><TableCell>{formatDate(r.invoiceDate)}</TableCell><TableCell className="font-mono text-xs">{r.BISId || "—"}</TableCell><TableCell className="text-right"><div className="flex flex-col items-end gap-2">{!isSent ? <SendToBisButton recordId={r.id} quantity={r.quantity ?? 0} categoryId={hasValidConfiguration ? r.categoryId ?? "" : ""} sourcePhoto={r.sourcePhoto ?? ""} action={handleSendToBis} /> : <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={pendingId === r.id} onClick={async () => { try { setPendingId(r.id); await approveMaterial(siteId, r.id); toast.success("Approval request sent to BIS") } catch (error: any) { toast.error(error?.message ?? "Failed to approve material") } finally { setPendingId(null) } }}>Approve</Button>}<Button size="sm" variant="outline" disabled={pendingId === r.id} onClick={async () => { try { setPendingId(r.id); await deleteMaterial(siteId, r.id); toast.success("Material deleted") } catch (error: any) { toast.error(error?.message ?? "Failed to delete material") } finally { setPendingId(null) } }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div></TableCell></TableRow>
      })}
    </TableBody></Table></div></div>
  </div>
}
