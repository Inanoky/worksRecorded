"use client";

import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock3,
	Copy,
	FileText,
	Loader2,
	Settings2,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import { getTgemInvoiceDashboardData } from "@/server/actions/tgem-invoice-actions";
import { TgemApprovalControls } from "./TgemApprovalControls";
import { TgemApprovalSetup } from "./TgemApprovalSetup";
import { TgemInvoiceUpload } from "./TgemInvoiceUpload";

type Props = {
	siteId: string;
	organizationLanguage?: string | null;
};

function getCopy(language?: string | null) {
	if (language === "lv") {
		return {
			title: "Rēķinu apstiprināšana",
			description: "Rēķinu pārskats un apstiprināšanas process.",
			inbox: "Rēķini",
			details: "Rēķina informācija",
			loading: "Ielādē rēķinus…",
			empty: "Šim objektam vēl nav rēķinu.",
			failed: "Neizdevās ielādēt rēķinus.",
			supplier: "Piegādātājs",
			invoiceNumber: "Rēķina numurs",
			invoiceDate: "Rēķina datums",
			dueDate: "Apmaksas termiņš",
			total: "Kopā",
			source: "Avots",
			lines: "Pozīcijas",
			audit: "Darbību vēsture",
			document: "Dokuments",
			textVersion: "Teksta versija",
			noDocument: "Dokuments nav pieejams.",
			ocr: "OCR statuss",
			extraction: "MI apstrāde",
			reference: "Atsauce",
			ocrText: "Atpazītais teksts",
			copyText: "Kopēt tekstu",
			copied: "Nokopēts",
			noOcrText: "OCR teksts vēl nav pieejams.",
			approvalSetup: "Apstiprināšanas iestatījumi",
		};
	}

	if (language === "ru") {
		return {
			title: "Согласование счетов",
			description: "Обзор счетов и процесс согласования.",
			inbox: "Счета",
			details: "Данные счета",
			loading: "Загрузка счетов…",
			empty: "Для этого проекта счетов пока нет.",
			failed: "Не удалось загрузить счета.",
			supplier: "Поставщик",
			invoiceNumber: "Номер счета",
			invoiceDate: "Дата счета",
			dueDate: "Срок оплаты",
			total: "Итого",
			source: "Источник",
			lines: "Позиции",
			audit: "История действий",
			document: "Документ",
			textVersion: "Текстовая версия",
			noDocument: "Документ недоступен.",
			ocr: "Статус OCR",
			extraction: "Обработка ИИ",
			reference: "Ссылка",
			ocrText: "Распознанный текст",
			copyText: "Копировать текст",
			copied: "Скопировано",
			noOcrText: "Текст OCR пока недоступен.",
			approvalSetup: "Настройки согласования",
		};
	}

	return {
		title: "Invoice approval",
		description: "Invoice review and approval workflow.",
		inbox: "Invoices",
		details: "Invoice details",
		loading: "Loading invoices…",
		empty: "No invoices exist for this project yet.",
		failed: "Could not load invoices.",
		supplier: "Supplier",
		invoiceNumber: "Invoice number",
		invoiceDate: "Invoice date",
		dueDate: "Due date",
		total: "Total",
		source: "Source",
		lines: "Line items",
		audit: "Activity history",
		document: "Document",
		textVersion: "Text version",
		noDocument: "No document is available.",
		ocr: "OCR status",
		extraction: "AI processing",
		reference: "Reference",
		ocrText: "Recognized text",
		copyText: "Copy text",
		copied: "Copied",
		noOcrText: "OCR text is not available yet.",
		approvalSetup: "Approval setup",
	};
}

function formatDate(value: string | null) {
	if (!value) return "—";
	return new Intl.DateTimeFormat("lv-LV", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));
}

function formatMoney(value: string | null, currency: string | null) {
	if (!value) return "—";
	return new Intl.NumberFormat("lv-LV", {
		style: "currency",
		currency: currency || "EUR",
	}).format(Number(value));
}

function statusClass(status: string) {
	if (status === "approved")
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	if (status === "in_approval")
		return "border-blue-200 bg-blue-50 text-blue-700";
	if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
	return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
	return status.replaceAll("_", " ");
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
			<div className="min-w-0 flex-1">
				<div className="text-xs text-muted-foreground">{label}</div>
				<div className="truncate text-sm font-medium">{value || "—"}</div>
			</div>
		</div>
	);
}

function OcrDocumentViewer({
	document,
	copy,
	view,
}: {
	document: TgemDashboardInvoice["documents"][number];
	copy: ReturnType<typeof getCopy>;
	view: "document" | "text";
}) {
	const [copied, setCopied] = React.useState(false);
	const ocrText = document.ocrPages
		.map((page) => page.text?.trim())
		.filter(Boolean)
		.join("\n\n");

	async function copyText() {
		if (!ocrText) return;

		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(ocrText);
		} else {
			const textArea = window.document.createElement("textarea");
			textArea.value = ocrText;
			textArea.setAttribute("readonly", "true");
			textArea.style.position = "fixed";
			textArea.style.opacity = "0";
			window.document.body.appendChild(textArea);
			textArea.select();
			window.document.execCommand("copy");
			textArea.remove();
		}

		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	if (view === "text") {
		return (
			<div
				data-testid="tgem-ocr-text-version"
				className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-md border bg-slate-50 dark:bg-slate-950/30"
			>
				<div className="flex items-center justify-between gap-3 border-b bg-background/80 px-3 py-2">
					<span className="text-xs font-medium text-muted-foreground">
						{copy.ocrText}
					</span>
					<button
						type="button"
						onClick={() => void copyText()}
						disabled={!ocrText}
						className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{copied ? (
							<Check className="h-3.5 w-3.5" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
						{copied ? copy.copied : copy.copyText}
					</button>
				</div>
				<textarea
					aria-label={copy.ocrText}
					readOnly
					value={ocrText}
					placeholder={copy.noOcrText}
					className="min-h-0 flex-1 resize-none border-0 bg-transparent p-4 font-mono text-xs leading-6 outline-none selection:bg-blue-200 dark:selection:bg-blue-800"
				/>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-[32rem] flex-col">
			{document.contentType === "application/pdf" ? (
				<iframe
					title={document.originalFilename}
					src={document.documentPath}
					className="min-h-0 flex-1 rounded-md border bg-white"
				/>
			) : (
				<div className="flex min-h-0 flex-1 items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
					<Image
						src={document.documentPath}
						alt={document.originalFilename}
						width={1200}
						height={1600}
						unoptimized
						className="max-h-full w-auto object-contain"
					/>
				</div>
			)}
		</div>
	);
}

function InvoiceDetails({
	invoice,
	copy,
	currentUserId,
	hasTemplate,
	organizationLanguage,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	copy: ReturnType<typeof getCopy>;
	currentUserId: string;
	hasTemplate: boolean;
	organizationLanguage?: string | null;
	onChanged: () => Promise<void>;
}) {
	const document = invoice.documents[0];
	const [documentView, setDocumentView] = React.useState<"document" | "text">(
		"document",
	);
	const sourceField = (label: string, value: React.ReactNode) => (
		<Field label={label} value={value} />
	);

	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(28rem,1.2fr)]">
			<div className="space-y-4">
				<TgemApprovalControls
					invoice={invoice}
					currentUserId={currentUserId}
					hasTemplate={hasTemplate}
					organizationLanguage={organizationLanguage}
					onChanged={onChanged}
				/>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{copy.details}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2">
						{sourceField(copy.supplier, invoice.supplierName)}
						{sourceField(copy.invoiceNumber, invoice.invoiceNumber)}
						{sourceField(copy.invoiceDate, formatDate(invoice.invoiceDate))}
						{sourceField(copy.dueDate, formatDate(invoice.dueDate))}
						{sourceField(
							copy.total,
							formatMoney(invoice.total, invoice.currency),
						)}
						<Field label={copy.source} value={invoice.source} />
						<Field label={copy.ocr} value={invoice.ocrStatus} />
						<Field label={copy.extraction} value={invoice.extractionStatus} />
						<div className="sm:col-span-2">
							<Field label={copy.reference} value={invoice.reference} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">{copy.lines}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{invoice.lines.map((line) => (
							<div key={line.id} className="rounded-md border p-3 text-sm">
								<div className="flex items-start justify-between gap-3">
									<span className="font-medium">{line.description || "—"}</span>
									<span className="whitespace-nowrap font-semibold">
										{formatMoney(line.total, line.currency || invoice.currency)}
									</span>
								</div>
								<div className="mt-1 text-xs text-muted-foreground">
									{line.quantity || "—"} {line.unit || ""} ·{" "}
									{line.suggestedCostCode || "No cost code"} ·{" "}
									{line.suggestedCategory || "No category"}
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">{copy.audit}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{invoice.auditEvents.map((event) => (
							<div key={event.id} className="flex gap-3 text-sm">
								<Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
								<div>
									<div className="font-medium">
										{event.eventType.replaceAll("_", " ")}
									</div>
									<div className="text-xs text-muted-foreground">
										{event.actorType} · {formatDate(event.createdAt)}
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<Card className="min-h-[38rem]">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<FileText className="h-4 w-4 text-blue-600" />
							{documentView === "document" ? copy.document : copy.textVersion}
						</CardTitle>
						{document ? (
							<button
								type="button"
								onClick={() =>
									setDocumentView((current) =>
										current === "document" ? "text" : "document",
									)
								}
								aria-pressed={documentView === "text"}
								className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70"
							>
								{documentView === "document" ? copy.textVersion : copy.document}
							</button>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="h-[calc(100%-5rem)]">
					{document ? (
						<div className="flex h-full min-h-[32rem] flex-col gap-3">
							<OcrDocumentViewer
								document={document}
								copy={copy}
								view={documentView}
							/>
							<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<span>{document.originalFilename}</span>
								<span>·</span>
								<span>{document.storageProvider}</span>
								<span>·</span>
								<span>
									{copy.ocr}: {invoice.ocrStatus}
								</span>
							</div>
						</div>
					) : (
						<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
							{copy.noDocument}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export function TgemInvoiceApprovalDashboard({
	siteId,
	organizationLanguage,
}: Props) {
	const copy = getCopy(organizationLanguage);
	const [data, setData] = React.useState<TgemDashboardData | null>(null);
	const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<
		string | null
	>(null);
	const [error, setError] = React.useState(false);
	const [showApprovalSetup, setShowApprovalSetup] = React.useState(false);
	const loadData = React.useCallback(
		async (preferredInvoiceId?: string) => {
			setError(false);
			const nextData = await getTgemInvoiceDashboardData(siteId);
			setData(nextData);
			setSelectedInvoiceId((currentId) => {
				if (
					preferredInvoiceId &&
					nextData?.invoices.some(
						(invoice) => invoice.id === preferredInvoiceId,
					)
				) {
					return preferredInvoiceId;
				}
				if (
					currentId &&
					nextData?.invoices.some((invoice) => invoice.id === currentId)
				) {
					return currentId;
				}
				return nextData?.invoices[0]?.id ?? null;
			});
		},
		[siteId],
	);

	React.useEffect(() => {
		let active = true;
		setError(false);
		void getTgemInvoiceDashboardData(siteId)
			.then((nextData) => {
				if (!active) return;
				setData(nextData);
				setSelectedInvoiceId(
					(currentId) => currentId ?? nextData?.invoices[0]?.id ?? null,
				);
			})
			.catch(() => {
				if (active) setError(true);
			});

		return () => {
			active = false;
		};
	}, [siteId]);

	const selectedInvoice =
		data?.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;

	return (
		<div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[116rem] flex-col gap-4 px-3 py-4 sm:px-5">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-normal">
						{copy.title}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{copy.description}
					</p>
				</div>
				{data ? (
					<button
						type="button"
						onClick={() => setShowApprovalSetup((current) => !current)}
						className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${showApprovalSetup ? "border-blue-500 bg-blue-50 text-blue-800" : "bg-background hover:bg-muted"}`}
					>
						<Settings2 className="h-4 w-4" />
						{copy.approvalSetup}
					</button>
				) : null}
			</div>

			{data === null && !error ? (
				<div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					{copy.loading}
				</div>
			) : error ? (
				<div className="flex min-h-32 items-center justify-center gap-2 text-sm text-red-600">
					<AlertTriangle className="h-4 w-4" />
					{copy.failed}
				</div>
			) : (
				<>
					{showApprovalSetup && data ? (
						<TgemApprovalSetup
							siteId={siteId}
							setup={data.approvalSetup}
							organizationLanguage={organizationLanguage}
							onSaved={() => loadData(selectedInvoiceId ?? undefined)}
						/>
					) : null}
					<TgemInvoiceUpload
						siteId={siteId}
						organizationLanguage={organizationLanguage}
						onInvoiceReady={loadData}
					/>
					<div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.35fr)_minmax(0,1fr)]">
						<Card className="h-fit">
							<CardHeader>
								<CardTitle className="text-base">{copy.inbox}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{data?.invoices.map((invoice) => (
									<button
										key={invoice.id}
										type="button"
										data-testid={`tgem-invoice-${invoice.id}`}
										onClick={() => setSelectedInvoiceId(invoice.id)}
										className={`w-full rounded-md border p-3 text-left transition hover:bg-muted/50 ${selectedInvoiceId === invoice.id ? "border-blue-500 bg-blue-50/50" : ""}`}
									>
										<div className="flex items-start justify-between gap-2">
											<span className="truncate font-medium">
												{invoice.invoiceNumber || invoice.id}
											</span>
											<Badge
												variant="outline"
												className={statusClass(invoice.status)}
											>
												{statusLabel(invoice.status)}
											</Badge>
										</div>
										<div className="mt-1 truncate text-sm text-muted-foreground">
											{invoice.supplierName || "—"}
										</div>
										<div className="mt-1 text-xs text-muted-foreground">
											{formatMoney(invoice.total, invoice.currency)} ·{" "}
											{invoice.source}
										</div>
									</button>
								))}
								{data?.invoices.length === 0 ? (
									<div className="py-8 text-center text-sm text-muted-foreground">
										{copy.empty}
									</div>
								) : null}
							</CardContent>
						</Card>

						{selectedInvoice ? (
							<InvoiceDetails
								key={selectedInvoice.id}
								invoice={selectedInvoice}
								copy={copy}
								currentUserId={data?.currentUserId ?? ""}
								hasTemplate={Boolean(data?.approvalSetup.template)}
								organizationLanguage={organizationLanguage}
								onChanged={() => loadData(selectedInvoiceId ?? undefined)}
							/>
						) : (
							<Card>
								<CardContent className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
									{copy.empty}
								</CardContent>
							</Card>
						)}
					</div>
					<Separator />
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<CheckCircle2 className="h-4 w-4 text-emerald-600" />
						Dashboard data is loaded from the TGEM invoice approval tables.
					</div>
				</>
			)}
		</div>
	);
}
