"use client";

import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock3,
	Copy,
	FileText,
	Loader2,
	LocateFixed,
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
	TgemDashboardSourceAnchor,
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
			noDocument: "Dokuments nav pieejams.",
			ocr: "OCR statuss",
			extraction: "MI apstrāde",
			reference: "Atsauce",
			ocrText: "Atpazītais teksts",
			copyText: "Kopēt tekstu",
			copied: "Nokopēts",
			noOcrText: "OCR teksts vēl nav pieejams.",
			showSource: "Parādīt dokumentā",
			sourceHint: "Izvēlieties tekstu tieši dokumentā, lai to kopētu.",
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
			noDocument: "Документ недоступен.",
			ocr: "Статус OCR",
			extraction: "Обработка ИИ",
			reference: "Ссылка",
			ocrText: "Распознанный текст",
			copyText: "Копировать текст",
			copied: "Скопировано",
			noOcrText: "Текст OCR пока недоступен.",
			showSource: "Показать в документе",
			sourceHint: "Выделите текст прямо в документе, чтобы скопировать его.",
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
		noDocument: "No document is available.",
		ocr: "OCR status",
		extraction: "AI processing",
		reference: "Reference",
		ocrText: "Recognized text",
		copyText: "Copy text",
		copied: "Copied",
		noOcrText: "OCR text is not available yet.",
		showSource: "Show in document",
		sourceHint: "Select text directly on the document to copy it.",
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

function Field({
	label,
	value,
	onLocate,
	active,
	locateLabel,
}: {
	label: string;
	value: React.ReactNode;
	onLocate?: () => void;
	active?: boolean;
	locateLabel?: string;
}) {
	const content = (
		<>
			<div className="min-w-0 flex-1">
				<div className="text-xs text-muted-foreground">{label}</div>
				<div className="truncate text-sm font-medium">{value || "—"}</div>
			</div>
			{onLocate ? (
				<LocateFixed
					className={`h-4 w-4 shrink-0 ${active ? "text-blue-700" : "text-blue-500"}`}
				/>
			) : null}
		</>
	);

	if (onLocate) {
		return (
			<button
				type="button"
				onClick={onLocate}
				aria-label={`${locateLabel}: ${label}`}
				className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "bg-background hover:border-blue-300 hover:bg-blue-50/50"}`}
			>
				{content}
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
			{content}
		</div>
	);
}

function OcrDocumentViewer({
	document,
	copy,
	activeSource,
}: {
	document: TgemDashboardInvoice["documents"][number];
	copy: ReturnType<typeof getCopy>;
	activeSource: TgemDashboardSourceAnchor | null;
}) {
	const [copied, setCopied] = React.useState(false);
	const scrollContainerRef = React.useRef<HTMLDivElement>(null);
	const firstPage = document.ocrPages[0];
	const pageWidth = firstPage?.width ?? 1;
	const pageHeight = firstPage?.height ?? 1;
	const ocrText = document.ocrPages
		.map((page) => page.text?.trim())
		.filter(Boolean)
		.join("\n\n");
	const hasOverlay = Boolean(
		document.contentType !== "application/pdf" &&
			firstPage?.width &&
			firstPage.height &&
			firstPage.blocks.length,
	);
	const visibleSource =
		activeSource?.pageNumber === firstPage?.pageNumber ? activeSource : null;

	React.useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container || !visibleSource) return;
		const targetTop = visibleSource.top * container.scrollHeight;
		const top = Math.max(0, targetTop - container.clientHeight / 2);
		if (typeof container.scrollTo === "function") {
			container.scrollTo({ top, behavior: "smooth" });
		} else {
			container.scrollTop = top;
		}
	}, [visibleSource]);

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

	return (
		<div className="flex h-full min-h-[32rem] flex-col gap-3">
			{document.contentType === "application/pdf" ? (
				<iframe
					title={document.originalFilename}
					src={document.documentPath}
					className="min-h-0 flex-1 rounded-md border bg-white"
				/>
			) : hasOverlay ? (
				<div
					ref={scrollContainerRef}
					className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/20 p-2"
				>
					<div
						className="relative mx-auto w-full overflow-hidden bg-white"
						style={{
							aspectRatio: `${pageWidth} / ${pageHeight}`,
							containerType: "inline-size",
						}}
					>
						<Image
							src={document.documentPath}
							alt={document.originalFilename}
							fill
							unoptimized
							sizes="(max-width: 1280px) 100vw, 60vw"
							className="object-fill"
						/>
						<div data-testid="tgem-ocr-overlay" className="absolute inset-0">
							{firstPage.blocks.map((block, index) => (
								<span
									key={`${firstPage.pageNumber}-${index}-${block.text}`}
									data-ocr-kind={block.kind}
									className="pointer-events-auto absolute z-10 origin-top-left cursor-text overflow-visible whitespace-nowrap text-transparent leading-none select-text selection:bg-blue-400/35 selection:text-transparent hover:bg-blue-300/15"
									style={{
										left: `${block.left * 100}%`,
										top: `${block.top * 100}%`,
										width: `${block.width * 100}%`,
										height: `${block.height * 100}%`,
										fontSize: `${Math.max(block.height * (pageHeight / pageWidth) * 100, 0.45)}cqw`,
									}}
									title={block.text}
								>
									{block.text}
								</span>
							))}
							{visibleSource ? (
								<div
									data-testid="tgem-field-source-highlight"
									className="pointer-events-none absolute z-20 rounded-sm border-2 border-blue-600 bg-blue-300/20 shadow-[0_0_0_2px_rgba(255,255,255,0.75)]"
									style={{
										left: `${visibleSource.left * 100}%`,
										top: `${visibleSource.top * 100}%`,
										width: `${visibleSource.width * 100}%`,
										height: `${visibleSource.height * 100}%`,
									}}
								/>
							) : null}
						</div>
					</div>
				</div>
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
			<div className="rounded-md border bg-background p-3">
				<p className="mb-2 text-xs text-blue-700">{copy.sourceHint}</p>
				<div className="mb-2 flex items-center justify-between gap-2">
					<div className="text-xs font-medium text-muted-foreground">
						{copy.ocrText}
					</div>
					<button
						type="button"
						onClick={() => void copyText()}
						disabled={!ocrText}
						className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
					className="min-h-24 w-full resize-y rounded-md border bg-muted/20 p-2 text-xs leading-5"
				/>
			</div>
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
	const [activeField, setActiveField] = React.useState<string | null>(null);
	const activeSource = activeField
		? (invoice.fieldAnchors[activeField] ?? null)
		: null;
	const sourceField = (name: string, label: string, value: React.ReactNode) => (
		<Field
			label={label}
			value={value}
			onLocate={
				invoice.fieldAnchors[name] ? () => setActiveField(name) : undefined
			}
			active={activeField === name}
			locateLabel={copy.showSource}
		/>
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
						{sourceField("supplierName", copy.supplier, invoice.supplierName)}
						{sourceField(
							"invoiceNumber",
							copy.invoiceNumber,
							invoice.invoiceNumber,
						)}
						{sourceField(
							"invoiceDate",
							copy.invoiceDate,
							formatDate(invoice.invoiceDate),
						)}
						{sourceField("dueDate", copy.dueDate, formatDate(invoice.dueDate))}
						{sourceField(
							"total",
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
					<CardTitle className="flex items-center gap-2 text-base">
						<FileText className="h-4 w-4 text-blue-600" />
						{copy.document}
					</CardTitle>
				</CardHeader>
				<CardContent className="h-[calc(100%-5rem)]">
					{document ? (
						<div className="flex h-full min-h-[32rem] flex-col gap-3">
							<OcrDocumentViewer
								document={document}
								copy={copy}
								activeSource={activeSource}
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
