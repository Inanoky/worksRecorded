import type { Prisma, PrismaClient } from "@prisma/client";
import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/google-document-ai";

type TgemOcrDatabase = Pick<
	PrismaClient,
	"tgemInvoiceOcrPage" | "tgemInvoiceCase" | "tgemInvoiceLine"
>;

function stringField(result: TgemInvoiceOcrResult, name: string) {
	const value = result.fields[name]?.value;
	if (value === null || value === undefined) return null;
	const text = String(value).trim();
	return text || null;
}

function numberField(result: TgemInvoiceOcrResult, name: string) {
	const value = result.fields[name]?.value;
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;
	const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
	return Number.isFinite(parsed) ? parsed : null;
}

function dateField(result: TgemInvoiceOcrResult, name: string) {
	const value = stringField(result, name);
	if (!value) return null;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function hasPersistableLineItem(
	lineItem: TgemInvoiceOcrResult["lineItems"][number],
) {
	return Boolean(
		lineItem.description ||
			lineItem.quantity !== null ||
			lineItem.unitPrice !== null ||
			lineItem.total !== null,
	);
}

export async function persistTgemInvoiceOcrResult(
	database: TgemOcrDatabase,
	input: {
		invoiceCaseId: string;
		documentId: string;
		result: TgemInvoiceOcrResult;
	},
) {
	for (const page of input.result.pages) {
		const data = {
			pageNumber: page.pageNumber,
			width: page.width,
			height: page.height,
			text: page.text,
			blocks: page.blocks,
			status: page.status,
			errorMessage: page.errorMessage ?? null,
		};

		await database.tgemInvoiceOcrPage.upsert({
			where: {
				documentId_pageNumber: {
					documentId: input.documentId,
					pageNumber: page.pageNumber,
				},
			},
			update: data,
			create: { documentId: input.documentId, ...data },
		});
	}

	const persistableLineItems = input.result.lineItems.filter(
		hasPersistableLineItem,
	);
	const currency = stringField(input.result, "currency");

	for (const [index, lineItem] of persistableLineItems.entries()) {
		const data = {
			description: lineItem.description,
			quantity: lineItem.quantity,
			unit: lineItem.unit,
			unitPrice: lineItem.unitPrice,
			total: lineItem.total,
			currency: lineItem.currency ?? currency,
			aiConfidence: lineItem.confidence,
			sourceText: lineItem.sourceText || lineItem.description,
		};

		await database.tgemInvoiceLine.upsert({
			where: {
				invoiceCaseId_lineNumber: {
					invoiceCaseId: input.invoiceCaseId,
					lineNumber: index + 1,
				},
			},
			update: data,
			create: {
				invoiceCaseId: input.invoiceCaseId,
				lineNumber: index + 1,
				...data,
			},
		});
	}

	const warnings: string[] = [];
	if (!stringField(input.result, "invoiceNumber")) {
		warnings.push("Invoice number was not detected.");
	}
	if (numberField(input.result, "total") === null) {
		warnings.push("Invoice total was not detected.");
	}
	const skippedLineItemCount =
		input.result.lineItems.length - persistableLineItems.length;
	if (skippedLineItemCount > 0) {
		warnings.push(
			`${skippedLineItemCount} incomplete line item${skippedLineItemCount === 1 ? " was" : "s were"} excluded.`,
		);
	}

	const processingComplete = input.result.pages.every(
		(page) => page.status === "complete",
	);
	const extractionSummary: Prisma.InputJsonValue = {
		provider: input.result.provider,
		fields: input.result.fields,
		detectedLineItemCount: input.result.lineItems.length,
		persistedLineItemCount: persistableLineItems.length,
	};
	const validationSummary: Prisma.InputJsonValue = {
		state: warnings.length > 0 ? "warning" : "ready",
		warnings,
	};

	await database.tgemInvoiceCase.update({
		where: { id: input.invoiceCaseId },
		data: {
			status: processingComplete ? "needs_review" : "failed_processing",
			ocrStatus: processingComplete ? "complete" : "failed",
			extractionStatus: processingComplete ? "complete" : "failed",
			processingError: input.result.pages.some((page) => page.errorMessage)
				? input.result.pages.find((page) => page.errorMessage)?.errorMessage
				: null,
			invoiceNumber: stringField(input.result, "invoiceNumber"),
			supplierName: stringField(input.result, "supplierName"),
			supplierRegistrationNo: stringField(
				input.result,
				"supplierRegistrationNo",
			),
			invoiceDate: dateField(input.result, "invoiceDate"),
			dueDate: dateField(input.result, "dueDate"),
			currency,
			subtotal: numberField(input.result, "subtotal"),
			vat: numberField(input.result, "vat"),
			total: numberField(input.result, "total"),
			bankAccount: stringField(input.result, "bankAccount"),
			reference: stringField(input.result, "purchaseOrder"),
			extractionSummary,
			validationSummary,
			processedAt: new Date(),
		},
	});

	return {
		pageCount: input.result.pages.length,
		lineItemCount: persistableLineItems.length,
		warningCount: warnings.length,
	};
}
