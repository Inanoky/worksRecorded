import type { SavedSiteDiaryRecord } from "./whatsapp-site-manager-validators";

type StructuredSaveTraceWithPersistedRecords = {
  persistedRecords?: Array<SavedSiteDiaryRecord | Record<string, unknown>> | null;
};

const WHATSAPP_SITE_MANAGER_EVAL_THREAD_PREFIX = "eval:whatsapp-site-manager:";

export async function cleanupWhatsappSiteManagerEvalCheckpointThread(
  threadId: string,
  deleteThread: (threadId: string) => Promise<unknown>,
) {
  if (!threadId.startsWith(WHATSAPP_SITE_MANAGER_EVAL_THREAD_PREFIX)) {
    throw new Error(
      `Refusing to delete non-eval WhatsApp site-manager checkpoint thread: ${threadId}`,
    );
  }

  await deleteThread(threadId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cloneWebhook<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function firstValue(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  const entry = Array.isArray(root?.entry) ? asRecord(root.entry[0]) : null;
  const changes = Array.isArray(entry?.changes)
    ? asRecord(entry.changes[0])
    : null;
  return asRecord(changes?.value);
}

function firstMessage(payload: unknown): Record<string, unknown> | null {
  const value = firstValue(payload);
  const messages = Array.isArray(value?.messages) ? value.messages : [];
  return asRecord(messages[0]);
}

function textFromWebhook(payload: unknown) {
  const message = firstMessage(payload);
  const text = asRecord(message?.text);
  const image = asRecord(message?.image);
  return String(text?.body ?? image?.caption ?? "");
}

export function prepareBatchedImageWebhookPayloads(args: {
  baseWebhook: Record<string, unknown>;
  caseId: string;
  runId: string;
  businessPhoneNumberId: string;
  senderPhone: string;
  bsuid: string;
  imageBatch: Array<{
    caption: string;
    timestamp: string;
    mediaId?: string;
    mimeType?: string;
  }>;
}) {
  const prepared = args.imageBatch.map((item, index) => {
    const payload = cloneWebhook(args.baseWebhook);
    const value = firstValue(payload);
    const message = firstMessage(payload);
    const messageId = `wamid.eval.${args.runId}.${args.caseId}.batch-${index + 1}`;

    if (!value || !message) {
      throw new Error(`Invalid WhatsApp eval webhook fixture for ${args.caseId}.`);
    }

    value.metadata = {
      ...(asRecord(value.metadata) ?? {}),
      phone_number_id: args.businessPhoneNumberId,
    };
    const contacts = Array.isArray(value.contacts) ? value.contacts : [];
    value.contacts = [
      {
        ...(asRecord(contacts[0]) ?? {}),
        wa_id: args.senderPhone,
        user_id: args.bsuid,
      },
    ];
    message.from = args.senderPhone;
    message.from_user_id = args.bsuid;
    message.id = messageId;
    message.timestamp = item.timestamp;
    message.type = "image";
    message.image = {
      id: item.mediaId ?? `eval-image-media-${args.caseId}-batch-${index + 1}`,
      mime_type: item.mimeType ?? "image/jpeg",
      caption: item.caption,
    };
    delete message.text;
    delete message.audio;

    return {
      payload,
      messageId,
      messageType: "image",
      inputText: textFromWebhook(payload),
    };
  });

  return {
    payloads: prepared,
    messageId: prepared.map((item) => item.messageId).join(","),
    messageType: "image",
    inputText: prepared.map((item) => item.inputText.trim()).find(Boolean) ?? "",
  };
}

function createdAtMs(record: Pick<SavedSiteDiaryRecord, "createdAt">) {
  return new Date(record.createdAt).getTime();
}

export function selectNewestEvalRecord<T extends Pick<SavedSiteDiaryRecord, "createdAt">>(
  records: T[],
) {
  return (
    [...records].sort((left, right) => createdAtMs(right) - createdAtMs(left))[0] ?? null
  );
}

export function getPersistedEvalRecordsFromTrace(
  traceEntries: StructuredSaveTraceWithPersistedRecords[],
) {
  return traceEntries.flatMap((entry) => entry.persistedRecords ?? []) as SavedSiteDiaryRecord[];
}

export function selectRecordsForWhatsappEval(args: {
  traceEntries: StructuredSaveTraceWithPersistedRecords[];
  fallbackRecords: SavedSiteDiaryRecord[];
}) {
  const persistedRecords = getPersistedEvalRecordsFromTrace(args.traceEntries);
  return persistedRecords.length > 0 ? persistedRecords : args.fallbackRecords;
}

export function hasWhatsappSiteManagerEvalMetadata(
  record: Pick<SavedSiteDiaryRecord, "evalMetadata">,
  args: { runId?: string; caseId?: string } = {},
) {
  const metadata = asRecord(record.evalMetadata);
  if (!metadata) return false;

  if (metadata.isEval !== true) return false;
  if (metadata.flow !== "whatsapp-site-manager") return false;
  if (args.runId && metadata.runId !== args.runId) return false;
  if (args.caseId && metadata.caseId !== args.caseId) return false;

  return true;
}
