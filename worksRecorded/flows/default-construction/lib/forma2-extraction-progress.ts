import type { ParsedForma2Sheet } from "@/flows/default-construction/lib/forma2-analytics";

export type Forma2ExtractionProgress = {
	phase:
		| "reading_workbook"
		| "selecting_worksheets"
		| "worksheets_selected"
		| "analyzing_worksheet"
		| "receiving_ai_result"
		| "worksheet_completed"
		| "finalizing";
	sheetName?: string;
	completedSheets?: number;
	totalSheets?: number;
	totalWorksheets?: number;
};

export type Forma2ExtractionStreamEvent =
	| ({ type: "progress" } & Forma2ExtractionProgress)
	| { type: "complete"; sheets: ParsedForma2Sheet[] }
	| { type: "error"; error: string };
