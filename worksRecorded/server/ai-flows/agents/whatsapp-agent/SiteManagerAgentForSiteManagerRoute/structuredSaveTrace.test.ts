import {
  hasStructuredSaveTraceContext,
  recordStructuredSaveTrace,
  runWithStructuredSaveTrace,
} from "./structuredSaveTrace";
import {
  getSiteManagerAgentRunContext,
  runWithSiteManagerAgentEvalContext,
} from "./runContext";

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
        normalizedInsertRows: [
          {
            WorkersInvolved: 2,
            TimeInvolved: 3,
            evalMetadata: { isEval: true, runId: "run-1", caseId: "case-1" },
          },
        ],
        persistedRecords: [
          {
            id: "record-1",
            WorkersInvolved: 2,
            TimeInvolved: 3,
            evalMetadata: { isEval: true, runId: "run-1", caseId: "case-1" },
          },
        ],
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
        normalizedInsertRows: [
          {
            WorkersInvolved: 2,
            TimeInvolved: 3,
            evalMetadata: { isEval: true, runId: "run-1", caseId: "case-1" },
          },
        ],
        persistedRecords: [
          {
            id: "record-1",
            WorkersInvolved: 2,
            TimeInvolved: 3,
            evalMetadata: { isEval: true, runId: "run-1", caseId: "case-1" },
          },
        ],
      },
    ]);
  });

  it("exposes eval tags and record metadata through the site-manager run context", async () => {
    await runWithSiteManagerAgentEvalContext(
      {
        traceMetadata: {
          evalRunId: "run-1",
          evalCaseId: "case-1",
          evalMode: "real-meta-webhook-regression",
          webhookMessageId: "wamid.eval.run-1.case-1",
        },
        traceTags: [
          "eval",
          "eval:whatsapp-site-manager",
          "eval-run:run-1",
          "eval-case:case-1",
        ],
        evalRecordMetadata: {
          isEval: true,
          flow: "whatsapp-site-manager",
          runId: "run-1",
          caseId: "case-1",
          messageId: "wamid.eval.run-1.case-1",
          createdBy: "ai-eval-runner",
        },
      },
      async () => {
        expect(getSiteManagerAgentRunContext()).toEqual(
          expect.objectContaining({
            traceMetadata: expect.objectContaining({
              evalRunId: "run-1",
              evalCaseId: "case-1",
            }),
            traceTags: expect.arrayContaining([
              "eval",
              "eval:whatsapp-site-manager",
              "eval-run:run-1",
              "eval-case:case-1",
            ]),
            evalRecordMetadata: expect.objectContaining({
              isEval: true,
              runId: "run-1",
              caseId: "case-1",
            }),
          }),
        );
      },
    );
  });
});
