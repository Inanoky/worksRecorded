import {
  cleanupWhatsappSiteManagerEvalCheckpointThread,
  hasWhatsappSiteManagerEvalMetadata,
  selectNewestEvalRecord,
  selectRecordsForWhatsappEval,
} from "./whatsapp-site-manager-runner-utils";
import type { SavedSiteDiaryRecord } from "./whatsapp-site-manager-validators";

function record(id: string, createdAt: string): SavedSiteDiaryRecord {
  return {
    id,
    siteId: "site-1",
    userId: "user-1",
    workerId: null,
    Date: null,
    Location: "3 stāvs",
    Works: "Finishing",
    Comments: "Ieklātas grīdas",
    originalUserComment: "Test Manager : Šodien tika ieklātas grīdas 3 stāvā, 2 cilvēki, 3h",
    originalAudioUrl: null,
    WorkersInvolved: 2,
    TimeInvolved: 3,
    evalMetadata: null,
    createdAt: new Date(createdAt),
  };
}

describe("WhatsApp site-manager eval runner utils", () => {
  it("allows checkpoint cleanup for temporary WhatsApp site-manager eval threads", async () => {
    const deleteThread = jest.fn().mockResolvedValue(undefined);
    const threadId = "eval:whatsapp-site-manager:site-1:case-1:run-1";

    await cleanupWhatsappSiteManagerEvalCheckpointThread(threadId, deleteThread);

    expect(deleteThread).toHaveBeenCalledWith(threadId);
  });

  it.each([
    "siteManager:site-1:user-1",
    "eval:dashboard-chat:site-1:case-1:run-1",
    "unrelated-thread",
  ])("rejects checkpoint cleanup for non-eval thread %s", async (threadId) => {
    const deleteThread = jest.fn().mockResolvedValue(undefined);

    await expect(
      cleanupWhatsappSiteManagerEvalCheckpointThread(threadId, deleteThread),
    ).rejects.toThrow("Refusing to delete non-eval WhatsApp site-manager checkpoint thread");
    expect(deleteThread).not.toHaveBeenCalled();
  });

  it("selects the newest current-run record when multiple rows share the same input text", () => {
    const selected = selectNewestEvalRecord([
      record("old-record", "2026-06-23T07:40:00.000Z"),
      record("new-record", "2026-06-23T07:45:00.000Z"),
    ]);

    expect(selected?.id).toBe("new-record");
  });

  it("returns null when no records were created", () => {
    expect(selectNewestEvalRecord([])).toBeNull();
  });

  it("prefers persisted trace records over fallback lookup records", () => {
    const persisted = record("persisted-record", "2026-06-23T07:45:00.000Z");
    const staleFallback = {
      ...record("fallback-record", "2026-06-23T07:45:01.000Z"),
      WorkersInvolved: 0,
    };

    const records = selectRecordsForWhatsappEval({
      traceEntries: [{ persistedRecords: [persisted] }],
      fallbackRecords: [staleFallback],
    });

    expect(records).toEqual([persisted]);
    expect(selectNewestEvalRecord(records)?.WorkersInvolved).toBe(2);
  });

  it("identifies WhatsApp site-manager eval metadata by run and case", () => {
    const evalRecord = {
      ...record("eval-record", "2026-06-23T07:45:00.000Z"),
      evalMetadata: {
        isEval: true,
        flow: "whatsapp-site-manager",
        runId: "run-1",
        caseId: "case-1",
        messageId: "wamid.eval.run-1.case-1",
        createdBy: "ai-eval-runner",
      },
    };

    expect(
      hasWhatsappSiteManagerEvalMetadata(evalRecord, {
        runId: "run-1",
        caseId: "case-1",
      }),
    ).toBe(true);
    expect(
      hasWhatsappSiteManagerEvalMetadata(evalRecord, {
        runId: "run-1",
        caseId: "other-case",
      }),
    ).toBe(false);
    expect(hasWhatsappSiteManagerEvalMetadata(record("normal-record", "2026-06-23T07:45:00.000Z"))).toBe(false);
  });
});
