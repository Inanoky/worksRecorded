/** @jest-environment node */

import { readFileSync } from "node:fs";
import path from "node:path";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";

jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({
		uploadFiles: jest.fn(),
	})),
}));

import {
	classifyMaterialDocumentImage,
	extractBISMaterialsFromPublicUrl,
} from "@/server/actions/META/RoutingHandlers/metaImageHandler";
import expectedFixture from "./fixtures/meta-webhook/material-invoice.expected.json";

type ExpectedMaterialItem = {
	name: string;
	cost: number;
	costTolerance?: number;
	invoiceNr: string;
	invoiceDate: string | null;
	costCode: string;
	quantity: number;
	quantityTolerance?: number;
	construction_material_id: string;
};

type ExtractedMaterialItem = {
	name: string;
	cost: number;
	invoiceNr: string;
	invoiceDate?: string | Date | null;
	costCode: string;
	quantity: number;
	construction_material_id: string;
};

type FieldComparison = {
	field: keyof ExpectedMaterialItem;
	status: "pass" | "fail";
	expected: unknown;
	actual: unknown;
	message?: string;
};

type ItemComparison = {
	index: number;
	status: "pass" | "fail";
	expectedName: string | null;
	actualName: string | null;
	fields: FieldComparison[];
};

type ExtractionComparisonReport = {
	status: "pass" | "fail";
	summary: {
		expectedRows: number;
		actualRows: number;
		passedRows: number;
		failedRows: number;
		failedFields: number;
		extraRows: number;
		missingRows: number;
	};
	items: ItemComparison[];
	extraItems: Array<{ index: number; actual: ExtractedMaterialItem }>;
};

type RealImageEvalCase = {
	name: string;
	publicUrl: () => string;
	expectedMaterialDocument: boolean;
	expectedItems?: ExpectedMaterialItem[];
	expectedInvoiceNr?: string;
	expectedInvoiceDateISO?: string;
	minExtractedRows?: number;
};

const fixturePath = path.join(
	process.cwd(),
	"test/fixtures/meta-webhook/material-invoice.jpg",
);
const latvianDateInvoiceFixturePath = path.join(
	process.cwd(),
	"test/fixtures/meta-webhook/material-invoice-latvian-date.jpg",
);
const progressReportFixturePath = path.join(
	process.cwd(),
	"test/fixtures/meta-webhook/progress-report-normal-image.jpg",
);

function fixtureImageDataUrl(args: { path: string; description: string }) {
	const bytes = readFileSync(args.path);
	const placeholder = Buffer.from("fixture material invoice image bytes");

	if (bytes.equals(placeholder)) {
		throw new Error(
			`Replace ${args.description} with a real image before running RUN_AI_EVALS=true.`,
		);
	}

	return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

function materialInvoiceImageDataUrl() {
	return fixtureImageDataUrl({
		path: fixturePath,
		description: "test/fixtures/meta-webhook/material-invoice.jpg",
	});
}

function latvianDateInvoiceImageDataUrl() {
	return fixtureImageDataUrl({
		path: latvianDateInvoiceFixturePath,
		description:
			"test/fixtures/meta-webhook/material-invoice-latvian-date.jpg",
	});
}

function progressReportImageDataUrl() {
	return fixtureImageDataUrl({
		path: progressReportFixturePath,
		description:
			"test/fixtures/meta-webhook/progress-report-normal-image.jpg",
	});
}

function normalize(value: string) {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeDate(value: string | Date | null | undefined) {
	if (value == null) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toISOString().slice(0, 10);
}

function compareField(args: {
	field: keyof ExpectedMaterialItem;
	expected: unknown;
	actual: unknown;
	pass: boolean;
	message?: string;
}): FieldComparison {
	return {
		field: args.field,
		status: args.pass ? "pass" : "fail",
		expected: args.expected,
		actual: args.actual,
		...(args.message && !args.pass ? { message: args.message } : {}),
	};
}

function compareExpectedItem(
	actual: ExtractedMaterialItem,
	expected: ExpectedMaterialItem,
): FieldComparison[] {
	const quantityTolerance = expected.quantityTolerance ?? 0.000001;
	const costTolerance = expected.costTolerance ?? 0.01;

	return [
		compareField({
			field: "name",
			expected: expected.name,
			actual: actual.name,
			pass: normalize(actual.name) === normalize(expected.name),
			message: "Name must match the expected invoice row text.",
		}),
		compareField({
			field: "cost",
			expected: expected.cost,
			actual: actual.cost,
			pass: Math.abs(actual.cost - expected.cost) <= costTolerance,
			message: `Cost must be within ${costTolerance}.`,
		}),
		compareField({
			field: "invoiceNr",
			expected: expected.invoiceNr,
			actual: actual.invoiceNr,
			pass: actual.invoiceNr === expected.invoiceNr,
			message: "Invoice number must match exactly.",
		}),
		compareField({
			field: "invoiceDate",
			expected: normalizeDate(expected.invoiceDate),
			actual: normalizeDate(actual.invoiceDate),
			pass:
				normalizeDate(actual.invoiceDate) ===
				normalizeDate(expected.invoiceDate),
			message: "Invoice date must match by calendar day.",
		}),
		compareField({
			field: "costCode",
			expected: expected.costCode,
			actual: actual.costCode,
			pass: actual.costCode === expected.costCode,
			message: "Cost code must match the generated or visible row code.",
		}),
		compareField({
			field: "quantity",
			expected: expected.quantity,
			actual: actual.quantity,
			pass: Math.abs(actual.quantity - expected.quantity) <= quantityTolerance,
			message: `Quantity must be within ${quantityTolerance}.`,
		}),
		compareField({
			field: "construction_material_id",
			expected: expected.construction_material_id,
			actual: actual.construction_material_id,
			pass:
				actual.construction_material_id === expected.construction_material_id,
			message: "Material category id must match exactly.",
		}),
	];
}

function compareExtractionItems(
	expectedItems: ExpectedMaterialItem[],
	actualItems: ExtractedMaterialItem[],
): ExtractionComparisonReport {
	const items = expectedItems.map((expected, index) => {
		const actual = actualItems[index] ?? null;
		const fields = actual
			? compareExpectedItem(actual, expected)
			: (
					[
						"name",
						"cost",
						"invoiceNr",
						"invoiceDate",
						"costCode",
						"quantity",
						"construction_material_id",
					] as Array<keyof ExpectedMaterialItem>
				).map((field) =>
					compareField({
						field,
						expected: expected[field],
						actual: null,
						pass: false,
						message: "Expected row is missing from extracted items.",
					}),
				);
		const failedFields = fields.filter((field) => field.status === "fail");

		return {
			index,
			status: failedFields.length === 0 ? "pass" : "fail",
			expectedName: expected.name,
			actualName: actual?.name ?? null,
			fields,
		} satisfies ItemComparison;
	});
	const extraItems = actualItems
		.slice(expectedItems.length)
		.map((actual, index) => ({
			index: expectedItems.length + index,
			actual,
		}));
	const failedRows = items.filter((item) => item.status === "fail").length;
	const missingRows = Math.max(expectedItems.length - actualItems.length, 0);
	const failedFields =
		items.reduce(
			(total, item) =>
				total + item.fields.filter((field) => field.status === "fail").length,
			0,
		) + extraItems.length;

	return {
		status:
			failedRows === 0 && extraItems.length === 0 && missingRows === 0
				? "pass"
				: "fail",
		summary: {
			expectedRows: expectedItems.length,
			actualRows: actualItems.length,
			passedRows: items.length - failedRows,
			failedRows,
			failedFields,
			extraRows: extraItems.length,
			missingRows,
		},
		items,
		extraItems,
	};
}

function formatExtractionComparisonReport(
	report: ExtractionComparisonReport,
): string {
	const lines = [
		"Material invoice image extraction comparison",
		JSON.stringify(report.summary, null, 2),
		"",
	];

	for (const item of report.items) {
		lines.push(
			`Row ${item.index + 1}: ${item.status.toUpperCase()} | expected="${item.expectedName ?? ""}" | actual="${item.actualName ?? ""}"`,
		);

		for (const field of item.fields) {
			const marker = field.status === "pass" ? "PASS" : "FAIL";
			lines.push(
				`  ${marker} ${field.field}: expected=${JSON.stringify(field.expected)} actual=${JSON.stringify(field.actual)}${field.message ? ` | ${field.message}` : ""}`,
			);
		}
	}

	if (report.extraItems.length > 0) {
		lines.push("", "Extra extracted rows:");
		for (const item of report.extraItems) {
			lines.push(`  Row ${item.index + 1}: ${JSON.stringify(item.actual)}`);
		}
	}

	return lines.join("\n");
}

async function runClassifyThenMaybeExtractImageEval(testCase: RealImageEvalCase) {
	const publicUrl = testCase.publicUrl();
	const context = {
		userId: "eval-user",
		orgId: "eval-org",
		siteId: "eval-site",
	};

	console.log(`CLASSIFICATION_CALL_START ${testCase.name}`);
	const classification = await classifyMaterialDocumentImage(publicUrl, context);
	console.log(`CLASSIFICATION_CALL_RESULT ${testCase.name}`, classification);

	expect(classification.isMaterialDocument).toBe(
		testCase.expectedMaterialDocument,
	);

	if (!testCase.expectedMaterialDocument) {
		expect(classification.confidence).toBeLessThan(0.65);
		console.log(`EXTRACTION_CALL_SKIPPED ${testCase.name}`);
		return;
	}

	expect(classification.confidence).toBeGreaterThanOrEqual(0.65);

	console.log(`EXTRACTION_CALL_START ${testCase.name}`);
	const payload = await extractBISMaterialsFromPublicUrl({
		publicUrl,
		context,
	});
	console.log(
		`EXTRACTION_CALL_RESULT ${testCase.name}`,
		JSON.stringify({ itemCount: payload.items.length }),
	);

	const actualItems = payload.items as ExtractedMaterialItem[];

	if (testCase.expectedItems) {
		const report = compareExtractionItems(testCase.expectedItems, actualItems);

		console.log(formatExtractionComparisonReport(report));

		if (report.status === "fail") {
			throw new Error(formatExtractionComparisonReport(report));
		}

		expect(report.status).toBe("pass");
	}

	if (testCase.minExtractedRows != null) {
		expect(actualItems.length).toBeGreaterThanOrEqual(testCase.minExtractedRows);
	}

	if (testCase.expectedInvoiceNr) {
		expect(
			actualItems.some((item) => item.invoiceNr === testCase.expectedInvoiceNr),
		).toBe(true);
	}

	if (testCase.expectedInvoiceDateISO) {
		expect(
			actualItems.some(
				(item) =>
					normalizeDate(item.invoiceDate) === testCase.expectedInvoiceDateISO,
			),
		).toBe(true);
	}
}

const maybeRealAiTest =
	process.env.RUN_AI_EVALS === "true" &&
	process.env.RUN_META_IMAGE_AI_EVAL === "true"
		? describe
		: describe.skip;

maybeRealAiTest("real material invoice image extraction eval", () => {
	jest.setTimeout(120_000);

	afterAll(async () => {
		await awaitAllCallbacks();
	});

	it.each([
		{
			name: "material-invoice.jpg",
			publicUrl: materialInvoiceImageDataUrl,
			expectedMaterialDocument: true,
			expectedItems: expectedFixture.items as ExpectedMaterialItem[],
		},
		{
			name: "material-invoice-latvian-date.jpg",
			publicUrl: latvianDateInvoiceImageDataUrl,
			expectedMaterialDocument: true,
			expectedInvoiceNr: "E02246903",
			expectedInvoiceDateISO: "2026-06-02",
			minExtractedRows: 1,
		},
		{
			name: "progress-report-normal-image.jpg",
			publicUrl: progressReportImageDataUrl,
			expectedMaterialDocument: false,
		},
	] satisfies RealImageEvalCase[])(
		"classifies $name and follows production extraction gating",
		async (testCase) => {
			await runClassifyThenMaybeExtractImageEval(testCase);
		},
	);
});
