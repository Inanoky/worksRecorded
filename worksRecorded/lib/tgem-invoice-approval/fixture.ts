import type { PrismaClient } from "@prisma/client";

const FIXTURE_IDEMPOTENCY_PREFIX = "tgem-invoice-fixture";

const TGEM_FIXTURE_OCR_PAGE = {
	pageNumber: 1,
	width: 3024,
	height: 4032,
	text: `Moxy Edinburgh Fountainbridge
INFORMATION STATEMENT
Invoice Date: 18/01/24
Description Reference Debit GBP Credit GBP
Deposit Transfer at C/I 216.00
Package 72.00
Package 72.00
Package 72.00
VAT @ 20% Net GBP 180.00 VAT GBP 36.00 Gross GBP 216.00
Total incl. tax 216.00 GBP
Bank Details: Name: BNP PARIBAS UK Account: 89873171`,
	blocks: [
		{
			text: "Moxy Edinburgh Fountainbridge",
			confidence: 0.99,
			left: 0.58,
			top: 0.06,
			width: 0.27,
			height: 0.018,
			polygon: [
				{ x: 0.58, y: 0.06 },
				{ x: 0.85, y: 0.06 },
				{ x: 0.85, y: 0.078 },
				{ x: 0.58, y: 0.078 },
			],
		},
		{
			text: "INFORMATION STATEMENT",
			confidence: 0.98,
			left: 0.1,
			top: 0.27,
			width: 0.24,
			height: 0.02,
			polygon: [
				{ x: 0.1, y: 0.27 },
				{ x: 0.34, y: 0.27 },
				{ x: 0.34, y: 0.29 },
				{ x: 0.1, y: 0.29 },
			],
		},
		{
			text: "Invoice Date: 18/01/24",
			confidence: 0.97,
			left: 0.6,
			top: 0.31,
			width: 0.25,
			height: 0.02,
			polygon: [
				{ x: 0.6, y: 0.31 },
				{ x: 0.85, y: 0.31 },
				{ x: 0.85, y: 0.33 },
				{ x: 0.6, y: 0.33 },
			],
		},
		{
			text: "Package 72.00 GBP",
			confidence: 0.95,
			left: 0.18,
			top: 0.43,
			width: 0.55,
			height: 0.02,
			polygon: [
				{ x: 0.18, y: 0.43 },
				{ x: 0.73, y: 0.43 },
				{ x: 0.73, y: 0.45 },
				{ x: 0.18, y: 0.45 },
			],
		},
		{
			text: "Total incl. tax 216.00 GBP",
			confidence: 0.98,
			left: 0.55,
			top: 0.55,
			width: 0.3,
			height: 0.02,
			polygon: [
				{ x: 0.55, y: 0.55 },
				{ x: 0.85, y: 0.55 },
				{ x: 0.85, y: 0.57 },
				{ x: 0.55, y: 0.57 },
			],
		},
	],
	status: "complete",
};

export function isTgemInvoiceFixtureModeEnabled() {
	return process.env.TGEM_INVOICE_FIXTURE_MODE === "true";
}

export function getTgemInvoiceFixtureIdempotencyKey(
	organizationId: string,
	siteId: string,
) {
	return `${FIXTURE_IDEMPOTENCY_PREFIX}:${organizationId}:${siteId}`;
}

export async function ensureTgemInvoiceFixture(
	database: PrismaClient,
	input: { organizationId: string; siteId: string; userId: string },
) {
	if (!isTgemInvoiceFixtureModeEnabled()) return null;

	const idempotencyKey = getTgemInvoiceFixtureIdempotencyKey(
		input.organizationId,
		input.siteId,
	);

	return database.tgemInvoiceCase.upsert({
		where: { idempotencyKey },
		update: {},
		create: {
			organizationId: input.organizationId,
			siteId: input.siteId,
			submittedByUserId: input.userId,
			idempotencyKey,
			source: "fixture",
			sourceSender: "TGEM MVP fixture",
			status: "needs_review",
			ocrStatus: "complete",
			extractionStatus: "complete",
			invoiceNumber: "TG-2026-0718",
			supplierName: "Baltic Electrical Systems SIA",
			supplierRegistrationNo: "40203188910",
			invoiceDate: new Date("2026-07-01T00:00:00.000Z"),
			dueDate: new Date("2026-07-15T00:00:00.000Z"),
			currency: "EUR",
			subtotal: 18420,
			vat: 3868.2,
			total: 22288.2,
			bankAccount: "LV80HABA0551047890201",
			reference: "Stage 2 electrical installation",
			validationSummary: {
				state: "warning",
				warnings: ["Fixture invoice requires review before approval."],
			},
			extractionSummary: {
				provider: "fixture",
				confidence: 0.98,
			},
			documents: {
				create: {
					storageProvider: "fixture",
					storageKey: "TGEMinvoice.png",
					canonicalUrl: "/TGEM/TGEMinvoice.png",
					originalFilename: "tgem-invoice-fixture.png",
					contentType: "image/png",
					byteSize: null,
					sha256: "tgem-mvp-fixture",
					source: "fixture",
					ocrPages: { create: TGEM_FIXTURE_OCR_PAGE },
				},
			},
			lines: {
				create: [
					{
						lineNumber: 1,
						description: "Cable tray installation, level 2",
						quantity: 420,
						unit: "m",
						unitPrice: 18,
						total: 7560,
						currency: "EUR",
						suggestedCostCode: "1000-EL",
						suggestedCategory: "Electrical works",
						aiConfidence: 0.96,
						sourceText: "Cable tray installation, level 2",
					},
					{
						lineNumber: 2,
						description: "Switchboard assembly and testing",
						quantity: 3,
						unit: "pcs",
						unitPrice: 1650,
						total: 4950,
						currency: "EUR",
						suggestedCostCode: "1000-EL",
						suggestedCategory: "Electrical works",
						aiConfidence: 0.94,
						sourceText: "Switchboard assembly and testing",
					},
					{
						lineNumber: 3,
						description: "Lighting circuit installation",
						quantity: 197,
						unit: "point",
						unitPrice: 30,
						total: 5910,
						currency: "EUR",
						suggestedCostCode: "1000-EL",
						suggestedCategory: "Electrical works",
						aiConfidence: 0.95,
						sourceText: "Lighting circuit installation",
					},
				],
			},
			approvalSteps: {
				create: {
					stepOrder: 1,
					role: "Project manager",
					status: "waiting",
				},
			},
			auditEvents: {
				create: {
					organizationId: input.organizationId,
					actorUserId: input.userId,
					actorType: "fixture",
					eventType: "fixture_created",
					toStatus: "needs_review",
					payload: { fixture: true },
				},
			},
		},
		include: {
			documents: true,
			lines: true,
			approvalSteps: true,
			auditEvents: true,
		},
	});
}
