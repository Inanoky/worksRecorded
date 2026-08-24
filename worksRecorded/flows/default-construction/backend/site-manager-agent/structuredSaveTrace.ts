import { AsyncLocalStorage } from "node:async_hooks";

export type StructuredSaveTraceEntry = {
	siteId: string;
	userId: string;
	date: string;
	originalUserComment: string;
	rawRecords: unknown[];
	mappedRows: Record<string, unknown>[];
	normalizedInsertRows?: Record<string, unknown>[];
	persistedRecords?: Record<string, unknown>[];
	checker?: {
		verdict: "accept" | "retry";
		reason: string;
		repairInstructions: string;
		expectedRecordCount?: number | null;
		appliedRepair: boolean;
		repairVerdict?: "accept" | "retry" | null;
		repairReason?: string | null;
	};
};

type StructuredSaveTraceContext = {
	entries: StructuredSaveTraceEntry[];
};

const structuredSaveTraceStorage =
	new AsyncLocalStorage<StructuredSaveTraceContext>();

export async function runWithStructuredSaveTrace<T>(fn: () => Promise<T>) {
	const context: StructuredSaveTraceContext = { entries: [] };
	const result = await structuredSaveTraceStorage.run(context, fn);

	return {
		result,
		entries: context.entries,
	};
}

export function recordStructuredSaveTrace(entry: StructuredSaveTraceEntry) {
	const context = structuredSaveTraceStorage.getStore();
	if (!context) return;

	context.entries.push(entry);
}

export function hasStructuredSaveTraceContext() {
	return Boolean(structuredSaveTraceStorage.getStore());
}
