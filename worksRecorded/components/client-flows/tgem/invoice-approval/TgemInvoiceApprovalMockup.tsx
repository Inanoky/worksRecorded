"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils/utils";
import { TGEM_MOCK_INVOICES } from "@/components/client-flows/tgem/invoice-approval/mock-data";
import type {
  TgemApprovalStatus,
  TgemInvoice,
} from "@/components/client-flows/tgem/invoice-approval/types";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("lv-LV", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("lv-LV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: TgemInvoice["status"]) {
  if (status === "Approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "In approval") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function riskClass(risk: TgemInvoice["risk"]) {
  if (risk === "High") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function approvalTone(status: TgemApprovalStatus) {
  if (status === "approved") {
    return {
      icon: CheckCircle2,
      dotClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Approved",
    };
  }
  if (status === "current") {
    return {
      icon: Clock3,
      dotClass: "border-blue-200 bg-blue-50 text-blue-700",
      label: "Current",
    };
  }
  if (status === "rejected") {
    return {
      icon: X,
      dotClass: "border-red-200 bg-red-50 text-red-700",
      label: "Rejected",
    };
  }
  return {
    icon: Clock3,
    dotClass: "border-slate-200 bg-slate-50 text-slate-600",
    label: "Waiting",
  };
}

export function TgemInvoiceApprovalMockup() {
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState(TGEM_MOCK_INVOICES[0]?.id);
  const [query, setQuery] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"approval" | "list">("approval");
  const [localStatusByInvoiceId, setLocalStatusByInvoiceId] = React.useState<
    Record<string, TgemInvoice["status"]>
  >({});

  const filteredInvoices = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return TGEM_MOCK_INVOICES;
    return TGEM_MOCK_INVOICES.filter((invoice) =>
      [
        invoice.number,
        invoice.supplier,
        invoice.project,
        invoice.contract,
        invoice.reference,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  const selectedInvoice =
    TGEM_MOCK_INVOICES.find((invoice) => invoice.id === selectedInvoiceId) ??
    TGEM_MOCK_INVOICES[0];
  const selectedStatus =
    localStatusByInvoiceId[selectedInvoice.id] ?? selectedInvoice.status;

  const updateSelectedStatus = (status: TgemInvoice["status"]) => {
    setLocalStatusByInvoiceId((prev) => ({
      ...prev,
      [selectedInvoice.id]: status,
    }));
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[116rem] flex-col gap-4 px-3 py-4 sm:px-5">
      <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-semibold tracking-normal">TGEM invoice approval</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Frontend mockup for invoice review, approval routing, and document verification.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={viewMode}
            onValueChange={(value) => {
              if (value === "approval" || value === "list") setViewMode(value);
            }}
          >
            <ToggleGroupItem value="approval">Approval</ToggleGroupItem>
            <ToggleGroupItem value="list">All invoices</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={() => updateSelectedStatus("Needs review")}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => updateSelectedStatus("In approval")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Request changes
          </Button>
          <Button size="sm" onClick={() => updateSelectedStatus("Approved")}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <AllInvoicesList
          invoices={filteredInvoices}
          statusByInvoiceId={localStatusByInvoiceId}
          onSelectInvoice={(invoiceId) => {
            setSelectedInvoiceId(invoiceId);
            setViewMode("approval");
          }}
        />
      ) : (
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(28rem,1.05fr)_minmax(28rem,0.95fr)]">
        <section className="min-h-0 rounded-md border bg-background shadow-sm">
          <div className="grid min-h-0 h-full grid-rows-[auto_minmax(0,1fr)]">
            <div className="space-y-3 border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Invoice data</h2>
                  <p className="text-xs text-muted-foreground">Queue, validation fields, and approvers</p>
                </div>
                <Badge variant="outline" className={cn("rounded-md", statusClass(selectedStatus))}>
                  {selectedStatus}
                </Badge>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search invoice, supplier, project..."
                />
              </div>
            </div>

            <ScrollArea className="min-h-0">
              <div className="space-y-4 p-4">
                <ScrollArea className="h-[22rem] rounded-md border">
                  <div className="space-y-2 p-2">
                    {filteredInvoices.map((invoice) => {
                      const isSelected = invoice.id === selectedInvoice.id;
                      const invoiceStatus = localStatusByInvoiceId[invoice.id] ?? invoice.status;
                      return (
                        <button
                          key={invoice.id}
                          type="button"
                          className={cn(
                            "w-full rounded-md border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50",
                            isSelected ? "border-blue-400 bg-blue-50/70" : "bg-background",
                          )}
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{invoice.number}</div>
                              <div className="truncate text-xs text-muted-foreground">{invoice.supplier}</div>
                            </div>
                            <Badge variant="outline" className={cn("shrink-0 rounded-md", statusClass(invoiceStatus))}>
                              {invoiceStatus}
                            </Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">Project</div>
                              <div className="truncate font-medium">{invoice.project}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-muted-foreground">Amount</div>
                              <div className="font-semibold">{formatMoney(invoice.total, invoice.currency)}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Supplier" value={selectedInvoice.supplier} />
                  <Field label="Reg. no." value={selectedInvoice.supplierRegNo} />
                  <Field label="Project" value={selectedInvoice.project} />
                  <Field label="Contract" value={selectedInvoice.contract} />
                  <Field label="Received" value={formatDate(selectedInvoice.receivedDate)} />
                  <Field label="Due date" value={formatDate(selectedInvoice.dueDate)} />
                  <Field label="Payment term" value={selectedInvoice.paymentTerm} />
                  <Field label="Period" value={selectedInvoice.servicePeriod} />
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Validation</span>
                    <Badge variant="outline" className={cn("rounded-md", riskClass(selectedInvoice.risk))}>
                      {selectedInvoice.risk} risk
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <CheckRow label="Supplier bank account found" ok={selectedInvoice.risk !== "High"} />
                    <CheckRow label="Contract reference attached" ok />
                    <CheckRow label="Amount within remaining budget" ok={selectedInvoice.risk !== "High"} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Approval steps</h3>
                  <div className="space-y-2">
                    {selectedInvoice.approvals.map((step, index) => {
                      const tone = approvalTone(step.status);
                      const Icon = tone.icon;
                      return (
                        <div key={step.id} className="rounded-md border p-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                tone.dotClass,
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold">
                                    {index + 1}. {step.role}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{step.person}</div>
                                </div>
                                <Badge variant="outline" className={cn("rounded-md", tone.dotClass)}>
                                  {tone.label}
                                </Badge>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">Due {formatDate(step.dueDate)}</div>
                              {step.comment ? (
                                <div className="mt-2 rounded-md bg-muted px-2 py-1.5 text-xs">{step.comment}</div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold" htmlFor="approval-comment">
                    Comment
                  </label>
                  <Textarea
                    id="approval-comment"
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add approval note..."
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </section>

        <section className="min-h-0 rounded-md border bg-slate-100 shadow-sm">
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Invoice document</h2>
                <p className="text-xs text-muted-foreground">Prepared OCR overlay preview</p>
              </div>
              <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50">
                OCR mock
              </Badge>
            </div>
            <ScrollArea className="min-h-0 bg-slate-50">
              <InvoiceDocument invoice={selectedInvoice} status={selectedStatus} />
            </ScrollArea>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}

function AllInvoicesList({
  invoices,
  statusByInvoiceId,
  onSelectInvoice,
}: {
  invoices: TgemInvoice[];
  statusByInvoiceId: Record<string, TgemInvoice["status"]>;
  onSelectInvoice: (invoiceId: string) => void;
}) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const pendingCount = invoices.filter(
    (invoice) => (statusByInvoiceId[invoice.id] ?? invoice.status) !== "Approved",
  ).length;

  return (
    <section className="min-h-0 flex-1 rounded-md border bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">All invoices</h2>
          <p className="text-xs text-muted-foreground">Mock invoice register for TGEM approval flow</p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">Invoices</div>
            <div className="font-semibold">{invoices.length}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="font-semibold">{pendingCount}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold">
              {formatMoney(totalAmount, invoices[0]?.currency ?? "EUR")}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100dvh-17rem)] min-h-[24rem]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const status = statusByInvoiceId[invoice.id] ?? invoice.status;
              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="font-medium">{invoice.number}</div>
                    <div className="text-xs text-muted-foreground">{invoice.contract}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[16rem] truncate">{invoice.supplier}</div>
                    <div className="text-xs text-muted-foreground">{invoice.supplierRegNo}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[14rem] truncate">{invoice.project}</div>
                    <div className="text-xs text-muted-foreground">{invoice.reference}</div>
                  </TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("rounded-md", statusClass(status))}>
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("rounded-md", riskClass(invoice.risk))}>
                      {invoice.risk}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMoney(invoice.total, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectInvoice(invoice.id)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      )}
    </div>
  );
}

function InvoiceDocument({
  status,
}: {
  invoice: TgemInvoice;
  status: TgemInvoice["status"];
}) {
  return (
    <div className="mx-auto w-full p-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className={cn("rounded-md", statusClass(status))}>
          {status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Select text on the document to simulate OCR output.
        </span>
      </div>
      <iframe
        title="TGEM invoice OCR preview"
        src="/TGEM/moxy_invoice_visible_ocr_overlay.html"
        className="h-[calc(100dvh-12rem)] w-full rounded-md border bg-white shadow-sm"
      />
    </div>
  );
}
