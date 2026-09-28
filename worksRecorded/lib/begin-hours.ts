import { z } from "zod";

export const BEGIN_ORGANIZATION_ID = "58467603-196e-4661-83ff-fe26e4b0ff0b";
export const BEGIN_STORAGE_MARKER = "begin-hours:v1";
export const BEGIN_RATE_CENTS = 1250;
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });
const status = z.enum(["approved", "unapproved", "missing-end", "ongoing"]);
export const beginEntrySchema = z.object({
  worker: z.string().min(1).max(200),
  date: isoDate,
  start: z.string().max(30),
  end: z.string().max(30),
  minutes: z.number().int().min(0).max(10080).nullable(),
  object: z.string().min(1).max(500),
  status,
  comment: z.string().max(10000),
});
export type BeginEntry = z.infer<typeof beginEntrySchema>;
export const beginAllocationSchema = z.object({
  recordId: z.string().min(1).max(200),
  explanation: z.string().min(1).max(20000),
  hours: z.number().finite().nonnegative().nullable(),
  workers: z.number().finite().nonnegative().nullable(),
  savedAt: z.string().datetime(),
  sourceImportedAt: z.string().datetime(),
  source: z.enum(["legacy-comment", "allocation", "begin-allocation"]),
});
export type BeginAllocation = z.infer<typeof beginAllocationSchema>;
const revisionSchema = z.object({
  importedAt: z.string().datetime(),
  importedBy: z.string(),
  sourceCompany: z.string(),
  capturedOn: isoDate,
  rateCents: z.number().int().positive(),
  objects: z.array(z.string()),
  entries: z.array(beginEntrySchema),
  allocations: z.array(beginAllocationSchema).max(10000).optional(),
});
export const beginDaySchema = revisionSchema.extend({
  kind: z.literal(BEGIN_STORAGE_MARKER),
  version: z.literal(1),
  date: isoDate,
  history: z.array(revisionSchema),
});
export type BeginDay = z.infer<typeof beginDaySchema>;

export function parseBeginDay(value: unknown): BeginDay {
  let data = value;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      throw new Error("Saglabātie Begin stundu dati nav derīgs JSON.");
    }
  }
  const result = beginDaySchema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => `${issue.path.join(".") || "root"} (${issue.code})`)
      .join(", ");
    throw new Error(`Saglabātie Begin stundu dati nav derīgi: ${fields}.`);
  }
  return result.data;
}

export function withBeginAllocation(
  day: BeginDay,
  input: BeginAllocation,
): BeginDay {
  const allocation = beginAllocationSchema.parse(input);
  return {
    ...day,
    allocations: [
      ...(day.allocations ?? []).filter(
        (item) => item.recordId !== allocation.recordId,
      ),
      allocation,
    ],
  };
}

export function splitLegacyBeginHoursComment(comment: string | null) {
  if (!comment) return null;
  const match =
    /(?:^|\r?\n)(Stundu (?:uzskaite \d{2}\.\d{2}\.\d{4}\.|(?:aprēķins|sadalījums) \([^\r\n)]*\d{2}\.\d{2}\.\d{4}\.\)):)/u.exec(
      comment,
    );
  if (!match) return null;
  const start = match.index + match[0].indexOf(match[1]);
  return {
    comment: comment.slice(0, match.index).trimEnd(),
    explanation: comment.slice(start).trim(),
  };
}

export function summarizeBeginEntries(
  entries: BeginEntry[],
  rateCents = BEGIN_RATE_CENTS,
) {
  const minutes = entries.reduce((sum, row) => sum + (row.minutes ?? 0), 0);
  return {
    minutes,
    costCents: Math.round((minutes * rateCents) / 60),
    missing: entries.filter((row) => row.status === "missing-end").length,
    ongoing: entries.filter((row) => row.status === "ongoing").length,
    unapproved: entries.filter((row) => row.status === "unapproved").length,
  };
}

export function parseBeginSnapshot(text: string) {
  if (text.length > 1_000_000) throw new Error("Fails pārsniedz 1 MB.");
  const input = z
    .object({
      company: z.string().min(1).max(200),
      source: z.literal("https://app.begin.ee/en/new-timesheets"),
      targetOrganizationId: z.literal(BEGIN_ORGANIZATION_ID),
      from: isoDate,
      through: isoDate,
      capturedOn: isoDate,
      workers: z.array(z.string().min(1).max(200)).max(2000),
      objects: z.array(z.string().max(500)).max(2000),
      columns: z.array(z.string()),
      rows: z
        .array(
          z.tuple([
            z.number().int().nonnegative(),
            z.string(),
            z.string(),
            z.string(),
            z.number().int().min(0).max(10080).nullable(),
            z.number().int().nonnegative(),
            status,
            z.string().max(10000),
          ]),
        )
        .max(10000),
    })
    .parse(JSON.parse(text));
  if (
    input.columns.join(",") !==
    "workerIndex,date,start,end,durationMinutes,objectIndex,status,comment"
  )
    throw new Error("Neatbalstīts kolonnu formāts.");
  if (
    input.from > input.through ||
    (Date.parse(input.through) - Date.parse(input.from)) / 86400000 > 30
  )
    throw new Error("Imports atbalsta līdz 31 dienai.");
  const entries = input.rows.map((row) => {
    const date = isoDate.parse(row[1].split(".").reverse().join("-"));
    const worker = input.workers[row[0]];
    const object = input.objects[row[5]];
    if (
      !worker ||
      object === undefined ||
      date < input.from ||
      date > input.through
    )
      throw new Error("Nederīgs darbinieks, objekts vai datums.");
    if (
      (row[6] === "ongoing" || row[6] === "missing-end") !==
      (row[4] === null)
    )
      throw new Error("Ilgums neatbilst ieraksta statusam.");
    return {
      worker,
      date,
      start: row[2],
      end: row[3],
      minutes: row[4],
      object,
      status: row[6],
      comment: row[7],
    };
  });
  return { ...input, entries };
}

export function beginPeriodDates(from: string, through: string) {
  const dates: string[] = [];
  for (let day = Date.parse(from); day <= Date.parse(through); day += 86400000)
    dates.push(new Date(day).toISOString().slice(0, 10));
  return dates;
}
