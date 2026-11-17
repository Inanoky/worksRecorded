import {
  ReviewedDiaryCorpusSchema,
  reviewedDiaryCases,
  reviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import {
  type ReviewedDiaryActualRow,
  validateReviewedDiaryCase,
} from "./reviewed-diary-validators";

const actualRows = (index = 0): ReviewedDiaryActualRow[] =>
  reviewedDiaryCases[index].expectedRecords.map((row) => ({
    ...row,
    comment: row.commentSignals.join(" "),
  }));
const evaluate = (rows: ReviewedDiaryActualRow[], index = 0) =>
  validateReviewedDiaryCase(
    reviewedDiaryCases[index],
    rows,
    reviewedDiaryCorpus.project.positions,
  );
it("freezes eight clear real requests and sixteen reviewed outputs from the selected period", () => {
  expect(reviewedDiaryCases).toHaveLength(8);
  expect(
    reviewedDiaryCases.reduce(
      (sum, item) => sum + item.expectedRecords.length,
      0,
    ),
  ).toBe(16);
  expect(reviewedDiaryCorpus.project.positions).toHaveLength(52);
  for (const evalCase of reviewedDiaryCases) {
    expect(evalCase.sourceText).not.toMatch(
      /^(?:Raitis Verbickis|Nikita Jersovs)\s*:/u,
    );
    expect(evalCase.sourceText).not.toContain("Correction:");
  }
});
it.each(reviewedDiaryCases.map((item, index) => [item.id, index] as const))(
  "accepts the reviewed reference for %s independently of output row order",
  (_id, index) => {
    expect(evaluate(actualRows(index).reverse(), index).status).toBe("pass");
  },
);
it.each([
  "amount",
  "position",
  "date",
  "workers",
  "unit",
  "missing",
  "duplicate",
])("fails a real regression in %s", (kind) => {
  const rows = actualRows();
  if (kind === "amount") rows[0].amount = 2.87;
  if (kind === "position")
    rows[0].forma2PositionId =
      reviewedDiaryCorpus.project.positions.find(
        (position) => position.categoryCode === "3",
      )?.id ?? "wrong";
  if (kind === "date") rows[0].dateISO = "2026-11-12";
  if (kind === "workers") rows[0].workers = 0;
  if (kind === "unit") rows[0].unit = "m";
  if (kind === "missing") rows.pop();
  if (kind === "duplicate") rows[1] = { ...rows[0], id: "duplicate" };
  expect(evaluate(rows).status).toBe("fail");
});
it("requires null quantities for a well whose source only names its diameter and identifier", () => {
  const index = reviewedDiaryCases.findIndex((item) =>
    item.id.endsWith("concrete-well-dn1000"),
  );
  const rows = actualRows(index);
  rows[0].amount = 1000;
  expect(evaluate(rows, index).status).toBe("fail");
});
it("accepts standard set/kompl unit aliases without allowing different dimensions", () => {
  const index = reviewedDiaryCases.findIndex((item) =>
    item.id.endsWith("pp-well-dn600"),
  );
  const rows = actualRows(index);
  rows[0].unit = "set";
  expect(evaluate(rows, index).status).toBe("pass");
});
it("rejects duplicate source batches and unknown target positions in the corpus", () => {
  const duplicate = JSON.parse(JSON.stringify(reviewedDiaryCorpus));
  duplicate.cases.push(duplicate.cases[0]);
  expect(ReviewedDiaryCorpusSchema.safeParse(duplicate).success).toBe(false);
  const wrong = JSON.parse(JSON.stringify(reviewedDiaryCorpus));
  wrong.cases[0].expectedRecords[0].forma2PositionId = "outside-project";
  expect(ReviewedDiaryCorpusSchema.safeParse(wrong).success).toBe(false);
});

it("keeps production identity and transport identifiers out of the committed corpus", () => {
  const content = JSON.stringify(reviewedDiaryCorpus);
  expect(content).not.toMatch(/kp_[a-z0-9]+|wamid\.|\+371\d{8}/u);
  expect(content).not.toMatch(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu,
  );
});
