import type { WebhookWhatsAppSiteManagerEvalCase } from "./whatsapp-site-manager-cases";

export type WhatsAppValidatorStatus = "pass" | "fail";
export type WhatsAppHeuristicStatus = "pass" | "warn" | "fail";
export type WhatsAppValidationSeverity = "critical" | "warning";
export type WhatsAppAggregateStatus = "pass" | "warn" | "fail";

export type SavedSiteDiaryRecord = {
	id: string;
	siteId: string | null;
	userId: string | null;
	workerId: string | null;
	Date: Date | null;
	Location: string | null;
	Works: string | null;
	Comments: string | null;
	originalUserComment: string | null;
	originalAudioUrl: string | null;
	WorkersInvolved: number | null;
	TimeInvolved: number | null;
	Amounts?: number | null;
	evalMetadata?: unknown;
	createdAt: Date;
};

export type WhatsAppValidatorResult = {
	name: string;
	status: WhatsAppValidatorStatus;
	severity: WhatsAppValidationSeverity;
	message: string;
};

export type WhatsAppHeuristicResult = {
	status: WhatsAppHeuristicStatus;
	score: number;
	results: WhatsAppValidatorResult[];
};

export type WhatsAppTurnValidationResult = {
	caseId: string;
	status: WhatsAppAggregateStatus;
	criticalFailures: number;
	warnings: number;
	results: WhatsAppValidatorResult[];
	heuristic: WhatsAppHeuristicResult;
};

function normalize(value: unknown) {
	return String(value ?? "")
		.toLocaleLowerCase("lv-LV")
		.replace(/\s+/g, " ")
		.trim();
}

function recordSearchText(record: SavedSiteDiaryRecord | null) {
	if (!record) return "";
	return normalize(
		[
			record.Location,
			record.Works,
			record.Comments,
			record.originalUserComment,
			record.WorkersInvolved,
			record.TimeInvolved,
			record.Amounts,
		]
			.filter((value) => value !== null && value !== undefined)
			.join(" "),
	);
}

function includesSignal(value: string, signal: string) {
	return signal
		.split("|")
		.map((item) => normalize(item))
		.some((variant) => variant.length > 0 && value.includes(variant));
}

function answerSentences(value: string) {
	return (value.trim().match(/[^.!?\n]+[.!?]?/g) ?? [])
		.map((sentence) => sentence.trim())
		.filter(Boolean);
}

function createResult(
	name: string,
	passed: boolean,
	message: string,
	severity: WhatsAppValidationSeverity = "critical",
): WhatsAppValidatorResult {
	return {
		name,
		status: passed ? "pass" : "fail",
		severity,
		message,
	};
}

function validatorSeverity(
	name: string,
	warningValidators: string[],
): WhatsAppValidationSeverity {
	return warningValidators.some(
		(validator) => name === validator || name.startsWith(`${validator}:`),
	)
		? "warning"
		: "critical";
}

function summarizeValidation(results: WhatsAppValidatorResult[]) {
	const failed = results.filter((result) => result.status === "fail");
	const criticalFailures = failed.filter(
		(result) => result.severity === "critical",
	).length;
	const warnings = failed.filter(
		(result) => result.severity === "warning",
	).length;
	return {
		criticalFailures,
		warnings,
		status:
			criticalFailures > 0
				? ("fail" as const)
				: warnings > 0
					? ("warn" as const)
					: ("pass" as const),
	};
}

function nearNumber(actual: number | null | undefined, expected: number) {
	return (
		typeof actual === "number" &&
		Number.isFinite(actual) &&
		Math.abs(actual - expected) < 0.01
	);
}

function formatNumberForMessage(value: number | null | undefined) {
	return typeof value === "number" && Number.isFinite(value)
		? String(value)
		: String(value ?? "null");
}

function isMetaLookasideUrl(value: string | null | undefined) {
	if (!value) return false;
	try {
		return new URL(value).hostname === "lookaside.fbsbx.com";
	} catch {
		return false;
	}
}

function toDateISO(value: Date | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function validateWhatsappSiteManagerRecord(args: {
	evalCase: WebhookWhatsAppSiteManagerEvalCase;
	record: SavedSiteDiaryRecord | null;
	records?: SavedSiteDiaryRecord[];
	createdPhotoCount?: number;
	answer?: string;
	siteId: string;
	userId: string;
}): WhatsAppTurnValidationResult {
	const {
		evalCase,
		record,
		records,
		createdPhotoCount,
		answer,
		siteId,
		userId,
	} = args;
	const results: WhatsAppValidatorResult[] = [];
	const heuristicResults: WhatsAppValidatorResult[] = [];
	const searchText = (records ?? (record ? [record] : []))
		.map(recordSearchText)
		.join(" ");
	const answerText = normalize(answer);
	const sentences = answerSentences(String(answer ?? ""));
	const firstSentence = normalize(sentences[0] ?? "");
	const shouldCreateRecord = evalCase.expected.shouldCreateRecord;
	const warningValidators = evalCase.expected.warningValidators;

	results.push(
		createResult(
			"record-created",
			shouldCreateRecord ? Boolean(record) : !record,
			shouldCreateRecord
				? "A site diary record must be created."
				: "No site diary record should be created.",
			validatorSeverity("record-created", warningValidators),
		),
	);
	if (records) {
		const expectedCount =
			evalCase.expected.expectedRecordCount ?? (shouldCreateRecord ? 1 : 0);
		results.push(
			createResult(
				"record-count",
				records.length === expectedCount,
				`Expected ${expectedCount} site diary record(s); got ${records.length}.`,
				validatorSeverity("record-count", warningValidators),
			),
		);
	}
	if (evalCase.expected.expectedPhotoCount !== undefined) {
		const expectedCount = evalCase.expected.expectedPhotoCount;
		results.push(
			createResult(
				"photo-count",
				createdPhotoCount === expectedCount,
				`Expected ${expectedCount} saved photo(s); got ${createdPhotoCount ?? 0}.`,
				validatorSeverity("photo-count", warningValidators),
			),
		);
	}

	if (evalCase.expected.expectedDateISO) {
		const expectedDateISO = evalCase.expected.expectedDateISO;
		results.push(
			createResult(
				"record-date",
				toDateISO(record?.Date) === expectedDateISO,
				`Record date must be ${expectedDateISO}; got ${toDateISO(record?.Date) ?? "null"}.`,
				validatorSeverity("record-date", warningValidators),
			),
		);
	}

	if (record) {
		results.push(
			createResult(
				"site-id",
				record.siteId === siteId,
				`Record must belong to eval site ${siteId}.`,
				validatorSeverity("site-id", warningValidators),
			),
			createResult(
				"user-id",
				record.userId === userId,
				`Record must belong to eval user ${userId}.`,
				validatorSeverity("user-id", warningValidators),
			),
			createResult(
				"no-worker-route",
				!record.workerId,
				"Site-manager eval records must not be saved as worker records.",
				validatorSeverity("no-worker-route", warningValidators),
			),
			createResult(
				"no-meta-audio-url",
				!isMetaLookasideUrl(record.originalAudioUrl),
				"Persisted audio URL must not be an expiring Meta lookaside URL.",
				validatorSeverity("no-meta-audio-url", warningValidators),
			),
		);
	}

	for (const signal of evalCase.expected.requiredAnswerSignals) {
		results.push(
			createResult(
				`answer-signal:${signal}`,
				includesSignal(answerText, signal),
				`Agent answer must include signal "${signal}".`,
				validatorSeverity(`answer-signal:${signal}`, warningValidators),
			),
		);
	}

	for (const signal of evalCase.expected.firstSentenceSignals) {
		results.push(
			createResult(
				`first-sentence-signal:${signal}`,
				includesSignal(firstSentence, signal),
				`Agent's first sentence must include signal "${signal}".`,
				validatorSeverity(`first-sentence-signal:${signal}`, warningValidators),
			),
		);
	}

	if (evalCase.expected.maxAnswerSentences !== undefined) {
		const maximum = evalCase.expected.maxAnswerSentences;
		results.push(
			createResult(
				"answer-sentence-limit",
				sentences.length <= maximum,
				`Agent answer must contain at most ${maximum} sentence(s); got ${sentences.length}.`,
				validatorSeverity("answer-sentence-limit", warningValidators),
			),
		);
	}

	const forbiddenAnswerMatches =
		evalCase.expected.forbiddenAnswerSignals.filter((signal) =>
			includesSignal(answerText, signal),
		);
	results.push(
		createResult(
			"forbidden-answer-signals",
			forbiddenAnswerMatches.length === 0,
			forbiddenAnswerMatches.length
				? `Agent answer includes forbidden signal(s): ${forbiddenAnswerMatches.join(", ")}.`
				: "Agent answer does not claim forbidden behavior.",
			validatorSeverity("forbidden-answer-signals", warningValidators),
		),
	);

	for (const signal of evalCase.expected.requiredTextSignals) {
		const passed = searchText.includes(normalize(signal));
		heuristicResults.push(
			createResult(
				`text-signal:${signal}`,
				passed,
				`Saved record must preserve text signal "${signal}".`,
				validatorSeverity(`text-signal:${signal}`, warningValidators),
			),
		);
	}

	if (typeof evalCase.expected.workersInvolved === "number") {
		const expected = evalCase.expected.workersInvolved;
		heuristicResults.push(
			createResult(
				"workers-involved",
				nearNumber(record?.WorkersInvolved, expected),
				`WorkersInvolved must be ${expected}; got ${formatNumberForMessage(record?.WorkersInvolved)}.`,
				validatorSeverity("workers-involved", warningValidators),
			),
		);
	} else if (evalCase.expected.workersInvolved === null) {
		heuristicResults.push(
			createResult(
				"workers-involved",
				record?.WorkersInvolved == null,
				`WorkersInvolved must be null when no worker count is stated; got ${formatNumberForMessage(record?.WorkersInvolved)}.`,
				validatorSeverity("workers-involved", warningValidators),
			),
		);
	}

	if (typeof evalCase.expected.timeInvolved === "number") {
		const expected = evalCase.expected.timeInvolved;
		heuristicResults.push(
			createResult(
				"time-involved",
				nearNumber(record?.TimeInvolved, expected),
				`TimeInvolved must be ${expected}; got ${formatNumberForMessage(record?.TimeInvolved)}.`,
				validatorSeverity("time-involved", warningValidators),
			),
		);
	}

	if (typeof evalCase.expected.amounts === "number") {
		const expected = evalCase.expected.amounts;
		heuristicResults.push(
			createResult(
				"amounts",
				nearNumber(record?.Amounts, expected),
				`Amounts must be ${expected}; got ${formatNumberForMessage(record?.Amounts)}.`,
				validatorSeverity("amounts", warningValidators),
			),
		);
	} else if (evalCase.expected.amounts === null) {
		heuristicResults.push(
			createResult(
				"amounts",
				record?.Amounts == null,
				`Amounts must be null when no completed quantity is stated; got ${formatNumberForMessage(record?.Amounts)}.`,
				validatorSeverity("amounts", warningValidators),
			),
		);
	}

	const passedHeuristics = heuristicResults.filter(
		(result) => result.status === "pass",
	).length;
	const score =
		heuristicResults.length > 0
			? passedHeuristics / heuristicResults.length
			: 1;
	const heuristicStatus: WhatsAppHeuristicStatus =
		score >= evalCase.expected.minHeuristicScore
			? "pass"
			: score >= 0.5
				? "warn"
				: "fail";

	results.push(
		createResult(
			"heuristic-min-score",
			heuristicStatus !== "fail",
			`Heuristic score must not fail. Score: ${score.toFixed(2)}.`,
			validatorSeverity("heuristic-min-score", warningValidators),
		),
	);

	const allResults = [...results, ...heuristicResults];
	const summary = summarizeValidation(allResults);

	return {
		caseId: evalCase.id,
		status: summary.status,
		criticalFailures: summary.criticalFailures,
		warnings: summary.warnings,
		results: allResults,
		heuristic: {
			status: heuristicStatus,
			score,
			results: heuristicResults,
		},
	};
}
