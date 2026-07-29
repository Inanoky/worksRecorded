import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
	createForma2PositionId,
	extractForma2PositionsFromRows,
	type Forma2Position,
	type ParsedForma2Sheet,
} from "@/flows/default-construction/lib/forma2-analytics";

const FORMA2_EXTRACTION_MODEL =
	process.env.FORMA2_EXTRACTION_MODEL?.trim() || "gpt-5.6-terra";
const FORMA2_EXTRACTION_TIMEOUT_MS = 240_000;
const MAX_WORKSHEETS = 16;
const MAX_WORKSHEET_TEXT_CHARS = 2_500_000;
const SHEET_BATCH_SIZE = 2;

const extractedPositionSchema = z.object({
	sourceRow: z
		.number()
		.int()
		.describe("One-based source row number in the original worksheet."),
	code: z
		.string()
		.describe(
			"Exact position code, such as 1.1 or 18.2. Empty only for a nested resource row.",
		),
	categoryCode: z
		.string()
		.describe("Nearest enclosing section/category code, or an empty string."),
	categoryName: z
		.string()
		.describe("Nearest enclosing section/category name, or an empty string."),
	name: z
		.string()
		.describe("Exact position or nested resource name in the source language."),
	kind: z.enum(["work", "material", "mechanism"]),
	parentCode: z
		.string()
		.nullable()
		.describe(
			"Parent work position code for a nested row; null for coded work positions.",
		),
	unit: z.string().describe("Measurement unit exactly as shown."),
	plannedQuantity: z.number().nullable(),
	laborNormHoursPerUnit: z
		.number()
		.nullable()
		.describe("Laika norma in hours per measurement unit, not total hours."),
	hourlyRate: z
		.number()
		.nullable()
		.describe("Hourly labor rate in EUR per hour."),
	plannedWorkCost: z
		.number()
		.describe("Total contracted labor cost for the full position quantity."),
	plannedMaterialCost: z
		.number()
		.describe("Total contracted material cost for the full position quantity."),
	plannedMechanismCost: z
		.number()
		.describe(
			"Total contracted mechanism/equipment cost for the full quantity.",
		),
	plannedTotalCost: z
		.number()
		.describe("Total contracted cost for the full position quantity."),
});

const forma2SheetExtractionSchema = z.object({
	isForma2DetailSheet: z
		.boolean()
		.describe(
			"True only for a worksheet containing individual Forma 2 or estimate positions.",
		),
	positions: z.array(extractedPositionSchema),
});

type ExtractedPosition = z.infer<typeof extractedPositionSchema>;
type ExtractedWorkbook = {
	sheets: Array<{ sheetName: string; positions: ExtractedPosition[] }>;
};

const EXTRACTION_INSTRUCTIONS = `You extract complete construction Forma 2 contract positions from one spreadsheet worksheet.

The worksheet structure and language may vary. Infer columns from their headings and values instead of relying on fixed column indexes. The user input contains the worksheet as exact, one-based rows and Excel column letters.

Worksheet classification:
- Set isForma2DetailSheet=true for a detailed contract estimate or Forma 2 position table, including sheets labelled "Forma Nr. 2", "Lokālā tāme", estimate/cost breakdown sheets, and similarly named industry equivalents.
- Include all contracted positions even when current-period or cumulative factual amounts are zero. Never filter by whether work was completed in the reporting period.
- Set isForma2DetailSheet=false and return an empty positions array for cover sheets, cross-sheet summaries such as "Kopā" or "Forma 3", signature sheets, and sheets without individual positions.

Extraction rules:
1. Extract EVERY individual coded work position and every readable nested labor, material, or mechanism/resource row belonging to it. Do not return section headers, subtotals, VAT rows, or grand totals as positions.
2. Preserve codes, names, units, and category labels in the original language. Never translate or rename them.
3. A coded work position has its exact code, kind=work, and parentCode=null. Never put punctuation placeholders such as "." or "-" into code or parentCode.
4. A nested resource row has code="" and parentCode equal to the exact code of its coded work parent.
5. plannedQuantity is the contracted quantity. laborNormHoursPerUnit is Laika norma in hours per unit. hourlyRate is the EUR hourly rate.
6. plannedWorkCost, plannedMaterialCost, and plannedMechanismCost are the respective totals for the full contracted quantity, not unit prices. plannedTotalCost is the full total. Follow the actual worksheet headers even when their order differs.
7. Use 0 only when a cost component is absent or clearly zero. Use null for an absent quantity, labor norm, or hourly rate. Never invent a value.
8. Copy the one-based row number shown at the start of each input row into sourceRow.
9. Associate every position with its nearest section/category code and name. Use empty strings when the worksheet has no category.
10. Return no duplicates. Before finishing, compare the output against the input and verify that every readable coded detail row is present.`;

function cleanText(value: unknown, maxLength: number) {
	return String(value ?? "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);
}

function nullableNumber(value: unknown) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function nonNegative(value: unknown) {
	const parsed = nullableNumber(value);
	return parsed != null && parsed >= 0 ? parsed : 0;
}

function cleanCode(value: unknown) {
	const result = cleanText(value, 40);
	return /^(?:[.\-–—]+|\/?null|none|n\/?a)$/i.test(result) ? "" : result;
}

export function normalizeForma2AiExtraction(
	workbook: ExtractedWorkbook,
): ParsedForma2Sheet[] {
	return workbook.sheets
		.map((sheet, sheetIndex) => {
			const warnings: string[] = [];
			const parentIdsByCode = new Map<string, string>();
			const normalizedRows = sheet.positions
				.map((raw, index) => {
					const name = cleanText(raw.name, 500);
					const code = cleanCode(raw.code);
					if (!name) return null;
					const sourceRow = Math.max(
						1,
						Math.trunc(nullableNumber(raw.sourceRow) ?? index + 1),
					);
					const id = createForma2PositionId({
						kind: raw.kind,
						code,
						name,
						sourceRow,
					});
					const plannedWorkCost = nonNegative(raw.plannedWorkCost);
					const plannedMaterialCost = nonNegative(raw.plannedMaterialCost);
					const plannedMechanismCost = nonNegative(raw.plannedMechanismCost);
					const componentTotal =
						plannedWorkCost + plannedMaterialCost + plannedMechanismCost;
					return {
						id,
						code,
						categoryCode: cleanText(raw.categoryCode, 40),
						categoryName: cleanText(raw.categoryName, 300),
						name,
						kind: raw.kind,
						parentCode: cleanCode(raw.parentCode),
						parentId: null,
						sourceRow,
						unit: cleanText(raw.unit, 40),
						plannedQuantity: nullableNumber(raw.plannedQuantity),
						laborNormHoursPerUnit: nullableNumber(raw.laborNormHoursPerUnit),
						hourlyRate: nullableNumber(raw.hourlyRate),
						plannedWorkCost,
						plannedMaterialCost,
						plannedMechanismCost,
						plannedTotalCost:
							nonNegative(raw.plannedTotalCost) || componentTotal,
					};
				})
				.filter((row): row is NonNullable<typeof row> => Boolean(row));

			for (const row of normalizedRows) {
				if (row.code && !row.parentCode) parentIdsByCode.set(row.code, row.id);
			}

			const positions = normalizedRows.map((row) => {
				const parentId = row.parentCode
					? (parentIdsByCode.get(row.parentCode) ?? null)
					: null;
				if (row.parentCode && !parentId) {
					warnings.push(
						`Parent position ${row.parentCode} was not found for ${row.name}.`,
					);
				}
				const { parentCode: _parentCode, ...position } = row;
				return { ...position, parentId } satisfies Forma2Position;
			});

			return {
				sheetName:
					cleanText(sheet.sheetName, 120) || `Forma 2 ${sheetIndex + 1}`,
				positions,
				warnings,
			};
		})
		.filter((sheet) => sheet.positions.length > 0);
}

function serializeWorksheetRows(
	rows: unknown[][],
	encodeColumn: (column: number) => string,
) {
	const lines = rows.flatMap((row, rowIndex) => {
		const cells = row.flatMap((value, columnIndex) => {
			const content = cleanText(value, 2_000);
			return content
				? [`${encodeColumn(columnIndex)}=${JSON.stringify(content)}`]
				: [];
		});
		return cells.length ? [`R${rowIndex + 1}: ${cells.join(" | ")}`] : [];
	});
	return lines.join("\n");
}

async function extractWorksheet(args: {
	openai: OpenAI;
	fileName: string;
	sheetName: string;
	worksheetText: string;
}) {
	const response = await args.openai.responses.parse(
		{
			model: FORMA2_EXTRACTION_MODEL,
			reasoning: { effort: "low" },
			store: false,
			max_output_tokens: 64_000,
			instructions: EXTRACTION_INSTRUCTIONS,
			input: `Workbook: ${args.fileName}\nWorksheet: ${args.sheetName}\n\n${args.worksheetText}`,
			text: {
				format: zodTextFormat(
					forma2SheetExtractionSchema,
					"forma2_sheet_extraction",
				),
			},
		},
		{ timeout: FORMA2_EXTRACTION_TIMEOUT_MS },
	);
	if (!response.output_parsed) {
		throw new Error(
			`The AI extractor returned no structured data for ${args.sheetName}`,
		);
	}
	return response.output_parsed;
}

export function reconcileForma2Extractions(args: {
	sheetNames: string[];
	aiSheets: ParsedForma2Sheet[];
	deterministicSheets: ParsedForma2Sheet[];
}) {
	const aiByName = new Map(
		args.aiSheets.map((sheet) => [sheet.sheetName, sheet]),
	);
	const deterministicByName = new Map(
		args.deterministicSheets.map((sheet) => [sheet.sheetName, sheet]),
	);
	return args.sheetNames.flatMap((sheetName) => {
		const deterministic = deterministicByName.get(sheetName);
		if (deterministic) return [deterministic];
		const ai = aiByName.get(sheetName);
		return ai ? [ai] : [];
	});
}

export async function extractForma2WorkbookWithAi(args: {
	fileName: string;
	buffer: ArrayBuffer;
}) {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	const XLSX = await import("xlsx");
	const workbook = XLSX.read(args.buffer, { type: "array" });
	const worksheets = workbook.SheetNames.map((sheetName) => {
		const rows = XLSX.utils.sheet_to_json<unknown[]>(
			workbook.Sheets[sheetName],
			{
				header: 1,
				defval: null,
				raw: false,
			},
		);
		const worksheetText = serializeWorksheetRows(rows, XLSX.utils.encode_col);
		return { sheetName, rows, worksheetText };
	});
	const deterministicSheets = worksheets
		.map((sheet) => extractForma2PositionsFromRows(sheet.rows, sheet.sheetName))
		.filter((sheet) => sheet.positions.length > 0);
	const worksheetInputs = worksheets
		.flatMap((sheet) => {
			if (!sheet.worksheetText || sheet.rows.length < 5) return [];
			if (sheet.worksheetText.length > MAX_WORKSHEET_TEXT_CHARS) {
				throw new Error(
					`Worksheet ${sheet.sheetName} is too large for AI extraction`,
				);
			}
			return [
				{
					sheetName: sheet.sheetName,
					worksheetText: sheet.worksheetText,
				},
			];
		})
		.slice(0, MAX_WORKSHEETS);

	const extractedSheets: ExtractedWorkbook["sheets"] = [];
	for (
		let index = 0;
		index < worksheetInputs.length;
		index += SHEET_BATCH_SIZE
	) {
		const batch = worksheetInputs.slice(index, index + SHEET_BATCH_SIZE);
		const extracted = await Promise.all(
			batch.map(async (sheet) => ({
				sheetName: sheet.sheetName,
				result: await extractWorksheet({
					openai,
					fileName: args.fileName,
					sheetName: sheet.sheetName,
					worksheetText: sheet.worksheetText,
				}),
			})),
		);
		for (const sheet of extracted) {
			if (sheet.result.isForma2DetailSheet && sheet.result.positions.length) {
				extractedSheets.push({
					sheetName: sheet.sheetName,
					positions: sheet.result.positions,
				});
			}
		}
	}

	const aiSheets = normalizeForma2AiExtraction({ sheets: extractedSheets });
	return reconcileForma2Extractions({
		sheetNames: workbook.SheetNames,
		aiSheets,
		deterministicSheets,
	});
}
