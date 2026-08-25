import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { SupportedReplyLanguage } from "./fastPath";

export const siteDiaryExtractionCheckerModel = "gpt-5.6-terra";
export const siteDiaryExtractionCheckerReasoningEffort = "medium" as const;

export const siteDiaryExtractionCheckerSchema = z.object({
	verdict: z.enum([
		"accept",
		"repairable",
		"needs_model_repair",
		"retry",
		"unsafe",
	]),
	reason: z.string().max(500),
	badSplitSignals: z.array(z.string().max(160)).max(8),
	repairInstructions: z.string().max(1000),
	expectedRecordCount: z.number().int().min(1).max(25).nullable().optional(),
	repairActions: z
		.array(
			z.object({
				rowIndex: z.number().int().min(0).max(24),
				field: z.enum(["Amounts", "Units", "WorkersInvolved", "TimeInvolved"]),
				operation: z.enum(["set_null"]),
				reason: z.string().max(240),
			}),
		)
		.max(20)
		.default([]),
});

export type SiteDiaryExtractionCheckerResult = z.infer<
	typeof siteDiaryExtractionCheckerSchema
>;

type SiteDiaryExtractionCheckerRow = Record<string, unknown>;

function hasValue(value: unknown) {
	return value !== null && value !== undefined && value !== "";
}

function compact(value: unknown, maxLength = 500) {
	const text = String(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function serializeRowsForSiteDiaryChecker(
	rows: SiteDiaryExtractionCheckerRow[],
) {
	return rows
		.map((row, index) => {
			const fields = [
				["Works", row.Works],
				["Location", row.Location],
				["Comments", row.Comments],
				["Amounts", row.Amounts],
				["Units", row.Units],
				["WorkersInvolved", row.WorkersInvolved],
				["TimeInvolved", row.TimeInvolved],
			]
				.filter(([, value]) => hasValue(value))
				.map(([key, value]) => `${key}: ${compact(value, 180)}`);

			return `Record ${index + 1}: ${fields.length ? fields.join("; ") : "(empty)"}`;
		})
		.join("\n");
}

export function buildSiteDiaryExtractionCheckerMessages(args: {
	originalMessage: string;
	rows: SiteDiaryExtractionCheckerRow[];
	language: SupportedReplyLanguage;
	contextText?: string;
}) {
	return [
		new SystemMessage(
			`You are a strict construction site diary extraction checker.
Judge whether the proposed rows represent real separate diary events/jobs from the original WhatsApp message.
The original message may explicitly refer to trusted reference items from the extraction context, for example same work, same place, yesterday, previous report, or continue. In that case, Works and Location may be supported by those reference items.
If trusted extraction context says CurrentMessageHasExplicitContextReference=true and contains matching recent reference items, do not mark a row unsafe merely because Works or Location came from that context.
Numeric fields still need current-message support unless the current message explicitly references that number. A phrase like "vēl 3h" supports TimeInvolved=3 for the new row, but does not support copying previous WorkersInvolved.
Return verdict=accept when the row count and split are safe enough to save automatically.
Return verdict=repairable when the row count and split are safe, but a small field-level issue can be fixed by setting nullable fields to null. Include repairActions for every field to null.
Return verdict=needs_model_repair when one real job was split into artificial rows, when machinery/tools/operators/sub-actions were turned into separate jobs, when shared workers/hours/quantity were split without source evidence, or when the original message clearly contains multiple distinct source-backed diary events/jobs but the proposed output merged them into one broad row.
Return verdict=unsafe when the proposed rows are too ambiguous or unsupported to save automatically and a deterministic field repair or one model repair would be unsafe.
Use verdict=retry only as a legacy alias for needs_model_repair when needed.
Return verdict=accept for one-row summaries when the source gives one shared duration, quantity, worker count, or general report that cannot be safely split into separate supported rows.
Shared duration or worker count does not justify merging material delivery with actual installed/placed work when the source gives separate action+quantity evidence for each, such as "ievesta smilts 160m3" and "iestrādāti 140m3". If a proposed row merges those into one broad row, return verdict=needs_model_repair with expectedRecordCount=2 and instruct the extractor to create one Material delivery row for the delivered quantity and one work row for the installed/placed quantity.
When material delivery and installed/placed work are already split, reject unsupported delivery WorkersInvolved or TimeInvolved copied from shared work labor/hours. Delivery rows should keep WorkersInvolved and TimeInvolved null unless the source explicitly ties labor/time to delivery, unloading, or transport. If only the delivery fields are wrong, keep expectedRecordCount unchanged, return verdict=repairable, and include set_null repairActions for those delivery fields while preserving the work row labor/hours.
repairActions are only for safe nulling: rowIndex is zero-based and field must be Amounts, Units, WorkersInvolved, or TimeInvolved. Do not use repairActions to rewrite text, change row categories, invent values, split rows, merge rows, or drop rows.
Do not reject merely because there are many rows. Full-day reports can legitimately create many rows when each row has distinct source evidence.
A row can be a site-diary-relevant note, weather entry, material delivery, machinery note, or work item when it is a real diary event.
Do not judge enum/category wording harshly unless it caused a wrong split.
If model repair is needed, write concrete repairInstructions for the extractor. The instruction must say which rows should be split into specific separate jobs, merged, dropped, or preserved, and why.
Use language=${args.language} for reason and repairInstructions when practical.`,
		),
		new HumanMessage(
			`Original WhatsApp message:
${args.originalMessage}

Trusted extraction context:
${args.contextText?.trim() || "(none provided)"}

Proposed rows:
${serializeRowsForSiteDiaryChecker(args.rows)}`,
		),
	];
}

export async function invokeSiteDiaryExtractionChecker(args: {
	originalMessage: string;
	rows: SiteDiaryExtractionCheckerRow[];
	language: SupportedReplyLanguage;
	contextText?: string;
	runnableConfig?: Record<string, unknown>;
}) {
	const llm = new ChatOpenAI({
		model: siteDiaryExtractionCheckerModel,
		reasoning: { effort: siteDiaryExtractionCheckerReasoningEffort },
	});
	const structured = llm.withStructuredOutput(
		siteDiaryExtractionCheckerSchema,
		{ includeRaw: true },
	) as any;
	const envelope = await structured.invoke(
		buildSiteDiaryExtractionCheckerMessages(args),
		args.runnableConfig,
	);
	return {
		parsed: (envelope?.parsed ?? envelope) as SiteDiaryExtractionCheckerResult,
		raw: envelope?.raw ?? null,
	};
}
