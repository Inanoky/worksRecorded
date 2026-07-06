"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  GripVertical,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Users,
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
import { TGEM_MOCK_INVOICES } from "@/flows/tgem-invoice-approval/frontend/mock-data";
import type {
  TgemApprovalStatus,
  TgemInvoice,
} from "@/flows/tgem-invoice-approval/frontend/types";

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

const TGEM_COST_CODES = [
  { value: "1000-EL", label: "1000-EL Electrical works" },
  { value: "1100-CW", label: "1100-CW Civil works" },
  { value: "1200-HVAC", label: "1200-HVAC Ventilation" },
  { value: "1300-ST", label: "1300-ST Steel works" },
  { value: "1400-EQ", label: "1400-EQ Equipment rental" },
  { value: "1500-GEN", label: "1500-GEN General site costs" },
  { value: "1600-SEC", label: "1600-SEC Security systems" },
  { value: "1700-DOC", label: "1700-DOC Documentation" },
];

function suggestedCostCode(text: string) {
  const normalizedText = text.toLowerCase();
  if (normalizedText.includes("electrical") || normalizedText.includes("cable") || normalizedText.includes("lighting")) {
    return "1000-EL";
  }
  if (normalizedText.includes("concrete") || normalizedText.includes("foundation") || normalizedText.includes("civil")) {
    return "1100-CW";
  }
  if (normalizedText.includes("hvac") || normalizedText.includes("ventilation") || normalizedText.includes("air")) {
    return "1200-HVAC";
  }
  if (normalizedText.includes("steel") || normalizedText.includes("anchor") || normalizedText.includes("plate")) {
    return "1300-ST";
  }
  if (normalizedText.includes("rental") || normalizedText.includes("lift") || normalizedText.includes("telehandler")) {
    return "1400-EQ";
  }
  if (normalizedText.includes("gate") || normalizedText.includes("reader") || normalizedText.includes("security")) {
    return "1600-SEC";
  }
  if (normalizedText.includes("drawing") || normalizedText.includes("report") || normalizedText.includes("survey")) {
    return "1700-DOC";
  }
  return "1500-GEN";
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
  const [viewMode, setViewMode] = React.useState<"approval" | "list" | "items" | "flow">("approval");
  const [localStatusByInvoiceId, setLocalStatusByInvoiceId] = React.useState<
    Record<string, TgemInvoice["status"]>
  >({});
  const [invoiceCostCodeById, setInvoiceCostCodeById] = React.useState<Record<string, string>>({});
  const [lineCostCodeByKey, setLineCostCodeByKey] = React.useState<Record<string, string>>({});

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
  const selectedCostCode =
    invoiceCostCodeById[selectedInvoice.id] ??
    suggestedCostCode(`${selectedInvoice.project} ${selectedInvoice.reference} ${selectedInvoice.supplier}`);

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
        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
          <ToggleGroup
            type="single"
            size="default"
            className="h-10 rounded-md border bg-muted/40 p-1"
            value={viewMode}
            onValueChange={(value) => {
              if (value === "approval" || value === "list" || value === "items" || value === "flow") setViewMode(value);
            }}
          >
            <ToggleGroupItem value="approval" className="h-8 min-w-[5.75rem] whitespace-nowrap rounded-sm px-3 text-sm">
              Approval
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="h-8 min-w-[6.5rem] whitespace-nowrap rounded-sm px-3 text-sm">
              All invoices
            </ToggleGroupItem>
            <ToggleGroupItem value="items" className="h-8 min-w-[6.75rem] whitespace-nowrap rounded-sm px-3 text-sm">
              Invoice items
            </ToggleGroupItem>
            <ToggleGroupItem value="flow" className="h-8 min-w-[7rem] whitespace-nowrap rounded-sm px-3 text-sm">
              Approval flow
            </ToggleGroupItem>
          </ToggleGroup>
          {viewMode === "approval" ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      {viewMode === "flow" ? (
        <ApprovalFlowSetup />
      ) : viewMode === "items" ? (
        <InvoiceItemsList
          invoices={filteredInvoices}
          lineCostCodeByKey={lineCostCodeByKey}
          onChangeLineCostCode={(lineKey, costCode) =>
            setLineCostCodeByKey((prev) => ({ ...prev, [lineKey]: costCode }))
          }
          onSelectInvoice={(invoiceId) => {
            setSelectedInvoiceId(invoiceId);
            setViewMode("approval");
          }}
        />
      ) : viewMode === "list" ? (
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

                <div className="rounded-md border p-3">
                  <label className="text-sm font-semibold" htmlFor="invoice-cost-code">
                    Invoice cost code
                  </label>
                  <select
                    id="invoice-cost-code"
                    value={selectedCostCode}
                    onChange={(event) =>
                      setInvoiceCostCodeById((prev) => ({
                        ...prev,
                        [selectedInvoice.id]: event.target.value,
                      }))
                    }
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {TGEM_COST_CODES.map((costCode) => (
                      <option key={costCode.value} value={costCode.value}>
                        {costCode.label}
                      </option>
                    ))}
                  </select>
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

                <Separator />

                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold">Invoice queue</h3>
                    <p className="text-xs text-muted-foreground">Scroll to review other invoices</p>
                  </div>
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

function InvoiceItemsList({
  invoices,
  lineCostCodeByKey,
  onChangeLineCostCode,
  onSelectInvoice,
}: {
  invoices: TgemInvoice[];
  lineCostCodeByKey: Record<string, string>;
  onChangeLineCostCode: (lineKey: string, costCode: string) => void;
  onSelectInvoice: (invoiceId: string) => void;
}) {
  const [itemSearch, setItemSearch] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [costCodeFilter, setCostCodeFilter] = React.useState("all");

  const projectOptions = React.useMemo(
    () => Array.from(new Set(invoices.map((invoice) => invoice.project))).sort(),
    [invoices],
  );

  const invoiceItems = React.useMemo(
    () =>
      invoices.flatMap((invoice) =>
        invoice.lines.map((line, index) => {
          const lineKey = `${invoice.id}-${line.id}-${index}`;
          const costCode =
            lineCostCodeByKey[lineKey] ??
            suggestedCostCode(`${invoice.project} ${invoice.reference} ${line.description}`);

          return {
            invoice,
            line,
            lineKey,
            costCode,
          };
        }),
      ),
    [invoices, lineCostCodeByKey],
  );

  const visibleItems = React.useMemo(() => {
    const normalizedSearch = itemSearch.trim().toLowerCase();
    return invoiceItems.filter(({ invoice, line, costCode }) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          invoice.number,
          invoice.supplier,
          invoice.project,
          invoice.contract,
          invoice.reference,
          line.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return (
        matchesSearch &&
        (projectFilter === "all" || invoice.project === projectFilter) &&
        (costCodeFilter === "all" || costCode === costCodeFilter)
      );
    });
  }, [costCodeFilter, invoiceItems, itemSearch, projectFilter]);

  const totalAmount = visibleItems.reduce((sum, item) => sum + item.line.total, 0);

  const resetFilters = () => {
    setItemSearch("");
    setProjectFilter("all");
    setCostCodeFilter("all");
  };

  return (
    <section className="min-h-0 flex-1 rounded-md border bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Invoice items</h2>
          <p className="text-xs text-muted-foreground">Invoice positions with individual cost code assignment</p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">Positions</div>
            <div className="font-semibold">{visibleItems.length}</div>
          </div>
          <div className="rounded-md border px-3 py-2">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold">{formatMoney(totalAmount, invoices[0]?.currency ?? "EUR")}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(2,minmax(10rem,0.8fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            value={itemSearch}
            onChange={(event) => setItemSearch(event.target.value)}
            placeholder="Search item, invoice, supplier..."
          />
        </div>
        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All projects</option>
          {projectOptions.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
        <select
          value={costCodeFilter}
          onChange={(event) => setCostCodeFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All cost codes</option>
          {TGEM_COST_CODES.map((costCode) => (
            <option key={costCode.value} value={costCode.value}>
              {costCode.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
          Clear
        </Button>
      </div>

      <ScrollArea className="h-[calc(100dvh-22rem)] min-h-[20rem]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Supplier / project</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Cost code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map(({ invoice, line, lineKey, costCode }) => (
              <TableRow
                key={lineKey}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition hover:bg-muted/50"
                onClick={() => onSelectInvoice(invoice.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectInvoice(invoice.id);
                  }
                }}
              >
                <TableCell>
                  <div className="font-medium">{invoice.number}</div>
                  <div className="text-xs text-muted-foreground">{invoice.contract}</div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[16rem] truncate">{invoice.supplier}</div>
                  <div className="text-xs text-muted-foreground">{invoice.project}</div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[24rem] truncate font-medium">{line.description}</div>
                  <div className="text-xs text-muted-foreground">{invoice.reference}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.quantity} {line.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.unitPrice, invoice.currency)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(line.total, invoice.currency)}
                </TableCell>
                <TableCell>
                  <select
                    value={costCode}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onChangeLineCostCode(lineKey, event.target.value)}
                    className="h-9 w-full min-w-[13rem] rounded-md border bg-background px-3 text-sm"
                  >
                    {TGEM_COST_CODES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
            {visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                  No invoice positions match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </ScrollArea>
    </section>
  );
}

function ApprovalFlowSetup() {
  const [project, setProject] = React.useState("TGEM Office Reconstruction");
  const [draggedStepId, setDraggedStepId] = React.useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = React.useState([
    {
      id: "step-project-manager",
      role: "Project manager",
      person: "Laura Berzina",
    },
    {
      id: "step-cost-controller",
      role: "Cost controller",
      person: "Miks Ozols",
    },
    {
      id: "step-finance",
      role: "Finance",
      person: "Anna Liepa",
    },
  ]);

  const availablePeople = [
    { person: "Edgars Kalnins", role: "Site manager" },
    { person: "Ieva Jansone", role: "Quantity surveyor" },
    { person: "Janis Krumins", role: "Board approval" },
    { person: "Nora Peterson", role: "Accountant" },
  ];

  const reorderStep = (targetStepId: string) => {
    if (!draggedStepId || draggedStepId === targetStepId) return;
    setWorkflowSteps((currentSteps) => {
      const fromIndex = currentSteps.findIndex((step) => step.id === draggedStepId);
      const toIndex = currentSteps.findIndex((step) => step.id === targetStepId);
      if (fromIndex < 0 || toIndex < 0) return currentSteps;
      const nextSteps = [...currentSteps];
      const [movedStep] = nextSteps.splice(fromIndex, 1);
      nextSteps.splice(toIndex, 0, movedStep);
      return nextSteps;
    });
    setDraggedStepId(null);
  };

  const addPerson = (person: string, role: string) => {
    setWorkflowSteps((currentSteps) => [
      ...currentSteps,
      {
        id: `step-${person.toLowerCase().replace(/\s+/g, "-")}-${currentSteps.length}`,
        person,
        role,
      },
    ]);
  };

  return (
    <section className="min-h-0 flex-1 rounded-md border bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold">Approval flow setup</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a project and arrange people in the approval order.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm">
            Save workflow
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100dvh-15rem)] min-h-[28rem]">
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(22rem,0.75fr)_minmax(32rem,1.25fr)]">
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <label className="text-sm font-semibold" htmlFor="workflow-project">
                Project
              </label>
              <select
                id="workflow-project"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option>TGEM Office Reconstruction</option>
                <option>TGEM Warehouse Extension</option>
                <option>TGEM Service Building</option>
              </select>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold">People</h3>
              </div>
              <div className="space-y-2">
                {availablePeople.map((person) => (
                  <button
                    key={person.person}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                    onClick={() => addPerson(person.person, person.role)}
                  >
                    <span>
                      <span className="block text-sm font-medium">{person.person}</span>
                      <span className="block text-xs text-muted-foreground">{person.role}</span>
                    </span>
                    <Plus className="h-4 w-4 text-blue-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold">Approval order</h3>
                </div>
                <p className="text-xs text-muted-foreground">{project}</p>
              </div>
              <Badge variant="outline" className="rounded-md border-blue-200 bg-blue-50 text-blue-700">
                {workflowSteps.length} steps
              </Badge>
            </div>

            <div className="space-y-3">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => setDraggedStepId(step.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorderStep(step.id)}
                  onDragEnd={() => setDraggedStepId(null)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border bg-background p-3 shadow-sm transition",
                    draggedStepId === step.id ? "border-blue-300 bg-blue-50/70 opacity-80" : "hover:border-blue-300",
                  )}
                >
                  <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-muted-foreground" />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{step.person}</div>
                    <div className="truncate text-xs text-muted-foreground">{step.role}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setWorkflowSteps((currentSteps) =>
                        currentSteps.filter((currentStep) => currentStep.id !== step.id),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">Invoice approval path</div>
              <div className="mt-1 text-muted-foreground">
                {workflowSteps.map((step) => step.person).join(" -> ")}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </section>
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
  const [invoiceSearch, setInvoiceSearch] = React.useState("");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");

  const projectOptions = React.useMemo(
    () => Array.from(new Set(invoices.map((invoice) => invoice.project))).sort(),
    [invoices],
  );

  const visibleInvoices = React.useMemo(() => {
    const normalizedSearch = invoiceSearch.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const status = statusByInvoiceId[invoice.id] ?? invoice.status;
      const matchesSearch =
        !normalizedSearch ||
        [
          invoice.number,
          invoice.supplier,
          invoice.supplierRegNo,
          invoice.project,
          invoice.contract,
          invoice.reference,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return (
        matchesSearch &&
        (projectFilter === "all" || invoice.project === projectFilter) &&
        (statusFilter === "all" || status === statusFilter) &&
        (riskFilter === "all" || invoice.risk === riskFilter)
      );
    });
  }, [invoiceSearch, invoices, projectFilter, riskFilter, statusByInvoiceId, statusFilter]);

  const resetFilters = () => {
    setInvoiceSearch("");
    setProjectFilter("all");
    setStatusFilter("all");
    setRiskFilter("all");
  };

  const totalAmount = visibleInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const pendingCount = visibleInvoices.filter(
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
            <div className="font-semibold">{visibleInvoices.length}</div>
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

      <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(10rem,0.8fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            value={invoiceSearch}
            onChange={(event) => setInvoiceSearch(event.target.value)}
            placeholder="Search invoice, supplier, contract..."
          />
        </div>
        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All projects</option>
          {projectOptions.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="In approval">In approval</option>
          <option value="Needs review">Needs review</option>
          <option value="Approved">Approved</option>
        </select>
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All risks</option>
          <option value="Low">Low risk</option>
          <option value="Medium">Medium risk</option>
          <option value="High">High risk</option>
        </select>
        <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
          Clear
        </Button>
      </div>

      <ScrollArea className="h-[calc(100dvh-22rem)] min-h-[20rem]">
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
            {visibleInvoices.map((invoice) => {
              const status = statusByInvoiceId[invoice.id] ?? invoice.status;
              return (
                <TableRow
                  key={invoice.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer transition hover:bg-muted/50"
                  onClick={() => onSelectInvoice(invoice.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectInvoice(invoice.id);
                    }
                  }}
                >
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
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectInvoice(invoice.id);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                  No invoices match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
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
