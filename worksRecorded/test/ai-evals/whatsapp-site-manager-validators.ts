import type { WebhookWhatsAppSiteManagerEvalCase } from "./whatsapp-site-manager-cases";

export type WhatsAppValidatorStatus = "pass" | "fail";
export type WhatsAppHeuristicStatus = "pass" | "warn" | "fail";

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
  message: string;
};

export type WhatsAppHeuristicResult = {
  status: WhatsAppHeuristicStatus;
  score: number;
  results: WhatsAppValidatorResult[];
};

export type WhatsAppTurnValidationResult = {
  caseId: string;
  status: WhatsAppValidatorStatus;
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
): WhatsAppValidatorResult {
  return {
    name,
    status: passed ? "pass" : "fail",
    message,
  };
}

function nearNumber(actual: number | null | undefined, expected: number) {
  return typeof actual === "number" && Number.isFinite(actual) && Math.abs(actual - expected) < 0.01;
}

function formatNumberForMessage(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? "null");
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
  answer?: string;
  siteId: string;
  userId: string;
}): WhatsAppTurnValidationResult {
  const { evalCase, record, records, answer, siteId, userId } = args;
  const results: WhatsAppValidatorResult[] = [];
  const heuristicResults: WhatsAppValidatorResult[] = [];
  const searchText = (records ?? (record ? [record] : []))
    .map(recordSearchText)
    .join(" ");
  const answerText = normalize(answer);
  const sentences = answerSentences(String(answer ?? ""));
  const firstSentence = normalize(sentences[0] ?? "");
  const shouldCreateRecord = evalCase.expected.shouldCreateRecord;

  results.push(
    createResult(
      "record-created",
      shouldCreateRecord ? Boolean(record) : !record,
      shouldCreateRecord
        ? "A site diary record must be created."
        : "No site diary record should be created.",
    ),
  );
  if (records) {
    const expectedCount = evalCase.expected.expectedRecordCount ?? (shouldCreateRecord ? 1 : 0);
    results.push(
      createResult(
        "record-count",
        records.length === expectedCount,
        `Expected ${expectedCount} site diary record(s); got ${records.length}.`,
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
      ),
    );
  }

  if (record) {
    results.push(
      createResult(
        "site-id",
        record.siteId === siteId,
        `Record must belong to eval site ${siteId}.`,
      ),
      createResult(
        "user-id",
        record.userId === userId,
        `Record must belong to eval user ${userId}.`,
      ),
      createResult(
        "no-worker-route",
        !record.workerId,
        "Site-manager eval records must not be saved as worker records.",
      ),
      createResult(
        "no-meta-audio-url",
        !isMetaLookasideUrl(record.originalAudioUrl),
        "Persisted audio URL must not be an expiring Meta lookaside URL.",
      ),
    );
  }

  for (const signal of evalCase.expected.requiredAnswerSignals) {
    results.push(
      createResult(
        `answer-signal:${signal}`,
        includesSignal(answerText, signal),
        `Agent answer must include signal "${signal}".`,
      ),
    );
  }

  for (const signal of evalCase.expected.firstSentenceSignals) {
    results.push(
      createResult(
        `first-sentence-signal:${signal}`,
        includesSignal(firstSentence, signal),
        `Agent's first sentence must include signal "${signal}".`,
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
      ),
    );
  }

  const forbiddenAnswerMatches = evalCase.expected.forbiddenAnswerSignals.filter((signal) =>
    includesSignal(answerText, signal),
  );
  results.push(
    createResult(
      "forbidden-answer-signals",
      forbiddenAnswerMatches.length === 0,
      forbiddenAnswerMatches.length
        ? `Agent answer includes forbidden signal(s): ${forbiddenAnswerMatches.join(", ")}.`
        : "Agent answer does not claim forbidden behavior.",
    ),
  );

  for (const signal of evalCase.expected.requiredTextSignals) {
    const passed = searchText.includes(normalize(signal));
    heuristicResults.push(
      createResult(
        `text-signal:${signal}`,
        passed,
        `Saved record must preserve text signal "${signal}".`,
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
      ),
    );
  } else if (evalCase.expected.workersInvolved === null) {
    heuristicResults.push(
      createResult(
        "workers-involved",
        record?.WorkersInvolved == null,
        `WorkersInvolved must be null when no worker count is stated; got ${formatNumberForMessage(record?.WorkersInvolved)}.`,
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
      ),
    );
  } else if (evalCase.expected.amounts === null) {
    heuristicResults.push(
      createResult(
        "amounts",
        record?.Amounts == null,
        `Amounts must be null when no completed quantity is stated; got ${formatNumberForMessage(record?.Amounts)}.`,
      ),
    );
  }

  const passedHeuristics = heuristicResults.filter((result) => result.status === "pass").length;
  const score = heuristicResults.length > 0 ? passedHeuristics / heuristicResults.length : 1;
  const heuristicStatus: WhatsAppHeuristicStatus =
    score >= evalCase.expected.minHeuristicScore ? "pass" : score >= 0.5 ? "warn" : "fail";

  results.push(
    createResult(
      "heuristic-min-score",
      heuristicStatus !== "fail",
      `Heuristic score must not fail. Score: ${score.toFixed(2)}.`,
    ),
  );

  const allResults = [...results, ...heuristicResults];
  const hardStructuredResults = heuristicResults.filter((result) =>
    result.name === "workers-involved" || result.name === "time-involved" || result.name === "amounts"
  );

  return {
    caseId: evalCase.id,
    status:
      results.every((result) => result.status === "pass") &&
      hardStructuredResults.every((result) => result.status === "pass") &&
      heuristicStatus !== "fail"
        ? "pass"
        : "fail",
    results: allResults,
    heuristic: {
      status: heuristicStatus,
      score,
      results: heuristicResults,
    },
  };
}
