import { z } from "zod";
import { type DiaryReviewSnapshot, evidenceNumbers } from "./diary-review";
import { normalizeForma2QuantityUnit } from "./forma2-quantities";

const measured = z.object({
  value: z.union([z.number().finite().min(0), z.null()]),
  evidence: z.union([z.string().min(1).max(1000), z.null()]),
});

export const diaryIntakeSchema = z.object({
  intent: z.enum(["save", "clarify", "reply"]),
  reply: z.string().min(1).max(2000),
  records: z
    .array(
      z.object({
        work: z.string().min(1).max(1000),
        positionId: z.union([z.string(), z.null()]),
        sourceQuote: z.string().min(1).max(4000),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateEvidence: z.union([z.string().max(200), z.null()]),
        location: z.union([z.string().max(1000), z.null()]),
        comment: z.string().min(1).max(4000),
        unit: z.union([z.string().max(50), z.null()]),
        quantity: measured,
        workers: measured,
        hours: measured,
      }),
    )
    .max(30),
});

export type DiaryIntakeDraft = z.infer<typeof diaryIntakeSchema>;
export type DiaryIntakeContext = DiaryReviewSnapshot & {
  sourceText: string;
  receivedDate: string;
  contextHash: string;
  workPositions: Record<string, string>;
  extractionContext: string;
};

export function rigaDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function supportedDate(
  date: string,
  evidence: string | null,
  context: DiaryIntakeContext,
) {
  if (
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    return false;
  if (!evidence) return date === context.receivedDate;
  if (!context.sourceText.includes(evidence)) return false;
  const relative = evidence.toLocaleLowerCase("lv");
  if (
    date === context.receivedDate &&
    /(?:^|[^\p{L}])šodien(?=$|[^\p{L}])/u.test(relative)
  )
    return true;
  if (/\b(vakar|aizvakar)\b/u.test(relative)) {
    const anchor = new Date(`${context.receivedDate}T12:00:00Z`);
    anchor.setUTCDate(
      anchor.getUTCDate() - (/\baizvakar\b/u.test(relative) ? 2 : 1),
    );
    return date === anchor.toISOString().slice(0, 10);
  }
  if (evidence.includes(date)) return true;
  const explicit = evidence.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})?/u);
  return Boolean(
    explicit &&
      date ===
        `${explicit[3] ?? context.receivedDate.slice(0, 4)}-${explicit[2].padStart(2, "0")}-${explicit[1].padStart(2, "0")}`,
  );
}

function sourceUnit(value: string) {
  const normalized = normalizeForma2QuantityUnit(value);
  if (/^(?:kubi|kubus|kubikmetr\p{L}*)$/u.test(normalized)) return "m3";
  if (/^(?:kvadrāt\p{L}*|kvadrat\p{L}*)$/u.test(normalized)) return "m2";
  if (/^metr\p{L}*$/u.test(normalized)) return "m";
  if (/^tonn\p{L}*$/u.test(normalized)) return "t";
  if (/^gabal\p{L}*$/u.test(normalized)) return "gab";
  return normalized;
}

function measureMatches(
  evidence: string,
  value: number,
  kind: "quantity" | "workers" | "hours",
  unit: string | null,
) {
  if (
    kind === "quantity" &&
    value === 1 &&
    ["gab", "kompl", "set"].includes(normalizeForma2QuantityUnit(unit ?? "")) &&
    !/(?:^|[^\p{L}])(?:nav|netika|nebija|tiks|netiks|būs|būtu|nebūs|nebūtu|tiek|daļēji|plānojam|plānots)(?=$|[^\p{L}])/iu.test(
      evidence,
    )
  ) {
    const completedWells = [
      ...evidence.matchAll(
        /(?:^|[^\p{L}])(?:iebūvēta|izbūvēta|uzstādīta)\s+(?:[\p{L}/-]+\s+){0,5}aka(?=$|[^\p{L}])/giu,
      ),
    ];
    const identifiers = [
      ...evidence.matchAll(
        /(?<![\p{L}\p{N}])[A-ZĀČĒĢĪĶĻŅŠŪŽ]{1,6}\s*\d+\s*(?:-\s*|,\s*svītriņa\s*|\s+svītriņa\s*)\d+(?![\p{L}\p{N}])/gu,
      ),
    ];
    if (completedWells.length === 1 && identifiers.length === 1) return true;
  }
  const reversed = evidence.matchAll(
    /((?:cilvēk|strādniek|darbiniek|person|stund)\p{L}*)\s*[:=]\s*(\d+(?:[.,]\d+)?|\p{L}+)/giu,
  );
  for (const match of reversed) {
    const label = match[1].toLocaleLowerCase("lv");
    if (
      evidenceNumbers(match[2]).includes(value) &&
      ((kind === "workers" && !label.startsWith("stund")) ||
        (kind === "hours" && label.startsWith("stund")))
    )
      return true;
  }
  const measures = evidence.matchAll(
    /(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?|\p{L}+)\s*([\p{L}²³][\p{L}\p{N}²³.]*)/giu,
  );
  for (const match of measures) {
    const numbers = evidenceNumbers(match[1]);
    const label = match[2].toLocaleLowerCase("lv").replace(/\.$/u, "");
    if (
      kind === "quantity" &&
      sourceUnit(label) === normalizeForma2QuantityUnit(unit ?? "") &&
      numbers.includes(value)
    )
      return true;
    if (
      kind === "workers" &&
      /^(?:cilvēk|strādniek|darbiniek|person)/u.test(label) &&
      numbers.includes(value)
    )
      return true;
    if (
      kind === "hours" &&
      /^(?:stund\p{L}*|st|h)$/u.test(label) &&
      numbers.includes(value)
    )
      return true;
    if (
      kind === "hours" &&
      /^(?:minūt\p{L}*|min\.?)$/u.test(label) &&
      numbers.some((number) => Math.abs(number / 60 - value) < 1e-9)
    )
      return true;
  }
  return false;
}

export class DiaryIntakeValidationError extends Error {
  constructor(
    code: string,
    readonly recordIndex: number,
    readonly field: string,
    readonly guidance: string,
  ) {
    super(code);
    this.name = "DiaryIntakeValidationError";
  }
}

export function validateDiaryIntake(
  input: unknown,
  context: DiaryIntakeContext,
) {
  const draft = diaryIntakeSchema.parse(input);
  if ((draft.intent === "save") !== Boolean(draft.records.length))
    throw new Error("INTAKE_RECORDS_REQUIRED");
  const used = new Set<string>();
  for (const [recordIndex, row] of draft.records.entries()) {
    function fail(code: string, field: string, guidance: string): never {
      throw new DiaryIntakeValidationError(code, recordIndex, field, guidance);
    }
    if (!context.workOptions.includes(row.work))
      fail(
        "INTAKE_WORK_SCOPE",
        "work",
        "Izvēlies precīzu workOptions nosaukumu bez pārfrāzēšanas.",
      );
    if (!context.sourceText.includes(row.sourceQuote))
      fail(
        "INTAKE_SOURCE_EVIDENCE",
        "sourceQuote",
        "Citātam burtiski jāsakrīt ar oriģinālo ziņu. Normalizētus nosaukumus un numurus raksti location/comment, bet avota citātā saglabā sākotnējos vārdus un pieturzīmes.",
      );
    if (!supportedDate(row.date, row.dateEvidence, context))
      fail(
        "INTAKE_DATE_EVIDENCE",
        "date",
        `Noklusējuma datums ir ${context.receivedDate}; citam datumam vajag precīzu dateEvidence no avota.`,
      );
    const mapped = context.workPositions[row.work] ?? null;
    if (mapped !== row.positionId)
      fail(
        "INTAKE_POSITION_MAPPING",
        "positionId",
        `Šim precīzajam work nosaukumam atļautais positionId ir ${JSON.stringify(mapped)}.`,
      );
    const position = context.positions.find(
      (item) => item.id === row.positionId,
    );
    if (
      row.positionId &&
      (!position || position.kind !== "work" || position.manualAssignmentOnly)
    )
      fail(
        "INTAKE_POSITION_SCOPE",
        "positionId",
        "Izvēlies pieejamu work pozīciju, kurai manualAssignmentOnly nav true, vai nepiesaistītu piezīmi.",
      );
    if (row.quantity.value !== null && !row.unit)
      fail(
        "INTAKE_UNIT_REQUIRED",
        "unit",
        "Daudzumam vajag avotā pamatotu mērvienību. Ja tā nav zināma, quantity.value=null.",
      );
    if (
      row.unit &&
      position &&
      normalizeForma2QuantityUnit(row.unit) !==
        normalizeForma2QuantityUnit(position.unit)
    )
      fail(
        "INTAKE_UNIT_MISMATCH",
        "unit",
        `Pozīcijas mērvienība ir ${position.unit}; nepārrēķini nesaderīgus apjomus, izvēlies pareizo pozīciju vai piezīmi.`,
      );
    if (row.workers.value !== null && !Number.isInteger(row.workers.value))
      fail(
        "INTAKE_WORKER_COUNT",
        "workers.value",
        "Darbinieku skaits ir vesels skaitlis vai null, ja avotā tas nav norādīts.",
      );
    for (const key of ["quantity", "workers", "hours"] as const) {
      const field = row[key];
      if (field.value === null) continue;
      if (
        !field.evidence ||
        !row.sourceQuote.includes(field.evidence) ||
        !measureMatches(field.evidence, field.value, key, row.unit)
      )
        fail(
          "INTAKE_NUMBER_EVIDENCE",
          `${key}.evidence`,
          `Lauks ${key}, vērtība ${field.value}${key === "quantity" ? ` ${row.unit ?? ""}` : ""}: evidence jābūt burtiskam citātam šīs rindas sourceQuote iekšienē ar pašu mērījumu un tā mērvienību/nozīmi. Ja pierādījums ir citā tās pašas darbības ziņas daļā, paplašini sourceQuote līdz pilnam nepārtrauktam avota fragmentam. Identifikatoru numuri un diametri nav darbu daudzums. Ja skaitlis nav pierādāms, atstāj value=null un saglabā faktu komentārā.`,
        );
      const evidenceKey = `${key}:${field.evidence.trim()}:${field.value}`;
      if (used.has(evidenceKey))
        fail(
          "INTAKE_DUPLICATED_MEASURE",
          `${key}.evidence`,
          "Šis pats mērījuma citāts jau izmantots citā rindā. Nedublē kopīgu laiku/apjomu; atšķirīgām darbībām citātā iekļauj to atšķirošo kontekstu.",
        );
      used.add(evidenceKey);
    }
    if (/^(?:piezīmes|notes?)$/iu.test(row.work) && row.positionId)
      fail(
        "INTAKE_NOTE_POSITION",
        "positionId",
        "Piezīmes neiekļauj Forma2 izpildē; positionId=null.",
      );
    if (
      /(?:^|[^\p{L}])(?:rīt|plānojam|plānots|plānoti)(?=$|[^\p{L}])/iu.test(
        row.sourceQuote,
      ) &&
      (row.quantity.value !== null ||
        row.workers.value !== null ||
        row.hours.value !== null)
    )
      fail(
        "INTAKE_PLANNED_AS_ACTUAL",
        "quantity/workers/hours",
        "Plāna rindai skaitļu laukus atstāj null. Ja citāts ietver gan izpildi, gan nākotnes plānu, sadali to atsevišķās darbībās ar katrai savu avota citātu.",
      );
  }
  return draft;
}

export function diaryIntakeRows(
  draft: DiaryIntakeDraft,
  context: DiaryIntakeContext,
) {
  return draft.records.map((row) => ({
    Date: `${row.date}T00:00:00.000Z`,
    Works: row.work,
    Location: row.location,
    Comments: row.comment,
    Units: row.unit,
    Amounts: null,
    [context.actualQuantityField]: row.quantity.value,
    WorkersInvolved: row.workers.value,
    TimeInvolved: row.hours.value,
  }));
}
