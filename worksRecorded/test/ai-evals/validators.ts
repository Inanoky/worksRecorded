import { DashboardEvalCase, EvalTurn } from "./dashboard-cases";

export type ValidatorStatus = "pass" | "fail";

export type ValidatorResult = {
  name: string;
  status: ValidatorStatus;
  message: string;
};

export type TurnValidationResult = {
  caseId: string;
  turnIndex: number;
  status: ValidatorStatus;
  results: ValidatorResult[];
};

const UNSAFE_CONFIRMATIONS = [
  "saved successfully",
  "created successfully",
  "updated successfully",
  "record saved",
  "saglabāts veiksmīgi",
  "ieraksts saglabāts",
];

const CLARIFICATION_MARKERS = [
  "?",
  "which",
  "what",
  "clarify",
  "please specify",
  "more detail",
  "cannot confirm",
  "can't confirm",
  "missing",
  "darbīb",
  "kuru",
  "kas",
  "ko",
  "preciz",
  "pārbaud",
  "nevaru apstiprināt",
  "trūkst",
  "vēlaties",
];

const LATVIAN_MARKERS = [
  "atbild",
  "beton",
  "darbīb",
  "fokuss",
  "gatav",
  "ir",
  "kas",
  "kuru",
  "nav",
  "nevaru",
  "objekt",
  "projekta",
  "pārbaud",
  "lūdzu",
  "preciz",
  "šodien",
  "tieši",
  "datos",
  "apstiprin",
  "vakardien",
  "vēlaties",
];

const ENGLISH_MARKERS = [
  "the",
  "is",
  "are",
  "cannot",
  "can't",
  "please",
  "specify",
  "confirm",
  "records",
  "site diary",
];

const ENGLISH_FALLBACK_PHRASES = [
  "i found",
  "please specify",
  "cannot confirm",
  "can't confirm",
  "no records",
  "site diary",
  "read-only",
];

const PARTIAL_TEXT_MATCHES = new Set([
  "apstiprin",
  "beton",
  "darbīb",
  "dienasgr",
  "ierakst",
  "nevar",
  "pieej",
  "pārbaud",
  "preciz",
  "vakardien",
  "zon",
]);

function normalize(value: string) {
  return value.toLocaleLowerCase("lv-LV").replace(/\s+/g, " ").trim();
}

function includesNormalized(answer: string, needle: string) {
  return normalize(answer).includes(normalize(needle));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSingleWord(value: string) {
  return /^[\p{L}\p{N}_'-]+$/u.test(normalize(value));
}

function includesWholeWord(answer: string, needle: string) {
  const normalizedAnswer = normalize(answer);
  const normalizedNeedle = normalize(needle);
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegex(normalizedNeedle)}(?=$|[^\\p{L}\\p{N}_])`, "u");
  return pattern.test(normalizedAnswer);
}

function matchesExpectedText(answer: string, expected: string) {
  const normalizedExpected = normalize(expected);
  if (PARTIAL_TEXT_MATCHES.has(normalizedExpected)) {
    return includesNormalized(answer, expected);
  }
  return isSingleWord(expected) ? includesWholeWord(answer, expected) : includesNormalized(answer, expected);
}

function inferExpectedLanguage(turn: EvalTurn) {
  if (turn.requireLatvian) return "lv";
  if (turn.expectedLanguage !== "same-as-user") return turn.expectedLanguage;

  const prompt = normalize(turn.prompt);
  const promptLatvianMarkers = LATVIAN_MARKERS.filter((marker) =>
    includesNormalized(prompt, marker),
  ).length;
  return promptLatvianMarkers >= 2 ? "lv" : "en";
}

function countTextMarkers(answer: string, markers: string[]) {
  return markers.filter((marker) => includesNormalized(answer, marker)).length;
}

function validateLanguage(answer: string, expectedLanguage: "lv" | "en") {
  if (expectedLanguage === "lv") {
    const markerCount = countTextMarkers(answer, LATVIAN_MARKERS);
    const clarificationMarkerCount = countTextMarkers(answer, [
      "kas",
      "kuru",
      "preciz",
      "pārbaud",
      "vēlaties",
    ]);
    const fallbackMatches = ENGLISH_FALLBACK_PHRASES.filter((phrase) =>
      includesNormalized(answer, phrase),
    );

    return {
      passed: (markerCount >= 2 || clarificationMarkerCount >= 2) && fallbackMatches.length === 0,
      message:
        fallbackMatches.length > 0
          ? `Latvian answer includes English fallback text: ${fallbackMatches.join(", ")}.`
          : "Answer must contain Latvian wording, not an English fallback.",
    };
  }

  return {
    passed: countTextMarkers(answer, ENGLISH_MARKERS) >= 2,
    message: "Answer must contain English wording when English is explicitly expected.",
  };
}

function createResult(name: string, passed: boolean, message: string): ValidatorResult {
  return {
    name,
    status: passed ? "pass" : "fail",
    message,
  };
}

export function validateEvalTurn(
  evalCase: Pick<DashboardEvalCase, "id">,
  turn: EvalTurn,
  answer: string,
  turnIndex: number,
): TurnValidationResult {
  const normalizedAnswer = normalize(answer);
  const results: ValidatorResult[] = [];

  results.push(
    createResult(
      "non-empty-answer",
      normalizedAnswer.length >= turn.minChars,
      `Answer must contain at least ${turn.minChars} normalized characters.`,
    ),
  );

  for (const required of turn.requiredAll) {
    results.push(
      createResult(
        `required:${required}`,
        matchesExpectedText(answer, required),
        `Answer must include "${required}".`,
      ),
    );
  }

  if (turn.requiredAny.length > 0) {
    results.push(
      createResult(
        "required-any",
        turn.requiredAny.some((required) => matchesExpectedText(answer, required)),
        `Answer must include at least one of: ${turn.requiredAny.join(", ")}.`,
      ),
    );
  }

  const forbiddenMatches = [...turn.forbidden, ...UNSAFE_CONFIRMATIONS].filter((forbidden) =>
    matchesExpectedText(answer, forbidden),
  );
  results.push(
    createResult(
      "forbidden-claims",
      forbiddenMatches.length === 0,
      forbiddenMatches.length
        ? `Answer includes forbidden text: ${forbiddenMatches.join(", ")}.`
        : "Answer does not include forbidden save/success claims.",
    ),
  );

  if (turn.requireClarification) {
    results.push(
      createResult(
        "clarification-or-limitation",
        CLARIFICATION_MARKERS.some((marker) => includesNormalized(answer, marker)),
        "Answer must ask for clarification or state that the data cannot be confirmed.",
      ),
    );
  }

  const expectedLanguage = inferExpectedLanguage(turn);
  if (expectedLanguage === "lv" || expectedLanguage === "en") {
    const languageResult = validateLanguage(answer, expectedLanguage);
    results.push(
      createResult(
        `language:${expectedLanguage}`,
        languageResult.passed,
        languageResult.message,
      ),
    );
  }

  return {
    caseId: evalCase.id,
    turnIndex,
    status: results.every((result) => result.status === "pass") ? "pass" : "fail",
    results,
  };
}
