"use client";

import {
	AlertTriangle,
	ArrowRight,
	Building2,
	Check,
	CheckCircle2,
	Clock3,
	Copy,
	FileText,
	Info,
	Loader2,
	MessageCircle,
	Pencil,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { updateTgemInvoiceAccounting } from "@/server/actions/tgem-cost-code-actions";
import { getTgemInvoiceDashboardData } from "@/server/actions/tgem-invoice-actions";
import { assignTgemInvoiceProject } from "@/server/actions/tgem-invoice-approval-actions";
import { TgemApprovalControls } from "./TgemApprovalControls";
import { TgemInvoiceUpload } from "./TgemInvoiceUpload";
import { TgemPdfViewer } from "./TgemPdfViewer";

type Props = {
	siteId?: string;
	initialProjectFilter?: string | null;
	initialView?: "approval" | "register";
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
			whatsappProcessingTitle: "WhatsApp rēķina apstrāde",
			whatsappProcessingDescription:
				"Rēķins ir saņemts. MI nolasa laukus un pozīcijas…",
			whatsappReceived: "Saņemts",
			whatsappReading: "OCR un datu nolasīšana",
			whatsappReady: "Gatavs pārbaudei",
			supplier: "Piegādātājs",
			invoiceNumber: "Rēķina numurs",
			invoiceDate: "Rēķina datums",
			dueDate: "Apmaksas termiņš",
			totalWithoutVat: "Kopā Bez PVN",
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
			costCodeHelp: "Par izmaksu kodiem",
			costCodeHelpText:
				"Izmaksu kodus un to nozīmi var pielāgot organizācijai projekta iestatījumos.",
			emptyCostCodeHelp:
				"Vēl nav pievienots neviens izmaksu kods. Pievienojiet tos projekta iestatījumos, lai varētu izvēlēties kodu rēķinam.",
			costCodeSettingsLink: "Atvērt projekta iestatījumus",
			accountingClassification: "Grāmatvedības klasifikācija",
			invoiceType: "Rēķina veids",
			editInvoiceType: "Rediģēt rēķina veidu",
			cancelInvoiceTypeEdit: "Atcelt veida rediģēšanu",
			debitInvoice: "Debeta rēķins",
			creditInvoice: "Kredītrēķins",
			selectCostCode: "Izvēlieties izmaksu kodu",
			saveAccounting: "Saglabāt klasifikāciju",
			savingAccounting: "Saglabā…",
			accountingSaved: "Klasifikācija saglabāta.",
			accountingFailed: "Neizdevās saglabāt klasifikāciju.",
			manageCostCodes: "Pārvaldīt izmaksu kodus",
			category: "Kategorija",
			noCostCode: "Nav izmaksu koda",
			noCategory: "Nav kategorijas",
			noLineItems: "Rēķina pozīcijas nav atpazītas.",
			dataSource: "Dati ielādēti no TGEM rēķinu apstiprināšanas sistēmas.",
			project: "Projekts",
			invoiceScope: "Rēķinu tvērums",
			projectFilter: "Rādīt rēķinus",
			allProjects: "Visi projekti",
			unassigned: "Nav piešķirts",
			assignProject: "Piešķirt projektu",
			changeProject: "Mainīt rēķina projektu",
			saveProject: "Saglabāt projektu",
			savingProject: "Saglabā…",
			projectSaved:
				"Projekts saglabāts. Rēķins jāiesniedz atkārtotai apstiprināšanai.",
			projectAssignmentFailed: "Neizdevās saglabāt projektu.",
			projectReapprovalWarning:
				"Mainot projektu, pašreizējais apstiprinājums tiks anulēts un rēķins būs jāiesniedz atkārtoti.",
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
				invoice_project_assigned: "Rēķinam piešķirts projekts",
				invoice_project_reassigned: "Rēķina projekts mainīts",
				invoice_accounting_updated: "Mainīta rēķina klasifikācija",
			},
			actors: {
				user: "Lietotājs",
				system: "Sistēma",
				whatsapp: "WhatsApp",
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
			whatsappProcessingTitle: "Обработка счета из WhatsApp",
			whatsappProcessingDescription:
				"Счет получен. ИИ извлекает поля и позиции…",
			whatsappReceived: "Получен",
			whatsappReading: "OCR и извлечение данных",
			whatsappReady: "Готово к проверке",
			supplier: "Поставщик",
			invoiceNumber: "Номер счета",
			invoiceDate: "Дата счета",
			dueDate: "Срок оплаты",
			totalWithoutVat: "Итого без НДС",
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
			costCodeHelp: "О кодах затрат",
			costCodeHelpText:
				"Коды затрат и их значения можно настроить для организации в настройках проекта.",
			emptyCostCodeHelp:
				"Коды затрат ещё не добавлены. Добавьте их в настройках проекта, чтобы выбрать код для счёта.",
			costCodeSettingsLink: "Открыть настройки проекта",
			accountingClassification: "Бухгалтерская классификация",
			invoiceType: "Тип счета",
			editInvoiceType: "Изменить тип счета",
			cancelInvoiceTypeEdit: "Отменить изменение типа",
			debitInvoice: "Дебетовый счет",
			creditInvoice: "Кредитовый счет",
			selectCostCode: "Выберите код затрат",
			saveAccounting: "Сохранить классификацию",
			savingAccounting: "Сохранение…",
			accountingSaved: "Классификация сохранена.",
			accountingFailed: "Не удалось сохранить классификацию.",
			manageCostCodes: "Управление кодами затрат",
			category: "Категория",
			noCostCode: "Нет кода затрат",
			noCategory: "Нет категории",
			noLineItems: "Позиции счета не распознаны.",
			dataSource: "Данные загружены из системы согласования счетов TGEM.",
			project: "Проект",
			invoiceScope: "Охват счетов",
			projectFilter: "Показать счета",
			allProjects: "Все проекты",
			unassigned: "Не назначен",
			assignProject: "Назначить проект",
			changeProject: "Изменить проект",
			saveProject: "Сохранить проект",
			savingProject: "Сохранение…",
			projectSaved:
				"Проект сохранен. Счет необходимо отправить на согласование повторно.",
			projectAssignmentFailed: "Не удалось сохранить проект.",
			projectReapprovalWarning:
				"При смене проекта текущее согласование будет отменено, и счет потребуется отправить повторно.",
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
				invoice_project_assigned: "Счету назначен проект",
				invoice_project_reassigned: "Проект счета изменен",
				invoice_accounting_updated: "Классификация счета изменена",
			},
			actors: {
				user: "Пользователь",
				system: "Система",
				whatsapp: "WhatsApp",
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
		whatsappProcessingTitle: "WhatsApp invoice processing",
		whatsappProcessingDescription:
			"The invoice was received. AI is reading fields and line items…",
		whatsappReceived: "Received",
		whatsappReading: "OCR and extraction",
		whatsappReady: "Ready for review",
		supplier: "Supplier",
		invoiceNumber: "Invoice number",
		invoiceDate: "Invoice date",
		dueDate: "Due date",
		totalWithoutVat: "Total excl. VAT",
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
		costCodeHelp: "About cost codes",
		costCodeHelpText:
			"Customize your organization’s cost codes and their meanings in Project settings.",
		emptyCostCodeHelp:
			"No cost codes have been added yet. Add them in Project settings to select a code for this invoice.",
		costCodeSettingsLink: "Open Project settings",
		accountingClassification: "Accounting classification",
		invoiceType: "Invoice type",
		editInvoiceType: "Edit invoice type",
		cancelInvoiceTypeEdit: "Cancel type edit",
		debitInvoice: "Debit invoice",
		creditInvoice: "Credit invoice",
		selectCostCode: "Select a cost code",
		saveAccounting: "Save classification",
		savingAccounting: "Saving…",
		accountingSaved: "Classification saved.",
		accountingFailed: "Could not save the classification.",
		manageCostCodes: "Manage cost codes",
		category: "Category",
		noCostCode: "No cost code",
		noCategory: "No category",
		noLineItems: "No invoice line items were recognized.",
		dataSource: "Data loaded from the TGEM invoice approval system.",
		project: "Project",
		invoiceScope: "Invoice scope",
		projectFilter: "Show invoices",
		allProjects: "All projects",
		unassigned: "Unassigned",
		assignProject: "Assign project",
		changeProject: "Change invoice project",
		saveProject: "Save project",
		savingProject: "Saving…",
		projectSaved:
			"Project saved. Submit the invoice again to start its new approval path.",
		projectAssignmentFailed: "Could not save the project.",
		projectReapprovalWarning:
			"Changing the project invalidates the current approval and requires resubmission.",
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
			invoice_project_assigned: "Invoice project assigned",
			invoice_project_reassigned: "Invoice project changed",
			invoice_accounting_updated: "Invoice classification changed",
		},
		actors: {
			user: "User",
			system: "System",
			whatsapp: "WhatsApp",
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

function Field({
	label,
	value,
	action,
	hint,
}: {
	label: string;
	value: React.ReactNode;
	action?: React.ReactNode;
	hint?: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					{label}
					{hint}
				</div>
				<div className="truncate text-sm font-medium">{value || "—"}</div>
			</div>
			{action}
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

function WhatsappInvoiceProcessing({
	invoices,
	copy,
}: {
	invoices: TgemDashboardInvoice[];
	copy: ReturnType<typeof getCopy>;
}) {
	if (invoices.length === 0) return null;

	return (
		<section
			aria-label={copy.whatsappProcessingTitle}
			data-testid="tgem-whatsapp-processing"
			className="overflow-hidden rounded-lg border border-blue-200 bg-card dark:border-blue-900"
		>
			<div className="flex items-start gap-4 border-b border-blue-100 bg-blue-50/60 p-4 dark:border-blue-950 dark:bg-blue-950/20">
				<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#25D366] text-white shadow-sm">
					<MessageCircle className="h-5 w-5" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="font-semibold tracking-tight">
							{copy.whatsappProcessingTitle}
						</h2>
						<Badge
							variant="outline"
							className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
						>
							WhatsApp
						</Badge>
					</div>
					<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
						{copy.whatsappProcessingDescription}
					</p>
				</div>
				<Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-blue-600 motion-reduce:animate-none" />
			</div>

			<div className="divide-y">
				{invoices.map((invoice) => {
					const processingStarted =
						invoice.status === "processing" ||
						invoice.ocrStatus === "processing" ||
						invoice.extractionStatus === "processing";
					const filename =
						invoice.documents[0]?.originalFilename ||
						invoice.invoiceNumber ||
						invoice.id;

					return (
						<div
							key={invoice.id}
							data-testid={`tgem-whatsapp-processing-${invoice.id}`}
							className="p-4"
						>
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<div className="truncate text-sm font-medium">{filename}</div>
									<div className="mt-0.5 truncate text-xs text-muted-foreground">
										{invoice.project?.name || copy.unassigned}
									</div>
								</div>
								<span className="text-xs font-medium text-blue-700 dark:text-blue-300">
									{processingStarted
										? copy.whatsappReading
										: copy.whatsappReceived}
								</span>
							</div>

							<div className="mt-3 grid grid-cols-3 gap-2">
								{[
									{
										label: copy.whatsappReceived,
										active: !processingStarted,
										complete: processingStarted,
									},
									{
										label: copy.whatsappReading,
										active: processingStarted,
										complete: false,
									},
									{
										label: copy.whatsappReady,
										active: false,
										complete: false,
									},
								].map((step) => (
									<div key={step.label} className="min-w-0">
										<div
											className={`h-1 rounded-full ${step.complete ? "bg-emerald-500" : step.active ? "bg-blue-600" : "bg-muted"}`}
										/>
										<div className="mt-1 truncate text-[11px] text-muted-foreground">
											{step.label}
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
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
									<TableHead>{copy.project}</TableHead>
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
												<div className="flex max-w-48 items-center gap-1.5">
													<Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
													<span className="truncate">
														{invoice.project?.name || copy.unassigned}
													</span>
												</div>
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
										<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
											<Building2 className="h-3 w-3" />
											{invoice.project?.name || copy.unassigned}
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
									label={copy.project}
									value={previewInvoice.project?.name || copy.unassigned}
								/>
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

function ProjectAssignment({
	invoice,
	projects,
	copy,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	projects: TgemDashboardData["projects"];
	copy: ReturnType<typeof getCopy>;
	onChanged: (projectId: string) => Promise<void>;
}) {
	const [projectId, setProjectId] = React.useState(invoice.project?.id ?? "");
	const [status, setStatus] = React.useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const [error, setError] = React.useState<string | null>(null);
	const changed = Boolean(projectId && projectId !== invoice.project?.id);
	const invalidatesApproval =
		changed &&
		["changes_requested", "in_approval", "approved", "rejected"].includes(
			invoice.status,
		);

	React.useEffect(() => {
		setProjectId(invoice.project?.id ?? "");
		setStatus("idle");
		setError(null);
	}, [invoice.project?.id]);

	async function save() {
		if (!changed) return;
		setStatus("saving");
		setError(null);
		try {
			await assignTgemInvoiceProject({
				invoiceCaseId: invoice.id,
				projectId,
				expectedUpdatedAt: invoice.updatedAt,
			});
			await onChanged(projectId);
			setStatus("saved");
		} catch (saveError) {
			setStatus("error");
			setError(
				saveError instanceof Error
					? saveError.message
					: copy.projectAssignmentFailed,
			);
		}
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Building2 className="h-4 w-4 text-blue-600" />
					{invoice.project ? copy.changeProject : copy.assignProject}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-col gap-2 sm:flex-row">
					<label className="min-w-0 flex-1">
						<span className="sr-only">{copy.project}</span>
						<select
							aria-label={
								invoice.project ? copy.changeProject : copy.assignProject
							}
							value={projectId}
							onChange={(event) => {
								setProjectId(event.target.value);
								setStatus("idle");
							}}
							className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							<option value="" disabled>
								{copy.unassigned}
							</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						disabled={!changed || status === "saving"}
						onClick={() => void save()}
						className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{status === "saving" ? copy.savingProject : copy.saveProject}
					</button>
				</div>
				{invalidatesApproval ? (
					<p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
						{copy.projectReapprovalWarning}
					</p>
				) : null}
				{status === "saved" ? (
					<p className="text-xs text-emerald-700 dark:text-emerald-400">
						{copy.projectSaved}
					</p>
				) : null}
				{status === "error" ? (
					<p className="text-xs text-red-600">
						{error || copy.projectAssignmentFailed}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}

function InvoiceAccountingClassification({
	invoice,
	costCodes,
	copy,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	costCodes: TgemDashboardData["costCodes"];
	copy: ReturnType<typeof getCopy>;
	onChanged: () => Promise<void>;
}) {
	const [invoiceType, setInvoiceType] = React.useState(invoice.invoiceType);
	const [editingInvoiceType, setEditingInvoiceType] = React.useState(false);
	const [costCode, setCostCode] = React.useState(invoice.costCode ?? "");
	const [status, setStatus] = React.useState<
		"idle" | "saving" | "saved" | "error"
	>("idle");
	const [error, setError] = React.useState<string | null>(null);
	const changed =
		invoiceType !== invoice.invoiceType ||
		costCode !== (invoice.costCode ?? "");
	const availableCostCodes = invoice.costCode
		? costCodes.some((item) => item.code === invoice.costCode)
			? costCodes
			: [
					{
						id: `archived-${invoice.costCode}`,
						code: invoice.costCode,
						name: "",
					},
					...costCodes,
				]
		: costCodes;

	React.useEffect(() => {
		setInvoiceType(invoice.invoiceType);
		setEditingInvoiceType(false);
		setCostCode(invoice.costCode ?? "");
		setStatus("idle");
		setError(null);
	}, [invoice.costCode, invoice.invoiceType]);

	async function save() {
		if (!changed) return;
		setStatus("saving");
		setError(null);
		try {
			await updateTgemInvoiceAccounting({
				invoiceCaseId: invoice.id,
				invoiceType,
				costCode: costCode || null,
				expectedUpdatedAt: invoice.updatedAt,
			});
			await onChanged();
			setEditingInvoiceType(false);
			setStatus("saved");
		} catch (saveError) {
			setStatus("error");
			setError(
				saveError instanceof Error ? saveError.message : copy.accountingFailed,
			);
		}
	}

	return (
		<>
			<Field
				label={copy.invoiceType}
				value={
					editingInvoiceType ? (
						<select
							aria-label={copy.invoiceType}
							value={invoiceType}
							disabled={status === "saving"}
							onChange={(event) => {
								setInvoiceType(event.target.value as "credit" | "debit");
								setStatus("idle");
							}}
							className="w-full rounded-sm bg-background text-sm font-medium focus-visible:outline-ring"
						>
							<option value="debit">{copy.debitInvoice}</option>
							<option value="credit">{copy.creditInvoice}</option>
						</select>
					) : invoiceType === "credit" ? (
						copy.creditInvoice
					) : (
						copy.debitInvoice
					)
				}
				action={
					<button
						type="button"
						aria-label={
							editingInvoiceType
								? copy.cancelInvoiceTypeEdit
								: copy.editInvoiceType
						}
						title={
							editingInvoiceType
								? copy.cancelInvoiceTypeEdit
								: copy.editInvoiceType
						}
						disabled={status === "saving"}
						onClick={() => {
							if (editingInvoiceType) setInvoiceType(invoice.invoiceType);
							setEditingInvoiceType(!editingInvoiceType);
							setStatus("idle");
							setError(null);
						}}
						className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring disabled:opacity-50"
					>
						{editingInvoiceType ? (
							<X className="h-4 w-4" />
						) : (
							<Pencil className="h-4 w-4" />
						)}
					</button>
				}
			/>
			<Field
				label={copy.costCode}
				hint={
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								aria-label={copy.costCodeHelp}
								title={copy.costCodeHelp}
								className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-ring"
							>
								<Info className="h-3 w-3" />
							</button>
						</PopoverTrigger>
						<PopoverContent
							align="start"
							className="w-64 space-y-2 p-3 text-xs"
							aria-label={copy.costCodeHelp}
						>
							<p>
								{costCodes.length === 0
									? copy.emptyCostCodeHelp
									: copy.costCodeHelpText}
							</p>
							<Link
								href={`/dashboard/invoices/settings${invoice.project?.id ? `?project=${encodeURIComponent(invoice.project.id)}` : ""}`}
								className="inline-block font-medium text-blue-700 underline underline-offset-4 dark:text-blue-300"
							>
								{copy.costCodeSettingsLink}
							</Link>
						</PopoverContent>
					</Popover>
				}
				value={
					<select
						aria-label={copy.costCode}
						value={costCode}
						onChange={(event) => {
							setCostCode(event.target.value);
							setStatus("idle");
						}}
						className="w-full rounded-sm bg-background text-sm font-medium focus-visible:outline-ring"
					>
						<option value="">{copy.selectCostCode}</option>
						{availableCostCodes.map((item) => (
							<option key={item.id} value={item.code}>
								{item.code}
								{item.name ? ` — ${item.name}` : ""}
							</option>
						))}
					</select>
				}
			/>
			{changed || status !== "idle" ? (
				<div className="flex flex-wrap items-center gap-3 sm:col-span-2">
					<button
						type="button"
						disabled={!changed || status === "saving"}
						onClick={() => void save()}
						className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{status === "saving" ? copy.savingAccounting : copy.saveAccounting}
					</button>
					{status === "saved" ? (
						<span className="text-xs text-emerald-700 dark:text-emerald-400">
							{copy.accountingSaved}
						</span>
					) : null}
					{status === "error" ? (
						<span className="text-xs text-red-600">
							{error || copy.accountingFailed}
						</span>
					) : null}
				</div>
			) : null}
		</>
	);
}

function InvoiceDetails({
	invoice,
	projects,
	costCodes,
	copy,
	currentUserId,
	approvalSetup,
	organizationLanguage,
	onChanged,
	onProjectChanged,
}: {
	invoice: TgemDashboardInvoice;
	projects: TgemDashboardData["projects"];
	costCodes: TgemDashboardData["costCodes"];
	copy: ReturnType<typeof getCopy>;
	currentUserId: string;
	approvalSetup: TgemDashboardData["approvalSetup"];
	organizationLanguage?: string | null;
	onChanged: () => Promise<void>;
	onProjectChanged: (projectId: string) => Promise<void>;
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
				{invoice.project ? (
					<TgemApprovalControls
						invoice={invoice}
						currentUserId={currentUserId}
						approvalSetup={approvalSetup}
						organizationLanguage={organizationLanguage}
						onChanged={onChanged}
					/>
				) : null}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{copy.details}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2">
						{sourceField(
							copy.project,
							invoice.project?.name || copy.unassigned,
						)}
						{sourceField(
							copy.invoiceDate,
							formatDate(invoice.invoiceDate, organizationLanguage),
						)}
						{sourceField(copy.invoiceNumber, invoice.invoiceNumber)}
						{sourceField(copy.supplier, invoice.supplierName)}

						{sourceField(
							copy.dueDate,
							formatDate(invoice.dueDate, organizationLanguage),
						)}
						<Field
							label={copy.ocr}
							value={localizedValue(copy.processingStatuses, invoice.ocrStatus)}
						/>
						{sourceField(
							copy.totalWithoutVat,
							formatMoney(
								invoice.subtotal,
								invoice.currency,
								organizationLanguage,
							),
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
							label={copy.extraction}
							value={localizedValue(
								copy.processingStatuses,
								invoice.extractionStatus,
							)}
						/>
						<InvoiceAccountingClassification
							key={invoice.id}
							invoice={invoice}
							costCodes={costCodes}
							copy={copy}
							onChanged={onChanged}
						/>
					</CardContent>
				</Card>
				<ProjectAssignment
					invoice={invoice}
					projects={projects}
					copy={copy}
					onChanged={onProjectChanged}
				/>

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
	initialProjectFilter,
	initialView = "register",
	organizationLanguage,
}: Props) {
	const copy = getCopy(organizationLanguage);
	const initialFilter =
		initialProjectFilter !== undefined
			? (initialProjectFilter ?? "all")
			: (siteId ?? "all");
	const [projectFilter, setProjectFilter] = React.useState(initialFilter);
	const [data, setData] = React.useState<TgemDashboardData | null>(null);
	const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<
		string | null
	>(null);
	const [error, setError] = React.useState(false);
	const [dashboardView, setDashboardView] = React.useState<
		"approval" | "register"
	>(initialView);
	React.useEffect(() => {
		setProjectFilter(initialFilter);
		setSelectedInvoiceId(null);
	}, [initialFilter]);
	React.useEffect(() => {
		setDashboardView(initialView);
	}, [initialView]);
	const changeDashboardView = React.useCallback(
		(nextView: "approval" | "register", invoiceId?: string) => {
			setDashboardView(nextView);
			if (invoiceId) setSelectedInvoiceId(invoiceId);
			if (typeof window === "undefined") return;

			const url = new URL(window.location.href);
			if (nextView === "approval") url.searchParams.set("view", "approval");
			else url.searchParams.delete("view");
			window.history.replaceState(null, "", `${url.pathname}${url.search}`);
		},
		[],
	);
	const loadData = React.useCallback(
		async (preferredInvoiceId?: string) => {
			setError(false);
			const nextData = await getTgemInvoiceDashboardData(
				projectFilter === "all" ? null : projectFilter,
			);
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
		[projectFilter],
	);

	const changeProjectFilter = React.useCallback((nextFilter: string) => {
		setProjectFilter(nextFilter);
		setSelectedInvoiceId(null);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			if (nextFilter === "all") url.searchParams.delete("project");
			else url.searchParams.set("project", nextFilter);
			window.history.replaceState(null, "", `${url.pathname}${url.search}`);
		}
	}, []);

	React.useEffect(() => {
		let active = true;
		let requestInFlight = false;
		let hasLoaded = false;

		async function refreshDashboard() {
			if (requestInFlight) return;
			requestInFlight = true;

			try {
				const nextData = await getTgemInvoiceDashboardData(
					projectFilter === "all" ? null : projectFilter,
				);
				if (!active) return;

				hasLoaded = true;
				setError(false);
				setData(nextData);
				setSelectedInvoiceId((currentId) => {
					if (
						currentId &&
						nextData?.invoices.some((invoice) => invoice.id === currentId)
					) {
						return currentId;
					}
					return nextData?.invoices[0]?.id ?? null;
				});
			} catch {
				if (active && !hasLoaded) setError(true);
			} finally {
				requestInFlight = false;
			}
		}

		setError(false);
		void refreshDashboard();
		const intervalId = window.setInterval(() => {
			if (!document.hidden) void refreshDashboard();
		}, 5_000);

		return () => {
			active = false;
			window.clearInterval(intervalId);
		};
	}, [projectFilter]);

	const selectedInvoice =
		data?.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null;
	const whatsappProcessingInvoices =
		data?.invoices.filter(
			(invoice) =>
				invoice.source === "whatsapp" &&
				(invoice.status === "received" || invoice.status === "processing"),
		) ?? [];
	const selectedProjectId =
		projectFilter === "all" || projectFilter === "unassigned"
			? null
			: projectFilter;
	const invoiceScope =
		projectFilter === "all"
			? copy.allProjects
			: projectFilter === "unassigned"
				? copy.unassigned
				: data?.projects.find((project) => project.id === projectFilter)?.name;

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
					{invoiceScope ? (
						<div
							data-testid="tgem-invoice-scope"
							className="mt-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
						>
							<Building2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
							<span className="text-xs font-medium text-blue-700 dark:text-blue-300">
								{copy.invoiceScope}:
							</span>{" "}
							<span className="font-semibold">{invoiceScope}</span>
						</div>
					) : null}
				</div>
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
					<TgemInvoiceUpload
						selectedProjectId={selectedProjectId}
						organizationLanguage={organizationLanguage}
						onInvoiceReady={async (invoiceCaseId, projectId) => {
							if (projectFilter === "all") {
								await loadData(invoiceCaseId);
								return;
							}
							if (projectFilter !== projectId) changeProjectFilter(projectId);
							else await loadData(invoiceCaseId);
						}}
					/>
					<WhatsappInvoiceProcessing
						invoices={whatsappProcessingInvoices}
						copy={copy}
					/>
					{dashboardView === "register" && data ? (
						<InvoiceRegister
							invoices={data.invoices}
							currentUserId={data.currentUserId}
							copy={copy}
							organizationLanguage={organizationLanguage}
							onOpenInvoice={(invoiceId) => {
								changeDashboardView("approval", invoiceId);
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
												{invoice.project?.name || copy.unassigned}
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
									projects={data.projects}
									costCodes={data.costCodes}
									copy={copy}
									currentUserId={data.currentUserId}
									approvalSetup={data.approvalSetup}
									organizationLanguage={organizationLanguage}
									onChanged={() => loadData(selectedInvoiceId ?? undefined)}
									onProjectChanged={async (projectId) => {
										if (projectFilter === "all") {
											await loadData(selectedInvoiceId ?? undefined);
										} else {
											changeProjectFilter(projectId);
										}
									}}
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
