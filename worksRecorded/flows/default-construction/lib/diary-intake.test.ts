import { intakeContext, intakeDraft } from "@/test/fixtures/diary-intake";
import { diaryIntakeRows, rigaDate, validateDiaryIntake } from "./diary-intake";

it("accepts supported quantities and word-number worker counts and uses the actual quantity column", () => {
  const context = intakeContext();
  const draft = validateDiaryIntake(intakeDraft(), context);
  expect(diaryIntakeRows(draft, context)[0]).toMatchObject({
    Amounts: 12.5,
    WorkersInvolved: 3,
    TimeInvolved: 4,
  });
  context.actualQuantityField = "Comments_Custom_1";
  expect(diaryIntakeRows(draft, context)[0]).toMatchObject({
    Amounts: null,
    Comments_Custom_1: 12.5,
  });
});
it.each([
  [
    "invented quantity",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].quantity.value = 99;
    },
    "INTAKE_NUMBER_EVIDENCE",
  ],
  [
    "dimension mismatch",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].unit = "m2";
    },
    "INTAKE_UNIT_MISMATCH",
  ],
  [
    "wrong position",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].positionId = "other";
    },
    "INTAKE_POSITION_MAPPING",
  ],
  [
    "unknown work",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].work = "Other";
    },
    "INTAKE_WORK_SCOPE",
  ],
  [
    "invented quote",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].sourceQuote = "Fake source";
    },
    "INTAKE_SOURCE_EVIDENCE",
  ],
  [
    "unknown workers as zero",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].workers.value = 0;
    },
    "INTAKE_NUMBER_EVIDENCE",
  ],
  [
    "unsupported retrospective date",
    (draft: ReturnType<typeof intakeDraft>) => {
      draft.records[0].date = "2025-01-01";
    },
    "INTAKE_DATE_EVIDENCE",
  ],
])("rejects %s", (_name, change, error) => {
  const draft = intakeDraft();
  change(draft);
  expect(() => validateDiaryIntake(draft, intakeContext())).toThrow(error);
});
it("rejects duplicated labour across different works", () => {
  const draft = intakeDraft();
  draft.records.push({
    ...draft.records[0],
    work: "Piezīmes",
    positionId: null,
    quantity: { value: null, evidence: null },
    unit: null,
  });
  expect(() => validateDiaryIntake(draft, intakeContext())).toThrow(
    "INTAKE_DUPLICATED_MEASURE",
  );
});
it("preserves missing workers and hours as null", () => {
  const draft = intakeDraft();
  draft.records[0].workers = draft.records[0].hours = {
    value: null,
    evidence: null,
  };
  expect(
    diaryIntakeRows(
      validateDiaryIntake(draft, intakeContext()),
      intakeContext(),
    )[0],
  ).toMatchObject({ WorkersInvolved: null, TimeInvolved: null });
});
it("accepts source-backed yesterday and rejects an invalid calendar date", () => {
  const context = intakeContext();
  context.sourceText = `Vakar. ${context.sourceText}`;
  const draft = intakeDraft();
  draft.records[0].date = "2026-11-15";
  draft.records[0].dateEvidence = "Vakar";
  expect(validateDiaryIntake(draft, context)).toEqual(draft);
  draft.records[0].date = "2026-02-30";
  expect(() => validateDiaryIntake(draft, context)).toThrow(
    "INTAKE_DATE_EVIDENCE",
  );
});
it("uses Riga date across the UTC midnight boundary", () => {
  expect(rigaDate(new Date("2026-11-15T22:30:00Z"))).toBe("2026-11-16");
});
it("keeps planned work as a note with no factual quantity", () => {
  const context = intakeContext();
  context.sourceText = "Rīt plānojam betonēt 12,5 m3.";
  const draft = intakeDraft();
  Object.assign(draft.records[0], {
    sourceQuote: context.sourceText,
    work: "Piezīmes",
    positionId: null,
    workers: { value: null, evidence: null },
    hours: { value: null, evidence: null },
    quantity: { value: 12.5, evidence: "12,5 m3" },
  });
  expect(() => validateDiaryIntake(draft, context)).toThrow(
    "INTAKE_PLANNED_AS_ACTUAL",
  );
  draft.records[0].quantity = { value: null, evidence: null };
  draft.records[0].unit = null;
  expect(validateDiaryIntake(draft, context)).toEqual(draft);
});

it("validates the unit next to the quantity and does not confuse metres with cubic metres", () => {
  const context = intakeContext();
  context.positions[0].unit = "m";
  const draft = intakeDraft();
  draft.records[0].unit = "m";
  expect(() => validateDiaryIntake(draft, context)).toThrow(
    "INTAKE_NUMBER_EVIDENCE",
  );
});
it("supports Latvian quantity unit names and exact minute-to-hour conversion", () => {
  const context = intakeContext();
  context.sourceText = "Betonēti 12,5 kubi. Strādāts 30 minūtes.";
  const draft = intakeDraft();
  Object.assign(draft.records[0], {
    sourceQuote: context.sourceText,
    quantity: { value: 12.5, evidence: "12,5 kubi" },
    workers: { value: null, evidence: null },
    hours: { value: 0.5, evidence: "30 minūtes" },
  });
  expect(validateDiaryIntake(draft, context)).toEqual(draft);
});
it("does not interpret a worker count as an amount when a unit occurs elsewhere in the quote", () => {
  const context = intakeContext();
  context.sourceText = "Betonēšana m3. Strādāja 3 cilvēki.";
  const draft = intakeDraft();
  Object.assign(draft.records[0], {
    sourceQuote: context.sourceText,
    quantity: { value: 3, evidence: context.sourceText },
    workers: { value: null, evidence: null },
    hours: { value: null, evidence: null },
  });
  expect(() => validateDiaryIntake(draft, context)).toThrow(
    "INTAKE_NUMBER_EVIDENCE",
  );
});

it("accepts explicit worker and duration labels with values after a colon", () => {
  const context = intakeContext();
  context.sourceText = "Betonēti 12,5 m3, darbinieki: 2, stundas: 4.";
  const draft = intakeDraft();
  Object.assign(draft.records[0], {
    sourceQuote: context.sourceText,
    quantity: { value: 12.5, evidence: "12,5 m3" },
    workers: { value: 2, evidence: "darbinieki: 2" },
    hours: { value: 4, evidence: "stundas: 4" },
  });
  expect(validateDiaryIntake(draft, context)).toEqual(draft);
});

it("identifies the exact row and field when a measurement cannot be proved", () => {
  const draft = intakeDraft();
  draft.records[0].quantity.value = 99;
  try {
    validateDiaryIntake(draft, intakeContext());
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toMatchObject({
      message: "INTAKE_NUMBER_EVIDENCE",
      recordIndex: 0,
      field: "quantity.evidence",
      guidance: expect.stringContaining("vērtība 99"),
    });
  }
});

it("accepts the explicit source word today as evidence for the received Riga date", () => {
  const context = intakeContext();
  context.sourceText = `Šodien ${context.sourceText}`;
  const draft = intakeDraft();
  draft.records[0].dateEvidence = "Šodien";
  expect(validateDiaryIntake(draft, context)).toEqual(draft);
});

it.each([
  ["Iebūvēta ūdensvada aka AU1, svītriņa 4.", 1, "kompl", true],
  ["Iebūvēta ūdensvada aka AU1-4.", 1, "gab.", true],
  ["Iebūvēta ūdensvada aka AU1-4.", 4, "kompl", false],
  ["Iebūvēta ūdensvada aka AU1-4.", 1, "m", false],
  ["Nav iebūvēta ūdensvada aka AU1-4.", 1, "kompl", false],
  ["Tiks iebūvēta ūdensvada aka AU1-4.", 1, "kompl", false],
  ["Iebūvētas ūdensvada akas AU1-4 un AU1-5.", 1, "kompl", false],
  ["Iebūvēta ūdensvada aka AU1-4 un aka AU1-5.", 1, "kompl", false],
])(
  "validates a single named completed well without treating its identifier as the count: %s",
  (source, value, unit, valid) => {
    const context = intakeContext();
    context.sourceText = source;
    context.positions[0].unit = unit;
    const draft = intakeDraft();
    Object.assign(draft.records[0], {
      sourceQuote: source,
      unit,
      quantity: { value, evidence: source },
      workers: { value: null, evidence: null },
      hours: { value: null, evidence: null },
    });
    if (valid) expect(validateDiaryIntake(draft, context)).toEqual(draft);
    else
      expect(() => validateDiaryIntake(draft, context)).toThrow(
        "INTAKE_NUMBER_EVIDENCE",
      );
  },
);
