import {
  hasStructuredSaveTraceContext,
  recordStructuredSaveTrace,
  runWithStructuredSaveTrace,
} from "./structuredSaveTrace";

describe("structured save trace", () => {
  it("captures structured save trace entries only inside trace context", async () => {
    recordStructuredSaveTrace({
      siteId: "site-outside",
      userId: "user-outside",
      date: "23-06-2026",
      originalUserComment: "outside",
      rawRecords: [{ Workers: 99 }],
      mappedRows: [{ WorkersInvolved: 99 }],
      normalizedInsertRows: [{ WorkersInvolved: 99 }],
      persistedRecords: [{ WorkersInvolved: 99 }],
    });

    expect(hasStructuredSaveTraceContext()).toBe(false);

    const traced = await runWithStructuredSaveTrace(async () => {
      expect(hasStructuredSaveTraceContext()).toBe(true);
      recordStructuredSaveTrace({
        siteId: "site-1",
        userId: "user-1",
        date: "23-06-2026",
        originalUserComment: "Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
        rawRecords: [{ Workers: 2, Hours: 3 }],
        mappedRows: [{ WorkersInvolved: 2, TimeInvolved: 3 }],
        normalizedInsertRows: [{ WorkersInvolved: 2, TimeInvolved: 3 }],
        persistedRecords: [{ id: "record-1", WorkersInvolved: 2, TimeInvolved: 3 }],
      });

      return "ok";
    });

    expect(traced.result).toBe("ok");
    expect(traced.entries).toEqual([
      {
        siteId: "site-1",
        userId: "user-1",
        date: "23-06-2026",
        originalUserComment: "Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
        rawRecords: [{ Workers: 2, Hours: 3 }],
        mappedRows: [{ WorkersInvolved: 2, TimeInvolved: 3 }],
        normalizedInsertRows: [{ WorkersInvolved: 2, TimeInvolved: 3 }],
        persistedRecords: [{ id: "record-1", WorkersInvolved: 2, TimeInvolved: 3 }],
      },
    ]);
  });
});
