import type { WhatsAppSiteManagerEvalCase } from "./whatsapp-site-manager-cases";

export type WhatsAppValidatorStatus = "pass" | "fail";
export type WhatsAppHeuristicStatus = "pass" | "warn" | "fail";

export type SavedSiteDiaryRecord = {
  id: string;
  siteId: string | null;
  userId: string | null;
  workerId: string | null;
  Location: string | null;
  Works: string | null;
  Comments: string | null;
  originalUserComment: string | null;
  originalAudioUrl: string | null;
  WorkersInvolved: number | null;
  TimeInvolved: number | null;
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
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
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

export function validateWhatsappSiteManagerRecord(args: {
  evalCase: WhatsAppSiteManagerEvalCase;
  record: SavedSiteDiaryRecord | null;
  records?: SavedSiteDiaryRecord[];
  siteId: string;
  userId: string;
}): WhatsAppTurnValidationResult {
  const { evalCase, record, records, siteId, userId } = args;
  const results: WhatsAppValidatorResult[] = [];
  const heuristicResults: WhatsAppValidatorResult[] = [];
  const searchText = recordSearchText(record);

  results.push(createResult("record-created", Boolean(record), "A site diary record must be created."));
  if (records) {
    results.push(
      createResult(
        "record-count",
        records.length === 1,
        `Exactly one site diary record should be created; got ${records.length}.`,
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
    result.name === "workers-involved" || result.name === "time-involved"
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
