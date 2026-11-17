import { reviewProposal, reviewSnapshot } from "@/test/fixtures/diary-review";
import {
  diaryReviewEnabled,
  diaryReviewProcessAfter,
  validateDiaryReviewProposal,
} from "./diary-review";

it("delays after the latest message but caps continuous traffic at thirty minutes", () => {
  const first = new Date("2026-11-16T08:00:00Z");
  expect(
    diaryReviewProcessAfter(
      first,
      new Date("2026-11-16T08:05:00Z"),
    ).toISOString(),
  ).toBe("2026-11-16T08:15:00.000Z");
  expect(
    diaryReviewProcessAfter(
      first,
      new Date("2026-11-16T08:27:00Z"),
    ).toISOString(),
  ).toBe("2026-11-16T08:30:00.000Z");
});

it("accepts source-backed decimal quantities and an in-project work position", () => {
  expect(
    validateDiaryReviewProposal(reviewProposal(), reviewSnapshot()).records[0]
      .changes[0].value,
  ).toBe(12.5);
});

it("accepts explicit Latvian word-number worker counts", () => {
  const proposal = reviewProposal();
  proposal.records[0].changes = [
    {
      field: "WorkersInvolved",
      value: 3,
      evidence: "trīs strādnieki",
      reason: "Norādīts avotā.",
    },
  ];
  expect(
    validateDiaryReviewProposal(proposal, reviewSnapshot()).records[0]
      .changes[0].value,
  ).toBe(3);
});

it.each(["other-site", "material-only", "manual-only"])(
  "rejects a %s position",
  (id) => {
    const snapshot = reviewSnapshot();
    if (id === "material-only") snapshot.positions[0].kind = "material";
    if (id === "manual-only") snapshot.positions[0].manualAssignmentOnly = true;
    if (id === "other-site") snapshot.positions = [];
    expect(() =>
      validateDiaryReviewProposal(reviewProposal(), snapshot),
    ).toThrow("REVIEW_POSITION_SCOPE");
  },
);

it.each(["manual", "rule"] as const)(
  "preserves existing %s assignments",
  (method) => {
    const snapshot = reviewSnapshot();
    snapshot.records[0].allocation = {
      sourceId: "row",
      sourceType: "work",
      positionId: "concrete",
      method,
      confidence: null,
      assignedAt: "today",
    };
    expect(() =>
      validateDiaryReviewProposal(reviewProposal(), snapshot),
    ).toThrow("REVIEW_MANUAL_ASSIGNMENT_PROTECTED");
  },
);

it("rejects edits to BIS-linked records", () => {
  const snapshot = reviewSnapshot();
  snapshot.records[0].bisId = "bis-1";
  expect(() => validateDiaryReviewProposal(reviewProposal(), snapshot)).toThrow(
    "REVIEW_BIS_PROTECTED",
  );
});

it("does not use another record as numeric evidence", () => {
  const proposal = reviewProposal();
  proposal.records[0].changes[0].evidence = "Vēl viens darbs 100 m3";
  expect(() => validateDiaryReviewProposal(proposal, reviewSnapshot())).toThrow(
    "REVIEW_UNSUPPORTED_EVIDENCE",
  );
});

it("rejects invented numbers even when a source quote exists", () => {
  const proposal = reviewProposal();
  proposal.records[0].changes[0].value = 100;
  expect(() => validateDiaryReviewProposal(proposal, reviewSnapshot())).toThrow(
    "REVIEW_NUMBER_NOT_IN_EVIDENCE",
  );
});

it("preserves planned quantities for the separate plan/actual profile", () => {
  const snapshot = reviewSnapshot();
  snapshot.actualQuantityField = "Comments_Custom_1";
  expect(() => validateDiaryReviewProposal(reviewProposal(), snapshot)).toThrow(
    "REVIEW_PLANNED_QUANTITY_PROTECTED",
  );
  const proposal = reviewProposal();
  proposal.records[0].changes[0].field = "Comments_Custom_1";
  expect(validateDiaryReviewProposal(proposal, snapshot)).toEqual(proposal);
});

it("rejects incompatible dimensions rather than converting m2 to m3", () => {
  const snapshot = reviewSnapshot();
  snapshot.records[0].fields.Units = "m2";
  expect(() => validateDiaryReviewProposal(reviewProposal(), snapshot)).toThrow(
    "REVIEW_UNIT_MISMATCH",
  );
});

it("requires one result for every scoped record with no duplicates", () => {
  const proposal = reviewProposal();
  proposal.records = [];
  expect(() => validateDiaryReviewProposal(proposal, reviewSnapshot())).toThrow(
    "REVIEW_INCOMPLETE_COVERAGE",
  );
  const duplicate = reviewProposal();
  duplicate.records.push(duplicate.records[0]);
  expect(() =>
    validateDiaryReviewProposal(duplicate, reviewSnapshot()),
  ).toThrow("REVIEW_RECORD_SCOPE");
});

it("does not apply changes under a verified or clarification verdict", () => {
  const proposal = reviewProposal();
  proposal.records[0].verdict = "verified";
  expect(() => validateDiaryReviewProposal(proposal, reviewSnapshot())).toThrow(
    "REVIEW_INVALID_VERDICT",
  );
});

it("does not enable paid background work unless the flag and site enrollment allow it", () => {
  const enabled = process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
  const sites = process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
  try {
    delete process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
    expect(diaryReviewEnabled("site")).toBe(false);
    process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = "true";
    process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS = "site, second";
    expect(diaryReviewEnabled("site")).toBe(true);
    expect(diaryReviewEnabled("other")).toBe(false);
  } finally {
    if (enabled === undefined)
      delete process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED;
    else process.env.CONSTRUCTION_DIARY_REVIEW_ENABLED = enabled;
    if (sites === undefined)
      delete process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS;
    else process.env.CONSTRUCTION_DIARY_REVIEW_SITE_IDS = sites;
  }
});
