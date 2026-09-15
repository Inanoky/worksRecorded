"use client";

import {
	AlertTriangle,
	ArrowRight,
	Check,
	CheckCircle2,
	Clock3,
	Copy,
	FileText,
	Inbox,
	LayoutPanelTop,
	Loader2,
	Search,
	Settings2,
	X,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import { getTgemInvoiceDashboardData } from "@/server/actions/tgem-invoice-actions";
import { TgemApprovalControls } from "./TgemApprovalControls";
import { TgemApprovalSetup } from "./TgemApprovalSetup";
import { TgemInvoiceUpload } from "./TgemInvoiceUpload";
import { TgemPdfViewer } from "./TgemPdfViewer";

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
			approvalWorkspace: "Apstiprināšanas skats",
			allInvoices: "Visi rēķini",
			registerDescription:
				"Meklējiet un pārskatiet visus šī projekta rēķinus vienuviet.",
			searchInvoices: "Meklēt pēc numura vai piegādātāja",
			status: "Statuss",
			allStatuses: "Visi statusi",
			assignedToMe: "Gaida mani",
			currentApprover: "Pašreizējais apstiprinātājs",
			noCurrentApprover: "Nav piešķirts",
			showingInvoices: "Parādīti rēķini",
			noMatchingInvoices: "Nav atrasts neviens atbilstošs rēķins.",
			previewInvoice: "Rēķina priekšskatījums",
			openInvoice: "Atvērt apstiprināšanas skatā",
			closePreview: "Aizvērt priekšskatījumu",
			approvalProgress: "Apstiprināšanas progress",
			step: "Solis",
			quantity: "Daudzums",
			unitPrice: "Vienības cena",
			costCode: "Izmaksu kods",
			category: "Kategorija",
			noCostCode: "Nav izmaksu koda",
			noCategory: "Nav kategorijas",
			noLineItems: "Rēķina pozīcijas nav atpazītas.",
			dataSource: "Dati ielādēti no TGEM rēķinu apstiprināšanas sistēmas.",
			statuses: {
				received: "Saņemts",
				processing: "Apstrādē",
				needs_review: "Jāpārbauda",
				in_approval: "Apstiprināšanā",
				approved: "Apstiprināts",
				changes_requested: "Pieprasīti labojumi",
				rejected: "Noraidīts",
				failed_processing: "Apstrādes kļūda",
			},
			processingStatuses: {
				pending: "Gaida",
				processing: "Apstrādē",
				complete: "Pabeigts",
				failed: "Kļūda",
			},
			sources: {
				dashboard: "Web panelis",
				whatsapp: "WhatsApp",
				email: "E-pasts",
				fixture: "Demo dati",
			},
			events: {
				fixture_created: "Izveidots demonstrācijas rēķins",
				invoice_received: "Rēķins saņemts",
				invoice_processing_started: "Sākta rēķina apstrāde",
				invoice_extraction_completed: "Datu atpazīšana pabeigta",
				invoice_processing_failed: "Rēķina apstrāde neizdevās",
				invoice_approval_auto_started: "Apstiprināšana sākta automātiski",
				invoice_approval_auto_start_skipped:
					"Automātiskā apstiprināšana netika sākta",
				invoice_submitted_for_approval: "Rēķins nosūtīts apstiprināšanai",
				invoice_approval_step_approved: "Apstiprināšanas solis apstiprināts",
				invoice_rejected: "Rēķins noraidīts",
				invoice_changes_requested: "Pieprasīti rēķina labojumi",
			},
			actors: {
				user: "Lietotājs",
				system: "Sistēma",
				fixture: "Demo dati",
			},
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
			approvalWorkspace: "Согласование",
			allInvoices: "Все счета",
			registerDescription:
				"Ищите и просматривайте все счета этого проекта в одном месте.",
			searchInvoices: "Поиск по номеру или поставщику",
			status: "Статус",
			allStatuses: "Все статусы",
			assignedToMe: "Ожидают меня",
			currentApprover: "Текущий согласующий",
			noCurrentApprover: "Не назначен",
			showingInvoices: "Показано счетов",
			noMatchingInvoices: "Подходящих счетов не найдено.",
			previewInvoice: "Предпросмотр счета",
			openInvoice: "Открыть для согласования",
			closePreview: "Закрыть предпросмотр",
			approvalProgress: "Ход согласования",
			step: "Этап",
			quantity: "Количество",
			unitPrice: "Цена за единицу",
			costCode: "Код затрат",
			category: "Категория",
			noCostCode: "Нет кода затрат",
			noCategory: "Нет категории",
			noLineItems: "Позиции счета не распознаны.",
			dataSource: "Данные загружены из системы согласования счетов TGEM.",
			statuses: {
				received: "Получен",
				processing: "Обрабатывается",
				needs_review: "Требует проверки",
				in_approval: "На согласовании",
				approved: "Согласован",
				changes_requested: "Запрошены исправления",
				rejected: "Отклонен",
				failed_processing: "Ошибка обработки",
			},
			processingStatuses: {
				pending: "Ожидает",
				processing: "Обрабатывается",
				complete: "Завершено",
				failed: "Ошибка",
			},
			sources: {
				dashboard: "Панель управления",
				whatsapp: "WhatsApp",
				email: "Электронная почта",
				fixture: "Демонстрационные данные",
			},
			events: {
				fixture_created: "Создан демонстрационный счет",
				invoice_received: "Счет получен",
				invoice_processing_started: "Обработка счета начата",
				invoice_extraction_completed: "Распознавание данных завершено",
				invoice_processing_failed: "Не удалось обработать счет",
				invoice_approval_auto_started: "Согласование начато автоматически",
				invoice_approval_auto_start_skipped:
					"Автоматическое согласование не начато",
				invoice_submitted_for_approval: "Счет отправлен на согласование",
				invoice_approval_step_approved: "Этап согласования завершен",
				invoice_rejected: "Счет отклонен",
				invoice_changes_requested: "Запрошены исправления счета",
			},
			actors: {
				user: "Пользователь",
				system: "Система",
				fixture: "Демонстрационные данные",
			},
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
		approvalWorkspace: "Approval workspace",
		allInvoices: "All invoices",
		registerDescription:
			"Search and review every invoice for this project in one place.",
		searchInvoices: "Search by number or supplier",
		status: "Status",
		allStatuses: "All statuses",
		assignedToMe: "Waiting for me",
		currentApprover: "Current approver",
		noCurrentApprover: "Not assigned",
		showingInvoices: "Invoices shown",
		noMatchingInvoices: "No matching invoices found.",
		previewInvoice: "Invoice preview",
		openInvoice: "Open in approval workspace",
		closePreview: "Close preview",
		approvalProgress: "Approval progress",
		step: "Step",
		quantity: "Quantity",
		unitPrice: "Unit price",
		costCode: "Cost code",
		category: "Category",
		noCostCode: "No cost code",
		noCategory: "No category",
		noLineItems: "No invoice line items were recognized.",
		dataSource: "Data loaded from the TGEM invoice approval system.",
		statuses: {
			received: "Received",
			processing: "Processing",
			needs_review: "Needs review",
			in_approval: "In approval",
			approved: "Approved",
			changes_requested: "Changes requested",
			rejected: "Rejected",
			failed_processing: "Processing failed",
		},
		processingStatuses: {
			pending: "Pending",
			processing: "Processing",
			complete: "Complete",
			failed: "Failed",
		},
		sources: {
			dashboard: "Dashboard",
			whatsapp: "WhatsApp",
			email: "Email",
			fixture: "Demo data",
		},
		events: {
			fixture_created: "Demo invoice created",
			invoice_received: "Invoice received",
			invoice_processing_started: "Invoice processing started",
			invoice_extraction_completed: "Data extraction completed",
			invoice_processing_failed: "Invoice processing failed",
			invoice_approval_auto_started: "Approval started automatically",
			invoice_approval_auto_start_skipped: "Automatic approval was not started",
			invoice_submitted_for_approval: "Invoice sent for approval",
			invoice_approval_step_approved: "Approval step completed",
			invoice_rejected: "Invoice rejected",
			invoice_changes_requested: "Invoice changes requested",
		},
		actors: {
			user: "User",
			system: "System",
			fixture: "Demo data",
		},
	};
}

function localeForLanguage(language?: string | null) {
	if (language === "ru") return "ru-RU";
	if (language === "en") return "en-GB";
	return "lv-LV";
}

function formatDate(value: string | null, language?: string | null) {
	if (!value) return "—";
	return new Intl.DateTimeFormat(localeForLanguage(language), {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));
}

function formatMoney(
	value: string | null,
	currency: string | null,
	language?: string | null,
) {
	if (!value) return "—";
	return new Intl.NumberFormat(localeForLanguage(language), {
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

function localizedValue(values: Record<string, string>, value: string) {
	return values[value] ?? value.replaceAll("_", " ");
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
	language,
	view,
}: {
	document: TgemDashboardInvoice["documents"][number];
	copy: ReturnType<typeof getCopy>;
	language?: string | null;
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
				className="flex h-[600px] flex-col overflow-hidden rounded-md border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/30"
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
		<div
			data-testid="tgem-document-viewport"
			className="flex h-[600px] flex-col"
		>
			{document.contentType === "application/pdf" ? (
				<TgemPdfViewer
					documentPath={document.documentPath}
					filename={document.originalFilename}
					language={language}
				/>
			) : (
				<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-800 p-4 text-sm text-slate-300 shadow-inner dark:border-slate-700 dark:bg-slate-950">
					<Image
						src={document.documentPath}
						alt={document.originalFilename}
						width={1200}
						height={1600}
						unoptimized
						className="max-h-full w-auto object-contain shadow-[0_12px_34px_rgba(0,0,0,0.38)]"
					/>
				</div>
			)}
		</div>
	);
}

function approvalPosition(invoice: TgemDashboardInvoice) {
	const currentRoundSteps = invoice.approvalSteps.filter(
		(step) => step.approvalRound === invoice.approvalRound,
	);
	const currentStep = currentRoundSteps.find(
		(step) => step.status === "current",
	);
	const currentStepIndex = currentStep
		? currentRoundSteps.findIndex((step) => step.id === currentStep.id) + 1
		: null;

	return {
		currentStep,
		currentStepIndex,
		totalSteps: currentRoundSteps.length,
	};
}

function InvoiceRegister({
	invoices,
	currentUserId,
	copy,
	organizationLanguage,
	onOpenInvoice,
}: {
	invoices: TgemDashboardInvoice[];
	currentUserId: string;
	copy: ReturnType<typeof getCopy>;
	organizationLanguage?: string | null;
	onOpenInvoice: (invoiceId: string) => void;
}) {
	const searchInputId = React.useId();
	const [search, setSearch] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState("all");
	const [assignedToMeOnly, setAssignedToMeOnly] = React.useState(false);
	const [previewInvoiceId, setPreviewInvoiceId] = React.useState<string | null>(
		null,
	);
	const normalizedSearch = search.trim().toLocaleLowerCase();
	const filteredInvoices = React.useMemo(
		() =>
			invoices.filter((invoice) => {
				const currentStep = approvalPosition(invoice).currentStep;
				const matchesSearch =
					!normalizedSearch ||
					invoice.invoiceNumber
						?.toLocaleLowerCase()
						.includes(normalizedSearch) ||
					invoice.supplierName
						?.toLocaleLowerCase()
						.includes(normalizedSearch) ||
					invoice.supplierRegistrationNo
						?.toLocaleLowerCase()
						.includes(normalizedSearch);
				const matchesStatus =
					statusFilter === "all" || invoice.status === statusFilter;
				const matchesAssignment =
					!assignedToMeOnly || currentStep?.approverUserId === currentUserId;

				return matchesSearch && matchesStatus && matchesAssignment;
			}),
		[assignedToMeOnly, currentUserId, invoices, normalizedSearch, statusFilter],
	);
	const previewInvoice =
		invoices.find((invoice) => invoice.id === previewInvoiceId) ?? null;

	function openPreview(invoiceId: string) {
		setPreviewInvoiceId(invoiceId);
	}

	return (
		<>
			<Card data-testid="tgem-invoice-register" className="overflow-hidden">
				<CardHeader className="border-b bg-slate-50/70 dark:bg-slate-950/30">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">{copy.allInvoices}</CardTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								{copy.registerDescription}
							</p>
						</div>
						<div className="rounded-full border bg-background px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
							{copy.showingInvoices}: {filteredInvoices.length} /{" "}
							{invoices.length}
						</div>
					</div>
					<div className="mt-4 flex flex-col gap-2 sm:flex-row">
						<div className="relative min-w-0 flex-1">
							<label htmlFor={searchInputId} className="sr-only">
								{copy.searchInvoices}
							</label>
							<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id={searchInputId}
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder={copy.searchInvoices}
								className="bg-background pl-9"
							/>
						</div>
						<select
							aria-label={copy.status}
							value={statusFilter}
							onChange={(event) => setStatusFilter(event.target.value)}
							className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<option value="all">{copy.allStatuses}</option>
							{Object.entries(copy.statuses).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
						<button
							type="button"
							aria-pressed={assignedToMeOnly}
							onClick={() => setAssignedToMeOnly((current) => !current)}
							className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${assignedToMeOnly ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200" : "bg-background hover:bg-muted"}`}
						>
							<Clock3 className="h-4 w-4" />
							{copy.assignedToMe}
						</button>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<div className="hidden md:block">
						<Table>
							<TableHeader className="sticky top-0 z-10 bg-background">
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-5">{copy.invoiceNumber}</TableHead>
									<TableHead>{copy.supplier}</TableHead>
									<TableHead>{copy.invoiceDate}</TableHead>
									<TableHead>{copy.dueDate}</TableHead>
									<TableHead className="text-right">{copy.total}</TableHead>
									<TableHead>{copy.status}</TableHead>
									<TableHead>{copy.currentApprover}</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredInvoices.map((invoice) => {
									const { currentStep } = approvalPosition(invoice);
									const invoiceLabel = invoice.invoiceNumber || invoice.id;

									return (
										<TableRow
											key={invoice.id}
											data-testid={`tgem-register-invoice-${invoice.id}`}
											className="group cursor-pointer"
											onClick={() => openPreview(invoice.id)}
										>
											<TableCell className="pl-5 font-semibold">
												<button
													type="button"
													aria-label={`${copy.previewInvoice}: ${invoiceLabel}`}
													className="text-left hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
												>
													{invoiceLabel}
												</button>
											</TableCell>
											<TableCell>
												<div className="max-w-64 truncate font-medium">
													{invoice.supplierName || "—"}
												</div>
												<div className="text-xs text-muted-foreground">
													{invoice.supplierRegistrationNo || "—"}
												</div>
											</TableCell>
											<TableCell>
												{formatDate(invoice.invoiceDate, organizationLanguage)}
											</TableCell>
											<TableCell>
												{formatDate(invoice.dueDate, organizationLanguage)}
											</TableCell>
											<TableCell className="text-right font-semibold tabular-nums">
												{formatMoney(
													invoice.total,
													invoice.currency,
													organizationLanguage,
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={statusClass(invoice.status)}
												>
													{localizedValue(copy.statuses, invoice.status)}
												</Badge>
											</TableCell>
											<TableCell>
												{currentStep?.approverName || copy.noCurrentApprover}
											</TableCell>
											<TableCell className="pr-4 text-right">
												<ArrowRight className="inline h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					<div className="divide-y md:hidden">
						{filteredInvoices.map((invoice) => {
							const { currentStep } = approvalPosition(invoice);

							return (
								<button
									key={invoice.id}
									type="button"
									onClick={() => openPreview(invoice.id)}
									className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
								>
									<div className="min-w-0">
										<div className="truncate font-semibold">
											{invoice.invoiceNumber || invoice.id}
										</div>
										<div className="mt-0.5 truncate text-sm text-muted-foreground">
											{invoice.supplierName || "—"}
										</div>
										<div className="mt-2 text-xs text-muted-foreground">
											{currentStep?.approverName || copy.noCurrentApprover}
										</div>
									</div>
									<div className="flex shrink-0 flex-col items-end gap-2">
										<span className="font-semibold tabular-nums">
											{formatMoney(
												invoice.total,
												invoice.currency,
												organizationLanguage,
											)}
										</span>
										<Badge
											variant="outline"
											className={statusClass(invoice.status)}
										>
											{localizedValue(copy.statuses, invoice.status)}
										</Badge>
									</div>
								</button>
							);
						})}
					</div>

					{filteredInvoices.length === 0 ? (
						<div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
							<Search className="mb-3 h-5 w-5 text-muted-foreground" />
							<p className="text-sm font-medium">{copy.noMatchingInvoices}</p>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Dialog
				open={previewInvoice !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewInvoiceId(null);
				}}
			>
				{previewInvoice ? (
					<DialogContent
						showCloseButton={false}
						className="top-0 right-0 left-auto flex h-dvh max-w-[calc(100%-1rem)] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 p-0 sm:max-w-lg"
					>
						<DialogHeader className="border-b px-5 py-4 pr-14 text-left">
							<DialogTitle>{copy.previewInvoice}</DialogTitle>
							<DialogDescription>
								{previewInvoice.invoiceNumber || previewInvoice.id} ·{` `}
								{previewInvoice.supplierName || "—"}
							</DialogDescription>
							<DialogClose asChild>
								<button
									type="button"
									aria-label={copy.closePreview}
									className="absolute top-3.5 right-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
								>
									<X className="h-4 w-4" />
								</button>
							</DialogClose>
						</DialogHeader>

						<div className="min-h-0 flex-1 overflow-y-auto p-5">
							<div className="mb-5 flex items-start justify-between gap-3 rounded-lg border bg-slate-50 p-4 dark:bg-slate-950/40">
								<div>
									<div className="text-xs text-muted-foreground">
										{copy.total}
									</div>
									<div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
										{formatMoney(
											previewInvoice.total,
											previewInvoice.currency,
											organizationLanguage,
										)}
									</div>
								</div>
								<Badge
									variant="outline"
									className={statusClass(previewInvoice.status)}
								>
									{localizedValue(copy.statuses, previewInvoice.status)}
								</Badge>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<Field
									label={copy.supplier}
									value={previewInvoice.supplierName}
								/>
								<Field
									label={copy.invoiceDate}
									value={formatDate(
										previewInvoice.invoiceDate,
										organizationLanguage,
									)}
								/>
								<Field
									label={copy.dueDate}
									value={formatDate(
										previewInvoice.dueDate,
										organizationLanguage,
									)}
								/>
								<Field
									label={copy.source}
									value={localizedValue(copy.sources, previewInvoice.source)}
								/>
							</div>

							{(() => {
								const { currentStep, currentStepIndex, totalSteps } =
									approvalPosition(previewInvoice);

								return (
									<div className="mt-5 rounded-lg border p-4">
										<div className="text-sm font-semibold">
											{copy.approvalProgress}
										</div>
										<div className="mt-3 flex items-center gap-3">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
												<Clock3 className="h-4 w-4" />
											</div>
											<div>
												<div className="text-sm font-medium">
													{currentStep?.approverName || copy.noCurrentApprover}
												</div>
												{currentStepIndex && totalSteps ? (
													<div className="text-xs text-muted-foreground">
														{copy.step} {currentStepIndex} / {totalSteps}
													</div>
												) : null}
											</div>
										</div>
									</div>
								);
							})()}

							{previewInvoice.documents[0] ? (
								<div className="mt-5 overflow-hidden rounded-lg border bg-background">
									<div className="flex items-center gap-2 border-b px-3 py-2.5">
										<FileText className="h-4 w-4 shrink-0 text-blue-600" />
										<div className="min-w-0 flex-1 truncate text-sm font-medium">
											{previewInvoice.documents[0].originalFilename}
										</div>
									</div>
									<div className="h-72">
										{previewInvoice.documents[0].contentType ===
										"application/pdf" ? (
											<TgemPdfViewer
												documentPath={previewInvoice.documents[0].documentPath}
												filename={previewInvoice.documents[0].originalFilename}
												language={organizationLanguage}
											/>
										) : (
											<div className="flex h-full items-center justify-center bg-slate-800 p-3 dark:bg-slate-950">
												<Image
													src={previewInvoice.documents[0].documentPath}
													alt={previewInvoice.documents[0].originalFilename}
													width={720}
													height={960}
													unoptimized
													className="max-h-full w-auto object-contain shadow-lg"
												/>
											</div>
										)}
									</div>
								</div>
							) : null}
						</div>

						<div className="border-t bg-background p-4">
							<button
								type="button"
								onClick={() => onOpenInvoice(previewInvoice.id)}
								className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
							>
								{copy.openInvoice}
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</DialogContent>
				) : null}
			</Dialog>
		</>
	);
}

function InvoiceDetails({
	invoice,
	copy,
	currentUserId,
	approvalSetup,
	organizationLanguage,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	copy: ReturnType<typeof getCopy>;
	currentUserId: string;
	approvalSetup: TgemDashboardData["approvalSetup"];
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
					approvalSetup={approvalSetup}
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
						{sourceField(
							copy.invoiceDate,
							formatDate(invoice.invoiceDate, organizationLanguage),
						)}
						{sourceField(
							copy.dueDate,
							formatDate(invoice.dueDate, organizationLanguage),
						)}
						{sourceField(
							copy.total,
							formatMoney(
								invoice.total,
								invoice.currency,
								organizationLanguage,
							),
						)}
						<Field
							label={copy.source}
							value={localizedValue(copy.sources, invoice.source)}
						/>
						<Field
							label={copy.ocr}
							value={localizedValue(copy.processingStatuses, invoice.ocrStatus)}
						/>
						<Field
							label={copy.extraction}
							value={localizedValue(
								copy.processingStatuses,
								invoice.extractionStatus,
							)}
						/>
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
										{formatMoney(
											line.total,
											line.currency || invoice.currency,
											organizationLanguage,
										)}
									</span>
								</div>
								<div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
									<div>
										<span className="font-medium text-foreground/75">
											{copy.quantity}:
										</span>{" "}
										{line.quantity || "—"} {line.unit || ""}
									</div>
									<div>
										<span className="font-medium text-foreground/75">
											{copy.unitPrice}:
										</span>{" "}
										{formatMoney(
											line.unitPrice,
											line.currency || invoice.currency,
											organizationLanguage,
										)}
									</div>
									<div>
										<span className="font-medium text-foreground/75">
											{copy.costCode}:
										</span>{" "}
										{line.suggestedCostCode || copy.noCostCode}
									</div>
									<div>
										<span className="font-medium text-foreground/75">
											{copy.category}:
										</span>{" "}
										{line.suggestedCategory || copy.noCategory}
									</div>
								</div>
							</div>
						))}
						{invoice.lines.length === 0 ? (
							<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
								{copy.noLineItems}
							</div>
						) : null}
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
										{localizedValue(copy.events, event.eventType)}
									</div>
									<div className="text-xs text-muted-foreground">
										{localizedValue(copy.actors, event.actorType)} ·{" "}
										{formatDate(event.createdAt, organizationLanguage)}
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<Card data-testid="tgem-document-card">
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
				<CardContent>
					{document ? (
						<div className="flex flex-col gap-3">
							<OcrDocumentViewer
								document={document}
								copy={copy}
								language={organizationLanguage}
								view={documentView}
							/>
							<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<span>{document.originalFilename}</span>
								<span>·</span>
								<span>{document.storageProvider}</span>
								<span>·</span>
								<span>
									{copy.ocr}:{" "}
									{localizedValue(copy.processingStatuses, invoice.ocrStatus)}
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
	const [dashboardView, setDashboardView] = React.useState<
		"approval" | "register"
	>("register");
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
					<div
						role="tablist"
						aria-label={copy.title}
						className="flex w-fit items-center gap-1 rounded-lg border bg-slate-100 p-1 dark:bg-slate-900"
					>
						<button
							type="button"
							role="tab"
							aria-selected={dashboardView === "register"}
							onClick={() => setDashboardView("register")}
							className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${dashboardView === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
						>
							<Inbox className="h-4 w-4" />
							{copy.allInvoices}
							<span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] leading-none tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-200">
								{data?.invoices.length ?? 0}
							</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={dashboardView === "approval"}
							onClick={() => setDashboardView("approval")}
							className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${dashboardView === "approval" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
						>
							<LayoutPanelTop className="h-4 w-4" />
							{copy.approvalWorkspace}
						</button>
					</div>

					{dashboardView === "register" && data ? (
						<InvoiceRegister
							invoices={data.invoices}
							currentUserId={data.currentUserId}
							copy={copy}
							organizationLanguage={organizationLanguage}
							onOpenInvoice={(invoiceId) => {
								setSelectedInvoiceId(invoiceId);
								setDashboardView("approval");
							}}
						/>
					) : (
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
													{localizedValue(copy.statuses, invoice.status)}
												</Badge>
											</div>
											<div className="mt-1 truncate text-sm text-muted-foreground">
												{invoice.supplierName || "—"}
											</div>
											<div className="mt-1 text-xs text-muted-foreground">
												{formatMoney(
													invoice.total,
													invoice.currency,
													organizationLanguage,
												)}{" "}
												· {localizedValue(copy.sources, invoice.source)}
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

							{selectedInvoice && data ? (
								<InvoiceDetails
									key={selectedInvoice.id}
									invoice={selectedInvoice}
									copy={copy}
									currentUserId={data.currentUserId}
									approvalSetup={data.approvalSetup}
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
					)}
					<Separator />
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<CheckCircle2 className="h-4 w-4 text-emerald-600" />
						{copy.dataSource}
					</div>
				</>
			)}
		</div>
	);
}
