import {
  cleanupWhatsappSiteManagerEvalCheckpointThread,
  hasWhatsappSiteManagerEvalMetadata,
  prepareBatchedImageWebhookPayloads,
  selectNewestEvalRecord,
  selectRecordsForWhatsappEval,
} from "./whatsapp-site-manager-runner-utils";
import type { SavedSiteDiaryRecord } from "./whatsapp-site-manager-validators";

type PreparedWebhookPayload = {
  entry: Array<{
    changes: Array<{
      value: {
        messages: Array<Record<string, unknown>>;
      };
    }>;
  }>;
};

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

  it("prepares batched image webhook payloads with distinct messages and image shape", () => {
    const baseWebhook = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "eval-waba",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "37127445304",
                  phone_number_id: "eval-business-phone",
                },
                contacts: [
                  {
                    profile: { name: "Eval Site Manager" },
                    wa_id: "37129391891",
                    user_id: "LV.original",
                  },
                ],
                messages: [
                  {
                    from: "37129391891",
                    from_user_id: "LV.original",
                    id: "wamid.original",
                    timestamp: "1782197581",
                    image: {
                      id: "original-media",
                      mime_type: "image/jpeg",
                      caption: "original",
                    },
                    type: "image",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const prepared = prepareBatchedImageWebhookPayloads({
      baseWebhook,
      caseId: "latvian-image-batch-yesterday-photo-date",
      runId: "run-1",
      businessPhoneNumberId: "business-1",
      senderPhone: "37120000000",
      bsuid: "LV.eval.run-1",
      imageBatch: [
        {
          caption: "Pievieno šos foto vakardienai",
          timestamp: "1782197581",
          mediaId: "media-1",
        },
        {
          caption: "",
          timestamp: "1782197582",
          mediaId: "media-2",
        },
      ],
    });

    expect(prepared.messageId).toBe(
      "wamid.eval.run-1.latvian-image-batch-yesterday-photo-date.batch-1,wamid.eval.run-1.latvian-image-batch-yesterday-photo-date.batch-2",
    );
    expect(prepared.inputText).toBe("Pievieno šos foto vakardienai");
    expect(prepared.payloads).toHaveLength(2);
    expect(prepared.payloads[0].messageId).not.toBe(
      prepared.payloads[1].messageId,
    );

    const firstMessage = (prepared.payloads[0].payload as PreparedWebhookPayload)
      .entry[0].changes[0].value.messages[0];
    const secondMessage = (
      prepared.payloads[1].payload as PreparedWebhookPayload
    ).entry[0].changes[0].value.messages[0];

    expect(firstMessage).toMatchObject({
      from: "37120000000",
      from_user_id: "LV.eval.run-1",
      type: "image",
      timestamp: "1782197581",
      image: {
        id: "media-1",
        mime_type: "image/jpeg",
        caption: "Pievieno šos foto vakardienai",
      },
    });
    expect(secondMessage).toMatchObject({
      from: "37120000000",
      from_user_id: "LV.eval.run-1",
      type: "image",
      timestamp: "1782197582",
      image: {
        id: "media-2",
        mime_type: "image/jpeg",
        caption: "",
      },
    });
    expect(firstMessage.text).toBeUndefined();
    expect(secondMessage.text).toBeUndefined();
  });
});
