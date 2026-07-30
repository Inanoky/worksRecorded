import {
  buildSiteDiaryAiValidationMetadata,
  buildSiteDiaryAiValidationSummaryMetadata,
  validateAiSiteDiaryRow,
} from "./ai-row-validation";

describe("validateAiSiteDiaryRow", () => {
  it("nulls layer counts that were mapped as amounts", () => {
    const result = validateAiSiteDiaryRow("reģipsis 2 kārtās", {
      Works: "Drywall",
      Amounts: 2,
      Units: "pcs",
    });

    expect(result.row).toEqual({
      Works: "Drywall",
      Amounts: null,
      Units: null,
    });
    expect(result.warnings).toEqual([
      { field: "Amounts", code: "amount_not_explicit", value: 2 },
    ]);
  });

  it("keeps explicit workers and hours but nulls inferred amounts", () => {
    const result = validateAiSiteDiaryRow("Dz 6, 2 cilvēki, 3h", {
      Location: "Dz 6",
      Amounts: 6,
      WorkersInvolved: 2,
      TimeInvolved: 3,
    });

    expect(result.row.Amounts).toBeNull();
    expect(result.row.WorkersInvolved).toBe(2);
    expect(result.row.TimeInvolved).toBe(3);
    expect(result.warnings).toEqual([
      { field: "Amounts", code: "amount_not_explicit", value: 6 },
    ]);
  });

  it("keeps explicit completed quantities", () => {
    const result = validateAiSiteDiaryRow("Pabeigti 10 m2 OSB", {
      Works: "OSB",
      Amounts: 10,
      Units: "m2",
    });

    expect(result.row.Amounts).toBe(10);
    expect(result.row.Units).toBe("m2");
    expect(result.warnings).toEqual([]);
  });

  it("keeps explicit hours but nulls missing workers and amounts", () => {
    const result = validateAiSiteDiaryRow("Šodien apmestas sienas 2 stāvā, 4h", {
      Location: "2 stāvs",
      Works: "Apmešana",
      Amounts: 2,
      WorkersInvolved: 2,
      TimeInvolved: 4,
    });

    expect(result.row.Amounts).toBeNull();
    expect(result.row.WorkersInvolved).toBeNull();
    expect(result.row.TimeInvolved).toBe(4);
    expect(result.warnings).toEqual([
      { field: "Amounts", code: "amount_not_explicit", value: 2 },
      { field: "WorkersInvolved", code: "workers_not_explicit", value: 2 },
    ]);
  });

  it("nulls model zeroes when zero was not explicit", () => {
    const result = validateAiSiteDiaryRow("Šodien veikta tīrīšana", {
      Works: "Cleaning",
      Amounts: 0,
      WorkersInvolved: 0,
      TimeInvolved: 0,
    });

    expect(result.row).toEqual({
      Works: "Cleaning",
      Amounts: null,
      WorkersInvolved: null,
      TimeInvolved: null,
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "amount_zero_not_explicit",
      "workers_zero_not_explicit",
      "hours_zero_not_explicit",
    ]);
  });

  it("keeps time-range hours when the duration matches", () => {
    const result = validateAiSiteDiaryRow("laiks: 08:00-15:00", {
      Works: "Stairs assembly",
      TimeInvolved: 7,
    });

    expect(result.row.TimeInvolved).toBe(7);
    expect(result.warnings).toEqual([]);
  });
});

describe("buildSiteDiaryAiValidationMetadata", () => {
  it("returns null when no warnings exist", () => {
    expect(buildSiteDiaryAiValidationMetadata([[], []])).toBeNull();
  });

  it("keeps row indexes for audit warnings", () => {
    expect(
      buildSiteDiaryAiValidationMetadata([
        [],
        [{ field: "Amounts", code: "amount_not_explicit", value: 2 }],
      ]),
    ).toEqual({
      siteDiaryAiValidation: {
        version: 1,
        rowWarnings: [
          {
            rowIndex: 1,
            warnings: [{ field: "Amounts", code: "amount_not_explicit", value: 2 }],
          },
        ],
      },
    });
  });
});

describe("buildSiteDiaryAiValidationSummaryMetadata", () => {
  it("returns flat filterable LangSmith metadata", () => {
    expect(
      buildSiteDiaryAiValidationSummaryMetadata([
        [{ field: "Amounts", code: "amount_not_explicit", value: 2 }],
        [{ field: "WorkersInvolved", code: "workers_not_explicit", value: 2 }],
      ]),
    ).toEqual({
      siteDiaryValidationWarningCount: 2,
      siteDiaryValidationFields: "Amounts,WorkersInvolved",
      siteDiaryValidationCodes: "amount_not_explicit,workers_not_explicit",
      siteDiaryValidationSanitized: true,
    });
  });

  it("returns empty values when no validation warnings exist", () => {
    expect(buildSiteDiaryAiValidationSummaryMetadata([[]])).toEqual({
      siteDiaryValidationWarningCount: 0,
      siteDiaryValidationFields: "",
      siteDiaryValidationCodes: "",
      siteDiaryValidationSanitized: false,
    });
  });
});
