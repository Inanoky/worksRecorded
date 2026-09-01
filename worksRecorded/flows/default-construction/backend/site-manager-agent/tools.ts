import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
	patchConfig,
	type RunnableConfig,
	RunnableLambda,
} from "@langchain/core/runnables";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import {
	archiveAndReplaceSiteDiaryBatch,
	getConfig,
	getSiteDiaryCorrectionTarget,
	saveSiteDiaryRecord,
	startSiteDiaryCorrection,
} from "@/server/actions/site-diary-actions";
import {
	getBisConnectionStatus,
	readBisMaterialRecords,
	readSiteDiaryBisStatuses,
} from "@/server/ai-flows/agents/bis-support-agent/tools";
import type { GraphState } from "@/server/ai-flows/agents/shared-between-agents/state";
import {
	getSiteManagerToolContext,
	type SiteDiaryConfirmationRecord,
	setSiteManagerSavedConfirmationRecords,
} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";
import { formatSiteDiarySaveToolResult } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolResult";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
	buildAiRunContext,
	summarizeForTrace,
} from "@/server/ai-flows/ai-run-context";
import { buildZodSchemaFromConfig, mapToDbFields } from "./AIschemas";
import {
	detectReplyLanguage,
	type SiteDiaryCorrectionResult,
	type SupportedReplyLanguage,
	serializeCorrectionToolResult,
} from "./fastPath";
import { systemPromptSaveToDatabaseFunction } from "./prompts";
import {
	buildSiteManagerWorkflowTraceContext,
	type FastPathTraceMetadata,
	fastPathTraceConfig,
	formatSiteManagerWorkflowRunName,
	getSiteManagerAgentRunContext,
	getSiteManagerSenderTraceMetadata,
	getSiteManagerSenderTraceTags,
	recordSiteManagerModelCall,
	recordSiteManagerTiming,
	recordSiteManagerToolCall,
} from "./runContext";
import {
	invokeSiteDiaryExtractionChecker,
	type SiteDiaryExtractionCheckerResult,
	siteDiaryExtractionCheckerModel,
} from "./siteDiaryExtractionChecker";
import { buildSiteDiaryExtractionContext } from "./siteDiaryExtractionContext";
import { recordStructuredSaveTrace } from "./structuredSaveTrace";

function currentDiaryDate() {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Europe/Riga",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).formatToParts(new Date());
	const values = Object.fromEntries(
		parts.map(({ type, value }) => [type, value]),
	);
	return `${values.day}-${values.month}-${values.year}`;
}

function formatDiaryDateForPrompt(value: Date | string | null | undefined) {
	if (!value) return currentDiaryDate();
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return currentDiaryDate();
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Europe/Riga",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).formatToParts(date);
	const values = Object.fromEntries(
		parts.map(({ type, value }) => [type, value]),
	);
	return `${values.day}-${values.month}-${values.year}`;
}

function addTraceTags(config: RunnableConfig | undefined, tags: string[]) {
	if (!config || !tags.length) return;
	config.tags = [...new Set([...(config.tags ?? []), ...tags])];
}

function assignTraceMetadata(
	config: RunnableConfig | undefined,
	metadata: Record<string, string | number | boolean | null | undefined>,
) {
	if (!config) return;
	config.metadata = {
		...(config.metadata ?? {}),
		...Object.fromEntries(
			Object.entries(metadata).filter(([, value]) => value !== undefined),
		),
	};
}

export const allowedUnits = [
	"m",
	"m2",
	"m3",
	"tn",
	"kg",
	"pcs",
	"package",
	"project",
	"hour",
	"set",
	"minute",
	"lifts",
] as const;

const structuredSiteDiaryModel = "gpt-5.6-sol";
const structuredSiteDiaryReasoningEffort = "medium" as const;

type StructuredSaveResult = {
	action:
		| "save_new_report"
		| "correct_existing_report"
		| "fallback"
		| "clarify";
	correctionMode: "not_applicable" | "intent_only" | "supplied";
	language: SupportedReplyLanguage;
	content: string;
	ok: boolean;
	count: number;
	records?: SiteDiaryConfirmationRecord[];
	rows?: Record<string, any>[];
	rawRecords?: Record<string, any>[];
	intentReason?: string;
	intentConfidence?: number;
};

function usageFromMessage(message: any) {
	const usage =
		message?.usage_metadata ?? message?.response_metadata?.tokenUsage ?? {};
	const inputTokens = Number(usage.input_tokens ?? usage.promptTokens ?? 0);
	const outputTokens = Number(
		usage.output_tokens ?? usage.completionTokens ?? 0,
	);
	return {
		inputTokens,
		outputTokens,
		totalTokens: Number(
			usage.total_tokens ?? usage.totalTokens ?? inputTokens + outputTokens,
		),
	};
}

const timeUnitPattern = String.raw`(?:h|hr|hrs|st\.?|stunda|stundas|stundu|hour|hours|minute|minutes|minūte|minūtes|minūšu|min\.?)`;
const amountUnitPattern = String.raw`(?:m2|m3|m²|m³|kubi|kubs|kubu|kubus|kubik\p{L}*|kvadr\u0101tus|kvadr\u0101tmetru|m|kg|tn|t|pcs|gab\.?|gabali|gabals|package|packages|set|sets|komplekts|komplekti|pacelšana|pacelšanas|lifts)`;
const workerUnitPattern = `(?:cilvēks|cilvēki|strādnieks|strādnieki|darbinieks|darbinieki|workers?|people|persons?)`;
const timeOnlyUnits = new Set([
	"hour",
	"hours",
	"h",
	"hr",
	"hrs",
	"st",
	"st.",
	"stunda",
	"stundas",
	"minute",
	"minutes",
	"min",
	"min.",
	"minūte",
	"minūtes",
]);

function numberEvidencePattern(value: number) {
	const normalized = String(Math.abs(value));
	const [integer, decimals] = normalized.split(".");
	if (!decimals) return `${integer}(?:[,.]0+)?`;
	return `${integer}[,.]${decimals}`;
}

function hasNumberWithUnit(source: string, value: number, unitPattern: string) {
	if (!Number.isFinite(value)) return false;
	const numberPattern = numberEvidencePattern(value);
	return new RegExp(
		String.raw`(?:^|[^\d])${numberPattern}\s*${unitPattern}(?=$|[^\p{L}\p{N}_])`,
		"iu",
	).test(source);
}

function roundHours(value: number) {
	return Math.round(value * 10000) / 10000;
}

function clockTimeToDecimalHours(hours: string, minutes: string) {
	return roundHours(Number(hours) + Number(minutes) / 60);
}

function clockTimeToDotNumber(hours: string, minutes: string) {
	return Number(`${Number(hours)}.${minutes.padStart(2, "0")}`);
}

function matchesParsedDuration(value: number, hours: string, minutes: string) {
	return (
		clockTimeToDecimalHours(hours, minutes) === value ||
		clockTimeToDotNumber(hours, minutes) === value
	);
}

function parseTimeInvolvedFromSource(source: string, value: number) {
	if (!Number.isFinite(value)) return null;

	const clockMatch = source.match(
		/(?:^|[^\d])(\d{1,2})\s*:\s*([0-5]\d)(?=$|[^\p{L}\p{N}_])/iu,
	);
	if (
		clockMatch &&
		matchesParsedDuration(value, clockMatch[1], clockMatch[2])
	) {
		return clockTimeToDecimalHours(clockMatch[1], clockMatch[2]);
	}

	const compactHourMinuteMatch = source.match(
		/(?:^|[^\d])(\d{1,2})\s*h\s*([0-5]\d)(?=$|[^\p{L}\p{N}_])/iu,
	);
	if (
		compactHourMinuteMatch &&
		matchesParsedDuration(
			value,
			compactHourMinuteMatch[1],
			compactHourMinuteMatch[2],
		)
	) {
		return clockTimeToDecimalHours(
			compactHourMinuteMatch[1],
			compactHourMinuteMatch[2],
		);
	}

	const wordHourMinuteMatch = source.match(
		/(?:^|[^\d])(\d{1,2})\s*(?:h|st\.?|stunda|stundas|stundu|hour|hours)\s+([0-5]?\d)\s*(?:min|mins|min\.?|minūte|minūtes|minūšu|minutes?)(?=$|[^\p{L}\p{N}_])/iu,
	);
	if (
		wordHourMinuteMatch &&
		matchesParsedDuration(value, wordHourMinuteMatch[1], wordHourMinuteMatch[2])
	) {
		return clockTimeToDecimalHours(
			wordHourMinuteMatch[1],
			wordHourMinuteMatch[2],
		);
	}

	const dotClockMatch = source.match(
		/(?:^|[^\d])(\d{1,2})\.([0-5]\d)\s*(?:h|st\.?|stunda|stundas|stundu|hour|hours)(?=$|[^\p{L}\p{N}_])/iu,
	);
	if (
		dotClockMatch &&
		matchesParsedDuration(value, dotClockMatch[1], dotClockMatch[2])
	) {
		return clockTimeToDecimalHours(dotClockMatch[1], dotClockMatch[2]);
	}

	if (hasNumberWithUnit(source, value, timeUnitPattern)) return value;
	return null;
}

function hasWorkerEvidence(source: string, value: number) {
	if (!Number.isFinite(value)) return false;
	const numberPattern = numberEvidencePattern(value);
	return new RegExp(
		String.raw`(?:^|[^\d])(?:${numberPattern}\s*${workerUnitPattern}|${workerUnitPattern}\s*[:=-]?\s*${numberPattern})(?=$|[^\p{L}\p{N}_])`,
		"iu",
	).test(source);
}

function inferWorkerCountFromRoleEvidence(row: Record<string, any>) {
	const text = [row.Works, row.Works_Custom_1, row.Comments, row.Comments_Custom_1]
		.map((value) => String(value ?? ""))
		.join(" ")
		.toLocaleLowerCase("lv-LV");
	const signals = new Set<string>();
	let count = 0;

	const numberedWorkerMatch = text.match(
		/(?:^|[^\p{L}\p{N}_])(\d{1,2})\s*(?:būv)?strādniek\p{L}*(?=$|[^\p{L}\p{N}_])/iu,
	);
	if (numberedWorkerMatch) {
		count += Number(numberedWorkerMatch[1]);
		signals.add("numbered-workers");
	}

	const rolePatterns: Array<[string, RegExp]> = [
		["operator", /(?:^|[^\p{L}\p{N}_])oper[āa]tor\p{L}*(?=$|[^\p{L}\p{N}_])/iu],
		[
			"helper",
			/(?:^|[^\p{L}\p{N}_])pal[īi]gstr[āa]dniek\p{L}*(?=$|[^\p{L}\p{N}_])/iu,
		],
		[
			"brigadier",
			/(?:^|[^\p{L}\p{N}_])brigadier\p{L}*(?=$|[^\p{L}\p{N}_])/iu,
		],
		[
			"site-manager-assistant",
			/(?:^|[^\p{L}\p{N}_])būvdarbu\s+vad\.?\s+pal[īi]g\p{L}*(?=$|[^\p{L}\p{N}_])/iu,
		],
	];
	if (!numberedWorkerMatch) {
		rolePatterns.push([
			"construction-worker",
			/(?:^|[^\p{L}\p{N}_])būvstr[āa]dniek\p{L}*(?=$|[^\p{L}\p{N}_])/iu,
		]);
	}

	for (const [signal, pattern] of rolePatterns) {
		if (pattern.test(text)) signals.add(signal);
	}
	count += signals.size - (signals.has("numbered-workers") ? 1 : 0);

	return count >= 2 ? count : null;
}

function normalizeUnit(value: unknown) {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasSupportedAmountEvidence(row: Record<string, any>, source: string) {
	if (typeof row.Amounts !== "number") return true;
	const unit = normalizeUnit(row.Units);
	if (!unit || timeOnlyUnits.has(unit)) return false;
	return hasNumberWithUnit(source, row.Amounts, amountUnitPattern);
}

function normalizeUnknownNumericFields(
	row: Record<string, any>,
	source: string,
) {
	const normalized = { ...row };
	if (typeof normalized.TimeInvolved === "number") {
		const parsedTime = parseTimeInvolvedFromSource(
			source,
			normalized.TimeInvolved,
		);
		if (parsedTime !== null) {
			normalized.TimeInvolved = parsedTime;
		} else if (normalized.TimeInvolved === 0 || normalized.TimeInvolved === 1) {
			normalized.TimeInvolved = null;
		}
	}
	if (
		typeof normalized.WorkersInvolved === "number" &&
		(normalized.WorkersInvolved === 0 || normalized.WorkersInvolved === 1) &&
		!hasWorkerEvidence(source, normalized.WorkersInvolved)
	) {
		normalized.WorkersInvolved = null;
	}
	if (
		(normalized.WorkersInvolved === null ||
			normalized.WorkersInvolved === undefined) &&
		!isMaterialDeliveryRow(normalized)
	) {
		const inferredWorkers = inferWorkerCountFromRoleEvidence(normalized);
		if (inferredWorkers !== null) {
			normalized.WorkersInvolved = inferredWorkers;
		}
	}
	const hasExplicitZeroAmount = hasNumberWithUnit(source, 0, amountUnitPattern);
	if (normalized.Amounts === 0 && !hasExplicitZeroAmount)
		normalized.Amounts = null;
	if (
		typeof normalized.Amounts === "number" &&
		normalized.Amounts !== 0 &&
		!hasSupportedAmountEvidence(normalized, source)
	) {
		if (
			typeof normalized.TimeInvolved !== "number" &&
			hasNumberWithUnit(source, normalized.Amounts, timeUnitPattern)
		) {
			normalized.TimeInvolved =
				parseTimeInvolvedFromSource(source, normalized.Amounts) ??
				normalized.Amounts;
		}
		normalized.Amounts = null;
		normalized.Units = null;
	}
	return normalized;
}

function normalizeRepairText(value: string) {
	return value.toLocaleLowerCase("lv-LV");
}

function hasAnyRepairSignal(text: string, signals: string[]) {
	return signals.some((signal) => text.includes(signal));
}

function isMaterialDeliveryRow(row: Record<string, any>) {
	const works = normalizeRepairText(String(row.Works ?? ""));
	return (
		works.includes("material delivery") || works.includes("materiālu piegāde")
	);
}

const safeCheckerNullRepairFields = new Set([
	"Amounts",
	"Units",
	"WorkersInvolved",
	"TimeInvolved",
]);

function applyStructuredCheckerFieldRepair(args: {
	rows: Record<string, any>[];
	checker: SiteDiaryExtractionCheckerResult;
}) {
	const { rows, checker } = args;
	const repairActions = checker.repairActions ?? [];
	if (!repairActions.length) return null;
	if (
		checker.expectedRecordCount !== null &&
		checker.expectedRecordCount !== undefined &&
		checker.expectedRecordCount !== rows.length
	) {
		return null;
	}

	let changed = false;
	const repairedRows = rows.map((row) => ({ ...row }));
	for (const action of repairActions) {
		if (action.operation !== "set_null") return null;
		if (!safeCheckerNullRepairFields.has(action.field)) return null;
		if (action.rowIndex < 0 || action.rowIndex >= repairedRows.length)
			return null;
		const row = repairedRows[action.rowIndex];
		if (row[action.field] !== null) {
			row[action.field] = null;
			changed = true;
		}
	}

	if (!changed) return null;
	return {
		rows: repairedRows,
		reason: `Applied ${repairActions.length} structured checker field repair action(s).`,
	};
}

function applySimpleCheckerFieldRepair(args: {
	rows: Record<string, any>[];
	checker: SiteDiaryExtractionCheckerResult;
}) {
	const { rows, checker } = args;
	if (checker.verdict === "accept" || checker.verdict === "unsafe") return null;
	const structuredRepair = applyStructuredCheckerFieldRepair(args);
	if (structuredRepair) return structuredRepair;
	if (checker.expectedRecordCount !== rows.length) return null;

	const text = normalizeRepairText(
		[
			checker.reason,
			checker.repairInstructions,
			...(checker.badSplitSignals ?? []),
		].join(" "),
	);
	const mentionsDelivery = hasAnyRepairSignal(text, [
		"material delivery",
		"materiālu pieg",
		"materiāla pieg",
		"piegādes rind",
		"delivery row",
	]);
	const mentionsUnsupported = hasAnyRepairSignal(text, [
		"unsupported",
		"nepamat",
		"nesaista",
		"nav tieši",
		"copied",
		"atvasin",
		"remove",
		"noņem",
		"null",
	]);
	if (!mentionsDelivery || !mentionsUnsupported) return null;

	const mentionsLabor = hasAnyRepairSignal(text, [
		"labor",
		"darba sastāv",
		"darbiniek",
		"workersinvolved",
		"timeinvolved",
	]);
	const clearWorkers =
		mentionsLabor ||
		hasAnyRepairSignal(text, ["workers", "darbiniek", "cilvēk", "strādniek"]);
	const clearTime =
		mentionsLabor ||
		hasAnyRepairSignal(text, ["time", "hours", "stund", "laik"]);
	if (!clearWorkers && !clearTime) return null;

	let changed = false;
	const repairedRows = rows.map((row) => {
		if (!isMaterialDeliveryRow(row)) return row;
		const repaired = { ...row };
		if (clearWorkers && repaired.WorkersInvolved !== null) {
			repaired.WorkersInvolved = null;
			changed = true;
		}
		if (clearTime && repaired.TimeInvolved !== null) {
			repaired.TimeInvolved = null;
			changed = true;
		}
		return repaired;
	});

	if (!changed) return null;
	return {
		rows: repairedRows,
		reason:
			"Applied deterministic checker field repair: cleared unsupported delivery workers/time.",
	};
}

function isCheckerRejectionVerdict(
	verdict: SiteDiaryExtractionCheckerResult["verdict"] | undefined,
) {
	return (
		verdict === "repairable" ||
		verdict === "needs_model_repair" ||
		verdict === "retry" ||
		verdict === "unsafe"
	);
}

function toConfirmationRecords(
	records: unknown,
): SiteDiaryConfirmationRecord[] {
	if (!Array.isArray(records)) return [];
	return records.map((value) => {
		const record =
			value && typeof value === "object"
				? (value as Record<string, unknown>)
				: {};
		return {
			Date:
				record.Date instanceof Date || typeof record.Date === "string"
					? record.Date
					: null,
			Location: typeof record.Location === "string" ? record.Location : null,
			Works: typeof record.Works === "string" ? record.Works : null,
			Comments: typeof record.Comments === "string" ? record.Comments : null,
			Units: typeof record.Units === "string" ? record.Units : null,
			Amounts: typeof record.Amounts === "number" ? record.Amounts : null,
			WorkersInvolved:
				typeof record.WorkersInvolved === "number"
					? record.WorkersInvolved
					: null,
			TimeInvolved:
				typeof record.TimeInvolved === "number" ? record.TimeInvolved : null,
		};
	});
}

function buildStructuredExtractionMessages(args: {
	question: string;
	date: string;
	siteId: string;
	systemPrompt: string;
	extractionContextText: string;
	allowFallback?: boolean;
	repairInstructions?: string;
	intentContext?: { hasReplyContext: boolean; hasPendingCorrection: boolean };
}) {
	const fallbackInstructions = args.allowFallback
		? `\nClassify the complete message, never isolated keywords. Set action=save_new_report only for a new site diary report. Set action=correct_existing_report when the user is asking to change a previous report. Set action=clarify when save-versus-correction intent is genuinely ambiguous. Set action=fallback for questions, greetings, BIS requests, project commands, or other conversation. Return no records unless action=save_new_report. Set correctionMode=not_applicable unless action=correct_existing_report. For correction intent, set correctionMode=intent_only when the user only asks to correct/change the earlier record but does not provide the new facts; set correctionMode=supplied when the message contains the requested change or trusted pending-correction state makes this message the supplied change. Latvian completed-work statements such as "Šodien salabojām durvis" are new reports, while imperatives referring to an earlier record such as "Salabo iepriekšējo ierakstu" are corrections. Trusted state: replyContext=${Boolean(args.intentContext?.hasReplyContext)}, pendingCorrection=${Boolean(args.intentContext?.hasPendingCorrection)}. Reply context and a pending correction are strong evidence, but still interpret the full message.`
		: "";
	const repairInstructions = args.repairInstructions
		? `\nChecker repair is mandatory. The previous extraction was rejected by a checker. Rerun extraction once using these repair instructions. Keep only records supported by the original report. Do not create separate records for machinery, tools, operators, or sub-actions when they describe one real job. Apply field-level repair instructions exactly: if instructed to remove or noņemt a field value, set that field to null or omit it from the repaired row.\nRepair instructions: ${args.repairInstructions}`
		: "";

	return [
		new SystemMessage(
			`${args.systemPrompt}\ntoday is : ${args.date}\n${args.siteId}${fallbackInstructions}${repairInstructions}`,
		),
		new SystemMessage(args.extractionContextText),
		new HumanMessage(`${args.question} Date is : ${args.date}`),
	];
}

type ExtractAndSaveSiteDiaryArgs = {
	question: string;
	requestedDate?: string;
	allowFallback?: boolean;
	persist?: boolean;
	runExtractionChecker?: boolean;
	repairInstructions?: string;
	fastPathTrace?: FastPathTraceMetadata;
	intentContext?: { hasReplyContext: boolean; hasPendingCorrection: boolean };
	runnableConfig?: RunnableConfig;
};

async function extractAndSaveSiteDiaryCore(
	args: ExtractAndSaveSiteDiaryArgs,
): Promise<StructuredSaveResult> {
	const toolStarted = Date.now();
	const toolContext = getSiteManagerToolContext();
	if (!toolContext) {
		return {
			action: "save_new_report",
			correctionMode: "not_applicable",
			language: detectReplyLanguage(args.question),
			content:
				"Failed to save site diary entry. Reason: Trusted site diary context is unavailable",
			ok: false,
			count: 0,
		};
	}

	const { userId, siteId, originalUserComment } = toolContext;
	setSiteManagerSavedConfirmationRecords([]);
	const date = args.requestedDate ?? currentDiaryDate();
	const whatsappSourceContext = getWhatsappSourceContext();
	const runContext = getSiteManagerAgentRunContext();
	const runMetrics = runContext?.metrics;
	const senderTraceMetadata = getSiteManagerSenderTraceMetadata(runContext);
	const senderTraceTags = getSiteManagerSenderTraceTags(runContext);
	const workflowTrace = buildSiteManagerWorkflowTraceContext({
		workflowId: runContext?.workflowId,
		messageType: runContext?.messageType ?? whatsappSourceContext.messageType,
		mediaPurpose:
			runContext?.mediaPurpose ?? whatsappSourceContext.mediaPurpose,
	});
	const runName = formatSiteManagerWorkflowRunName({
		prefix: "Structured Save",
		workflowRunLabel:
			runContext?.workflowRunLabel ?? workflowTrace.workflowRunLabel,
		senderLabel: runContext?.senderLabel,
		fallback: "SiteDiaryStructuredSave",
	});
	const structuredTrace = fastPathTraceConfig(
		args.fastPathTrace ??
			runContext?.fastPathTrace ?? {
				fastPathMode: runMetrics?.fastPathMode ?? "off",
				fastPathCandidate: false,
				executionPath: "legacy-agent",
				fastPathAttempted: false,
				fastPathOutcome: "skipped",
				fallbackReason: "ineligible",
			},
	);
	const aiContext = buildAiRunContext({
		flow: "structured-site-diary-save",
		runName,
		threadId: `structured-site-diary-save:${siteId}:${userId}`,
		siteId,
		userId,
		channel: "tool",
		model: structuredSiteDiaryModel,
		metadata: {
			date,
			hasOriginalAudioUrl: Boolean(whatsappSourceContext.originalAudioUrl),
			whatsappMessageId: whatsappSourceContext.messageId ?? null,
			originalUserCommentPreview: summarizeForTrace(originalUserComment),
			fastPath: Boolean(args.allowFallback),
			...workflowTrace.metadata,
			...senderTraceMetadata,
			...(runContext?.traceMetadata ?? {}),
			...structuredTrace.metadata,
		},
		tags: [
			...senderTraceTags,
			...workflowTrace.tags,
			...(runContext?.traceTags ?? []),
			...structuredTrace.tags,
		],
		parentConfig: args.runnableConfig,
	});

	const updateTraceOutcome = (
		fastPathOutcome: FastPathTraceMetadata["fastPathOutcome"],
		fallbackReason?: FastPathTraceMetadata["fallbackReason"],
	) => {
		Object.assign(aiContext.runnableConfig.metadata, { fastPathOutcome });
		if (fallbackReason) {
			Object.assign(aiContext.runnableConfig.metadata, { fallbackReason });
		} else {
			delete aiContext.runnableConfig.metadata.fallbackReason;
		}
	};

	const contextStarted = Date.now();
	const map = await getConfig(siteId);
	const mapObject =
		map && typeof map === "object" && !Array.isArray(map)
			? (map as Record<string, any>)
			: null;
	const mapToUse = mapObject ?? defaultConfig;
	const systemPrompt = await systemPromptSaveToDatabaseFunction(
		userId,
		mapObject?.AIpromptToUse?.Client,
	);
	const extractionContext = await buildSiteDiaryExtractionContext({
		siteId,
		userId,
		requestedDate: date,
		sourceText: args.question,
		config: mapToUse as any,
	});
	Object.assign(aiContext.runnableConfig.metadata, {
		extractionContextRecentRecordCount:
			extractionContext.metadata.recentRecordCount,
		extractionContextHasExplicitReference:
			extractionContext.metadata.hasExplicitContextReference,
		extractionContextSchemaOptionCount:
			extractionContext.metadata.schemaOptionCount,
		extractionContextTruncated: extractionContext.metadata.truncated,
	});
	recordSiteManagerTiming("structuredContextMs", Date.now() - contextStarted);

	const {
		schema: recordSchema,
		fieldMap,
		dropdownValueMaps,
	} = buildZodSchemaFromConfig(mapToUse as any);
	const baseSchema = z.object({ records: z.array(recordSchema) });
	const responseSchema = args.allowFallback
		? z.object({
				action: z.enum([
					"save_new_report",
					"correct_existing_report",
					"fallback",
					"clarify",
				]),
				correctionMode: z.enum(["not_applicable", "intent_only", "supplied"]),
				language: z.enum(["lv", "en", "ru"]),
				records: z.array(recordSchema),
				intentReason: z.string().max(240),
				intentConfidence: z.number().min(0).max(1),
			})
		: baseSchema;

	const llm = new ChatOpenAI({
		model: structuredSiteDiaryModel,
		reasoning: { effort: structuredSiteDiaryReasoningEffort },
	});
	const structuredLlm = llm.withStructuredOutput(responseSchema, {
		includeRaw: true,
	}) as any;
	const extractionStarted = Date.now();
	let envelope: any;
	try {
		envelope = await structuredLlm.invoke(
			buildStructuredExtractionMessages({
				question: args.question,
				date,
				siteId,
				systemPrompt,
				extractionContextText: extractionContext.text,
				allowFallback: args.allowFallback,
				repairInstructions: args.repairInstructions,
				intentContext: args.intentContext,
			}),
			aiContext.runnableConfig,
		);
	} catch (error) {
		updateTraceOutcome("error", "extraction-error");
		const durationMs = Date.now() - extractionStarted;
		recordSiteManagerTiming("structuredExtractionMs", durationMs);
		recordSiteManagerModelCall({
			purpose: args.repairInstructions
				? "structured-repair-extraction"
				: args.allowFallback
					? "fast-path-extraction"
					: "structured-extraction",
			model: structuredSiteDiaryModel,
			actualModel: null,
			durationMs,
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
		});
		if (args.allowFallback) {
			return {
				action: "fallback",
				correctionMode: "not_applicable",
				language: detectReplyLanguage(args.question),
				content: "",
				ok: false,
				count: 0,
			};
		}
		throw error;
	}
	const extractionDurationMs = Date.now() - extractionStarted;
	const response = envelope?.parsed ?? envelope;
	const rawMessage = envelope?.raw ?? null;
	const usage = usageFromMessage(rawMessage);
	recordSiteManagerTiming("structuredExtractionMs", extractionDurationMs);
	recordSiteManagerModelCall({
		purpose: args.repairInstructions
			? "structured-repair-extraction"
			: args.allowFallback
				? "fast-path-extraction"
				: "structured-extraction",
		model: structuredSiteDiaryModel,
		actualModel: rawMessage?.response_metadata?.model_name ?? null,
		durationMs: extractionDurationMs,
		...usage,
	});

	const language = args.allowFallback
		? ((response.language as SupportedReplyLanguage | undefined) ??
			detectReplyLanguage(args.question))
		: detectReplyLanguage(args.question);
	if (args.allowFallback) {
		Object.assign(aiContext.runnableConfig.metadata, {
			classifiedIntent: response.action ?? "fallback",
			correctionMode: response.correctionMode ?? "not_applicable",
			intentConfidence: response.intentConfidence ?? null,
			intentReason: response.intentReason ?? null,
		});
	}
	if (args.allowFallback && response.action !== "save_new_report") {
		if (response.action === "correct_existing_report") {
			updateTraceOutcome("correction");
		} else if (response.action === "clarify") {
			updateTraceOutcome("clarify");
		} else {
			updateTraceOutcome("fallback", "model-fallback");
		}
		recordSiteManagerToolCall({
			name: "site_diary_intent_classifier",
			durationMs: Date.now() - toolStarted,
			ok: true,
		});
		return {
			action: response.action ?? "fallback",
			correctionMode:
				response.correctionMode ??
				(response.action === "correct_existing_report"
					? "supplied"
					: "not_applicable"),
			language,
			content: "",
			ok: true,
			count: 0,
			intentReason: response.intentReason,
			intentConfidence: response.intentConfidence,
		};
	}

	const rawRecords = Array.isArray(response.records) ? response.records : [];
	if (!rawRecords.length) {
		if (args.allowFallback) updateTraceOutcome("fallback", "no-records");
		const content =
			"Failed to save site diary entry. Reason: No records to insert";
		recordSiteManagerToolCall({
			name: "save_to_database",
			durationMs: Date.now() - toolStarted,
			ok: false,
		});
		return {
			action: args.allowFallback ? "fallback" : "save_new_report",
			correctionMode: "not_applicable",
			language,
			content,
			ok: false,
			count: 0,
		};
	}

	const rows = rawRecords.map((record: Record<string, unknown>) =>
		normalizeUnknownNumericFields(
			mapToDbFields(record, fieldMap, dropdownValueMaps),
			args.question,
		),
	);
	if (args.persist === false) {
		updateTraceOutcome("save");
		recordSiteManagerToolCall({
			name: "shadow_save_to_database",
			durationMs: Date.now() - toolStarted,
			ok: true,
		});
		return {
			action: "save_new_report",
			correctionMode: "not_applicable",
			language,
			content: "",
			ok: true,
			count: rows.length,
			rows,
			rawRecords,
		};
	}

	let rowsToSave = rows;
	let rawRecordsToTrace = rawRecords;
	let checkerToTrace:
		| {
				verdict: SiteDiaryExtractionCheckerResult["verdict"];
				reason: string;
				repairInstructions: string;
				expectedRecordCount?: number | null;
				repairActions?: SiteDiaryExtractionCheckerResult["repairActions"];
				appliedRepair: boolean;
				repairVerdict?: SiteDiaryExtractionCheckerResult["verdict"] | null;
				repairReason?: string | null;
		  }
		| undefined;
	const updateCheckerTrace = (
		metadata: Record<string, string | number | boolean | null | undefined>,
		tags: string[] = [],
	) => {
		assignTraceMetadata(args.runnableConfig, metadata);
		assignTraceMetadata(aiContext.runnableConfig, metadata);
		addTraceTags(args.runnableConfig, tags);
		addTraceTags(aiContext.runnableConfig, tags);
	};
	if (args.runExtractionChecker !== false && rows.length >= 1) {
		const checkerStarted = Date.now();
		try {
			updateCheckerTrace({
				siteDiaryCheckerRan: true,
				siteDiaryCheckerSucceeded: false,
				siteDiaryCheckerAppliedRepair: false,
				siteDiaryCheckerPersistedAfterRepair: false,
			});
			const checkerTrace = buildAiRunContext({
				flow: "structured-site-diary-save",
				runName: formatSiteManagerWorkflowRunName({
					prefix: "Checker",
					workflowRunLabel:
						runContext?.workflowRunLabel ?? workflowTrace.workflowRunLabel,
					senderLabel: runContext?.senderLabel,
					fallback: "SiteDiaryExtractionChecker",
				}),
				threadId: `structured-site-diary-checker:${siteId}:${userId}`,
				siteId,
				userId,
				channel: "tool",
				model: siteDiaryExtractionCheckerModel,
				metadata: {
					date,
					proposedRecordCount: rows.length,
					whatsappMessageId: whatsappSourceContext.messageId ?? null,
					originalUserCommentPreview: summarizeForTrace(originalUserComment),
					...workflowTrace.metadata,
					...senderTraceMetadata,
					...(runContext?.traceMetadata ?? {}),
					...structuredTrace.metadata,
				},
				tags: [
					...senderTraceTags,
					...workflowTrace.tags,
					...(runContext?.traceTags ?? []),
					"site-diary-extraction-checker",
					...structuredTrace.tags,
				],
				parentConfig: args.runnableConfig,
			});
			const checker = await invokeSiteDiaryExtractionChecker({
				originalMessage: args.question,
				rows,
				language,
				contextText: extractionContext.text,
				runnableConfig: checkerTrace.runnableConfig,
			});
			const checkerDurationMs = Date.now() - checkerStarted;
			const checkerUsage = usageFromMessage(checker.raw);
			recordSiteManagerTiming("structuredCheckerMs", checkerDurationMs);
			recordSiteManagerModelCall({
				purpose: "site_diary_extraction_checker",
				model: siteDiaryExtractionCheckerModel,
				actualModel: checker.raw?.response_metadata?.model_name ?? null,
				durationMs: checkerDurationMs,
				...checkerUsage,
			});
			recordSiteManagerToolCall({
				name: "site_diary_extraction_checker",
				durationMs: checkerDurationMs,
				ok: true,
			});
			const checkerVerdict = checker.parsed.verdict ?? "accept";
			Object.assign(aiContext.runnableConfig.metadata, {
				extractionCheckerVerdict: checkerVerdict,
				extractionCheckerReason: summarizeForTrace(checker.parsed.reason),
				extractionCheckerExpectedRecordCount:
					checker.parsed.expectedRecordCount ?? null,
				extractionCheckerRepairActionCount:
					checker.parsed.repairActions?.length ?? 0,
			});
			updateCheckerTrace(
				{
					siteDiaryCheckerVerdict: checkerVerdict,
					siteDiaryCheckerSucceeded: checkerVerdict === "accept",
				},
				[`site-diary-checker:${checkerVerdict}`],
			);
			checkerToTrace = {
				verdict: checkerVerdict,
				reason: checker.parsed.reason,
				repairInstructions: checker.parsed.repairInstructions,
				expectedRecordCount: checker.parsed.expectedRecordCount ?? null,
				repairActions: checker.parsed.repairActions ?? [],
				appliedRepair: false,
				repairVerdict: null,
				repairReason: null,
			};

			if (isCheckerRejectionVerdict(checkerVerdict)) {
				recordSiteManagerTiming("structuredCheckerRetries", 1);
				const simpleRepair = applySimpleCheckerFieldRepair({
					rows,
					checker: checker.parsed,
				});
				if (simpleRepair) {
					rowsToSave = simpleRepair.rows;
					checkerToTrace.appliedRepair = true;
					checkerToTrace.repairVerdict = "accept";
					checkerToTrace.repairReason = simpleRepair.reason;
					Object.assign(aiContext.runnableConfig.metadata, {
						extractionRepairCheckerVerdict: "accept",
						extractionRepairCheckerReason: summarizeForTrace(
							simpleRepair.reason,
						),
						extractionCheckerSimpleFieldRepair: true,
						extractionCheckerStructuredFieldRepair:
							(checker.parsed.repairActions?.length ?? 0) > 0,
					});
					updateCheckerTrace(
						{
							siteDiaryCheckerAppliedRepair: true,
							siteDiaryCheckerRepairVerdict: "accept",
							siteDiaryCheckerSucceeded: true,
							siteDiaryCheckerSimpleFieldRepair: true,
						},
						[
							"site-diary-checker:repair-applied",
							"site-diary-checker:repair-accepted",
							"site-diary-checker:simple-field-repair",
						],
					);
					recordSiteManagerToolCall({
						name: "site_diary_checker_field_repair",
						durationMs: 0,
						ok: true,
					});
				} else if (checker.parsed.verdict === "unsafe") {
					updateTraceOutcome("error", "extraction-error");
					updateCheckerTrace(
						{
							siteDiaryCheckerSucceeded: false,
							siteDiaryCheckerPersistedAfterRepair: false,
						},
						["site-diary-checker:failed"],
					);
					recordSiteManagerToolCall({
						name: "save_to_database",
						durationMs: Date.now() - toolStarted,
						ok: false,
					});
					return {
						action: "save_new_report",
						correctionMode: "not_applicable",
						language,
						content: `Failed to save site diary entry. Reason: Checker marked extraction unsafe: ${checker.parsed.reason}`,
						ok: false,
						count: 0,
					};
				} else {
					const repair = await extractAndSaveSiteDiary({
						question: args.question,
						requestedDate: date,
						allowFallback: false,
						persist: false,
						runExtractionChecker: false,
						repairInstructions:
							checker.parsed.repairInstructions || checker.parsed.reason,
						fastPathTrace: args.fastPathTrace,
						intentContext: args.intentContext,
						runnableConfig: args.runnableConfig,
					});
					if (!repair.ok || !repair.rows?.length) {
						updateTraceOutcome("error", "extraction-error");
						updateCheckerTrace(
							{
								siteDiaryCheckerSucceeded: false,
								siteDiaryCheckerPersistedAfterRepair: false,
							},
							["site-diary-checker:failed"],
						);
						recordSiteManagerToolCall({
							name: "save_to_database",
							durationMs: Date.now() - toolStarted,
							ok: false,
						});
						return {
							action: "save_new_report",
							correctionMode: "not_applicable",
							language,
							content:
								"Failed to save site diary entry. Reason: Checker-guided repair extraction returned no records",
							ok: false,
							count: 0,
						};
					}
					rowsToSave = repair.rows;
					rawRecordsToTrace = repair.rawRecords ?? repair.rows;
					checkerToTrace.appliedRepair = true;
					updateCheckerTrace(
						{
							siteDiaryCheckerAppliedRepair: true,
							siteDiaryCheckerSucceeded: false,
						},
						["site-diary-checker:repair-applied"],
					);
					if (repair.rows.length >= 1) {
						const repairChecker = await invokeSiteDiaryExtractionChecker({
							originalMessage: args.question,
							rows: repair.rows,
							language,
							contextText: extractionContext.text,
							runnableConfig: checkerTrace.runnableConfig,
						});
						checkerToTrace.repairVerdict = repairChecker.parsed.verdict;
						checkerToTrace.repairReason = repairChecker.parsed.reason;
						Object.assign(aiContext.runnableConfig.metadata, {
							extractionRepairCheckerVerdict: repairChecker.parsed.verdict,
							extractionRepairCheckerReason: summarizeForTrace(
								repairChecker.parsed.reason,
							),
							extractionRepairCheckerRepairActionCount:
								repairChecker.parsed.repairActions?.length ?? 0,
						});
						if (repairChecker.parsed.verdict === "accept") {
							updateCheckerTrace(
								{
									siteDiaryCheckerRepairVerdict: repairChecker.parsed.verdict,
									siteDiaryCheckerSucceeded: true,
								},
								["site-diary-checker:repair-accepted"],
							);
						} else {
							const repairCheckerFieldRepair = applySimpleCheckerFieldRepair({
								rows: repair.rows,
								checker: repairChecker.parsed,
							});
							if (repairCheckerFieldRepair) {
								rowsToSave = repairCheckerFieldRepair.rows;
								checkerToTrace.repairVerdict = "accept";
								checkerToTrace.repairReason = repairCheckerFieldRepair.reason;
								Object.assign(aiContext.runnableConfig.metadata, {
									extractionRepairCheckerVerdict: "accept",
									extractionRepairCheckerReason: summarizeForTrace(
										repairCheckerFieldRepair.reason,
									),
									extractionCheckerSimpleFieldRepair: true,
									extractionCheckerStructuredFieldRepair:
										(repairChecker.parsed.repairActions?.length ?? 0) > 0,
								});
								updateCheckerTrace(
									{
										siteDiaryCheckerRepairVerdict: "accept",
										siteDiaryCheckerSucceeded: true,
										siteDiaryCheckerSimpleFieldRepair: true,
									},
									[
										"site-diary-checker:repair-applied",
										"site-diary-checker:repair-accepted",
										"site-diary-checker:simple-field-repair",
									],
								);
								recordSiteManagerToolCall({
									name: "site_diary_checker_field_repair",
									durationMs: 0,
									ok: true,
								});
							} else {
								updateCheckerTrace(
									{
										siteDiaryCheckerRepairVerdict: repairChecker.parsed.verdict,
										siteDiaryCheckerSucceeded: false,
									},
									["site-diary-checker:failed"],
								);
								updateTraceOutcome("error", "extraction-error");
								recordSiteManagerToolCall({
									name: "save_to_database",
									durationMs: Date.now() - toolStarted,
									ok: false,
								});
								return {
									action: "save_new_report",
									correctionMode: "not_applicable",
									language,
									content: `Failed to save site diary entry. Reason: Checker-guided repair was still rejected: ${repairChecker.parsed.reason}`,
									ok: false,
									count: 0,
								};
							}
						}
					}
				}
			}
		} catch (error) {
			const checkerDurationMs = Date.now() - checkerStarted;
			console.warn(
				"site diary extraction checker failed; saving original extraction",
				error,
			);
			recordSiteManagerTiming("structuredCheckerMs", checkerDurationMs);
			recordSiteManagerModelCall({
				purpose: "site_diary_extraction_checker",
				model: siteDiaryExtractionCheckerModel,
				actualModel: null,
				durationMs: checkerDurationMs,
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0,
			});
			recordSiteManagerToolCall({
				name: "site_diary_extraction_checker",
				durationMs: checkerDurationMs,
				ok: false,
			});
			updateCheckerTrace(
				{
					siteDiaryCheckerRan: true,
					siteDiaryCheckerSucceeded: false,
				},
				["site-diary-checker:failed"],
			);
		}
	} else {
		updateCheckerTrace({
			siteDiaryCheckerRan: false,
			siteDiaryCheckerSucceeded: null,
			siteDiaryCheckerAppliedRepair: false,
			siteDiaryCheckerPersistedAfterRepair: false,
		});
	}
	const persistenceStarted = Date.now();
	let result: Awaited<ReturnType<typeof saveSiteDiaryRecord>> | undefined;
	try {
		result = await saveSiteDiaryRecord({
			rows: rowsToSave,
			userId,
			siteId,
			originalUserComment,
			evalMetadata: runContext?.evalRecordMetadata,
		});
	} catch (error) {
		updateTraceOutcome("error");
		const message =
			error instanceof Error ? error.message : "Database unavailable";
		recordSiteManagerTiming("persistenceMs", Date.now() - persistenceStarted);
		recordSiteManagerToolCall({
			name: "save_to_database",
			durationMs: Date.now() - toolStarted,
			ok: false,
		});
		return {
			action: "save_new_report",
			correctionMode: "not_applicable",
			language,
			content: `Failed to save site diary entry. Reason: ${message}`,
			ok: false,
			count: 0,
		};
	}
	recordSiteManagerTiming("persistenceMs", Date.now() - persistenceStarted);

	recordStructuredSaveTrace({
		siteId,
		userId,
		date,
		originalUserComment,
		rawRecords: rawRecordsToTrace,
		mappedRows: rowsToSave,
		normalizedInsertRows: result?.normalizedInsertRows ?? [],
		persistedRecords: result?.records ?? [],
		checker: checkerToTrace,
	});

	const content = formatSiteDiarySaveToolResult(result, rowsToSave.length);
	const ok = Boolean(result?.ok);
	updateTraceOutcome(ok ? "save" : "error");
	if (checkerToTrace?.appliedRepair) {
		updateCheckerTrace({
			siteDiaryCheckerPersistedAfterRepair: ok,
		});
	}
	const count = result?.count ?? rowsToSave.length;
	const confirmationRecords = ok ? toConfirmationRecords(result?.records) : [];
	setSiteManagerSavedConfirmationRecords(confirmationRecords);
	recordSiteManagerToolCall({
		name: "save_to_database",
		durationMs: Date.now() - toolStarted,
		ok,
	});
	return {
		action: "save_new_report",
		correctionMode: "not_applicable",
		language,
		content,
		ok,
		count,
		records: confirmationRecords,
		rows: rowsToSave,
		rawRecords: rawRecordsToTrace,
	};
}

const siteDiarySavePipeline = RunnableLambda.from<
	ExtractAndSaveSiteDiaryArgs,
	StructuredSaveResult
>(async (pipelineArgs, runnableConfig) =>
	extractAndSaveSiteDiaryCore({
		...pipelineArgs,
		runnableConfig: runnableConfig as RunnableConfig,
	}),
);

export function extractAndSaveSiteDiary(
	args: ExtractAndSaveSiteDiaryArgs,
): Promise<StructuredSaveResult> {
	const { runnableConfig, ...pipelineInput } = args;
	const runContext = getSiteManagerAgentRunContext();
	const sourceContext = getWhatsappSourceContext();
	const workflowTrace = buildSiteManagerWorkflowTraceContext({
		workflowId: runContext?.workflowId,
		messageType: runContext?.messageType ?? sourceContext.messageType,
		mediaPurpose: runContext?.mediaPurpose ?? sourceContext.mediaPurpose,
	});
	const runName = formatSiteManagerWorkflowRunName({
		prefix: "SiteDiarySavePipeline",
		workflowRunLabel: runContext
			? (runContext.workflowRunLabel ?? workflowTrace.workflowRunLabel)
			: null,
		senderLabel: runContext?.senderLabel,
		fallback: "SiteDiarySavePipeline",
	});
	return siteDiarySavePipeline.invoke(pipelineInput, {
		...(runnableConfig ?? {}),
		runName,
		tags: [
			...new Set([...(runnableConfig?.tags ?? []), "site-diary-save-pipeline"]),
		],
	});
}

export const siteDiaryToDatabaseTool = new DynamicStructuredTool({
	name: "save_to_database",
	description:
		"Save one construction site diary log to the database. Use this only for real site diary work or notes that should become site diary records.",

	schema: z.object({
		question: z
			.string()
			.describe(
				"The original site diary text to parse from the user's message.",
			),
		date: z
			.string()
			.optional()
			.describe(
				"The explicit diary date from the user, usually dd-mm-yyyy. Omit it when no date was specified.",
			),
	}),

	async func({ question, date: requestedDate }, runManager, parentConfig) {
		const runnableConfig = patchConfig(parentConfig, {
			callbacks: runManager?.getChild(),
		});
		return (
			await extractAndSaveSiteDiary({
				question,
				requestedDate,
				runnableConfig,
			})
		).content;
	},
});

function correctionStatusFromReason(
	reason: string,
): SiteDiaryCorrectionResult["status"] {
	if (reason === "bis-linked") return "blocked_bis";
	if (reason === "no-eligible-batch") return "no_eligible_batch";
	if (reason === "no-records") return "needs_clarification";
	return "failed";
}

function correctionResult(
	args: Omit<SiteDiaryCorrectionResult, "kind">,
): SiteDiaryCorrectionResult {
	return { kind: "site_diary_correction", ...args };
}

export async function startSiteDiaryCorrectionOperation(args: {
	language: SupportedReplyLanguage;
}): Promise<SiteDiaryCorrectionResult> {
	const started = Date.now();
	const context = getSiteManagerToolContext();
	const source = getWhatsappSourceContext();
	if (!context || !source.messageId) {
		recordSiteManagerToolCall({
			name: "start_site_diary_correction",
			durationMs: Date.now() - started,
			ok: false,
		});
		return correctionResult({
			status: "failed",
			language: args.language,
			message: "Trusted message context is unavailable",
		});
	}
	try {
		const result = await startSiteDiaryCorrection({
			siteId: context.siteId,
			userId: context.userId,
			messageId: source.messageId,
			replyToMessageId: source.replyToMessageId,
		});
		if (!result.ok) {
			recordSiteManagerToolCall({
				name: "start_site_diary_correction",
				durationMs: Date.now() - started,
				ok: false,
			});
			return correctionResult({
				status: correctionStatusFromReason(result.reason),
				language: args.language,
			});
		}
		recordSiteManagerToolCall({
			name: "start_site_diary_correction",
			durationMs: Date.now() - started,
			ok: true,
		});
		return correctionResult({ status: "pending", language: args.language });
	} catch (error) {
		recordSiteManagerToolCall({
			name: "start_site_diary_correction",
			durationMs: Date.now() - started,
			ok: false,
		});
		return correctionResult({
			status: "failed",
			language: args.language,
			message:
				error instanceof Error ? error.message : "Unknown correction error",
		});
	}
}

export async function replaceLastSiteDiaryBatchOperation(args: {
	correction: string;
	language: SupportedReplyLanguage;
}): Promise<SiteDiaryCorrectionResult> {
	const started = Date.now();
	const context = getSiteManagerToolContext();
	const source = getWhatsappSourceContext();
	const runContext = getSiteManagerAgentRunContext();
	if (!context || !source.messageId) {
		recordSiteManagerToolCall({
			name: "replace_last_site_diary_batch",
			durationMs: Date.now() - started,
			ok: false,
		});
		return correctionResult({
			status: "failed",
			language: args.language,
			message: "Trusted message context is unavailable",
		});
	}

	try {
		const target = await getSiteDiaryCorrectionTarget({
			siteId: context.siteId,
			userId: context.userId,
			replyToMessageId: source.replyToMessageId,
		});
		if (!target || !target.records.length) {
			recordSiteManagerToolCall({
				name: "replace_last_site_diary_batch",
				durationMs: Date.now() - started,
				ok: false,
			});
			return correctionResult({
				status: "no_eligible_batch",
				language: args.language,
			});
		}
		const oldRecordCount = target.records.length;
		if (target.records.some((record) => Boolean(record.BISId))) {
			recordSiteManagerToolCall({
				name: "replace_last_site_diary_batch",
				durationMs: Date.now() - started,
				ok: false,
			});
			return correctionResult({
				status: "blocked_bis",
				language: args.language,
				oldRecordCount,
			});
		}
		const targetDiaryDate = target.records[0]?.Date ?? null;
		const targetDiaryDateForPrompt = formatDiaryDateForPrompt(targetDiaryDate);
		const extraction = await extractAndSaveSiteDiary({
			question: `ORIGINAL REPORT (trusted):\n${target.batch.originalText}\n\nUSER CORRECTION (takes precedence):\n${args.correction}\n\nReturn the complete corrected diary batch.`,
			requestedDate: targetDiaryDateForPrompt,
			persist: false,
		});
		if (!extraction.ok || !extraction.rows?.length) {
			await startSiteDiaryCorrection({
				siteId: context.siteId,
				userId: context.userId,
				messageId: source.messageId,
				replyToMessageId: source.replyToMessageId,
			});
			recordSiteManagerToolCall({
				name: "replace_last_site_diary_batch",
				durationMs: Date.now() - started,
				ok: false,
			});
			return correctionResult({
				status: "needs_clarification",
				language: args.language,
				oldRecordCount,
			});
		}
		const correctionRows = extraction.rows.map((row) => ({
			...row,
			Date: targetDiaryDate ?? row.Date,
		}));
		const result = await archiveAndReplaceSiteDiaryBatch({
			siteId: context.siteId,
			userId: context.userId,
			correctionMessageId: source.messageId,
			correctionText: args.correction,
			rows: correctionRows,
			replyToMessageId: source.replyToMessageId,
			evalMetadata: runContext?.evalRecordMetadata,
		});
		if (!result.ok) {
			recordSiteManagerToolCall({
				name: "replace_last_site_diary_batch",
				durationMs: Date.now() - started,
				ok: false,
			});
			return correctionResult({
				status: correctionStatusFromReason(result.reason),
				language: args.language,
				oldRecordCount,
			});
		}
		if (result.records?.length) {
			recordStructuredSaveTrace({
				siteId: context.siteId,
				userId: context.userId,
				date: targetDiaryDateForPrompt,
				originalUserComment: `${target.batch.originalText}\nCorrection: ${args.correction}`,
				rawRecords: extraction.rows,
				mappedRows: correctionRows,
				normalizedInsertRows: correctionRows,
				persistedRecords: result.records as Record<string, unknown>[],
			});
		}
		recordSiteManagerToolCall({
			name: "replace_last_site_diary_batch",
			durationMs: Date.now() - started,
			ok: true,
		});
		return correctionResult({
			status: result.idempotent ? "idempotent" : "replaced",
			language: args.language,
			oldRecordCount: result.oldCount ?? oldRecordCount,
			newRecordCount: result.count,
			records: toConfirmationRecords(result.records),
		});
	} catch (error) {
		recordSiteManagerToolCall({
			name: "replace_last_site_diary_batch",
			durationMs: Date.now() - started,
			ok: false,
		});
		return correctionResult({
			status: "failed",
			language: args.language,
			message:
				error instanceof Error ? error.message : "Unknown correction error",
		});
	}
}

export const startSiteDiaryCorrectionTool = new DynamicStructuredTool({
	name: "start_site_diary_correction",
	description:
		"Start a correction only when the complete message asks to change an earlier WhatsApp diary report but does not yet say what the corrected facts are. Never select this from a standalone keyword.",
	schema: z.object({}),
	async func() {
		return serializeCorrectionToolResult(
			await startSiteDiaryCorrectionOperation({
				language: detectReplyLanguage(
					getSiteManagerToolContext()?.originalUserComment ?? "",
				),
			}),
		);
	},
});

export const replaceLastSiteDiaryBatchTool = new DynamicStructuredTool({
	name: "replace_last_site_diary_batch",
	description:
		"Archive and replace a previous WhatsApp diary batch. Use only when the complete message clearly supplies a correction, or when a pending correction session makes the current message the correction. Pass only the current user's correction text; trusted historical records are loaded internally.",
	schema: z.object({
		correction: z
			.string()
			.min(1)
			.describe(
				"Only the current user's correction text. Never include record IDs or invented historical text.",
			),
	}),
	async func({ correction }) {
		return serializeCorrectionToolResult(
			await replaceLastSiteDiaryBatchOperation({
				correction,
				language: detectReplyLanguage(
					getSiteManagerToolContext()?.originalUserComment ?? correction,
				),
			}),
		);
	},
});

function serializeBisResult(value: unknown) {
	return JSON.stringify(value, (_, item) =>
		typeof item === "bigint" ? item.toString() : item,
	);
}

async function withToolMetric<T>(name: string, fn: () => Promise<T>) {
	const started = Date.now();
	try {
		const result = await fn();
		recordSiteManagerToolCall({
			name,
			durationMs: Date.now() - started,
			ok: true,
		});
		return result;
	} catch (error) {
		recordSiteManagerToolCall({
			name,
			durationMs: Date.now() - started,
			ok: false,
		});
		throw error;
	}
}

export const bisConnectionStatusTool = new DynamicStructuredTool({
	name: "get_bis_connection_status",
	description:
		"Read the trusted user's local BIS connection and active-project case configuration. Use for BIS connection, setup, eligibility, or submission guidance. This does not contact BIS and cannot change data.",
	schema: z.object({}),
	async func() {
		const context = getSiteManagerToolContext();
		if (!context) {
			return "BIS status could not be verified because trusted site-manager context is unavailable.";
		}
		try {
			const result = await withToolMetric("get_bis_connection_status", () =>
				getBisConnectionStatus(
					{ siteId: context.siteId, userId: context.userId },
					{
						connectionOverride:
							getSiteManagerAgentRunContext()?.bisConnectionOverride,
					},
				),
			);
			return serializeBisResult(result);
		} catch {
			return serializeBisResult({
				error: "BIS connection status could not be verified.",
			});
		}
	},
});

export const bisMaterialRecordsTool = new DynamicStructuredTool({
	name: "read_bis_material_records",
	description:
		"Read locally stored BIS material records for the trusted active project. This is read-only.",
	schema: z.object({
		search: z
			.string()
			.trim()
			.max(120)
			.optional()
			.describe(
				"Optional material, category, invoice, or cost-code search text.",
			),
		limit: z.number().int().min(1).max(20).default(10),
	}),
	async func({ search, limit }) {
		const context = getSiteManagerToolContext();
		if (!context)
			return "BIS materials could not be read because trusted site-manager context is unavailable.";
		try {
			return serializeBisResult(
				await withToolMetric("read_bis_material_records", () =>
					readBisMaterialRecords(
						{ siteId: context.siteId, userId: context.userId },
						{ search, limit },
					),
				),
			);
		} catch {
			return serializeBisResult({
				error: "BIS material records could not be read.",
			});
		}
	},
});

export const siteDiaryBisStatusesTool = new DynamicStructuredTool({
	name: "read_site_diary_bis_statuses",
	description:
		"Read local BIS submission identifiers and statuses for site diary records in the trusted active project. This is read-only.",
	schema: z.object({
		submission: z.enum(["all", "sent", "not-sent"]).default("all"),
		search: z
			.string()
			.trim()
			.max(120)
			.optional()
			.describe("Optional work, location, or comment search text."),
		limit: z.number().int().min(1).max(20).default(10),
	}),
	async func({ submission, search, limit }) {
		const context = getSiteManagerToolContext();
		if (!context)
			return "BIS diary statuses could not be read because trusted site-manager context is unavailable.";
		try {
			return serializeBisResult(
				await withToolMetric("read_site_diary_bis_statuses", () =>
					readSiteDiaryBisStatuses(
						{ siteId: context.siteId, userId: context.userId },
						{ submission, search, limit },
					),
				),
			);
		} catch {
			return serializeBisResult({
				error: "Site diary BIS statuses could not be read.",
			});
		}
	},
});

export const tools = [
	siteDiaryToDatabaseTool,
	startSiteDiaryCorrectionTool,
	replaceLastSiteDiaryBatchTool,
	bisConnectionStatusTool,
	bisMaterialRecordsTool,
	siteDiaryBisStatusesTool,
];

export const toolNode = new ToolNode<typeof GraphState.State>(tools);
