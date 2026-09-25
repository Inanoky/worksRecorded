import type * as XLSX from "xlsx";
import type { TgemDashboardInvoice } from "@/lib/tgem-invoice-approval/dashboard-types";
import { getTgemCurrentApprovalStep } from "@/lib/tgem-invoice-approval/register-filtering";

type ExportLanguage = "lv" | "en" | "ru";

function exportLanguage(language?: string | null): ExportLanguage {
	if (language === "en" || language === "ru") return language;
	return "lv";
}

function getExportCopy(language?: string | null) {
	const selected = exportLanguage(language);
	if (selected === "lv") {
		return {
			invoiceSheet: "Rēķini",
			lineSheet: "Pozīcijas",
			unassigned: "Nav piešķirts",
			debit: "Debeta rēķins",
			credit: "Kredītrēķins",
			receipt: "Čeks",
			invoice: {
				number: "Rēķina numurs",
				project: "Projekts",
				supplier: "Piegādātājs",
				registration: "Reģistrācijas numurs",
				type: "Dokumenta veids",
				costCode: "Izmaksu kods",
				invoiceDate: "Rēķina datums",
				receivedDate: "Saņemšanas datums",
				dueDate: "Apmaksas termiņš",
				approvedDate: "Apstiprināšanas datums",
				currency: "Valūta",
				subtotal: "Kopā bez PVN",
				vat: "PVN",
				total: "Kopā",
				status: "Statuss",
				approver: "Pašreizējais apstiprinātājs",
				source: "Avots",
				reference: "Atsauce",
				bankAccount: "Bankas konts",
				ocr: "OCR statuss",
				extraction: "MI apstrādes statuss",
			},
			line: {
				invoiceNumber: "Rēķina numurs",
				project: "Projekts",
				supplier: "Piegādātājs",
				invoiceCostCode: "Rēķina izmaksu kods",
				lineNumber: "Pozīcijas numurs",
				description: "Apraksts",
				quantity: "Daudzums",
				unit: "Mērvienība",
				unitPrice: "Vienības cena",
				total: "Kopā",
				currency: "Valūta",
				costCode: "Izmaksu kods",
				category: "Kategorija",
				suggestedCostCode: "Ieteiktais izmaksu kods",
				suggestedCategory: "Ieteiktā kategorija",
				confidence: "MI pārliecība",
			},
		};
	}
	if (selected === "ru") {
		return {
			invoiceSheet: "Счета",
			lineSheet: "Позиции",
			unassigned: "Не назначен",
			debit: "Дебетовый счёт",
			credit: "Кредитный счёт",
			receipt: "Чек",
			invoice: {
				number: "Номер счёта",
				project: "Проект",
				supplier: "Поставщик",
				registration: "Регистрационный номер",
				type: "Тип документа",
				costCode: "Код затрат",
				invoiceDate: "Дата счёта",
				receivedDate: "Дата получения",
				dueDate: "Срок оплаты",
				approvedDate: "Дата согласования",
				currency: "Валюта",
				subtotal: "Итого без НДС",
				vat: "НДС",
				total: "Итого",
				status: "Статус",
				approver: "Текущий согласующий",
				source: "Источник",
				reference: "Ссылка",
				bankAccount: "Банковский счёт",
				ocr: "Статус OCR",
				extraction: "Статус обработки ИИ",
			},
			line: {
				invoiceNumber: "Номер счёта",
				project: "Проект",
				supplier: "Поставщик",
				invoiceCostCode: "Код затрат счёта",
				lineNumber: "Номер позиции",
				description: "Описание",
				quantity: "Количество",
				unit: "Единица",
				unitPrice: "Цена за единицу",
				total: "Итого",
				currency: "Валюта",
				costCode: "Код затрат",
				category: "Категория",
				suggestedCostCode: "Предложенный код затрат",
				suggestedCategory: "Предложенная категория",
				confidence: "Уверенность ИИ",
			},
		};
	}
	return {
		invoiceSheet: "Invoices",
		lineSheet: "Line items",
		unassigned: "Unassigned",
		debit: "Debit invoice",
		credit: "Credit invoice",
		receipt: "Receipt",
		invoice: {
			number: "Invoice number",
			project: "Project",
			supplier: "Supplier",
			registration: "Registration number",
			type: "Document type",
			costCode: "Cost code",
			invoiceDate: "Invoice date",
			receivedDate: "Received date",
			dueDate: "Due date",
			approvedDate: "Approved date",
			currency: "Currency",
			subtotal: "Total excl. VAT",
			vat: "VAT",
			total: "Total",
			status: "Status",
			approver: "Current approver",
			source: "Source",
			reference: "Reference",
			bankAccount: "Bank account",
			ocr: "OCR status",
			extraction: "AI processing status",
		},
		line: {
			invoiceNumber: "Invoice number",
			project: "Project",
			supplier: "Supplier",
			invoiceCostCode: "Invoice cost code",
			lineNumber: "Line number",
			description: "Description",
			quantity: "Quantity",
			unit: "Unit",
			unitPrice: "Unit price",
			total: "Total",
			currency: "Currency",
			costCode: "Cost code",
			category: "Category",
			suggestedCostCode: "Suggested cost code",
			suggestedCategory: "Suggested category",
			confidence: "AI confidence",
		},
	};
}

function numberCell(value: string | null) {
	if (value === null || !value.trim()) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function dateCell(value: string | null) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function localize(values: Record<string, string>, value: string) {
	return values[value] ?? value.replaceAll("_", " ");
}

export type TgemInvoiceExportLabels = {
	statuses: Record<string, string>;
	sources: Record<string, string>;
	processingStatuses: Record<string, string>;
};

function setWorksheetPresentation(worksheet: XLSX.WorkSheet, widths: number[]) {
	worksheet["!cols"] = widths.map((wch) => ({ wch }));
	if (worksheet["!ref"]) {
		worksheet["!autofilter"] = { ref: worksheet["!ref"] };
	}
}

export function buildTgemInvoiceWorkbook(
	xlsx: typeof XLSX,
	invoices: readonly TgemDashboardInvoice[],
	options: {
		language?: string | null;
		labels: TgemInvoiceExportLabels;
	},
) {
	const copy = getExportCopy(options.language);
	const invoiceRows = invoices.map((invoice) => ({
		[copy.invoice.number]: invoice.invoiceNumber ?? "",
		[copy.invoice.project]: invoice.project?.name ?? copy.unassigned,
		[copy.invoice.supplier]: invoice.supplierName ?? "",
		[copy.invoice.registration]: invoice.supplierRegistrationNo ?? "",
		[copy.invoice.type]:
			invoice.invoiceType === "credit"
				? copy.credit
				: invoice.invoiceType === "receipt"
					? copy.receipt
					: copy.debit,
		[copy.invoice.costCode]: invoice.costCode ?? "",
		[copy.invoice.invoiceDate]: dateCell(invoice.invoiceDate),
		[copy.invoice.receivedDate]: dateCell(invoice.receivedAt),
		[copy.invoice.dueDate]: dateCell(invoice.dueDate),
		[copy.invoice.approvedDate]: dateCell(invoice.approvedAt),
		[copy.invoice.currency]: invoice.currency ?? "",
		[copy.invoice.subtotal]: numberCell(invoice.subtotal),
		[copy.invoice.vat]: numberCell(invoice.vat),
		[copy.invoice.total]: numberCell(invoice.total),
		[copy.invoice.status]: localize(options.labels.statuses, invoice.status),
		[copy.invoice.approver]:
			getTgemCurrentApprovalStep(invoice)?.approverName ?? "",
		[copy.invoice.source]: localize(options.labels.sources, invoice.source),
		[copy.invoice.reference]: invoice.reference ?? "",
		[copy.invoice.bankAccount]: invoice.bankAccount ?? "",
		[copy.invoice.ocr]: localize(
			options.labels.processingStatuses,
			invoice.ocrStatus,
		),
		[copy.invoice.extraction]: localize(
			options.labels.processingStatuses,
			invoice.extractionStatus,
		),
	}));
	const lineRows = invoices.flatMap((invoice) =>
		invoice.lines.map((line) => ({
			[copy.line.invoiceNumber]: invoice.invoiceNumber ?? "",
			[copy.line.project]: invoice.project?.name ?? copy.unassigned,
			[copy.line.supplier]: invoice.supplierName ?? "",
			[copy.line.invoiceCostCode]: invoice.costCode ?? "",
			[copy.line.lineNumber]: line.lineNumber,
			[copy.line.description]: line.description ?? "",
			[copy.line.quantity]: numberCell(line.quantity),
			[copy.line.unit]: line.unit ?? "",
			[copy.line.unitPrice]: numberCell(line.unitPrice),
			[copy.line.total]: numberCell(line.total),
			[copy.line.currency]: line.currency ?? invoice.currency ?? "",
			[copy.line.costCode]: line.costCode ?? "",
			[copy.line.category]: line.category ?? "",
			[copy.line.suggestedCostCode]: line.suggestedCostCode ?? "",
			[copy.line.suggestedCategory]: line.suggestedCategory ?? "",
			[copy.line.confidence]: line.aiConfidence,
		})),
	);
	const invoiceSheet = xlsx.utils.json_to_sheet(invoiceRows, {
		header: Object.values(copy.invoice),
		cellDates: true,
		dateNF: "dd.mm.yyyy",
	});
	const lineSheet = xlsx.utils.json_to_sheet(lineRows, {
		header: Object.values(copy.line),
		cellDates: true,
		dateNF: "dd.mm.yyyy",
	});
	setWorksheetPresentation(
		invoiceSheet,
		[
			20, 28, 30, 22, 18, 18, 14, 18, 14, 18, 12, 16, 14, 16, 20, 28, 16, 24,
			24, 18, 22,
		],
	);
	setWorksheetPresentation(
		lineSheet,
		[20, 28, 30, 20, 12, 42, 14, 14, 16, 16, 12, 18, 22, 22, 26, 16],
	);
	const workbook = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(workbook, invoiceSheet, copy.invoiceSheet);
	xlsx.utils.book_append_sheet(workbook, lineSheet, copy.lineSheet);
	return workbook;
}

export async function downloadTgemInvoiceWorkbook(
	invoices: readonly TgemDashboardInvoice[],
	options: {
		language?: string | null;
		labels: TgemInvoiceExportLabels;
		now?: Date;
	},
) {
	const xlsx = await import("xlsx");
	const workbook = buildTgemInvoiceWorkbook(xlsx, invoices, options);
	const datePart = (options.now ?? new Date()).toISOString().slice(0, 10);
	xlsx.writeFile(workbook, `tgem-invoices-${datePart}.xlsx`, {
		compression: true,
	});
}
