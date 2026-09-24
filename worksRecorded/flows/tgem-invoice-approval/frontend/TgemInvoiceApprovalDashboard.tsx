"use client";

import {
	AlertTriangle,
	ArrowDown,
	ArrowRight,
	ArrowUp,
	ArrowUpDown,
	Building2,
	Check,
	CheckCircle2,
	Clock3,
	Copy,
	Files,
	FileText,
	History,
	Info,
	ListChecks,
	Loader2,
	Pencil,
	ReceiptText,
	Search,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { DashboardOrganizationBrand } from "@/components/dashboard/DashboardOrganizationBrand";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
} from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	normalizeTgemInvoiceDetailValue,
	type TgemEditableInvoiceField,
	type TgemInvoiceDetailsError,
} from "@/lib/tgem-invoice-approval/invoice-details";
import { downloadTgemInvoiceWorkbook } from "@/lib/tgem-invoice-approval/register-export";
import {
	createDefaultTgemInvoiceRegisterFilters,
	filterTgemInvoiceRegister,
	getTgemInvoiceRegisterFacets,
	type TgemInvoiceRegisterFilters as TgemInvoiceRegisterFilterState,
} from "@/lib/tgem-invoice-approval/register-filtering";
import {
	sortTgemInvoiceRegister,
	type TgemInvoiceSort,
	type TgemInvoiceSortField,
} from "@/lib/tgem-invoice-approval/register-sorting";
import { updateTgemInvoiceAccounting } from "@/server/actions/tgem-cost-code-actions";
import { getTgemInvoiceDashboardData } from "@/server/actions/tgem-invoice-actions";
import { assignTgemInvoiceProject } from "@/server/actions/tgem-invoice-approval-actions";
import { deleteTgemInvoices } from "@/server/actions/tgem-invoice-delete-actions";
import { updateTgemInvoiceDetail } from "@/server/actions/tgem-invoice-details-actions";
import { TgemApprovalControls } from "./TgemApprovalControls";
import { TgemImageViewer } from "./TgemImageViewer";
import { TgemInvoiceRegisterFilters } from "./TgemInvoiceRegisterFilters";
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
			supplier: "Piegādātājs",
			invoiceNumber: "Rēķina numurs",
			invoiceDate: "Rēķina datums",
			dueDate: "Apmaksas termiņš",
			totalWithoutVat: "Kopā Bez PVN",
			total: "Kopā",
			priceWithoutVat: "Cena bez PVN",
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
			deleteInvoice: "Dzēst rēķinu",
			deleteSelected: "Dzēst atlasītos",
			selectInvoice: "Atlasīt rēķinu",
			selectAllInvoices: "Atlasīt visus redzamos rēķinus",
			deleteTitle: "Vai tiešām vēlaties dzēst?",
			deleteDescription:
				"Atlasītie rēķini, to pozīcijas, dokumentu ieraksti un apstiprināšanas vēsture tiks neatgriezeniski dzēsti.",
			confirmDelete: "Jā, dzēst",
			cancelDelete: "Atcelt",
			deletingInvoices: "Dzēš…",
			deleteFailed: "Neizdevās dzēst rēķinus. Mēģiniet vēlreiz.",
			deleteConflict:
				"Kāds no rēķiniem ir mainīts. Atceliet un atlasiet rēķinus vēlreiz.",
			deleteProcessing: "Rēķini vēl tiek apstrādāti. Mēģiniet vēlāk.",
			deleteAccessDenied:
				"Kāds no rēķiniem vairs nav pieejams vai jums nav piekļuves.",
			deleteLimit: "Vienlaikus var dzēst līdz 1000 rēķiniem.",
			deletedInvoices: "Dzēstie rēķini",
			registerDescription:
				"Meklējiet un pārskatiet visus šī projekta rēķinus vienuviet.",
			searchInvoices: "Meklēt pēc numura vai piegādātāja",
			status: "Statuss",
			allStatuses: "Visi statusi",
			sortBy: "Kārtot pēc",
			defaultOrder: "Sākotnējā secība",
			sortAscending: "Kārtot augošā secībā",
			sortDescending: "Kārtot dilstošā secībā",
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
			editDetail: "Rediģēt",
			saveDetail: "Saglabāt",
			cancelDetail: "Atcelt",
			detailSaved: "Saglabāts.",
			detailSaveFailed: "Neizdevās saglabāt. Mēģiniet vēlreiz.",
			detailRefreshFailed:
				"Izmaiņas saglabātas, bet skatu neizdevās atjaunināt. Pārlādējiet lapu.",
			detailErrors: {
				invalid_input: "Nederīgi rēķina dati.",
				invalid_number:
					"Rēķina numurs drīkst būt līdz 120 rakstzīmēm un bez vadības rakstzīmēm.",
				invalid_date: "Ievadiet derīgu datumu.",
				invalid_version: "Pārlādējiet rēķinu un mēģiniet vēlreiz.",
				access_denied: "Nav piekļuves šim rēķinam.",
				processing: "Pagaidiet, līdz rēķina apstrāde ir pabeigta.",
				conflict:
					"Rēķins ir mainīts. Atceliet un atveriet rediģēšanu vēlreiz pirms saglabāšanas.",
			},
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
				invoice_details_updated: "Laboti rēķina dati",
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
			supplier: "Поставщик",
			invoiceNumber: "Номер счета",
			invoiceDate: "Дата счета",
			dueDate: "Срок оплаты",
			totalWithoutVat: "Итого без НДС",
			total: "Итого",
			priceWithoutVat: "Цена без НДС",
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
			deleteInvoice: "Удалить счёт",
			deleteSelected: "Удалить выбранные",
			selectInvoice: "Выбрать счёт",
			selectAllInvoices: "Выбрать все видимые счета",
			deleteTitle: "Вы уверены, что хотите удалить?",
			deleteDescription:
				"Выбранные счета, их позиции, записи документов и история согласования будут удалены безвозвратно.",
			confirmDelete: "Да, удалить",
			cancelDelete: "Отмена",
			deletingInvoices: "Удаление…",
			deleteFailed: "Не удалось удалить счета. Попробуйте ещё раз.",
			deleteConflict:
				"Один из счетов изменён. Отмените действие и выберите счета повторно.",
			deleteProcessing: "Счета ещё обрабатываются. Попробуйте позже.",
			deleteAccessDenied:
				"Один из счетов больше не доступен или у вас нет доступа.",
			deleteLimit: "Можно удалить до 1000 счетов за один раз.",
			deletedInvoices: "Удалено счетов",
			registerDescription:
				"Ищите и просматривайте все счета этого проекта в одном месте.",
			searchInvoices: "Поиск по номеру или поставщику",
			status: "Статус",
			allStatuses: "Все статусы",
			sortBy: "Сортировать по",
			defaultOrder: "Исходный порядок",
			sortAscending: "Сортировать по возрастанию",
			sortDescending: "Сортировать по убыванию",
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
			editDetail: "Изменить",
			saveDetail: "Сохранить",
			cancelDetail: "Отменить",
			detailSaved: "Сохранено.",
			detailSaveFailed: "Не удалось сохранить. Попробуйте ещё раз.",
			detailRefreshFailed:
				"Изменения сохранены, но не удалось обновить данные. Перезагрузите страницу.",
			detailErrors: {
				invalid_input: "Некорректные данные счета.",
				invalid_number:
					"Номер счета должен содержать не более 120 символов и не содержать управляющих символов.",
				invalid_date: "Введите корректную дату.",
				invalid_version: "Перезагрузите счет и попробуйте ещё раз.",
				access_denied: "Нет доступа к этому счету.",
				processing: "Дождитесь завершения обработки счета.",
				conflict:
					"Счет изменился. Отмените и снова откройте редактирование перед сохранением.",
			},
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
				invoice_details_updated: "Данные счета исправлены",
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
		supplier: "Supplier",
		invoiceNumber: "Invoice number",
		invoiceDate: "Invoice date",
		dueDate: "Due date",
		totalWithoutVat: "Total excl. VAT",
		total: "Total",
		priceWithoutVat: "Price without VAT",
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
		deleteInvoice: "Delete invoice",
		deleteSelected: "Delete selected",
		selectInvoice: "Select invoice",
		selectAllInvoices: "Select all visible invoices",
		deleteTitle: "Are you sure you want to delete?",
		deleteDescription:
			"The selected invoices, their line items, document records, and approval history will be permanently deleted.",
		confirmDelete: "Yes, delete",
		cancelDelete: "Cancel",
		deletingInvoices: "Deleting…",
		deleteFailed: "Could not delete invoices. Please try again.",
		deleteConflict:
			"An invoice has changed. Cancel and select the invoices again.",
		deleteProcessing: "Invoices are still processing. Please try again later.",
		deleteAccessDenied:
			"An invoice is no longer available or you do not have access.",
		deleteLimit: "You can delete up to 1000 invoices at a time.",
		deletedInvoices: "Invoices deleted",
		registerDescription:
			"Search and review every invoice for this project in one place.",
		searchInvoices: "Search by number or supplier",
		status: "Status",
		allStatuses: "All statuses",
		sortBy: "Sort by",
		defaultOrder: "Default order",
		sortAscending: "Sort ascending",
		sortDescending: "Sort descending",
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
		editDetail: "Edit",
		saveDetail: "Save",
		cancelDetail: "Cancel",
		detailSaved: "Saved.",
		detailSaveFailed: "Could not save. Try again.",
		detailRefreshFailed:
			"Changes saved, but the view could not refresh. Reload the page.",
		detailErrors: {
			invalid_input: "Invalid invoice data.",
			invalid_number:
				"Invoice number must be at most 120 characters with no control characters.",
			invalid_date: "Enter a valid date.",
			invalid_version: "Reload the invoice and try again.",
			access_denied: "You do not have access to this invoice.",
			processing: "Wait until invoice processing has finished.",
			conflict:
				"This invoice changed. Cancel and reopen the edit before saving.",
		},
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
			invoice_details_updated: "Invoice details corrected",
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
		return "border-[#B8E0C6] bg-[#ECF8F0] text-[#159447]";
	if (status === "in_approval" || status === "processing")
		return "border-[#B8CDF1] bg-[#EEF4FF] text-tgem-primary";
	if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
	if (status === "received")
		return "border-[#E1E6ED] bg-slate-50 text-slate-600";
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
						className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition hover:border-tgem-primary/30 hover:bg-tgem-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
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
					className="min-h-0 flex-1 resize-none border-0 bg-transparent p-4 font-mono text-xs leading-6 outline-none selection:bg-tgem-primary/20"
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
				<TgemImageViewer
					key={document.documentPath}
					documentPath={document.documentPath}
					filename={document.originalFilename}
					language={language}
				/>
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
	costCodes,
	currentUserId,
	filters,
	copy,
	organizationLanguage,
	onOpenInvoice,
	onChanged,
	onFiltersChange,
}: {
	invoices: TgemDashboardInvoice[];
	costCodes: TgemDashboardData["costCodes"];
	currentUserId: string;
	filters: TgemInvoiceRegisterFilterState;
	copy: ReturnType<typeof getCopy>;
	organizationLanguage?: string | null;
	onOpenInvoice: (invoiceId: string) => void;
	onChanged: () => Promise<void>;
	onFiltersChange: (filters: TgemInvoiceRegisterFilterState) => void;
}) {
	const registerId = React.useId();
	const [sort, setSort] = React.useState<TgemInvoiceSort | null>(null);
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
	const [deletedIds, setDeletedIds] = React.useState<Set<string>>(new Set());
	const [deleteTargets, setDeleteTargets] = React.useState<
		TgemDashboardInvoice[]
	>([]);
	const [deleting, setDeleting] = React.useState(false);
	const deletingRef = React.useRef(false);
	const [deleteError, setDeleteError] = React.useState<string | null>(null);
	const [deletedCount, setDeletedCount] = React.useState<number | null>(null);
	const [previewInvoiceId, setPreviewInvoiceId] = React.useState<string | null>(
		null,
	);
	const availableInvoices = React.useMemo(
		() => invoices.filter((invoice) => !deletedIds.has(invoice.id)),
		[invoices, deletedIds],
	);
	const filteredInvoices = React.useMemo(
		() => filterTgemInvoiceRegister(availableInvoices, filters),
		[availableInvoices, filters],
	);
	const facets = React.useMemo(
		() =>
			getTgemInvoiceRegisterFacets(
				availableInvoices,
				localeForLanguage(organizationLanguage),
			),
		[availableInvoices, organizationLanguage],
	);
	const selectedInvoices = filteredInvoices.filter((invoice) =>
		selectedIds.has(invoice.id),
	);
	const allSelected =
		filteredInvoices.length > 0 &&
		selectedInvoices.length === filteredInvoices.length;
	function toggleSelection(id: string, checked: boolean) {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}
	function toggleAll(checked: boolean) {
		setSelectedIds(
			checked
				? new Set(filteredInvoices.map((invoice) => invoice.id))
				: new Set(),
		);
	}
	function changeFilters(nextFilters: TgemInvoiceRegisterFilterState) {
		setSelectedIds(new Set());
		onFiltersChange(nextFilters);
	}
	function requestDelete(targets: TgemDashboardInvoice[]) {
		setDeleteError(null);
		setDeletedCount(null);
		setDeleteTargets(targets);
	}
	async function confirmDelete() {
		if (deletingRef.current || deleteTargets.length === 0) return;
		deletingRef.current = true;
		setDeleting(true);
		setDeleteError(null);
		try {
			const result = await deleteTgemInvoices(
				deleteTargets.map(({ id, updatedAt }) => ({ id, updatedAt })),
			);
			if (!result.ok) {
				setDeleteError(
					result.error === "processing"
						? copy.deleteProcessing
						: result.error === "conflict"
							? copy.deleteConflict
							: result.error === "access_denied"
								? copy.deleteAccessDenied
								: copy.deleteLimit,
				);
				return;
			}
			setDeletedIds((current) => new Set([...current, ...result.deletedIds]));
			setSelectedIds(new Set());
			setDeleteTargets([]);
			setPreviewInvoiceId(null);
			setDeletedCount(result.deletedIds.length);
			try {
				await onChanged();
			} catch {}
		} catch {
			setDeleteError(copy.deleteFailed);
		} finally {
			deletingRef.current = false;
			setDeleting(false);
		}
	}
	const previewInvoice =
		invoices.find((invoice) => invoice.id === previewInvoiceId) ?? null;
	const sortedInvoices = React.useMemo(
		() =>
			sortTgemInvoiceRegister(filteredInvoices, sort, {
				locale: localeForLanguage(organizationLanguage),
				statusLabels: copy.statuses,
				getCurrentApprover: (invoice) =>
					approvalPosition(invoice).currentStep?.approverName ?? null,
			}),
		[filteredInvoices, sort, organizationLanguage, copy.statuses],
	);
	const columns: {
		key: string;
		field?: TgemInvoiceSortField;
		label: string;
		className?: string;
	}[] = [
		{ key: "costCode", label: copy.costCode },
		{ key: "invoiceNumber", label: copy.invoiceNumber },
		{ key: "project", label: copy.project },
		{ key: "supplier", field: "supplier", label: copy.supplier },
		{ key: "invoiceDate", field: "invoiceDate", label: copy.invoiceDate },
		{ key: "dueDate", field: "dueDate", label: copy.dueDate },
		{ key: "subtotal", label: copy.priceWithoutVat, className: "text-right" },
		{
			key: "total",
			field: "total",
			label: copy.total,
			className: "text-right",
		},
		{ key: "status", label: copy.status },
		{ key: "currentApprover", label: copy.currentApprover },
	];
	const sortColumns = columns.flatMap((column) =>
		column.field ? [{ field: column.field, label: column.label }] : [],
	);
	function toggleSort(field: TgemInvoiceSortField) {
		setSort((current) => ({
			field,
			direction:
				current?.field === field && current.direction === "asc"
					? "desc"
					: "asc",
		}));
	}

	function openPreview(invoiceId: string) {
		setPreviewInvoiceId(invoiceId);
	}
	async function exportInvoices() {
		await downloadTgemInvoiceWorkbook(sortedInvoices, {
			language: organizationLanguage,
			labels: {
				statuses: copy.statuses,
				sources: copy.sources,
				processingStatuses: copy.processingStatuses,
			},
		});
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
							{invoices.filter((invoice) => !deletedIds.has(invoice.id)).length}
						</div>
					</div>
					<TgemInvoiceRegisterFilters
						filters={filters}
						facets={facets}
						currentUserId={currentUserId}
						matchingCount={filteredInvoices.length}
						language={organizationLanguage}
						valueLabels={{
							statuses: copy.statuses,
							sources: copy.sources,
							processingStatuses: copy.processingStatuses,
						}}
						onChange={changeFilters}
						onExport={exportInvoices}
					/>
					<div className="flex flex-wrap items-center gap-3">
						<label
							htmlFor={`${registerId}-select-all`}
							className="flex items-center gap-2 text-sm md:hidden"
						>
							<Checkbox
								className="data-[state=checked]:border-tgem-primary data-[state=checked]:bg-tgem-primary focus-visible:border-tgem-primary focus-visible:ring-tgem-primary/40 dark:data-[state=checked]:bg-tgem-primary"
								id={`${registerId}-select-all`}
								aria-label={copy.selectAllInvoices}
								checked={
									allSelected
										? true
										: selectedInvoices.length
											? "indeterminate"
											: false
								}
								disabled={deleting || !filteredInvoices.length}
								onCheckedChange={(checked) => toggleAll(checked === true)}
							/>
							{copy.selectAllInvoices}
						</label>
						{selectedInvoices.length > 0 ? (
							<Button
								variant="destructive"
								size="sm"
								disabled={deleting}
								onClick={() => requestDelete(selectedInvoices)}
							>
								<Trash2 className="h-4 w-4" />
								{copy.deleteSelected} ({selectedInvoices.length})
							</Button>
						) : null}
						{deletedCount !== null ? (
							<output className="text-sm text-muted-foreground">
								{copy.deletedInvoices}: {deletedCount}
							</output>
						) : null}
					</div>
					<div className="mt-2 flex items-center gap-2 md:hidden">
						<select
							aria-label={copy.sortBy}
							value={sort?.field ?? ""}
							onChange={(event) =>
								setSort(
									event.target.value
										? {
												field: event.target.value as TgemInvoiceSortField,
												direction: "asc",
											}
										: null,
								)
							}
							className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-tgem-primary"
						>
							<option value="">{copy.defaultOrder}</option>
							{sortColumns.map((column) => (
								<option key={column.field} value={column.field}>
									{column.label}
								</option>
							))}
						</select>
						{sort ? (
							<button
								type="button"
								aria-label={
									sort.direction === "asc"
										? copy.sortDescending
										: copy.sortAscending
								}
								onClick={() => toggleSort(sort.field)}
								className="flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-muted focus-visible:outline-tgem-primary"
							>
								{sort.direction === "asc" ? (
									<ArrowUp aria-hidden="true" className="h-4 w-4" />
								) : (
									<ArrowDown aria-hidden="true" className="h-4 w-4" />
								)}
							</button>
						) : null}
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<div className="hidden md:block">
						<Table>
							<TableHeader className="sticky top-0 z-10 bg-background">
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-12 pl-5">
										<Checkbox
											className="data-[state=checked]:border-tgem-primary data-[state=checked]:bg-tgem-primary focus-visible:border-tgem-primary focus-visible:ring-tgem-primary/40 dark:data-[state=checked]:bg-tgem-primary"
											aria-label={copy.selectAllInvoices}
											checked={
												allSelected
													? true
													: selectedInvoices.length
														? "indeterminate"
														: false
											}
											disabled={deleting || !filteredInvoices.length}
											onCheckedChange={(checked) => toggleAll(checked === true)}
										/>
									</TableHead>
									{columns.map((column) => {
										const field = column.field;
										if (!field) {
											return (
												<TableHead
													key={column.key}
													className={column.className}
												>
													{column.label}
												</TableHead>
											);
										}
										const active = sort?.field === field;
										const Icon = active
											? sort.direction === "asc"
												? ArrowUp
												: ArrowDown
											: ArrowUpDown;
										return (
											<TableHead
												key={column.key}
												className={column.className}
												aria-sort={
													active
														? sort.direction === "asc"
															? "ascending"
															: "descending"
														: "none"
												}
											>
												<button
													type="button"
													aria-label={`${active && sort.direction === "asc" ? copy.sortDescending : copy.sortAscending}: ${column.label}`}
													onClick={() => toggleSort(field)}
													className={`inline-flex items-center gap-1.5 rounded-sm py-1 text-sm font-medium hover:text-tgem-primary focus-visible:outline-tgem-primary ${active ? "text-tgem-primary" : "text-muted-foreground"}`}
												>
													{column.label}
													<Icon
														aria-hidden="true"
														className="h-3.5 w-3.5 shrink-0"
													/>
												</button>
											</TableHead>
										);
									})}
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedInvoices.map((invoice) => {
									const { currentStep } = approvalPosition(invoice);
									const invoiceLabel = invoice.invoiceNumber || invoice.id;

									return (
										<TableRow
											key={invoice.id}
											data-testid={`tgem-register-invoice-${invoice.id}`}
											className="group cursor-pointer"
											onClick={() => openPreview(invoice.id)}
										>
											<TableCell
												className="pl-5"
												onClick={(event) => event.stopPropagation()}
											>
												<Checkbox
													className="data-[state=checked]:border-tgem-primary data-[state=checked]:bg-tgem-primary focus-visible:border-tgem-primary focus-visible:ring-tgem-primary/40 dark:data-[state=checked]:bg-tgem-primary"
													aria-label={`${copy.selectInvoice}: ${invoiceLabel}`}
													checked={selectedIds.has(invoice.id)}
													disabled={deleting}
													onCheckedChange={(checked) =>
														toggleSelection(invoice.id, checked === true)
													}
												/>
											</TableCell>
											<TableCell className="font-medium">
												{invoice.costCode || "—"}
											</TableCell>
											<TableCell className="font-semibold">
												<button
													type="button"
													aria-label={`${copy.previewInvoice}: ${invoiceLabel}`}
													className="text-left hover:text-tgem-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
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
													invoice.subtotal,
													invoice.currency,
													organizationLanguage,
												)}
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
												<Button
													variant="ghost"
													size="icon"
													aria-label={`${copy.deleteInvoice}: ${invoiceLabel}`}
													disabled={deleting}
													onClick={(event) => {
														event.stopPropagation();
														requestDelete([invoice]);
													}}
													className="text-destructive hover:text-destructive"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
												<ArrowRight className="inline h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					<div className="divide-y md:hidden">
						{sortedInvoices.map((invoice) => {
							const { currentStep } = approvalPosition(invoice);

							return (
								<div key={invoice.id} className="flex items-start gap-2 p-4">
									<Checkbox
										className="mt-1 data-[state=checked]:border-tgem-primary data-[state=checked]:bg-tgem-primary focus-visible:border-tgem-primary focus-visible:ring-tgem-primary/40 dark:data-[state=checked]:bg-tgem-primary"
										aria-label={`${copy.selectInvoice}: ${invoice.invoiceNumber || invoice.id}`}
										checked={selectedIds.has(invoice.id)}
										disabled={deleting}
										onCheckedChange={(checked) =>
											toggleSelection(invoice.id, checked === true)
										}
									/>
									<button
										key={invoice.id}
										data-testid={`tgem-register-mobile-invoice-${invoice.id}`}
										type="button"
										onClick={() => openPreview(invoice.id)}
										className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left transition hover:bg-tgem-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tgem-primary/50"
									>
										<div className="min-w-0">
											<div className="mb-1 text-xs text-muted-foreground">
												{copy.costCode}: {invoice.costCode || "—"}
											</div>
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
											<span className="text-right text-xs text-muted-foreground tabular-nums">
												{copy.priceWithoutVat}
												<br />
												{formatMoney(
													invoice.subtotal,
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
									<Button
										variant="ghost"
										size="icon"
										aria-label={`${copy.deleteInvoice}: ${invoice.invoiceNumber || invoice.id}`}
										disabled={deleting}
										onClick={() => requestDelete([invoice])}
										className="shrink-0 text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
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

			<AlertDialog
				open={deleteTargets.length > 0}
				onOpenChange={(open) => {
					if (!open && !deletingRef.current) setDeleteTargets([]);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
						<AlertDialogDescription>
							{copy.deleteDescription}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="max-h-48 overflow-y-auto text-sm">
						<p className="mb-2 font-medium">
							{copy.inbox}: {deleteTargets.length}
						</p>
						<ul className="list-inside list-disc">
							{deleteTargets.map((invoice) => (
								<li key={invoice.id}>
									{invoice.invoiceNumber || invoice.id} ·{" "}
									{invoice.supplierName || "—"}
								</li>
							))}
						</ul>
					</div>
					{deleteError ? (
						<p role="alert" className="text-sm text-destructive">
							{deleteError}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>
							{copy.cancelDelete}
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting}
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={(event) => {
								event.preventDefault();
								void confirmDelete();
							}}
						>
							{deleting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{deleting ? copy.deletingInvoices : copy.confirmDelete}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Dialog
				open={previewInvoice !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewInvoiceId(null);
				}}
			>
				{previewInvoice ? (
					<DialogContent
						showCloseButton={false}
						onEscapeKeyDown={(event) => {
							if (
								event.target instanceof Element &&
								event.target.closest("[data-tgem-invoice-detail-editor]")
							)
								event.preventDefault();
						}}
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
									className="absolute top-3.5 right-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-tgem-primary/10 hover:text-tgem-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
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

							<InvoiceInformationCard
								key={previewInvoice.id}
								invoice={previewInvoice}
								costCodes={costCodes}
								copy={copy}
								organizationLanguage={organizationLanguage}
								onChanged={onChanged}
							/>

							{(() => {
								const { currentStep, currentStepIndex, totalSteps } =
									approvalPosition(previewInvoice);

								return (
									<div className="mt-5 rounded-lg border p-4">
										<div className="text-sm font-semibold">
											{copy.approvalProgress}
										</div>
										<div className="mt-3 flex items-center gap-3">
											<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tgem-primary text-white shadow-sm ring-1 ring-tgem-primary/20">
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
										<FileText className="h-4 w-4 shrink-0 text-tgem-primary" />
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
											<TgemImageViewer
												key={previewInvoice.documents[0].documentPath}
												documentPath={previewInvoice.documents[0].documentPath}
												filename={previewInvoice.documents[0].originalFilename}
												language={organizationLanguage}
											/>
										)}
									</div>
								</div>
							) : null}
						</div>

						<div className="border-t bg-background p-4">
							<button
								type="button"
								onClick={() => onOpenInvoice(previewInvoice.id)}
								className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-tgem-primary px-4 text-sm font-semibold text-white transition hover:bg-tgem-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 focus-visible:ring-offset-2"
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
					<Building2 className="h-4 w-4 text-tgem-primary" />
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
							className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-tgem-primary focus-visible:ring-3 focus-visible:ring-tgem-primary/50"
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
						className="inline-flex h-9 items-center justify-center rounded-md bg-tgem-primary px-3 text-sm font-semibold text-white transition hover:bg-tgem-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
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
					<p className="text-xs text-[#159447] dark:text-emerald-400">
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

function EditableInvoiceDetail({
	invoice,
	field,
	label,
	copy,
	language,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	field: TgemEditableInvoiceField;
	label: string;
	copy: ReturnType<typeof getCopy>;
	language?: string | null;
	onChanged: () => Promise<void>;
}) {
	const raw =
		field === "invoiceNumber"
			? (invoice[field] ?? "")
			: (invoice[field]?.slice(0, 10) ?? "");
	const [session, setSession] = React.useState<{
		draft: string;
		version: string;
		original: string;
	} | null>(null);
	const [savedValue, setSavedValue] = React.useState<{
		value: string;
		sourceVersion: string;
	}>();
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<
		TgemInvoiceDetailsError | "failed" | "refresh_failed" | null
	>(null);
	const [saved, setSaved] = React.useState(false);
	const errorId = React.useId();
	const focusInput = React.useCallback((node: HTMLInputElement | null) => {
		node?.focus();
	}, []);
	const editButtonRef = React.useRef<HTMLButtonElement>(null);
	const processing =
		invoice.status === "received" ||
		invoice.status === "processing" ||
		invoice.ocrStatus === "processing" ||
		invoice.extractionStatus === "processing";
	const current =
		savedValue?.sourceVersion === invoice.updatedAt ? savedValue.value : raw;
	const display =
		field === "invoiceNumber" || !current
			? current
			: new Intl.DateTimeFormat(localeForLanguage(language), {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					timeZone: "UTC",
				}).format(new Date(`${current}T00:00:00.000Z`));

	function cancel() {
		if (saving) return;
		setSession(null);
		setError(null);
		window.requestAnimationFrame(() => editButtonRef.current?.focus());
	}

	async function save() {
		if (!session || saving) return;
		const normalized = normalizeTgemInvoiceDetailValue(field, session.draft);
		if (!normalized.ok) {
			setError(normalized.error);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const result = await updateTgemInvoiceDetail({
				invoiceCaseId: invoice.id,
				field,
				value: session.draft,
				expectedUpdatedAt: session.version,
			});
			if (!result.ok) {
				setError(result.error);
				if (result.error === "conflict")
					await onChanged().catch(() => undefined);
				return;
			}
			setSavedValue({
				value: result.value ?? "",
				sourceVersion: session.version,
			});
			setSession(null);
			setSaved(true);
			window.requestAnimationFrame(() => editButtonRef.current?.focus());
			try {
				await onChanged();
			} catch {
				setError("refresh_failed");
			}
		} catch {
			setError("failed");
		} finally {
			setSaving(false);
		}
	}

	const message =
		error === "failed"
			? copy.detailSaveFailed
			: error === "refresh_failed"
				? copy.detailRefreshFailed
				: error
					? copy.detailErrors[error]
					: null;
	return (
		<Field
			label={label}
			value={
				<div className="whitespace-normal">
					{session ? (
						<form
							data-tgem-invoice-detail-editor=""
							onSubmit={(event) => {
								event.preventDefault();
								void save();
							}}
							onKeyDown={(event) => {
								if (event.key === "Escape") {
									event.preventDefault();
									event.stopPropagation();
									cancel();
								}
							}}
						>
							<input
								ref={focusInput}
								aria-label={label}
								aria-invalid={Boolean(error)}
								aria-describedby={error ? errorId : undefined}
								type={field === "invoiceNumber" ? "text" : "date"}
								maxLength={field === "invoiceNumber" ? 120 : undefined}
								value={session.draft}
								disabled={saving}
								onChange={(event) => {
									setSession({ ...session, draft: event.target.value });
									setError(null);
								}}
								className="mt-1 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-tgem-primary"
							/>
							<div className="mt-2 flex flex-wrap gap-2">
								<button
									type="submit"
									aria-label={`${copy.saveDetail}: ${label}`}
									disabled={saving || session.draft.trim() === session.original}
									className="rounded-md bg-tgem-primary px-2 py-1 text-xs font-medium text-white hover:bg-tgem-primary-hover focus-visible:outline-tgem-primary disabled:opacity-50"
								>
									{saving ? copy.savingAccounting : copy.saveDetail}
								</button>
								<button
									type="button"
									aria-label={`${copy.cancelDetail}: ${label}`}
									disabled={saving}
									onClick={cancel}
									className="rounded-md border px-2 py-1 text-xs hover:bg-muted focus-visible:outline-tgem-primary disabled:opacity-50"
								>
									{copy.cancelDetail}
								</button>
							</div>
						</form>
					) : (
						<span>{display || "—"}</span>
					)}
					{message ? (
						<p
							id={errorId}
							role="alert"
							className="mt-1 text-xs font-normal text-red-600"
						>
							{message}
						</p>
					) : saved ? (
						<output className="mt-1 text-xs font-normal text-[#159447] dark:text-emerald-400">
							{copy.detailSaved}
						</output>
					) : null}
				</div>
			}
			action={
				!session ? (
					<button
						type="button"
						aria-label={`${copy.editDetail}: ${label}`}
						ref={editButtonRef}
						title={
							processing
								? copy.detailErrors.processing
								: `${copy.editDetail}: ${label}`
						}
						disabled={processing || saving}
						onClick={() => {
							setSession({
								draft: current,
								version: invoice.updatedAt,
								original: current,
							});
							setError(null);
							setSaved(false);
						}}
						className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-tgem-primary disabled:opacity-50"
					>
						<Pencil className="h-4 w-4" />
					</button>
				) : undefined
			}
		/>
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
							className="w-full rounded-sm bg-background text-sm font-medium focus-visible:outline-tgem-primary"
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
						className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-tgem-primary disabled:opacity-50"
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
								className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-tgem-primary"
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
								className="inline-block font-medium text-tgem-primary underline underline-offset-4"
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
						className="w-full rounded-sm bg-background text-sm font-medium focus-visible:outline-tgem-primary"
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
						className="inline-flex h-9 items-center justify-center rounded-md bg-tgem-primary px-3 text-sm font-semibold text-white transition hover:bg-tgem-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{status === "saving" ? copy.savingAccounting : copy.saveAccounting}
					</button>
					{status === "saved" ? (
						<span className="text-xs text-[#159447] dark:text-emerald-400">
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

function InvoiceInformationCard({
	invoice,
	costCodes,
	copy,
	organizationLanguage,
	onChanged,
}: {
	invoice: TgemDashboardInvoice;
	costCodes: TgemDashboardData["costCodes"];
	copy: ReturnType<typeof getCopy>;
	organizationLanguage?: string | null;
	onChanged: () => Promise<void>;
}) {
	const sourceField = (label: string, value: React.ReactNode) => (
		<Field label={label} value={value} />
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ReceiptText className="h-4 w-4 text-tgem-primary" />
					{copy.details}
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 sm:grid-cols-2">
				{sourceField(
					copy.project,
					<span
						data-testid="tgem-invoice-project-label"
						className="inline-flex rounded-md border border-tgem-primary/20 bg-tgem-primary/10 px-2 py-1 text-sm font-semibold text-tgem-primary shadow-xs"
					>
						{invoice.project?.name || copy.unassigned}
					</span>,
				)}
				<EditableInvoiceDetail
					key={`${invoice.id}-invoiceDate`}
					invoice={invoice}
					field="invoiceDate"
					label={copy.invoiceDate}
					copy={copy}
					language={organizationLanguage}
					onChanged={onChanged}
				/>
				<EditableInvoiceDetail
					key={`${invoice.id}-invoiceNumber`}
					invoice={invoice}
					field="invoiceNumber"
					label={copy.invoiceNumber}
					copy={copy}
					language={organizationLanguage}
					onChanged={onChanged}
				/>
				{sourceField(copy.supplier, invoice.supplierName)}

				<EditableInvoiceDetail
					key={`${invoice.id}-dueDate`}
					invoice={invoice}
					field="dueDate"
					label={copy.dueDate}
					copy={copy}
					language={organizationLanguage}
					onChanged={onChanged}
				/>
				<Field
					label={copy.ocr}
					value={localizedValue(copy.processingStatuses, invoice.ocrStatus)}
				/>
				{sourceField(
					copy.totalWithoutVat,
					formatMoney(invoice.subtotal, invoice.currency, organizationLanguage),
				)}
				{sourceField(
					copy.total,
					formatMoney(invoice.total, invoice.currency, organizationLanguage),
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
				<InvoiceInformationCard
					invoice={invoice}
					costCodes={costCodes}
					copy={copy}
					organizationLanguage={organizationLanguage}
					onChanged={onChanged}
				/>
				<ProjectAssignment
					invoice={invoice}
					projects={projects}
					copy={copy}
					onChanged={onProjectChanged}
				/>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<ListChecks className="h-4 w-4 text-tgem-primary" />
							{copy.lines}
						</CardTitle>
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
						<CardTitle className="flex items-center gap-2 text-base">
							<History className="h-4 w-4 text-tgem-primary" />
							{copy.audit}
						</CardTitle>
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
							<FileText
								data-testid="tgem-document-title-icon"
								className="h-4 w-4 text-tgem-primary"
							/>
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
								className="rounded-md border border-tgem-primary/25 bg-tgem-primary/10 px-2.5 py-1 text-xs font-medium text-tgem-primary shadow-xs transition hover:border-tgem-primary/40 hover:bg-tgem-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50"
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
	const [registerFilters, setRegisterFilters] =
		React.useState<TgemInvoiceRegisterFilterState>(() =>
			createDefaultTgemInvoiceRegisterFilters(),
		);
	React.useEffect(() => {
		setProjectFilter(initialFilter);
		setSelectedInvoiceId(null);
		setRegisterFilters(createDefaultTgemInvoiceRegisterFilters());
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
		setRegisterFilters(createDefaultTgemInvoiceRegisterFilters());
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
			<div className="flex items-start justify-between gap-3 border-b pb-3">
				<div className="min-w-0 flex-1">
					<h1 className="text-2xl font-semibold tracking-normal">
						{copy.title}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{copy.description}
					</p>
					{invoiceScope ? (
						<div
							data-testid="tgem-invoice-scope"
							className="mt-2 inline-flex items-center gap-2 rounded-md border border-tgem-primary/20 bg-tgem-primary/10 px-2.5 py-1.5 text-sm text-foreground shadow-xs dark:border-tgem-primary/25 dark:bg-tgem-primary/10"
						>
							<Building2 className="h-4 w-4 shrink-0 text-tgem-primary" />
							<span className="text-xs font-medium text-tgem-primary">
								{copy.invoiceScope}:
							</span>{" "}
							<span className="font-semibold">{invoiceScope}</span>
						</div>
					) : null}
				</div>
				<DashboardOrganizationBrand
					flowModuleKey={FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL}
				/>
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
					{dashboardView === "register" && data ? (
						<InvoiceRegister
							key={projectFilter}
							invoices={data.invoices}
							costCodes={data.costCodes}
							currentUserId={data.currentUserId}
							filters={registerFilters}
							copy={copy}
							organizationLanguage={organizationLanguage}
							onChanged={() => loadData()}
							onFiltersChange={setRegisterFilters}
							onOpenInvoice={(invoiceId) => {
								changeDashboardView("approval", invoiceId);
							}}
						/>
					) : (
						<div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.35fr)_minmax(0,1fr)]">
							<Card className="h-fit">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Files className="h-4 w-4 text-tgem-primary" />
										{copy.inbox}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{data?.invoices.map((invoice) => (
										<button
											key={invoice.id}
											type="button"
											data-testid={`tgem-invoice-${invoice.id}`}
											onClick={() => setSelectedInvoiceId(invoice.id)}
											className={`w-full rounded-md border p-3 text-left transition hover:bg-[#F1F6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tgem-primary/50 ${selectedInvoiceId === invoice.id ? "border-[#7CA5E8] bg-[#F1F6FF] shadow-[inset_3px_0_0_#214EA3]" : "border-[#E1E6ED] bg-background"}`}
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
						<CheckCircle2 className="h-4 w-4 text-[#159447]" />
						{copy.dataSource}
					</div>
				</>
			)}
		</div>
	);
}
