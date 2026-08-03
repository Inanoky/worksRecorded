import type { WhatsAppWorkerEvalCase } from "./whatsapp-worker-cases";

export type WhatsAppWorkerValidatorStatus = "pass" | "fail";
export type WhatsAppWorkerHeuristicStatus = "pass" | "warn" | "fail";
export type WhatsAppWorkerValidationSeverity = "critical" | "warning";
export type WhatsAppWorkerAggregateStatus = "pass" | "warn" | "fail";

export type SavedWorkerDiaryRecord = {
	id: string;
	siteId: string | null;
	userId: string | null;
	workerId: string | null;
	Location: string | null;
	Works: string | null;
	Comments: string | null;
	originalUserComment: string | null;
	originalAudioUrl: string | null;
	createdAt: Date;
	evalMetadata?: unknown;
};

export type SavedTimelogRecord = {
	id: string;
	workerId: string | null;
	siteId: string | null;
	clockIn: Date | null;
	clockOut: Date | null;
	createdAt: Date;
};

export type CapturedMetaGraphMessage = {
	url: string;
	body: Record<string, unknown>;
};

export type WorkerAfterState = {
	id: string;
	isClockedIn: boolean | null;
};

export type WhatsAppWorkerValidatorResult = {
	name: string;
	status: WhatsAppWorkerValidatorStatus;
	severity: WhatsAppWorkerValidationSeverity;
	message: string;
};

export type WhatsAppWorkerHeuristicResult = {
	status: WhatsAppWorkerHeuristicStatus;
	score: number;
	results: WhatsAppWorkerValidatorResult[];
};

export type WhatsAppWorkerValidationResult = {
	caseId: string;
	status: WhatsAppWorkerAggregateStatus;
	criticalFailures: number;
	warnings: number;
	results: WhatsAppWorkerValidatorResult[];
	heuristic: WhatsAppWorkerHeuristicResult;
};

function normalize(value: unknown) {
	return String(value ?? "")
		.toLocaleLowerCase("lv-LV")
		.replace(/\s+/g, " ")
		.trim();
}

function createResult(
	name: string,
	passed: boolean,
	message: string,
	severity: WhatsAppWorkerValidationSeverity = "critical",
): WhatsAppWorkerValidatorResult {
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
): WhatsAppWorkerValidationSeverity {
	return warningValidators.some(
		(validator) => name === validator || name.startsWith(`${validator}:`),
	)
		? "warning"
		: "critical";
}

function summarizeValidation(results: WhatsAppWorkerValidatorResult[]) {
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

function recordSearchText(record: SavedWorkerDiaryRecord | null) {
	if (!record) return "";
	return normalize(
		[record.Location, record.Works, record.Comments, record.originalUserComment]
			.filter((value) => value !== null && value !== undefined)
			.join(" "),
	);
}

function isClockInCard(message: CapturedMetaGraphMessage) {
	const interactive = message.body.interactive as any;
	return (
		message.body.type === "interactive" &&
		interactive?.type === "cta_url" &&
		interactive?.action?.name === "cta_url" &&
		typeof interactive?.action?.parameters?.url === "string" &&
		interactive.action.parameters.url.includes("/clock-in?token=")
	);
}

function containsSensitiveGraphData(value: unknown): boolean {
	if (typeof value === "string") {
		return (
			/token=[A-Za-z0-9._-]{12,}/.test(value) ||
			/"?(to|recipient)"?\s*:\s*"?\+?\d{8,}/.test(value)
		);
	}

	if (Array.isArray(value)) return value.some(containsSensitiveGraphData);

	if (value && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).some(
			([key, nested]) => {
				if (
					(key === "to" || key === "recipient") &&
					typeof nested === "string" &&
					/\d{8,}/.test(nested)
				) {
					return true;
				}

				return containsSensitiveGraphData(nested);
			},
		);
	}

	return false;
}

export function selectNewestWorkerDiaryRecord(
	records: SavedWorkerDiaryRecord[],
) {
	return (
		[...records].sort(
			(left, right) =>
				new Date(right.createdAt).getTime() -
				new Date(left.createdAt).getTime(),
		)[0] ?? null
	);
}

export function validateWhatsappWorkerCase(args: {
	evalCase: WhatsAppWorkerEvalCase;
	responseStatus: number;
	siteId: string;
	workerId: string;
	diaryRecords: SavedWorkerDiaryRecord[];
	timelogRecords: SavedTimelogRecord[];
	graphMessages: CapturedMetaGraphMessage[];
	workerAfter: WorkerAfterState | null;
	seededTimelogId?: string | null;
}): WhatsAppWorkerValidationResult {
	const {
		evalCase,
		responseStatus,
		siteId,
		workerId,
		diaryRecords,
		timelogRecords,
		graphMessages,
		workerAfter,
		seededTimelogId,
	} = args;
	const results: WhatsAppWorkerValidatorResult[] = [];
	const heuristicResults: WhatsAppWorkerValidatorResult[] = [];
	const selectedDiaryRecord = selectNewestWorkerDiaryRecord(
		diaryRecords.filter((record) => record.workerId === workerId),
	);
	const searchText = recordSearchText(selectedDiaryRecord);
	const clockInCards = graphMessages.filter(isClockInCard);
	const warningValidators = evalCase.expected.warningValidators;
	const seededTimelog = seededTimelogId
		? (timelogRecords.find((record) => record.id === seededTimelogId) ?? null)
		: null;

	results.push(
		createResult(
			"webhook-status",
			responseStatus === 200,
			`Webhook must return 200; got ${responseStatus}.`,
			validatorSeverity("webhook-status", warningValidators),
		),
		createResult(
			"no-user-diary-record",
			!evalCase.expected.noUserDiaryRecord ||
				diaryRecords.every(
					(record) => record.userId === null && record.workerId === workerId,
				),
			"Worker eval must not create a site-manager/user-owned diary record.",
			validatorSeverity("no-user-diary-record", warningValidators),
		),
		createResult(
			"graph-message-redaction",
			graphMessages.every(
				(message) => !containsSensitiveGraphData(message.body),
			),
			"Captured Graph API payloads must redact phone numbers and clock-in token values.",
			validatorSeverity("graph-message-redaction", warningValidators),
		),
	);

	if (typeof evalCase.expected.clockInCardSent === "boolean") {
		const expected = evalCase.expected.clockInCardSent;
		results.push(
			createResult(
				"clock-in-card",
				expected ? clockInCards.length > 0 : clockInCards.length === 0,
				expected
					? "A clock-in card with a clock-in URL must be sent."
					: "A clock-in card must not be sent.",
				validatorSeverity("clock-in-card", warningValidators),
			),
		);
	}

	if (typeof evalCase.expected.clockOutClosed === "boolean") {
		const expected = evalCase.expected.clockOutClosed;
		results.push(
			createResult(
				"clock-out-closed",
				expected ? Boolean(seededTimelog?.clockOut) : !seededTimelog?.clockOut,
				expected
					? "The seeded open timelog must be clocked out."
					: "The seeded timelog must stay open.",
				validatorSeverity("clock-out-closed", warningValidators),
			),
		);
	}

	if (typeof evalCase.expected.workerIsClockedIn === "boolean") {
		results.push(
			createResult(
				"worker-clocked-in-state",
				workerAfter?.isClockedIn === evalCase.expected.workerIsClockedIn,
				`Worker isClockedIn must be ${evalCase.expected.workerIsClockedIn}; got ${String(workerAfter?.isClockedIn)}.`,
				validatorSeverity("worker-clocked-in-state", warningValidators),
			),
		);
	}

	if (typeof evalCase.expected.workerDiaryRecordCreated === "boolean") {
		const expected = evalCase.expected.workerDiaryRecordCreated;
		results.push(
			createResult(
				"worker-diary-record-created",
				expected ? Boolean(selectedDiaryRecord) : diaryRecords.length === 0,
				expected
					? "A worker-owned site diary record must be created."
					: "No worker diary record should be created.",
				validatorSeverity("worker-diary-record-created", warningValidators),
			),
		);
	}

	if (evalCase.expected.noTimelogCreated) {
		const nonSeededTimelogs = timelogRecords.filter(
			(record) => record.id !== seededTimelogId,
		);
		results.push(
			createResult(
				"no-timelog-created",
				nonSeededTimelogs.length === 0,
				`No new timelog rows should be created; got ${nonSeededTimelogs.length}.`,
				validatorSeverity("no-timelog-created", warningValidators),
			),
		);
	}

	if (selectedDiaryRecord) {
		results.push(
			createResult(
				"worker-diary-site",
				selectedDiaryRecord.siteId === siteId,
				`Worker diary record must belong to eval site ${siteId}.`,
				validatorSeverity("worker-diary-site", warningValidators),
			),
			createResult(
				"worker-diary-worker",
				selectedDiaryRecord.workerId === workerId,
				`Worker diary record must belong to eval worker ${workerId}.`,
				validatorSeverity("worker-diary-worker", warningValidators),
			),
			createResult(
				"worker-diary-no-user",
				selectedDiaryRecord.userId === null,
				"Worker diary record must not be user-owned.",
				validatorSeverity("worker-diary-no-user", warningValidators),
			),
		);
	}

	for (const signal of evalCase.expected.requiredDiaryTextSignals) {
		const passed = searchText.includes(normalize(signal));
		heuristicResults.push(
			createResult(
				`diary-text-signal:${signal}`,
				passed,
				`Saved worker diary record must preserve text signal "${signal}".`,
				validatorSeverity(`diary-text-signal:${signal}`, warningValidators),
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
	const heuristicStatus: WhatsAppWorkerHeuristicStatus =
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
