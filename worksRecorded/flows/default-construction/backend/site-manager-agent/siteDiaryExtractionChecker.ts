import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { createDefaultConstructionDiaryUnitResolver } from "../../lib/site-diary-productivity-settings";
import type { ConfigMap } from "./AIschemas";
import { SITE_MANAGER_AI_BUDGET_MS } from "./aiDeadline";
import { composeSiteDiaryCheckerPrompt } from "./diary-prompts/composeCheckerPrompt";
import {
	diaryModelOutputTokenLimit,
	diaryModelReasoningOptions,
	diaryModelUsesResponsesApi,
	siteDiaryExtractionCheckerModel,
	siteDiaryExtractionCheckerReasoningEffort,
} from "./diaryModelSettings";
import type { SupportedReplyLanguage } from "./fastPath";
import {
	assertCompleteModelResponse,
	createModelRequestDiagnostics,
} from "./modelRequestDiagnostics";
import {
	diaryRepairFieldSchema,
	getSiteDiaryWorkAliases,
} from "./siteDiaryRepair";

export {
	siteDiaryExtractionCheckerModel,
	siteDiaryExtractionCheckerReasoningEffort,
};

export type SiteDiaryCheckerModelSettings = {
	model?: string;
	reasoningEffort?: "low" | "medium" | "high";
	useResponsesApi?: boolean;
};

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
				field: z.enum([
					"Amounts",
					"Units",
					"WorkersInvolved",
					"TimeInvolved",
					"Location",
				]),
				operation: z.enum(["set_null"]),
				reason: z.string().max(240),
			}),
		)
		.max(20)
		.default([]),
	modelRepairTargets: z
		.array(
			z.object({
				rowIndex: z.number().int().min(0).max(24),
				fields: z.array(diaryRepairFieldSchema).min(1).max(8),
				allowStructuralChanges: z.boolean(),
			}),
		)
		.max(25)
		.nullable()
		.optional(),
	coverageComplete: z.boolean().nullable().optional(),
	rowReviews: z
		.array(
			z.object({
				rowIndex: z.number().int().min(0).max(24),
				status: z.enum(["accept", "needs_review"]),
				reason: z.string().max(500),
				sourceText: z.string().min(1).max(2000),
				sourceSpans: z
					.array(z.string().min(10).max(2000))
					.min(1)
					.max(5)
					.nullable()
					.optional(),
			}),
		)
		.max(25)
		.nullable()
		.optional(),
});

export type SiteDiaryExtractionCheckerResult = z.infer<
	typeof siteDiaryExtractionCheckerSchema
>;

type SiteDiaryExtractionCheckerRow = Record<string, unknown>;

export type SiteDiaryCheckerRepairContext = {
	previousRows: SiteDiaryExtractionCheckerRow[];
	previousReview: SiteDiaryExtractionCheckerResult;
};

export function buildSiteDiaryWorkCatalog(config: ConfigMap) {
	const unitForWork = createDefaultConstructionDiaryUnitResolver(config);
	const aliases = getSiteDiaryWorkAliases(config);
	return Array.from(new Set(Object.values(config.Works?.DropDownOptions ?? {})))
		.map((work) => {
			const speechAliases = aliases
				.filter((entry) => entry.work === work)
				.map((entry) => entry.alias);
			return JSON.stringify({
				work,
				unit: unitForWork(work) ?? null,
				...(speechAliases.length ? { speechAliases } : {}),
			});
		})
		.join("\n");
}

export function serializeRowsForSiteDiaryChecker(
	rows: SiteDiaryExtractionCheckerRow[],
) {
	return rows
		.map((row, index) => {
			const fields = [
				["Date", row.Date],
				["Works", row.Works],
				["Location", row.Location],
				["Comments", row.Comments],
				["Amounts", row.Amounts],
				["Units", row.Units],
				["WorkersInvolved", row.WorkersInvolved],
				["TimeInvolved", row.TimeInvolved],
			].map(
				([key, value]) =>
					`${key}: ${value == null || value === "" ? "null" : String(value)}`,
			);

			return `Record ${index + 1}: ${fields.length ? fields.join("; ") : "(empty)"}`;
		})
		.join("\n");
}

export type SiteDiaryCheckerMessageArgs = {
	originalMessage: string;
	rows: SiteDiaryExtractionCheckerRow[];
	language: SupportedReplyLanguage;
	contextText?: string;
	workCatalog?: string;
	projectConfig?: ConfigMap;
	workCatalogScope?: "complete" | "repair";
	repairContext?: SiteDiaryCheckerRepairContext;
	referenceDate?: string;
};

function buildCheckerInput(args: SiteDiaryCheckerMessageArgs) {
	const composition = composeSiteDiaryCheckerPrompt({
		language: args.language,
		projectConfig: args.projectConfig,
		rows: args.rows,
		repair: Boolean(args.repairContext),
	});
	return {
		promptComposition: composition.manifest,
		messages: [
			new SystemMessage(composition.systemText),
			new HumanMessage(
				`Original WhatsApp message:
${args.originalMessage}

Trusted reference date: ${args.referenceDate ?? "not provided"}

${args.workCatalogScope === "repair" ? "Relevant configured work catalog for repair" : "Complete configured work catalog"} (category vocabulary and units, not evidence of completed work):
${args.workCatalog?.trim() || "(not provided)"}

Trusted extraction context:
${args.contextText?.trim() || "(none provided)"}

Proposed rows:
${serializeRowsForSiteDiaryChecker(args.rows)}${args.repairContext ? `\n\nPrevious rows before repair:\n${serializeRowsForSiteDiaryChecker(args.repairContext.previousRows)}\n\nPrevious checker review (audit context, not new source facts):\n${JSON.stringify(args.repairContext.previousReview)}` : ""}`,
			),
		],
	};
}

export function buildSiteDiaryExtractionCheckerMessages(
	args: SiteDiaryCheckerMessageArgs,
) {
	return buildCheckerInput(args).messages;
}

export async function invokeSiteDiaryExtractionChecker(
	args: SiteDiaryCheckerMessageArgs & {
		runnableConfig?: RunnableConfig;
		evaluationModel?: SiteDiaryCheckerModelSettings;
	},
) {
	const model = args.evaluationModel?.model ?? siteDiaryExtractionCheckerModel;
	const useResponsesApi =
		args.evaluationModel?.useResponsesApi ?? diaryModelUsesResponsesApi(model);
	const diagnostics = createModelRequestDiagnostics({
		model,
		purpose: args.repairContext
			? "site_diary_extraction_repair_checker"
			: "site_diary_extraction_checker",
	});
	const llm = new ChatOpenAI({
		model,
		timeout: SITE_MANAGER_AI_BUDGET_MS,
		maxRetries: 0,
		maxTokens: diaryModelOutputTokenLimit(args.originalMessage),
		configuration: diagnostics.configuration,
		...diaryModelReasoningOptions(
			args.evaluationModel?.reasoningEffort ??
				siteDiaryExtractionCheckerReasoningEffort,
			useResponsesApi,
		),
		useResponsesApi,
	});
	const structured = llm.withStructuredOutput(
		siteDiaryExtractionCheckerSchema,
		{ includeRaw: true },
	);
	const input = buildCheckerInput(args);
	const runnableConfig = {
		...args.runnableConfig,
		metadata: {
			...args.runnableConfig?.metadata,
			diaryCheckerPrompt: input.promptComposition,
		},
	};
	const result = await diagnostics.run(async (config) => {
		const envelope = await structured.invoke(input.messages, config);
		assertCompleteModelResponse(envelope?.raw);
		return {
			parsed: siteDiaryExtractionCheckerSchema.parse(
				envelope?.parsed ?? envelope,
			),
			raw: envelope?.raw ?? null,
		};
	}, runnableConfig);
	return {
		...result,
		promptComposition: input.promptComposition,
		diagnostics: diagnostics.snapshot(),
	};
}
