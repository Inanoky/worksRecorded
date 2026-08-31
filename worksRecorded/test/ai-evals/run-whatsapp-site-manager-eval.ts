import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";

import { buildSiteManagerWorkflowTraceContext } from "@/flows/default-construction/backend/site-manager-agent/runContext";
import { prisma } from "@/lib/utils/db";
import { runWithSiteManagerAgentEvalContext } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/agent";
import {
	runWithStructuredSaveTrace,
	type StructuredSaveTraceEntry,
} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/structuredSaveTrace";
import { inspectCheckpointShape } from "@/server/ai-flows/ai-context-inspection";
import { siteManagerAgentForSiteManagerRouteModelModel } from "@/server/ai-flows/ai-models-settings";
import { getSiteManagerThreadId } from "@/server/ai-flows/ai-run-context";
import { runWithLangSmithTraceFlush } from "./ai-eval-runner-lifecycle";
import {
	formatEvalSelectionSummary,
	selectEvalCases,
} from "./eval-case-selection";
import {
	assertEvalEnvironment,
	shouldPreserveEvalRecords,
} from "./eval-environment-guard";
import {
	type CheckpointInspectionWhatsAppSiteManagerEvalCase,
	type WebhookWhatsAppSiteManagerEvalCase,
	whatsappSiteManagerEvalCases,
} from "./whatsapp-site-manager-cases";
import { evaluateSiteManagerCheckpointInspection } from "./whatsapp-site-manager-checkpoint-inspection";
import {
	cleanupWhatsappSiteManagerEvalCheckpointThread,
	getPersistedEvalRecordsFromTrace,
	prepareBatchedImageWebhookPayloads,
	selectNewestEvalRecord,
	selectRecordsForWhatsappEval,
} from "./whatsapp-site-manager-runner-utils";
import {
	type SavedBisMaterialRecord,
	type SavedPhotoRecord,
	type SavedSiteDiaryRecord,
	validateWhatsappSiteManagerRecord,
	type WhatsAppTurnValidationResult,
} from "./whatsapp-site-manager-validators";

type JudgeStatus = "pass" | "warn" | "fail" | "skipped";

type JudgeResult = {
	status: JudgeStatus;
	explanation: string;
	improvements: string[];
};

type EvalResultStatus = "pass" | "warn" | "fail" | "skipped";

type CaseRunResult = {
	caseId: string;
	webhookMessageId: string | null;
	inputPreview: string | null;
	createdRecordIds: string[];
	createdPhotoIds: string[];
	createdMaterialRecordIds: string[];
	selectedRecord: SavedSiteDiaryRecord | null;
	warehousePhotos: SavedPhotoRecord[];
	materialRecords: SavedBisMaterialRecord[];
	answer: string | null;
	requestedModel: string | null;
	actualModel: string | null;
	tokenUsage: unknown;
	finishReason: string | null;
	executionPath: "legacy-agent" | "fast-path" | "correction-path" | null;
	fastPathMode: "off" | "shadow" | "on" | null;
	timings: Record<string, number> | null;
	modelCalls: unknown[];
	toolCalls: unknown[];
	aggregateTokenUsage: unknown;
	structuredSaveTrace: StructuredSaveTraceEntry[];
	deterministic: WhatsAppTurnValidationResult | null;
	controlledMemory: ControlledMemoryEvalResult;
	judge: JudgeResult | null;
	latencyMs: number;
	threadId: string;
};

type ControlledMemoryEvalCheck = {
	name: string;
	status: "pass" | "fail" | "skipped";
	message: string;
};

type ControlledMemoryEvalResult = {
	status: EvalResultStatus;
	mode: "checkpoint-inspection" | "skipped";
	message: string;
	checks: ControlledMemoryEvalCheck[];
	originalMessageCount: number | null;
	originalChars: number | null;
	originalEstimatedTokens: number | null;
	compactedMessageCount: number | null;
	compactedChars: number | null;
	compactedEstimatedTokens: number | null;
	controlledMemoryStats: unknown;
	latestMetadata: Record<string, unknown> | null;
	checkpointMessageCount: number | null;
	checkpointToolMessageCount: number | null;
	checkpointLargestToolMessageChars: number;
	historicalTokenUsage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	} | null;
};

type LatencyCaseSummary = {
	caseId: string;
	latencyMs: number;
	threadId: string;
};

type WhatsAppSiteManagerEvalReport = {
	runId: string;
	flow: "whatsapp-site-manager";
	model: string;
	requestedModel: string;
	actualModels: string[];
	judgeModel: string | null;
	siteId: string;
	userId: string;
	startedAt: string;
	finishedAt: string;
	results: CaseRunResult[];
	latency: {
		slowThresholdMs: number;
		totalMs: number;
		averageMs: number;
		slowestCase: LatencyCaseSummary | null;
		casesOverThreshold: LatencyCaseSummary[];
	};
	summary: {
		cases: number;
		deterministicFailures: number;
		deterministicCriticalFailures: number;
		deterministicWarnings: number;
		heuristicWarnings: number;
		heuristicFailures: number;
		controlledMemoryFailures: number;
		judgeWarnings: number;
		judgeFailures: number;
	};
};

const GRAPH_API_PREFIX = "https://graph.facebook.com/";
const EVAL_IMAGE_MEDIA_URL =
	"https://eval.test/meta-media/site-manager-image-caption.jpg";
const EVAL_UPLOADED_IMAGE_URL =
	"https://eval.test/uploads/site-manager-image-caption.jpg";
const EVAL_PROGRESS_IMAGE_MEDIA_ID = "eval-image-media-progress-report-normal";
const EVAL_PROGRESS_IMAGE_MEDIA_URL =
	"https://eval.test/meta-media/progress-report-normal-image.jpg";
const EVAL_PROGRESS_IMAGE_FIXTURE_PATH = path.join(
	process.cwd(),
	"test/fixtures/meta-webhook/progress-report-normal-image.jpg",
);
const EVAL_MATERIAL_LATVIAN_DATE_MEDIA_ID =
	"eval-image-media-material-invoice-latvian-date";
const EVAL_MATERIAL_LATVIAN_DATE_MEDIA_URL =
	"https://eval.test/meta-media/material-invoice-latvian-date.jpg";
const EVAL_MATERIAL_LATVIAN_DATE_FIXTURE_PATH = path.join(
	process.cwd(),
	"test/fixtures/meta-webhook/material-invoice-latvian-date.jpg",
);
const EVAL_IMAGE_BYTES = new Uint8Array([
	0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff,
	0xd9,
]);

const JudgeSchema = {
	parse(value: unknown): JudgeResult {
		const item = value as Partial<JudgeResult>;
		if (
			item.status === "pass" ||
			item.status === "warn" ||
			item.status === "fail"
		) {
			return {
				status: item.status,
				explanation: String(item.explanation ?? ""),
				improvements: Array.isArray(item.improvements)
					? item.improvements.filter(
							(improvement) => typeof improvement === "string",
						)
					: [],
			};
		}
		return {
			status: "warn",
			explanation: "Judge returned an unrecognized status.",
			improvements: [],
		};
	},
};

function hasArg(name: string) {
	return process.argv.includes(name);
}

function getRequiredEnv(name: string) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required for real AI eval runs.`);
	}
	return value;
}

function preview(value: string, maxLength = 220) {
	const compact = value.replace(/\s+/g, " ").trim();
	return compact.length <= maxLength
		? compact
		: `${compact.slice(0, maxLength)}...`;
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function createRunId() {
	return new Date().toISOString().replace(/[:.]/g, "-");
}

function getSlowThresholdMs() {
	const rawValue = process.env.AI_EVAL_SLOW_TURN_MS;
	if (!rawValue) return 15000;

	const parsed = Number(rawValue);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(
			"AI_EVAL_SLOW_TURN_MS must be a positive number of milliseconds.",
		);
	}

	return parsed;
}

function getSimulatedBisConnection(
	evalCase: WebhookWhatsAppSiteManagerEvalCase,
) {
	if (!evalCase.simulatedBisConnection) return undefined;
	return {
		status: evalCase.simulatedBisConnection,
		siteName: "AI Eval Site",
		caseNumber:
			evalCase.simulatedBisConnection === "ready" ? "EVAL-BIS-001" : undefined,
		caseName:
			evalCase.simulatedBisConnection === "ready"
				? "AI Eval BIS Case"
				: undefined,
	} as const;
}

function summarizeLatency(results: CaseRunResult[], slowThresholdMs: number) {
	const cases = results.map((item) => ({
		caseId: item.caseId,
		latencyMs: item.latencyMs,
		threadId: item.threadId,
	}));
	const totalMs = cases.reduce((total, item) => total + item.latencyMs, 0);
	const slowestCase =
		cases.length > 0
			? cases.reduce((slowest, item) =>
					item.latencyMs > slowest.latencyMs ? item : slowest,
				)
			: null;

	return {
		slowThresholdMs,
		totalMs,
		averageMs: cases.length > 0 ? Math.round(totalMs / cases.length) : 0,
		slowestCase,
		casesOverThreshold: cases.filter(
			(item) => item.latencyMs >= slowThresholdMs,
		),
	};
}

function parseJudgeJson(value: string): JudgeResult {
	try {
		return JudgeSchema.parse(JSON.parse(value));
	} catch {
		return {
			status: "warn",
			explanation: `Judge response was not valid JSON: ${preview(value, 300)}`,
			improvements: [],
		};
	}
}

function cloneWebhook(value: Record<string, unknown>) {
	return JSON.parse(JSON.stringify(value));
}

function hasMaterialRecordExpectation(
	evalCase: WebhookWhatsAppSiteManagerEvalCase,
) {
	return Boolean(evalCase.expected.materialRecords);
}

function hasPhotoPurposeExpectation(
	evalCase: WebhookWhatsAppSiteManagerEvalCase,
) {
	return Boolean(evalCase.expected.expectedPhotoPurpose);
}

async function readMaterialLatvianDateFixtureBytes() {
	return readFile(EVAL_MATERIAL_LATVIAN_DATE_FIXTURE_PATH);
}

async function readProgressImageFixtureBytes() {
	return readFile(EVAL_PROGRESS_IMAGE_FIXTURE_PATH);
}

async function getUploadedImageUrlForCase(
	evalCase: WebhookWhatsAppSiteManagerEvalCase,
) {
	if (hasMaterialRecordExpectation(evalCase)) {
		const bytes = await readMaterialLatvianDateFixtureBytes();
		return `data:image/jpeg;base64,${bytes.toString("base64")}`;
	}

	if (evalCase.expected.expectedPhotoPurpose === "site_diary") {
		const bytes = await readProgressImageFixtureBytes();
		return `data:image/jpeg;base64,${bytes.toString("base64")}`;
	}

	return EVAL_UPLOADED_IMAGE_URL;
}

function shouldRunImageClassifierForCase(
	evalCase: WebhookWhatsAppSiteManagerEvalCase,
) {
	return (
		hasMaterialRecordExpectation(evalCase) ||
		hasPhotoPurposeExpectation(evalCase)
	);
}

function configureImageClassifierForCase(
	evalCase: WebhookWhatsAppSiteManagerEvalCase,
) {
	if (shouldRunImageClassifierForCase(evalCase)) {
		delete process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER;
		return;
	}

	process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER = "true";
}

function skippedControlledMemoryResult(
	message = "No controlled-memory inspection for this case.",
): ControlledMemoryEvalResult {
	return {
		status: "skipped",
		mode: "skipped",
		message,
		checks: [],
		originalMessageCount: null,
		originalChars: null,
		originalEstimatedTokens: null,
		compactedMessageCount: null,
		compactedChars: null,
		compactedEstimatedTokens: null,
		controlledMemoryStats: null,
		latestMetadata: null,
		checkpointMessageCount: null,
		checkpointToolMessageCount: null,
		checkpointLargestToolMessageChars: 0,
		historicalTokenUsage: null,
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function firstMessage(payload: any) {
	return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null;
}

function firstValue(payload: any) {
	return payload?.entry?.[0]?.changes?.[0]?.value ?? null;
}

function textFromWebhook(payload: any) {
	const message = firstMessage(payload);
	return String(message?.text?.body ?? message?.image?.caption ?? "");
}

function prepareWebhookPayload(args: {
	evalCase: WebhookWhatsAppSiteManagerEvalCase;
	runId: string;
	businessPhoneNumberId: string;
	senderPhone: string;
	bsuid: string;
	body?: string;
	messageSuffix?: string;
}) {
	const payload = cloneWebhook(args.evalCase.webhook);
	const value = firstValue(payload);
	const message = firstMessage(payload);
	const messageId = `wamid.eval.${args.runId}.${args.evalCase.id}${args.messageSuffix ? `.${args.messageSuffix}` : ""}`;

	if (!value || !message) {
		throw new Error(
			`Invalid WhatsApp eval webhook fixture for ${args.evalCase.id}.`,
		);
	}

	value.metadata = {
		...(value.metadata ?? {}),
		phone_number_id: args.businessPhoneNumberId,
	};
	value.contacts = [
		{
			...(value.contacts?.[0] ?? {}),
			wa_id: args.senderPhone,
			user_id: args.bsuid,
		},
	];
	message.from = args.senderPhone;
	message.from_user_id = args.bsuid;
	message.id = messageId;
	if (args.body !== undefined) {
		message.type = "text";
		message.text = { body: args.body };
		delete message.image;
		delete message.audio;
	}

	return {
		payload,
		messageId,
		messageType: typeof message.type === "string" ? message.type : null,
		inputText: textFromWebhook(payload),
	};
}

function installGraphApiFetchMock() {
	const originalFetch = global.fetch;

	global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input.toString();
		if (url.startsWith(GRAPH_API_PREFIX)) {
			if (url.includes(EVAL_PROGRESS_IMAGE_MEDIA_ID)) {
				return new Response(
					JSON.stringify({
						url: EVAL_PROGRESS_IMAGE_MEDIA_URL,
						mime_type: "image/jpeg",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			if (url.includes(EVAL_MATERIAL_LATVIAN_DATE_MEDIA_ID)) {
				return new Response(
					JSON.stringify({
						url: EVAL_MATERIAL_LATVIAN_DATE_MEDIA_URL,
						mime_type: "image/jpeg",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			if (url.includes("eval-image-media-")) {
				return new Response(
					JSON.stringify({
						url: EVAL_IMAGE_MEDIA_URL,
						mime_type: "image/jpeg",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (url === EVAL_IMAGE_MEDIA_URL) {
			return new Response(EVAL_IMAGE_BYTES, {
				status: 200,
				headers: { "Content-Type": "image/jpeg" },
			});
		}

		if (url === EVAL_PROGRESS_IMAGE_MEDIA_URL) {
			return new Response(await readProgressImageFixtureBytes(), {
				status: 200,
				headers: { "Content-Type": "image/jpeg" },
			});
		}

		if (url === EVAL_MATERIAL_LATVIAN_DATE_MEDIA_URL) {
			return new Response(await readMaterialLatvianDateFixtureBytes(), {
				status: 200,
				headers: { "Content-Type": "image/jpeg" },
			});
		}

		if (!originalFetch) {
			throw new Error(`No fetch implementation available for ${url}.`);
		}

		return originalFetch(input, init);
	}) as typeof fetch;

	return () => {
		global.fetch = originalFetch;
	};
}

async function assertEvalPreconditions(args: {
	siteId: string;
	userId: string;
}) {
	const [user, settings] = await Promise.all([
		prisma.user.findUnique({
			where: { id: args.userId },
			select: {
				id: true,
				lastSelectedSiteIdforWhatsapp: true,
			},
		}),
		prisma.sitediarysettings.findUnique({
			where: { siteId: args.siteId },
			select: {
				id: true,
				schema: true,
			},
		}),
	]);

	if (!user) {
		throw new Error(`AI_EVAL_USER_ID ${args.userId} was not found.`);
	}

	if (user.lastSelectedSiteIdforWhatsapp !== args.siteId) {
		throw new Error(
			`Eval user lastSelectedSiteIdforWhatsapp must be ${args.siteId}; got ${user.lastSelectedSiteIdforWhatsapp ?? "null"}.`,
		);
	}

	if (!settings?.schema) {
		throw new Error(
			`AI_EVAL_SITE_ID ${args.siteId} must have a site diary settings schema.`,
		);
	}
}

async function seedEvalIdentity(args: {
	userId: string;
	businessPhoneNumberId: string;
	senderPhone: string;
	bsuid: string;
}) {
	const prismaAny = prisma as any;
	if (!prismaAny.whatsAppIdentity) {
		throw new Error("Prisma client does not expose whatsAppIdentity.");
	}

	await prismaAny.whatsAppIdentity.create({
		data: {
			provider: "meta",
			phone: args.senderPhone,
			waId: args.senderPhone,
			bsuid: args.bsuid,
			businessPhoneNumberId: args.businessPhoneNumberId,
			status: "active",
			userId: args.userId,
		},
	});
}

async function findCreatedRecords(args: {
	siteId: string;
	userId: string;
	startedAt: Date;
	inputText: string;
	runId: string;
	caseId: string;
	includeTextFallback?: boolean;
}) {
	return prisma.sitediaryrecords.findMany({
		where: {
			siteId: args.siteId,
			userId: args.userId,
			archivedAt: null,
			createdAt: { gte: args.startedAt },
			OR: [
				{
					AND: [
						{ evalMetadata: { path: ["isEval"], equals: true } },
						{
							evalMetadata: { path: ["flow"], equals: "whatsapp-site-manager" },
						},
						{ evalMetadata: { path: ["runId"], equals: args.runId } },
						{ evalMetadata: { path: ["caseId"], equals: args.caseId } },
					],
				},
				...(args.includeTextFallback === false
					? []
					: [
							{
								originalUserComment: {
									contains: args.inputText,
								},
							},
						]),
			],
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			siteId: true,
			userId: true,
			workerId: true,
			Date: true,
			Location: true,
			Location_Custom_1: true,
			Location_Custom_2: true,
			Works: true,
			Works_Custom_1: true,
			Works_Custom_2: true,
			Comments: true,
			Comments_Custom_1: true,
			Comments_Custom_2: true,
			originalUserComment: true,
			originalAudioUrl: true,
			Units: true,
			WorkersInvolved: true,
			TimeInvolved: true,
			Amounts: true,
			evalMetadata: true,
			createdAt: true,
		},
	});
}

async function findCreatedPhotos(args: {
	siteId: string;
	userId: string;
	startedAt: Date;
	inputText: string;
	includeTextFilter?: boolean;
}): Promise<SavedPhotoRecord[]> {
	return prisma.photos.findMany({
		where: {
			siteId: args.siteId,
			userId: args.userId,
			workerId: null,
			createdAt: { gte: args.startedAt },
			...(args.includeTextFilter === false
				? {}
				: {
						Comment: {
							contains: args.inputText,
						},
					}),
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			siteId: true,
			userId: true,
			workerId: true,
			URL: true,
			fileUrl: true,
			Comment: true,
			mediaPurpose: true,
			Date: true,
			createdAt: true,
		},
	});
}

async function findPhotosBySourceUrl(args: {
	siteId: string;
	userId: string;
	startedAt: Date;
	sourcePhoto: string;
}): Promise<SavedPhotoRecord[]> {
	return prisma.photos.findMany({
		where: {
			siteId: args.siteId,
			userId: args.userId,
			workerId: null,
			createdAt: { gte: args.startedAt },
			OR: [{ URL: args.sourcePhoto }, { fileUrl: args.sourcePhoto }],
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			siteId: true,
			userId: true,
			workerId: true,
			URL: true,
			fileUrl: true,
			Comment: true,
			mediaPurpose: true,
			Date: true,
			createdAt: true,
		},
	});
}

async function findCreatedMaterialRecords(args: {
	siteId: string;
	userId: string;
	startedAt: Date;
	sourcePhoto: string;
}): Promise<SavedBisMaterialRecord[]> {
	return prisma.bISmaterialRecords.findMany({
		where: {
			siteId: args.siteId,
			userId: args.userId,
			createdAt: { gte: args.startedAt },
			sourcePhoto: args.sourcePhoto,
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			siteId: true,
			userId: true,
			name: true,
			invoiceNr: true,
			invoiceDate: true,
			cost: true,
			quantity: true,
			sourcePhoto: true,
			createdAt: true,
		},
	});
}

async function findCorrectionAuditRecords(args: {
	correctionMessageId: string;
}): Promise<SavedSiteDiaryRecord[]> {
	const audit = await prisma.siteDiaryCorrectionAudit.findUnique({
		where: { correctionMessageId: args.correctionMessageId },
	});
	if (!audit) return [];
	const newIds = Array.isArray(audit.newRecordIds)
		? audit.newRecordIds.filter((id): id is string => typeof id === "string")
		: [];
	if (!newIds.length) return [];
	const records = await prisma.sitediaryrecords.findMany({
		where: { id: { in: newIds }, archivedAt: null },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			siteId: true,
			userId: true,
			workerId: true,
			Date: true,
			Location: true,
			Location_Custom_1: true,
			Location_Custom_2: true,
			Works: true,
			Works_Custom_1: true,
			Works_Custom_2: true,
			Comments: true,
			Comments_Custom_1: true,
			Comments_Custom_2: true,
			originalUserComment: true,
			originalAudioUrl: true,
			Units: true,
			WorkersInvolved: true,
			TimeInvolved: true,
			Amounts: true,
			evalMetadata: true,
			createdAt: true,
		},
	});
	return records as unknown as SavedSiteDiaryRecord[];
}

async function cleanupPreviousEvalCaseRows(args: {
	siteId: string;
	userId: string;
	inputText: string;
	caseId: string;
	includeTextFallback?: boolean;
	materialSourcePhoto?: string | null;
	materialInvoiceNr?: string | null;
}) {
	await prisma.sitediaryrecords.deleteMany({
		where: {
			siteId: args.siteId,
			userId: args.userId,
			AND: [
				{ evalMetadata: { path: ["isEval"], equals: true } },
				{ evalMetadata: { path: ["flow"], equals: "whatsapp-site-manager" } },
				{ evalMetadata: { path: ["caseId"], equals: args.caseId } },
			],
		},
	});

	if (args.includeTextFallback !== false) {
		await prisma.sitediaryrecords.deleteMany({
			where: {
				siteId: args.siteId,
				userId: args.userId,
				originalUserComment: {
					contains: args.inputText,
				},
			},
		});
		await prisma.photos.deleteMany({
			where: {
				siteId: args.siteId,
				userId: args.userId,
				Comment: {
					contains: args.inputText,
				},
			},
		});
	}

	if (args.materialSourcePhoto) {
		await prisma.bISmaterialRecords.deleteMany({
			where: {
				siteId: args.siteId,
				userId: args.userId,
				sourcePhoto: args.materialSourcePhoto,
				...(args.materialInvoiceNr
					? { invoiceNr: args.materialInvoiceNr }
					: {}),
			},
		});
	}
}

async function cleanupEvalRows(args: {
	siteId: string;
	userId: string;
	businessPhoneNumberId: string;
	recordIds: string[];
	photoIds: string[];
	materialRecordIds: string[];
	materialSourcePhoto?: string | null;
	runId: string;
	caseId: string;
}) {
	const prismaAny = prisma as any;
	await prisma.sitediaryrecords.deleteMany({
		where: {
			AND: [
				{ evalMetadata: { path: ["isEval"], equals: true } },
				{ evalMetadata: { path: ["flow"], equals: "whatsapp-site-manager" } },
				{ evalMetadata: { path: ["runId"], equals: args.runId } },
				{ evalMetadata: { path: ["caseId"], equals: args.caseId } },
			],
		},
	});
	await prisma.sitediaryrecords.deleteMany({
		where: {
			id: { in: args.recordIds },
		},
	});
	await prisma.photos.deleteMany({
		where: {
			id: { in: args.photoIds },
		},
	});
	await prisma.bISmaterialRecords.deleteMany({
		where: {
			id: { in: args.materialRecordIds },
		},
	});
	if (args.materialSourcePhoto) {
		await prisma.bISmaterialRecords.deleteMany({
			where: {
				siteId: args.siteId,
				userId: args.userId,
				sourcePhoto: args.materialSourcePhoto,
			},
		});
	}
	if (prismaAny.whatsAppIdentity) {
		await prismaAny.whatsAppIdentity.deleteMany({
			where: {
				businessPhoneNumberId: args.businessPhoneNumberId,
			},
		});
	}
}

async function cleanupEvalIdentity(businessPhoneNumberId: string) {
	const prismaAny = prisma as any;
	if (prismaAny.whatsAppIdentity) {
		await prismaAny.whatsAppIdentity.deleteMany({
			where: { businessPhoneNumberId },
		});
	}
}

async function cleanupEvalCheckpointThread(threadId: string) {
	await cleanupWhatsappSiteManagerEvalCheckpointThread(
		threadId,
		async (safeThreadId) => {
			await prisma.$transaction([
				prisma.$executeRaw(
					Prisma.sql`DELETE FROM "checkpoint_writes" WHERE thread_id = ${safeThreadId}`,
				),
				prisma.$executeRaw(
					Prisma.sql`DELETE FROM "checkpoint_blobs" WHERE thread_id = ${safeThreadId}`,
				),
				prisma.$executeRaw(
					Prisma.sql`DELETE FROM "checkpoints" WHERE thread_id = ${safeThreadId}`,
				),
			]);
		},
	);
}

async function getLatestCheckpointInspection(threadId: string) {
	const rows = await prisma.$queryRaw<
		Array<{
			checkpointId: string;
			checkpointTs: string | null;
			metadata: unknown;
			checkpoint: unknown;
		}>
	>`
    SELECT
      checkpoint_id AS "checkpointId",
      checkpoint->>'ts' AS "checkpointTs",
      metadata,
      checkpoint
    FROM "checkpoints"
    WHERE thread_id = ${threadId}
    ORDER BY COALESCE(checkpoint->>'ts', '') DESC, checkpoint_id DESC
    LIMIT 1
  `;
	const latest = rows[0] ?? null;
	const inspectionPayload = latest
		? { ...asRecord(latest.checkpoint), metadata: latest.metadata }
		: null;
	const shape = inspectCheckpointShape(inspectionPayload);
	return {
		latest: latest ? { ...latest, checkpoint: inspectionPayload } : null,
		shape,
	};
}

async function judgeRecord(args: {
	client: OpenAI;
	model: string;
	evalCase: WebhookWhatsAppSiteManagerEvalCase;
	inputText: string;
	record: SavedSiteDiaryRecord | null;
	deterministic: WhatsAppTurnValidationResult;
}): Promise<JudgeResult> {
	const response = await (args.client.responses.create as any)({
		model: args.model,
		input: [
			{
				role: "system",
				content:
					'You judge regression-test saved records for a construction SaaS WhatsApp site-manager assistant. Return strict JSON shaped as {"status":"pass"|"warn"|"fail","explanation":"...","improvements":["..."]}. Keep improvements advisory and concise. Use an empty improvements array when no useful improvement is needed. Fail fabricated details, wrong quantities, missing core facts, or unsafe persistence behavior.',
			},
			{
				role: "user",
				content: JSON.stringify({
					caseId: args.evalCase.id,
					intent: args.evalCase.intent,
					inputText: args.inputText,
					savedRecord: args.record,
					deterministicStatus: args.deterministic.status,
					deterministicResults: args.deterministic.results,
					heuristic: args.deterministic.heuristic,
				}),
			},
		],
		text: {
			format: {
				type: "json_object",
			},
		},
	});

	return parseJudgeJson(String(response.output_text ?? ""));
}

async function main() {
	const dryRun = hasArg("--dry-run");
	const listOnly = hasArg("--list");
	const enableJudge =
		hasArg("--judge") || process.env.AI_EVAL_ENABLE_JUDGE === "true";
	const selection = selectEvalCases({
		cases: whatsappSiteManagerEvalCases,
		getInteractionIds: (evalCase) =>
			evalCase.mode === "webhook" && evalCase.followUp
				? [evalCase.id, `${evalCase.id}-follow-up`]
				: [evalCase.id],
	});

	if (dryRun || listOnly) {
		console.log("WhatsApp site-manager eval selection:");
		for (const line of formatEvalSelectionSummary(selection)) {
			console.log(line);
		}
		return;
	}

	if (process.env.RUN_AI_EVALS !== "true") {
		throw new Error("Set RUN_AI_EVALS=true to run real AI evals.");
	}

	const siteId = getRequiredEnv("AI_EVAL_SITE_ID");
	const userId = getRequiredEnv("AI_EVAL_USER_ID");
	getRequiredEnv("OPENAI_API_KEY");
	getRequiredEnv("DATABASE_URL");
	process.env.META_ACCESS_TOKEN ||= "eval-meta-token";
	process.env.WEBHOOK_VERIFY_TOKEN ||= "eval-webhook-token";

	await assertEvalEnvironment({
		flow: "whatsapp-site-manager",
		siteId,
		userId,
	});
	await assertEvalPreconditions({ siteId, userId });

	const runId = createRunId();
	const agentModel =
		process.env.AI_EVAL_AGENT_MODEL ||
		siteManagerAgentForSiteManagerRouteModelModel;
	const slowThresholdMs = getSlowThresholdMs();
	const judgeModel = enableJudge
		? process.env.AI_EVAL_JUDGE_MODEL || "gpt-4.1-mini"
		: null;
	const judgeClient = enableJudge
		? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
		: null;
	const senderPhone = process.env.AI_EVAL_WHATSAPP_PHONE || "37129391891";
	const preserveRecords = shouldPreserveEvalRecords();
	const businessPhoneNumberId = `eval-business-phone-${runId}`;
	const previousUploadedImageUrl = process.env.AI_EVAL_UPLOADED_IMAGE_URL;
	const previousSkipMetaImageClassifier =
		process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER;
	process.env.AI_EVAL_UPLOADED_IMAGE_URL = EVAL_UPLOADED_IMAGE_URL;
	process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER = "true";
	const restoreFetch = installGraphApiFetchMock();
	const { POST } = await import("@/app/api/webhook/meta/webhook/route");

	const startedAt = new Date().toISOString();
	const results: CaseRunResult[] = [];

	try {
		for (const evalCase of selection.selectedCases) {
			if (evalCase.mode === "checkpoint-inspection") {
				const inspectionEvalCase: CheckpointInspectionWhatsAppSiteManagerEvalCase =
					evalCase;
				const threadId = getSiteManagerThreadId(siteId, userId);
				const started = Date.now();
				const inspection = await getLatestCheckpointInspection(threadId);
				const evaluated = evaluateSiteManagerCheckpointInspection({
					checkpoint: inspection.latest?.checkpoint ?? null,
					expectation: inspectionEvalCase.expectedCheckpointInspection,
				});
				const controlledMemory: ControlledMemoryEvalResult = {
					status: evaluated.status,
					mode: "checkpoint-inspection",
					message: evaluated.message,
					checks: [],
					originalMessageCount: evaluated.originalMessageCount,
					originalChars: evaluated.originalChars,
					originalEstimatedTokens: evaluated.originalEstimatedTokens,
					compactedMessageCount: evaluated.compactedMessageCount,
					compactedChars: evaluated.compactedChars,
					compactedEstimatedTokens: evaluated.compactedEstimatedTokens,
					controlledMemoryStats: evaluated.controlledMemoryStats,
					latestMetadata: asRecord(inspection.latest?.metadata),
					checkpointMessageCount:
						inspection.shape.messageCount ?? evaluated.originalMessageCount,
					checkpointToolMessageCount: inspection.shape.toolMessageCount,
					checkpointLargestToolMessageChars:
						inspection.shape.largestToolMessageChars,
					historicalTokenUsage: evaluated.historicalTokenUsage,
				};

				results.push({
					caseId: evalCase.id,
					webhookMessageId: null,
					inputPreview: null,
					createdRecordIds: [],
					createdPhotoIds: [],
					createdMaterialRecordIds: [],
					selectedRecord: null,
					warehousePhotos: [],
					materialRecords: [],
					answer: null,
					requestedModel: null,
					actualModel: null,
					tokenUsage: evaluated.historicalTokenUsage,
					finishReason: null,
					executionPath: null,
					fastPathMode: null,
					timings: null,
					modelCalls: [],
					toolCalls: [],
					aggregateTokenUsage: null,
					structuredSaveTrace: [],
					deterministic: null,
					controlledMemory,
					judge: null,
					latencyMs: Date.now() - started,
					threadId,
				});

				console.log(
					`[${controlledMemory.status.toUpperCase()}] ${evalCase.id} (${controlledMemory.message})`,
				);
				continue;
			}

			const webhookEvalCase: WebhookWhatsAppSiteManagerEvalCase = evalCase;
			const bsuid = `LV.eval.${runId}.${evalCase.id}`;
			const threadId = `eval:whatsapp-site-manager:${siteId}:${webhookEvalCase.id}:${runId}`;
			let createdRecordIds: string[] = [];
			let createdPhotoIds: string[] = [];
			let createdMaterialRecordIds: string[] = [];
			let warehousePhotos: SavedPhotoRecord[] = [];
			let materialRecords: SavedBisMaterialRecord[] = [];
			const currentUploadedImageUrl =
				await getUploadedImageUrlForCase(webhookEvalCase);
			process.env.AI_EVAL_UPLOADED_IMAGE_URL = currentUploadedImageUrl;
			configureImageClassifierForCase(webhookEvalCase);
			const prepared = prepareWebhookPayload({
				evalCase: webhookEvalCase,
				runId,
				businessPhoneNumberId,
				senderPhone,
				bsuid,
			});
			const preparedBatch = webhookEvalCase.imageBatch
				? prepareBatchedImageWebhookPayloads({
						baseWebhook: webhookEvalCase.webhook,
						caseId: webhookEvalCase.id,
						runId,
						businessPhoneNumberId,
						senderPhone,
						bsuid,
						imageBatch: webhookEvalCase.imageBatch,
					})
				: null;
			const preparedForCase = preparedBatch ?? prepared;
			const workflowTrace = buildSiteManagerWorkflowTraceContext({
				messageType: preparedForCase.messageType,
			});
			const evalTraceMetadata = {
				evalRunId: runId,
				evalCaseId: evalCase.id,
				evalMode: "real-meta-webhook-regression",
				webhookMessageId: preparedForCase.messageId,
				...workflowTrace.metadata,
			};
			const evalTraceTags = [
				"eval",
				"eval:whatsapp-site-manager",
				`eval-run:${runId}`,
				`eval-case:${evalCase.id}`,
				...workflowTrace.tags,
			];
			const evalRecordMetadata = {
				isEval: true,
				environment: "single-db",
				flow: "whatsapp-site-manager",
				workflowId: workflowTrace.workflowId,
				workflowName: workflowTrace.workflowName,
				messageType: workflowTrace.messageType,
				mediaPurpose: workflowTrace.mediaPurpose,
				runId,
				caseId: evalCase.id,
				siteId,
				userId,
				organizationId: process.env.AI_EVAL_ALLOWED_ORGANIZATION_ID ?? null,
				messageId: preparedForCase.messageId,
				createdBy: "ai-eval-runner",
			};

			try {
				if (!preserveRecords) {
					await cleanupPreviousEvalCaseRows({
						siteId,
						userId,
						inputText: preparedForCase.inputText,
						caseId: evalCase.id,
						materialSourcePhoto: webhookEvalCase.expected.materialRecords
							? currentUploadedImageUrl
							: null,
						materialInvoiceNr:
							webhookEvalCase.expected.materialRecords?.invoiceNr ?? null,
					});
					if (webhookEvalCase.followUp) {
						await cleanupPreviousEvalCaseRows({
							siteId,
							userId,
							inputText: webhookEvalCase.followUp.body,
							caseId: `${webhookEvalCase.id}-follow-up`,
							includeTextFallback: false,
						});
					}
				}

				await seedEvalIdentity({
					userId,
					businessPhoneNumberId,
					senderPhone,
					bsuid,
				});

				const started = Date.now();
				const caseStartedAt = new Date();
				const tracedRun = await runWithStructuredSaveTrace(() =>
					preparedBatch
						? (async () => {
								const runs: Array<
									ReturnType<typeof runWithSiteManagerAgentEvalContext>
								> = [];
								for (const batchPayload of preparedBatch.payloads) {
									runs.push(
										runWithSiteManagerAgentEvalContext(
											{
												threadId,
												model: agentModel,
												traceMetadata: {
													...evalTraceMetadata,
													webhookMessageId: batchPayload.messageId,
												},
												traceTags: [...evalTraceTags, "eval-image-batch"],
												workflowId: workflowTrace.workflowId,
												workflowName: workflowTrace.workflowName,
												workflowRunLabel: workflowTrace.workflowRunLabel,
												messageType: workflowTrace.messageType,
												mediaPurpose: workflowTrace.mediaPurpose,
												evalRecordMetadata,
												bisConnectionOverride:
													getSimulatedBisConnection(webhookEvalCase),
											},
											() =>
												POST({
													json: async () => batchPayload.payload,
												} as Request),
										),
									);
									await sleep(50);
								}
								const completed = await Promise.all(runs);
								return completed[completed.length - 1];
							})()
						: runWithSiteManagerAgentEvalContext(
								{
									threadId,
									model: agentModel,
									traceMetadata: evalTraceMetadata,
									traceTags: evalTraceTags,
									workflowId: workflowTrace.workflowId,
									workflowName: workflowTrace.workflowName,
									workflowRunLabel: workflowTrace.workflowRunLabel,
									messageType: workflowTrace.messageType,
									mediaPurpose: workflowTrace.mediaPurpose,
									evalRecordMetadata,
									bisConnectionOverride:
										getSimulatedBisConnection(webhookEvalCase),
								},
								() =>
									POST({
										json: async () => prepared.payload,
									} as Request),
							),
				);
				const agentRun = tracedRun.result;
				const latencyMs = Date.now() - started;
				const response = agentRun.result;
				if (response.status !== 200) {
					throw new Error(
						`Webhook returned status ${response.status} for ${evalCase.id}.`,
					);
				}

				const createdRecords = await findCreatedRecords({
					siteId,
					userId,
					startedAt: caseStartedAt,
					inputText: preparedForCase.inputText,
					runId,
					caseId: evalCase.id,
				});
				const createdPhotos = await findCreatedPhotos({
					siteId,
					userId,
					startedAt: caseStartedAt,
					inputText: preparedForCase.inputText,
					includeTextFilter: webhookEvalCase.expected.expectedPhotoDateISO
						? false
						: undefined,
				});
				warehousePhotos = webhookEvalCase.expected.materialRecords
					? await findPhotosBySourceUrl({
							siteId,
							userId,
							startedAt: caseStartedAt,
							sourcePhoto: currentUploadedImageUrl,
						})
					: [];
				createdPhotoIds = Array.from(
					new Set(
						[...createdPhotos, ...warehousePhotos].map((photo) => photo.id),
					),
				);
				materialRecords = await findCreatedMaterialRecords({
					siteId,
					userId,
					startedAt: caseStartedAt,
					sourcePhoto: currentUploadedImageUrl,
				});
				createdMaterialRecordIds = materialRecords.map((record) => record.id);
				const persistedRecords = getPersistedEvalRecordsFromTrace(
					tracedRun.entries,
				);
				createdRecordIds = Array.from(
					new Set(
						[...persistedRecords, ...createdRecords].map((record) => record.id),
					),
				);
				const recordsForValidation = selectRecordsForWhatsappEval({
					traceEntries: tracedRun.entries,
					fallbackRecords: createdRecords,
				});
				const selectedRecord = selectNewestEvalRecord(recordsForValidation);
				const deterministic = validateWhatsappSiteManagerRecord({
					evalCase: webhookEvalCase,
					siteId,
					userId,
					record: selectedRecord,
					records: recordsForValidation,
					materialRecords,
					createdPhotos,
					warehousePhotos,
					createdPhotoCount: createdPhotos.length,
					answer: agentRun.details?.content ?? "",
				});
				const judge =
					judgeClient && judgeModel
						? await judgeRecord({
								client: judgeClient,
								model: judgeModel,
								evalCase: webhookEvalCase,
								inputText: preparedForCase.inputText,
								record: selectedRecord,
								deterministic,
							})
						: {
								status: "skipped" as const,
								explanation:
									"Run with --judge or AI_EVAL_ENABLE_JUDGE=true to enable LLM judging.",
								improvements: [],
							};

				results.push({
					caseId: evalCase.id,
					webhookMessageId: preparedForCase.messageId,
					inputPreview: preview(preparedForCase.inputText),
					createdRecordIds,
					createdPhotoIds,
					createdMaterialRecordIds,
					selectedRecord,
					warehousePhotos,
					materialRecords,
					answer: agentRun.details?.content ?? "",
					requestedModel: agentRun.details?.requestedModel ?? agentModel,
					actualModel: agentRun.details?.actualModel ?? null,
					tokenUsage: agentRun.details?.tokenUsage ?? null,
					finishReason: agentRun.details?.finishReason ?? null,
					executionPath: agentRun.details?.executionPath ?? null,
					fastPathMode: agentRun.details?.fastPathMode ?? null,
					timings: agentRun.details?.timings ?? null,
					modelCalls: agentRun.details?.modelCalls ?? [],
					toolCalls: agentRun.details?.toolCalls ?? [],
					aggregateTokenUsage: agentRun.details?.aggregateTokenUsage ?? null,
					structuredSaveTrace: tracedRun.entries,
					deterministic,
					controlledMemory: skippedControlledMemoryResult(),
					judge,
					latencyMs,
					threadId,
				});

				const marker =
					deterministic.status === "fail" || judge.status === "fail"
						? "FAIL"
						: deterministic.heuristic.status === "warn" ||
								judge.status === "warn"
							? "WARN"
							: "PASS";
				const latencyLabel =
					latencyMs >= slowThresholdMs
						? `${latencyMs}ms, slow`
						: `${latencyMs}ms`;
				console.log(`[${marker}] ${evalCase.id} (${latencyLabel})`);

				if (webhookEvalCase.followUp) {
					const followUpId = `${webhookEvalCase.id}-follow-up`;
					const followUpCase: WebhookWhatsAppSiteManagerEvalCase = {
						...webhookEvalCase,
						id: followUpId,
						intent: `${webhookEvalCase.intent} Follow-up must use the same conversation context and satisfy the follow-up expectation without inventing missing details.`,
						expected: webhookEvalCase.followUp.expected,
						followUp: undefined,
					};
					const followUpPrepared = prepareWebhookPayload({
						evalCase: webhookEvalCase,
						runId,
						businessPhoneNumberId,
						senderPhone,
						bsuid,
						body: webhookEvalCase.followUp.body,
						messageSuffix: "follow-up",
					});
					const followUpWorkflowTrace = buildSiteManagerWorkflowTraceContext({
						messageType: followUpPrepared.messageType,
					});
					const followUpStartedAt = new Date();
					const followUpStarted = Date.now();
					const followUpTraceMetadata = {
						evalRunId: runId,
						evalCaseId: followUpId,
						evalMode: "real-meta-webhook-regression-follow-up",
						webhookMessageId: followUpPrepared.messageId,
						...followUpWorkflowTrace.metadata,
					};
					const followUpRecordMetadata = {
						isEval: true,
						environment: "single-db",
						flow: "whatsapp-site-manager",
						workflowId: followUpWorkflowTrace.workflowId,
						workflowName: followUpWorkflowTrace.workflowName,
						messageType: followUpWorkflowTrace.messageType,
						mediaPurpose: followUpWorkflowTrace.mediaPurpose,
						runId,
						caseId: followUpId,
						siteId,
						userId,
						organizationId: process.env.AI_EVAL_ALLOWED_ORGANIZATION_ID ?? null,
						messageId: followUpPrepared.messageId,
						createdBy: "ai-eval-runner",
					};
					const followUpTracedRun = await runWithStructuredSaveTrace(() =>
						runWithSiteManagerAgentEvalContext(
							{
								threadId,
								model: agentModel,
								traceMetadata: followUpTraceMetadata,
								traceTags: [
									...evalTraceTags,
									...followUpWorkflowTrace.tags,
									"eval-follow-up",
								],
								workflowId: followUpWorkflowTrace.workflowId,
								workflowName: followUpWorkflowTrace.workflowName,
								workflowRunLabel: followUpWorkflowTrace.workflowRunLabel,
								messageType: followUpWorkflowTrace.messageType,
								mediaPurpose: followUpWorkflowTrace.mediaPurpose,
								evalRecordMetadata: followUpRecordMetadata,
								bisConnectionOverride:
									getSimulatedBisConnection(webhookEvalCase),
							},
							() =>
								POST({ json: async () => followUpPrepared.payload } as Request),
						),
					);
					const followUpAgentRun = followUpTracedRun.result;
					const followUpLatencyMs = Date.now() - followUpStarted;
					if (followUpAgentRun.result.status !== 200) {
						throw new Error(
							`Webhook returned status ${followUpAgentRun.result.status} for ${followUpId}.`,
						);
					}

					const followUpCreatedRecords = await findCreatedRecords({
						siteId,
						userId,
						startedAt: followUpStartedAt,
						inputText: followUpPrepared.inputText,
						runId,
						caseId: followUpId,
						includeTextFallback: false,
					});
					const followUpPersistedRecords = getPersistedEvalRecordsFromTrace(
						followUpTracedRun.entries,
					);
					let followUpAuditRecords: SavedSiteDiaryRecord[] = [];
					if (
						followUpPersistedRecords.length === 0 &&
						followUpCreatedRecords.length === 0
					) {
						followUpAuditRecords = await findCorrectionAuditRecords({
							correctionMessageId: followUpPrepared.messageId,
						});
					}
					const followUpRecordIds = Array.from(
						new Set(
							[
								...followUpPersistedRecords,
								...followUpCreatedRecords,
								...followUpAuditRecords,
							].map((record) => record.id),
						),
					);
					createdRecordIds = Array.from(
						new Set([...createdRecordIds, ...followUpRecordIds]),
					);
					const followUpRecordsForValidation = selectRecordsForWhatsappEval({
						traceEntries: followUpTracedRun.entries,
						fallbackRecords:
							followUpCreatedRecords.length > 0
								? followUpCreatedRecords
								: followUpAuditRecords,
					});
					const followUpSelectedRecord = selectNewestEvalRecord(
						followUpRecordsForValidation,
					);
					const followUpDeterministic = validateWhatsappSiteManagerRecord({
						evalCase: followUpCase,
						siteId,
						userId,
						record: followUpSelectedRecord,
						records: followUpRecordsForValidation,
						materialRecords: [],
						answer: followUpAgentRun.details?.content ?? "",
					});
					const followUpJudge =
						judgeClient && judgeModel
							? await judgeRecord({
									client: judgeClient,
									model: judgeModel,
									evalCase: followUpCase,
									inputText: followUpPrepared.inputText,
									record: followUpSelectedRecord,
									deterministic: followUpDeterministic,
								})
							: {
									status: "skipped" as const,
									explanation:
										"Run with --judge or AI_EVAL_ENABLE_JUDGE=true to enable LLM judging.",
									improvements: [],
								};

					results.push({
						caseId: followUpId,
						webhookMessageId: followUpPrepared.messageId,
						inputPreview: preview(followUpPrepared.inputText),
						createdRecordIds: followUpRecordIds,
						createdPhotoIds: [],
						createdMaterialRecordIds: [],
						selectedRecord: followUpSelectedRecord,
						warehousePhotos: [],
						materialRecords: [],
						answer: followUpAgentRun.details?.content ?? "",
						requestedModel:
							followUpAgentRun.details?.requestedModel ?? agentModel,
						actualModel: followUpAgentRun.details?.actualModel ?? null,
						tokenUsage: followUpAgentRun.details?.tokenUsage ?? null,
						finishReason: followUpAgentRun.details?.finishReason ?? null,
						executionPath: followUpAgentRun.details?.executionPath ?? null,
						fastPathMode: followUpAgentRun.details?.fastPathMode ?? null,
						timings: followUpAgentRun.details?.timings ?? null,
						modelCalls: followUpAgentRun.details?.modelCalls ?? [],
						toolCalls: followUpAgentRun.details?.toolCalls ?? [],
						aggregateTokenUsage:
							followUpAgentRun.details?.aggregateTokenUsage ?? null,
						structuredSaveTrace: followUpTracedRun.entries,
						deterministic: followUpDeterministic,
						controlledMemory: skippedControlledMemoryResult(),
						judge: followUpJudge,
						latencyMs: followUpLatencyMs,
						threadId,
					});

					const followUpMarker =
						followUpDeterministic.status === "fail" ||
						followUpJudge.status === "fail"
							? "FAIL"
							: followUpDeterministic.heuristic.status === "warn" ||
									followUpJudge.status === "warn"
								? "WARN"
								: "PASS";
					console.log(
						`[${followUpMarker}] ${followUpId} (${followUpLatencyMs}ms)`,
					);
				}
			} finally {
				if (preserveRecords) {
					console.log(
						`[PRESERVED] ${evalCase.id} records=${createdRecordIds.join(",") || "none"} photos=${createdPhotoIds.join(",") || "none"} materials=${createdMaterialRecordIds.join(",") || "none"}`,
					);
					await Promise.all([
						cleanupEvalIdentity(businessPhoneNumberId),
						cleanupEvalCheckpointThread(threadId),
					]);
				} else {
					await Promise.all([
						cleanupEvalRows({
							siteId,
							userId,
							businessPhoneNumberId,
							recordIds: createdRecordIds,
							photoIds: createdPhotoIds,
							materialRecordIds: createdMaterialRecordIds,
							materialSourcePhoto: webhookEvalCase.expected.materialRecords
								? currentUploadedImageUrl
								: null,
							runId,
							caseId: evalCase.id,
						}),
						cleanupEvalCheckpointThread(threadId),
					]);
				}
			}
		}
	} finally {
		restoreFetch();
		if (previousUploadedImageUrl === undefined) {
			delete process.env.AI_EVAL_UPLOADED_IMAGE_URL;
		} else {
			process.env.AI_EVAL_UPLOADED_IMAGE_URL = previousUploadedImageUrl;
		}
		if (previousSkipMetaImageClassifier === undefined) {
			delete process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER;
		} else {
			process.env.AI_EVAL_SKIP_META_IMAGE_CLASSIFIER =
				previousSkipMetaImageClassifier;
		}
	}

	const latency = summarizeLatency(results, slowThresholdMs);
	const actualModels = Array.from(
		new Set(
			results
				.map((item) => item.actualModel)
				.filter((model): model is string => Boolean(model)),
		),
	);

	const report: WhatsAppSiteManagerEvalReport = {
		runId,
		flow: "whatsapp-site-manager",
		model: agentModel,
		requestedModel: agentModel,
		actualModels,
		judgeModel,
		siteId,
		userId,
		startedAt,
		finishedAt: new Date().toISOString(),
		results,
		latency,
		summary: {
			cases: results.length,
			deterministicFailures: results.reduce(
				(count, item) => count + (item.deterministic?.criticalFailures ?? 0),
				0,
			),
			deterministicCriticalFailures: results.reduce(
				(count, item) => count + (item.deterministic?.criticalFailures ?? 0),
				0,
			),
			deterministicWarnings: results.reduce(
				(count, item) => count + (item.deterministic?.warnings ?? 0),
				0,
			),
			heuristicWarnings: results.filter(
				(item) => item.deterministic?.heuristic.status === "warn",
			).length,
			heuristicFailures: results.filter(
				(item) => item.deterministic?.heuristic.status === "fail",
			).length,
			controlledMemoryFailures: results.filter(
				(item) => item.controlledMemory.status === "fail",
			).length,
			judgeWarnings: results.filter((item) => item.judge?.status === "warn")
				.length,
			judgeFailures: results.filter((item) => item.judge?.status === "fail")
				.length,
		},
	};

	const outputDir = path.join(process.cwd(), ".ai-eval-results");
	await mkdir(outputDir, { recursive: true });
	const outputPath = path.join(
		outputDir,
		`whatsapp-site-manager-${runId}.json`,
	);
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

	console.log(`Wrote ${outputPath}`);
	console.log(JSON.stringify(report.summary, null, 2));

	if (
		report.summary.deterministicCriticalFailures > 0 ||
		report.summary.controlledMemoryFailures > 0 ||
		report.summary.judgeFailures > 0
	) {
		process.exitCode = 1;
	}
}

runWithLangSmithTraceFlush(main).catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
