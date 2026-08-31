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
	Location_Custom_1?: string | null;
	Location_Custom_2?: string | null;
	Works: string | null;
	Works_Custom_1?: string | null;
	Works_Custom_2?: string | null;
	Comments: string | null;
	Comments_Custom_1?: string | null;
	Comments_Custom_2?: string | null;
	originalUserComment: string | null;
	originalAudioUrl: string | null;
	Units?: string | null;
	WorkersInvolved: number | null;
	TimeInvolved: number | null;
	Amounts?: number | null;
	evalMetadata?: unknown;
	createdAt: Date;
};

export type SavedBisMaterialRecord = {
	id: string;
	siteId: string | null;
	userId: string | null;
	name: string | null;
	invoiceNr: string | null;
	invoiceDate: Date | null;
	cost: number | null;
	quantity: number | null;
	sourcePhoto: string | null;
	createdAt: Date;
};

export type SavedPhotoRecord = {
	id: string;
	siteId: string | null;
	userId: string | null;
	workerId: string | null;
	URL: string | null;
	fileUrl: string | null;
	Comment: string | null;
	mediaPurpose: string | null;
	Date?: Date | null;
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
			record.Location_Custom_1,
			record.Location_Custom_2,
			record.Works,
			record.Works_Custom_1,
			record.Works_Custom_2,
			record.Comments,
			record.Comments_Custom_1,
			record.Comments_Custom_2,
			record.originalUserComment,
			record.Units,
			record.WorkersInvolved,
			record.TimeInvolved,
			record.Amounts,
		]
			.filter((value) => value !== null && value !== undefined)
			.join(" "),
	);
}

function materialRecordSearchText(record: SavedBisMaterialRecord | null) {
	if (!record) return "";
	return normalize(
		[
			record.name,
			record.invoiceNr,
			record.cost,
			record.quantity,
			toDateISO(record.invoiceDate),
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

function matchesNumericExpectation(
	actual: number | null | undefined,
	expected: number | null | undefined,
	allowZeroForNull: boolean,
) {
	if (expected === undefined) return true;
	if (typeof expected === "number") return nearNumber(actual, expected);
	return actual == null || (allowZeroForNull && nearNumber(actual, 0));
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

function recordFieldText(record: SavedSiteDiaryRecord, field: string) {
	return normalize((record as Record<string, unknown>)[field]);
}

function recordSummary(record: SavedSiteDiaryRecord) {
	return [
		record.Location,
		record.Location_Custom_1,
		record.Works,
		record.Works_Custom_1,
		record.Units,
		formatNumberForMessage(record.Amounts),
		formatNumberForMessage(record.WorkersInvolved),
		formatNumberForMessage(record.TimeInvolved),
	]
		.filter((value) => value !== null && value !== undefined && value !== "")
		.join(" / ");
}

function recordMatchesExpectation(args: {
	record: SavedSiteDiaryRecord;
	expectedRecord: WebhookWhatsAppSiteManagerEvalCase["expected"]["records"][number];
	allowZeroForNull: boolean;
}) {
	const { record, expectedRecord, allowZeroForNull } = args;
	const searchText = recordSearchText(record);
	const requiredTextMatches = expectedRecord.requiredTextSignals.every(
		(signal) => includesSignal(searchText, signal),
	);
	const requiredFieldMatches = Object.entries(
		expectedRecord.requiredFieldSignals,
	).every(([field, signals]) =>
		signals.every((signal) =>
			includesSignal(recordFieldText(record, field), signal),
		),
	);
	const forbiddenFieldMatches = Object.entries(
		expectedRecord.forbiddenFieldSignals,
	).every(([field, signals]) =>
		signals.every(
			(signal) => !includesSignal(recordFieldText(record, field), signal),
		),
	);
	const numericMatches =
		matchesNumericExpectation(
			record.WorkersInvolved,
			expectedRecord.workersInvolved,
			allowZeroForNull,
		) &&
		matchesNumericExpectation(
			record.TimeInvolved,
			expectedRecord.timeInvolved,
			allowZeroForNull,
		) &&
		matchesNumericExpectation(
			record.Amounts,
			expectedRecord.amounts,
			allowZeroForNull,
		);
	const unitsMatch = expectedRecord.units
		? includesSignal(normalize(record.Units), expectedRecord.units)
		: true;

	return (
		requiredTextMatches &&
		requiredFieldMatches &&
		forbiddenFieldMatches &&
		numericMatches &&
		unitsMatch
	);
}

export function validateWhatsappSiteManagerRecord(args: {
	evalCase: WebhookWhatsAppSiteManagerEvalCase;
	record: SavedSiteDiaryRecord | null;
	records?: SavedSiteDiaryRecord[];
	materialRecords?: SavedBisMaterialRecord[];
	createdPhotos?: SavedPhotoRecord[];
	warehousePhotos?: SavedPhotoRecord[];
	createdPhotoCount?: number;
	answer?: string;
	siteId: string;
	userId: string;
}): WhatsAppTurnValidationResult {
	const {
		evalCase,
		record,
		records,
		materialRecords = [],
		createdPhotos = [],
		warehousePhotos = [],
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
	const materialExpectation = evalCase.expected.materialRecords;
	const materialSearchText = materialRecords
		.map(materialRecordSearchText)
		.join(" ");
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
	if (evalCase.expected.expectedPhotoPurpose) {
		const expectedPurpose = evalCase.expected.expectedPhotoPurpose;
		const photosToValidate =
			expectedPurpose === "warehouse_invoice" ? warehousePhotos : createdPhotos;
		results.push(
			createResult(
				`photo-purpose:${expectedPurpose}`,
				photosToValidate.length > 0 &&
					photosToValidate.every(
						(photo) => photo.mediaPurpose === expectedPurpose,
					),
				`Expected ${photosToValidate.length || "matching"} photo(s) to have mediaPurpose ${expectedPurpose}; got ${photosToValidate.map((photo) => photo.mediaPurpose ?? "null").join(", ") || "none"}.`,
				validatorSeverity(
					`photo-purpose:${expectedPurpose}`,
					warningValidators,
				),
			),
		);
	}
	if (evalCase.expected.expectedPhotoDateISO) {
		const expectedPhotoDateISO = evalCase.expected.expectedPhotoDateISO;
		results.push(
			createResult(
				"photo-date",
				createdPhotos.length > 0 &&
					createdPhotos.every(
						(photo) => toDateISO(photo.Date) === expectedPhotoDateISO,
					),
				`Expected saved photo date ${expectedPhotoDateISO}; got ${createdPhotos.map((photo) => toDateISO(photo.Date) ?? "null").join(", ") || "none"}.`,
				validatorSeverity("photo-date", warningValidators),
			),
		);
	}
	if (evalCase.expected.expectedWarehousePhotoCount !== undefined) {
		const expectedCount = evalCase.expected.expectedWarehousePhotoCount;
		results.push(
			createResult(
				"warehouse-photo-count",
				warehousePhotos.length === expectedCount,
				`Expected ${expectedCount} warehouse photo(s); got ${warehousePhotos.length}.`,
				validatorSeverity("warehouse-photo-count", warningValidators),
			),
		);
	}

	if (materialExpectation) {
		if (materialExpectation.expectedRecordCount !== undefined) {
			const expectedCount = materialExpectation.expectedRecordCount;
			results.push(
				createResult(
					"material-record-count",
					materialRecords.length === expectedCount,
					`Expected ${expectedCount} material record(s); got ${materialRecords.length}.`,
					validatorSeverity("material-record-count", warningValidators),
				),
			);
		} else {
			const minimumCount = materialExpectation.minRecordCount;
			results.push(
				createResult(
					"material-record-count",
					materialRecords.length >= minimumCount,
					`Expected at least ${minimumCount} material record(s); got ${materialRecords.length}.`,
					validatorSeverity("material-record-count", warningValidators),
				),
			);
		}

		const matchingInvoiceRecords = materialExpectation.invoiceNr
			? materialRecords.filter(
					(record) => record.invoiceNr === materialExpectation.invoiceNr,
				)
			: materialRecords;

		if (materialExpectation.invoiceNr) {
			results.push(
				createResult(
					`material-invoice-nr:${materialExpectation.invoiceNr}`,
					matchingInvoiceRecords.length > 0,
					`Expected a material record with invoice number ${materialExpectation.invoiceNr}.`,
					validatorSeverity(
						`material-invoice-nr:${materialExpectation.invoiceNr}`,
						warningValidators,
					),
				),
			);
		}

		if (materialExpectation.expectedInvoiceDateISO) {
			const expectedDate = materialExpectation.expectedInvoiceDateISO;
			results.push(
				createResult(
					`material-invoice-date:${expectedDate}`,
					matchingInvoiceRecords.some(
						(record) => toDateISO(record.invoiceDate) === expectedDate,
					),
					`Expected material invoice date ${expectedDate}; got ${matchingInvoiceRecords.map((record) => toDateISO(record.invoiceDate) ?? "null").join(", ") || "none"}.`,
					validatorSeverity(
						`material-invoice-date:${expectedDate}`,
						warningValidators,
					),
				),
			);
		}

		if (materialExpectation.forbiddenInvoiceDateISO) {
			const forbiddenDate = materialExpectation.forbiddenInvoiceDateISO;
			results.push(
				createResult(
					`material-forbidden-invoice-date:${forbiddenDate}`,
					!matchingInvoiceRecords.some(
						(record) => toDateISO(record.invoiceDate) === forbiddenDate,
					),
					`Material invoice date must not be ${forbiddenDate}.`,
					validatorSeverity(
						`material-forbidden-invoice-date:${forbiddenDate}`,
						warningValidators,
					),
				),
			);
		}

		for (const signal of materialExpectation.requiredNameSignals) {
			results.push(
				createResult(
					`material-name-signal:${signal}`,
					materialSearchText.includes(normalize(signal)),
					`Material records must preserve name signal "${signal}".`,
					validatorSeverity(
						`material-name-signal:${signal}`,
						warningValidators,
					),
				),
			);
		}
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
		const passed = includesSignal(searchText, signal);
		heuristicResults.push(
			createResult(
				`text-signal:${signal}`,
				passed,
				`Saved record must preserve text signal "${signal}".`,
				validatorSeverity(`text-signal:${signal}`, warningValidators),
			),
		);
	}

	const expectedRecords = evalCase.expected.records;
	if (expectedRecords.length > 0) {
		const actualRecords = records ?? (record ? [record] : []);
		const usedRecordIndexes = new Set<number>();
		expectedRecords.forEach((expectedRecord, index) => {
			const allowZeroForNull =
				evalCase.expected.nullNumericValuesCanBeZero ||
				expectedRecord.nullNumericValuesCanBeZero;
			const matchingIndex = actualRecords.findIndex(
				(candidate, candidateIndex) =>
					!usedRecordIndexes.has(candidateIndex) &&
					recordMatchesExpectation({
						record: candidate,
						expectedRecord,
						allowZeroForNull,
					}),
			);
			if (matchingIndex >= 0) usedRecordIndexes.add(matchingIndex);
			heuristicResults.push(
				createResult(
					`expected-record:${index + 1}`,
					matchingIndex >= 0,
					matchingIndex >= 0
						? `Expected record ${index + 1} matched ${actualRecords[matchingIndex]?.id}.`
						: `Expected record ${index + 1} did not match any saved record. Saved records: ${actualRecords.map(recordSummary).join(" | ") || "none"}.`,
					validatorSeverity(`expected-record:${index + 1}`, warningValidators),
				),
			);
		});
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
				matchesNumericExpectation(
					record?.WorkersInvolved,
					null,
					evalCase.expected.nullNumericValuesCanBeZero,
				),
				`WorkersInvolved must be null${evalCase.expected.nullNumericValuesCanBeZero ? " or 0" : ""} when no worker count is stated; got ${formatNumberForMessage(record?.WorkersInvolved)}.`,
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
				matchesNumericExpectation(
					record?.Amounts,
					null,
					evalCase.expected.nullNumericValuesCanBeZero,
				),
				`Amounts must be null${evalCase.expected.nullNumericValuesCanBeZero ? " or 0" : ""} when no completed quantity is stated; got ${formatNumberForMessage(record?.Amounts)}.`,
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
