import { z } from "zod";
import type { Forma2Allocation, Forma2Position } from "./forma2-analytics";
import { normalizeForma2QuantityUnit } from "./forma2-quantities";

export const DIARY_REVIEW_DELAY_MS = 10 * 60_000;
export const DIARY_REVIEW_MAX_WAIT_MS = 30 * 60_000;
export const DIARY_REVIEW_BATCH_SIZE = 40;
export const DIARY_REVIEW_LEASE_MS = 6 * 60_000;
export const DIARY_REVIEW_TIMEOUT_MS = 240_000;

export const diaryReviewFields = [
  "Works",
  "Location",
  "Comments",
  "Units",
  "Amounts",
  "Comments_Custom_1",
  "WorkersInvolved",
  "TimeInvolved",
] as const;
export type DiaryReviewField = (typeof diaryReviewFields)[number];

export type DiaryReviewRecord = {
  id: string;
  userId: string | null;
  sourceText: string;
  date: string | null;
  bisId: string | null;
  fields: Record<DiaryReviewField, string | number | null>;
  allocation: Forma2Allocation | null;
  selectedPositionId: string | null;
};

export type DiaryReviewSnapshot = {
  siteId: string;
  organizationId: string;
  userId: string;
  configHash: string;
  documentId: string | null;
  actualQuantityField: "Amounts" | "Comments_Custom_1";
  records: DiaryReviewRecord[];
  positions: Forma2Position[];
  workOptions: string[];
  guidance: string;
  examples: { work: string; positionId: string }[];
};

export const diaryReviewProposalSchema = z.object({
  summary: z.string().min(1).max(2000),
  records: z
    .array(
      z.object({
        recordId: z.string(),
        verdict: z.enum(["verified", "changes", "needs_clarification"]),
        reason: z.string().min(1).max(1500),
        issues: z.array(z.string().max(500)).max(12),
        changes: z
          .array(
            z.object({
              field: z.enum(diaryReviewFields),
              value: z.union([
                z.string().max(4000),
                z.number().finite(),
                z.null(),
              ]),
              evidence: z.string().min(1).max(1000),
              reason: z.string().min(1).max(500),
            }),
          )
          .max(8),
        assignment: z
          .object({
            positionId: z.string(),
            evidence: z.string().min(1).max(1000),
            reason: z.string().min(1).max(1000),
          })
          .nullable(),
      }),
    )
    .max(DIARY_REVIEW_BATCH_SIZE),
});
export type DiaryReviewProposal = z.infer<typeof diaryReviewProposalSchema>;

export function diaryReviewSiteIds() {
  return (process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function diaryReviewEnabled(siteId?: string) {
  if (process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED !== "true") return false;
  const sites = diaryReviewSiteIds();
  return !sites.length || Boolean(siteId && sites.includes(siteId));
}

export function diaryReviewProcessAfter(first: Date, last: Date) {
  return new Date(
    Math.min(
      last.getTime() + DIARY_REVIEW_DELAY_MS,
      first.getTime() + DIARY_REVIEW_MAX_WAIT_MS,
    ),
  );
}

export function diaryReviewIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
        ),
      ]
    : [];
}

const numericFields = new Set<DiaryReviewField>([
  "Amounts",
  "Comments_Custom_1",
  "WorkersInvolved",
  "TimeInvolved",
]);

export function evidenceNumbers(text: string) {
  const words: Record<string, number> = {
    nulle: 0,
    nulli: 0,
    viens: 1,
    viena: 1,
    vienu: 1,
    divi: 2,
    divas: 2,
    divus: 2,
    trīs: 3,
    četri: 4,
    četras: 4,
    pieci: 5,
    piecas: 5,
    seši: 6,
    sešas: 6,
    septiņi: 7,
    septiņas: 7,
    astoņi: 8,
    astoņas: 8,
    deviņi: 9,
    deviņas: 9,
    desmit: 10,
  };
  return [
    ...(text.match(/\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?/g) ?? []).map((number) =>
      Number(number.replace(/[ \u00a0]/g, "").replace(",", ".")),
    ),
    ...text
      .toLocaleLowerCase("lv")
      .split(/[^\p{L}]+/u)
      .flatMap((word) => (word in words ? [words[word]] : [])),
  ];
}

export function validateDiaryReviewProposal(
  input: unknown,
  snapshot: DiaryReviewSnapshot,
): DiaryReviewProposal {
  const proposal = diaryReviewProposalSchema.parse(input);
  const records = new Map(
    snapshot.records.map((record) => [record.id, record]),
  );
  const seen = new Set<string>();
  for (const row of proposal.records) {
    const record = records.get(row.recordId);
    if (!record || seen.has(row.recordId))
      throw new Error("REVIEW_RECORD_SCOPE");
    seen.add(row.recordId);
    if (row.verdict === "verified" && row.issues.length)
      throw new Error("REVIEW_INVALID_VERDICT");
    if (row.verdict !== "changes" && (row.changes.length || row.assignment))
      throw new Error("REVIEW_INVALID_VERDICT");
    if (record.bisId !== null && (row.changes.length || row.assignment))
      throw new Error("REVIEW_BIS_PROTECTED");
    if (record.allocation?.split && (row.changes.length || row.assignment))
      throw new Error("REVIEW_MANUAL_ASSIGNMENT_PROTECTED");
    const fields = new Set<DiaryReviewField>();
    const next = { ...record.fields };
    for (const change of row.changes) {
      if (fields.has(change.field)) throw new Error("REVIEW_DUPLICATE_FIELD");
      fields.add(change.field);
      if (!record.sourceText.includes(change.evidence))
        throw new Error("REVIEW_UNSUPPORTED_EVIDENCE");
      if (numericFields.has(change.field)) {
        if (
          change.value !== null &&
          (typeof change.value !== "number" ||
            change.value < 0 ||
            change.value > 1_000_000_000)
        )
          throw new Error("REVIEW_INVALID_NUMBER");
        const numbers = evidenceNumbers(change.evidence);
        if (change.value !== null && !numbers.includes(change.value as number))
          throw new Error("REVIEW_NUMBER_NOT_IN_EVIDENCE");
        if (
          change.field === "Comments_Custom_1" &&
          snapshot.actualQuantityField !== "Comments_Custom_1"
        )
          throw new Error("REVIEW_QUANTITY_PROFILE");
        if (
          change.field === "Amounts" &&
          snapshot.actualQuantityField === "Comments_Custom_1"
        )
          throw new Error("REVIEW_PLANNED_QUANTITY_PROTECTED");
      } else if (change.value !== null && typeof change.value !== "string") {
        throw new Error("REVIEW_INVALID_TEXT");
      }
      if (change.field === "Works") {
        if (
          record.allocation?.split ||
          (record.allocation && record.allocation.method !== "automatic")
        )
          throw new Error("REVIEW_MANUAL_ASSIGNMENT_PROTECTED");
        if (
          typeof change.value !== "string" ||
          !snapshot.workOptions.includes(change.value)
        )
          throw new Error("REVIEW_UNKNOWN_WORK");
      }
      next[change.field] = change.value;
    }
    if (
      fields.has("Works") &&
      !row.assignment &&
      (record.allocation || record.selectedPositionId)
    )
      throw new Error("REVIEW_ASSIGNMENT_REQUIRED");
    if (row.assignment) {
      if (!record.sourceText.includes(row.assignment.evidence))
        throw new Error("REVIEW_UNSUPPORTED_EVIDENCE");
      if (
        record.allocation &&
        (record.allocation.method !== "automatic" || record.allocation.split)
      )
        throw new Error("REVIEW_MANUAL_ASSIGNMENT_PROTECTED");
      const position = snapshot.positions.find(
        (item) => item.id === row.assignment?.positionId,
      );
      if (
        !position ||
        position.kind !== "work" ||
        position.manualAssignmentOnly
      )
        throw new Error("REVIEW_POSITION_SCOPE");
      if (
        next[snapshot.actualQuantityField] !== null &&
        normalizeForma2QuantityUnit(String(next.Units ?? "")) !==
          normalizeForma2QuantityUnit(position.unit)
      )
        throw new Error("REVIEW_UNIT_MISMATCH");
    }
    const effectivePositionId =
      row.assignment?.positionId ??
      record.allocation?.positionId ??
      record.selectedPositionId;
    const effectivePosition = snapshot.positions.find(
      (position) => position.id === effectivePositionId,
    );
    if (
      effectivePosition &&
      (fields.has("Units") || fields.has(snapshot.actualQuantityField)) &&
      next[snapshot.actualQuantityField] !== null &&
      next[snapshot.actualQuantityField] !== "" &&
      normalizeForma2QuantityUnit(String(next.Units ?? "")) !==
        normalizeForma2QuantityUnit(effectivePosition.unit)
    )
      throw new Error("REVIEW_UNIT_MISMATCH");
  }
  if (seen.size !== records.size) throw new Error("REVIEW_INCOMPLETE_COVERAGE");
  return proposal;
}
