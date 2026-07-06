// worksRecorded/app/api/webhook/Meta/route.ts
// Next.js App Router webhook endpoint (GET verify + POST events)
export const maxDuration = 300;

import { randomUUID } from "crypto";
import { prisma } from "@/lib/utils/db";
import {
  getString,
  normalizePhone,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { handleWorkerRoute } from "@/flows/default-production/backend";

import { handleSiteManagerRoute } from "@/flows/default-construction/backend";
import { runWithMetaReplyContext } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { getMetaGraphBaseUrl } from "@/lib/utils/whatsapp-helpers/meta/config";
import {
  applyMetaUserIdUpdate,
  extractMetaWebhookIdentity,
  resolveMetaWhatsAppIdentity,
  type ResolvedWhatsAppIdentity,
} from "@/lib/utils/whatsapp-helpers/meta/identity";
import {
  sendMetaContactRequest,
  sendMetaGraphMessage,
} from "@/lib/utils/whatsapp-helpers/meta/sender";
import {
  getSession,
  startSession,
  updateSession,
  deleteSession,
} from "@/app/api/webhook/meta/webhook/helperes";
import {
  handleZtcWorkerRoute,
} from "@/flows/ztc-production/backend";
import {
  handleZtcQualityRoute,
  isZtcQualityWorkerRole,
} from "@/flows/ztc-production/backend";
import { resolveAdvancedProductionWorkflowContextForWorker } from "@/lib/production-flow/runtime-server";
import { resolveWorkerFlowRuntime } from "@/lib/flows/worker-runtime-server";

const { WEBHOOK_VERIFY_TOKEN, META_ACCESS_TOKEN } = process.env;

const LOCK_TTL_MS = 180_000;
const ROUTING_LOCK_WAIT_MS = 120_000;
const ROUTING_LOCK_RETRY_MS = 500;
const PROCESSED_MESSAGE_TTL_MS = 10 * 60_000;
const ZTC_IMAGE_BATCH_QUIET_MS = 5_000;
const ZTC_IMAGE_BATCH_STALE_MS = 2 * 60_000;
const ZTC_DIAGONAL_STATE_PREFIXES = [
  "__ZTC_DIAGONAL_FIRST_PHOTO_PENDING__",
  "__ZTC_DIAGONAL_FIRST_MEASURE_PENDING__",
  "__ZTC_DIAGONAL_SECOND_PHOTO_PENDING__",
  "__ZTC_DIAGONAL_SECOND_MEASURE_PENDING__",
];
const processedMetaMessages =
  (globalThis as any).__processedMetaMessages ||
  new Map<string, number>();

(globalThis as any).__processedMetaMessages = processedMetaMessages;

function logMetaWebhookTiming(
  event: string,
  startedAt: number,
  details: Record<string, unknown> = {},
) {
  console.log("[Meta webhook timing]", {
    event,
    durationMs: Date.now() - startedAt,
    ...details,
  });
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

async function cleanupStaleLock(phone: string) {
  const cutoff = new Date(Date.now() - LOCK_TTL_MS);

  await prisma.whatsappTextLock.deleteMany({
    where: {
      phone,
      lockedAt: { lt: cutoff },
    },
  });
}

async function tryAcquireTextLock(phone: string, messageId?: string | null) {
  await cleanupStaleLock(phone);

  try {
    await prisma.whatsappTextLock.create({
      data: {
        phone,
        messageId: messageId || undefined,
      },
    });

    return true;
  } catch (e: any) {
    if (isUniqueViolation(e)) return false;
    throw e;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireRoutingLock(phone: string, messageId?: string | null) {
  const deadline = Date.now() + ROUTING_LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    const acquired = await tryAcquireTextLock(phone, messageId);
    if (acquired) return true;
    await sleep(ROUTING_LOCK_RETRY_MS);
  }

  return false;
}

async function releaseTextLock(phone: string) {
  await prisma.whatsappTextLock.deleteMany({
    where: { phone },
  });
}

function hasProcessedMetaMessage(messageId: string): boolean {
  const now = Date.now();

  for (const [id, expiresAt] of processedMetaMessages.entries()) {
    if (expiresAt <= now) processedMetaMessages.delete(id);
  }

  const existing = processedMetaMessages.get(messageId);
  if (existing && existing > now) return true;

  processedMetaMessages.set(messageId, now + PROCESSED_MESSAGE_TTL_MS);
  return false;
}

function isRoutableMetaMessage(message: any) {
  return message?.type === "text" || message?.type === "image" || message?.type === "audio";
}

function isReadableMetaMessage(message: any) {
  return isRoutableMetaMessage(message) || message?.type === "contacts";
}

function logUnsupportedMetaMessage(message: any) {
  console.warn("Meta unsupported webhook message skipped", {
    id: message?.id,
    from: message?.from,
    type: message?.type,
    unsupportedType: message?.unsupported?.type,
    errors: Array.isArray(message?.errors)
      ? message.errors.map((error: any) => ({
          code: error?.code,
          title: error?.title,
          message: error?.message,
          details: error?.error_data?.details,
        }))
      : undefined,
  });
}

function mustGetEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function describeUrlForLog(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

async function graphSendMessage(
  businessPhoneNumberId: string,
  body: unknown
): Promise<void> {
  const token = mustGetEnv("META_ACCESS_TOKEN", META_ACCESS_TOKEN);

  const res = await fetch(
    `${getMetaGraphBaseUrl()}/${businessPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Graph API error ${res.status} ${res.statusText}: ${text || "<no body>"}`
    );
  }
}

async function sendMetaTypingIndicator(
  businessPhoneNumberId: string,
  messageId: string,
  to: string | null
): Promise<void> {
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: {
      type: "text",
    },
  };

  if (to) body.to = to;
  await graphSendMessage(businessPhoneNumberId, body);
}

/**
 * GET /api/webhook/Meta
 * Meta webhook verification handshake.
 */
export async function GET(req: Request): Promise<Response> {
  const verifyToken = mustGetEnv("WEBHOOK_VERIFY_TOKEN", WEBHOOK_VERIFY_TOKEN);

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    console.log("Webhook verified successfully!");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

async function getMetaMediaInfo(mediaId: string): Promise<{ url: string; mimeType: string } | null> {
  const token = mustGetEnv("META_ACCESS_TOKEN", META_ACCESS_TOKEN);

  const res = await fetch(`${getMetaGraphBaseUrl()}/${mediaId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Failed to resolve Meta media info", res.status, text);
    return null;
  }

  const data = await res.json().catch(() => null);
  const url = data?.url;
  const mimeType = data?.mime_type;

  if (!url) return null;
  return { url, mimeType: mimeType || "image/jpeg" };
}

async function toWhatsAppFormData(message: any, resolved: ResolvedWhatsAppIdentity): Promise<FormData> {
  const startedAt = Date.now();
  const formData = new FormData();
  const textBody = typeof message?.text?.body === "string" ? message.text.body : "";
  const imageCaption =
    typeof message?.image?.caption === "string" ? message.image.caption : "";
  const body = textBody || imageCaption;
  const from = resolved.fromForHandlers || "";
  const hasImage = Boolean(message?.image?.id);
  const hasAudio = Boolean(message?.audio?.id);
  const numMedia = hasImage || hasAudio ? "1" : "0";

  formData.set("SmsStatus", "received");
  formData.set("From", from);
  formData.set("WaId", resolved.webhookIdentity.phone ?? "");
  formData.set("MetaUserId", resolved.webhookIdentity.bsuid ?? "");
  formData.set("MetaParentUserId", resolved.webhookIdentity.parentBsuid ?? "");
  formData.set("MetaUsername", resolved.webhookIdentity.username ?? "");
  formData.set("Body", body);
  formData.set("MessageId", message?.id ?? "");
  formData.set("MessageTimestamp", message?.timestamp ?? "");
  formData.set("NumMedia", numMedia);

  if (hasImage) {
    const mediaStartedAt = Date.now();
    const mediaInfo = await getMetaMediaInfo(message.image.id);
    logMetaWebhookTiming("meta_image_media_info", mediaStartedAt, {
      messageId: message?.id ?? null,
      mediaId: message.image.id,
      hasUrl: Boolean(mediaInfo?.url),
      selectedUrl: describeUrlForLog(mediaInfo?.url),
    });

    if (mediaInfo) {
      formData.set("MediaUrl0", mediaInfo.url);
      formData.set("MediaContentType0", mediaInfo.mimeType);
      formData.set("MediaProvider0", "meta");
    }
  }

  if (hasAudio) {
    const mediaStartedAt = Date.now();
    const mediaInfo = await getMetaMediaInfo(message.audio.id);
    logMetaWebhookTiming("meta_audio_media_info", mediaStartedAt, {
      messageId: message?.id ?? null,
      mediaId: message.audio?.id,
      hasUrl: Boolean(mediaInfo?.url),
      selectedUrl: describeUrlForLog(mediaInfo?.url),
    });

    const mediaUrl = mediaInfo?.url || (typeof message.audio?.url === "string" ? message.audio.url : "");
    const mimeType =
      mediaInfo?.mimeType ||
      (typeof message.audio?.mime_type === "string" ? message.audio.mime_type : "audio/ogg");

    console.log("[originalAudioUrl][webhook] audio media resolved", {
      messageId: message?.id,
      mediaId: message.audio?.id,
      hasGraphUrl: Boolean(mediaInfo?.url),
      hasPayloadUrl: typeof message.audio?.url === "string" && message.audio.url.length > 0,
      selectedUrl: describeUrlForLog(mediaUrl),
      mimeType,
    });

    if (mediaUrl) {
      formData.set("MediaUrl0", mediaUrl);
      formData.set("MediaContentType0", mimeType);
      formData.set("MediaProvider0", "meta");
    } else {
      console.warn("[originalAudioUrl][webhook] audio message has no usable media URL", {
        messageId: message?.id,
        mediaId: message.audio?.id,
      });
    }
  }

  logMetaWebhookTiming("to_whatsapp_form_data", startedAt, {
    messageId: message?.id ?? null,
    type: message?.type ?? null,
    hasImage,
    hasAudio,
    numMedia,
  });

  return formData;
}

type ZtcImageBatchMode = "ztc_worker" | "ztc_quality";

type SerializedZtcImageMessage = {
  messageId: string;
  receivedAt: string;
  entries: Array<[string, string]>;
};

function serializeFormData(formData: FormData): Array<[string, string]> {
  return Array.from(formData.entries()).map(([key, value]) => [
    key,
    typeof value === "string" ? value : String(value),
  ]);
}

function getSerializedEntry(item: SerializedZtcImageMessage, key: string) {
  return item.entries.find(([entryKey]) => entryKey === key)?.[1] ?? "";
}

function buildBatchedImageFormData(items: SerializedZtcImageMessage[]) {
  const formData = new FormData();
  const first = items[0];
  if (!first) return formData;

  for (const [key, value] of first.entries) {
    if (/^Media(?:Url|ContentType|Provider)\d+$/i.test(key)) continue;
    if (key === "NumMedia" || key === "MessageId" || key === "MessageTimestamp" || key === "Body") continue;
    formData.set(key, value);
  }

  const body = items
    .map((item) => getSerializedEntry(item, "Body").trim())
    .find(Boolean) ?? "";
  const messageIds = items.map((item) => item.messageId).filter(Boolean);
  const timestamps = items
    .map((item) => Number(getSerializedEntry(item, "MessageTimestamp")))
    .filter((value) => Number.isFinite(value) && value > 0);

  formData.set("Body", body);
  formData.set("MessageId", messageIds.join(","));
  formData.set("MessageTimestamp", timestamps.length > 0 ? String(Math.min(...timestamps)) : "");
  formData.set("MetaBatchMessageIds", JSON.stringify(messageIds));
  formData.set("MetaBatchSize", String(items.length));
  formData.set("NumMedia", String(items.length));

  items.forEach((item, index) => {
    formData.set(`MediaUrl${index}`, getSerializedEntry(item, "MediaUrl0"));
    formData.set(`MediaContentType${index}`, getSerializedEntry(item, "MediaContentType0"));
    formData.set(`MediaProvider${index}`, getSerializedEntry(item, "MediaProvider0"));
  });

  return formData;
}

function isSingleMetaImageFormData(formData: FormData) {
  return (
    getString(formData, "NumMedia") === "1" &&
    getString(formData, "MediaContentType0").startsWith("image/")
  );
}

function isZtcDiagonalState(state: string | null | undefined) {
  return ZTC_DIAGONAL_STATE_PREFIXES.some((prefix) => state?.startsWith(prefix));
}

async function shouldSendZtcImageBatchAcknowledgement(args: {
  workerId: string;
  mode: ZtcImageBatchMode;
}) {
  const activeSession = await prisma.ztcRecords.findFirst({
    where: {
      workerId: args.workerId,
      Date_Custom_2: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      Works: true,
      Comments_Custom_1: true,
    },
  });

  if (!activeSession) return false;
  if (isZtcDiagonalState(activeSession.Comments_Custom_1)) return false;

  if (args.mode === "ztc_quality") {
    return activeSession.Comments_Custom_1?.startsWith("__ZTC_QA_PENDING__") ?? false;
  }

  return Boolean(activeSession.Works);
}

async function stageZtcImageBatch(args: {
  identityKey: string;
  worker: { id: string; organizationId?: string | null };
  mode: ZtcImageBatchMode;
  formData: FormData;
  businessPhoneNumberId: string;
  ackRecipient?: string | null;
}) {
  if (!isSingleMetaImageFormData(args.formData)) {
    return { ready: true as const, formData: args.formData, batchId: null, batchSize: 1 };
  }

  const messageId = getString(args.formData, "MessageId");
  const batchKey = `${args.mode}:${args.identityKey}`;
  const item: SerializedZtcImageMessage = {
    messageId,
    receivedAt: new Date().toISOString(),
    entries: serializeFormData(args.formData),
  };

  const stageStartedAt = Date.now();
  const stagedRows = await prisma.$queryRaw<Array<{ itemCount: number | bigint }>>`
    INSERT INTO "ZtcInboundMediaBatch" (
      "id",
      "batchKey",
      "workerId",
      "organizationId",
      "mode",
      "status",
      "items",
      "firstReceivedAt",
      "lastReceivedAt",
      "lastMessageId",
      "processAfter",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${batchKey},
      ${args.worker.id},
      ${args.worker.organizationId ?? null},
      ${args.mode},
      'collecting',
      ${JSON.stringify([item])}::jsonb,
      NOW(),
      NOW(),
      ${messageId || null},
      NOW() + (${ZTC_IMAGE_BATCH_QUIET_MS}::int * INTERVAL '1 millisecond'),
      NOW(),
      NOW()
    )
    ON CONFLICT ("batchKey") DO UPDATE SET
      "workerId" = EXCLUDED."workerId",
      "organizationId" = EXCLUDED."organizationId",
      "mode" = EXCLUDED."mode",
      "status" = 'collecting',
      "items" = CASE
        WHEN "ZtcInboundMediaBatch"."status" = 'collecting'
          AND "ZtcInboundMediaBatch"."updatedAt" > NOW() - (${ZTC_IMAGE_BATCH_STALE_MS}::int * INTERVAL '1 millisecond')
        THEN "ZtcInboundMediaBatch"."items" || EXCLUDED."items"
        ELSE EXCLUDED."items"
      END,
      "lastReceivedAt" = NOW(),
      "lastMessageId" = EXCLUDED."lastMessageId",
      "processAfter" = EXCLUDED."processAfter",
      "updatedAt" = NOW()
    RETURNING jsonb_array_length("items") AS "itemCount"
  `;
  const stagedItemCount = Number(stagedRows[0]?.itemCount ?? 0);
  logMetaWebhookTiming("ztc_image_batch_stage", stageStartedAt, {
    batchKey,
    mode: args.mode,
    workerId: args.worker.id,
    messageId,
    stagedItemCount,
  });

  const shouldSendAck =
    stagedItemCount === 1 &&
    args.ackRecipient &&
    (await shouldSendZtcImageBatchAcknowledgement({
      workerId: args.worker.id,
      mode: args.mode,
    }));

  if (shouldSendAck) {
    await sendMetaGraphMessage({
      businessPhoneNumberId: args.businessPhoneNumberId,
      recipient: args.ackRecipient,
      body: {
        text: {
          body: "Foto saņemts. Bildes tiek saglabātas, lūdzu uzgaidiet...",
        },
      },
    }).catch((error) => {
      console.error("ZTC image batch acknowledgement failed", error);
    });
  } else if (stagedItemCount === 1) {
    console.log("[Meta webhook timing]", {
      event: "ztc_image_batch_ack_suppressed",
      batchKey,
      mode: args.mode,
      workerId: args.worker.id,
      messageId,
    });
  }

  await sleep(ZTC_IMAGE_BATCH_QUIET_MS);

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    items: unknown;
    lastMessageId: string | null;
    processAfter: Date;
  }>>`
    SELECT "id", "items", "lastMessageId", "processAfter"
    FROM "ZtcInboundMediaBatch"
    WHERE "batchKey" = ${batchKey}
      AND "status" = 'collecting'
    LIMIT 1
  `;

  const row = rows[0];
  if (!row || row.lastMessageId !== messageId) {
    console.log("[Meta webhook timing]", {
      event: "ztc_image_batch_deferred_to_later_image",
      batchKey,
      mode: args.mode,
      workerId: args.worker.id,
      messageId,
      latestMessageId: row?.lastMessageId ?? null,
    });
    return { ready: false as const };
  }

  const processAfterMs = new Date(row.processAfter).getTime();
  if (Number.isFinite(processAfterMs) && processAfterMs > Date.now()) {
    await sleep(Math.min(processAfterMs - Date.now(), ZTC_IMAGE_BATCH_QUIET_MS));
  }

  const claimedRows = await prisma.$queryRaw<Array<{ id: string; items: unknown }>>`
    UPDATE "ZtcInboundMediaBatch"
    SET "status" = 'processing',
        "updatedAt" = NOW()
    WHERE "id" = ${row.id}
      AND "status" = 'collecting'
      AND "lastMessageId" = ${messageId || null}
    RETURNING "id", "items"
  `;

  const claimed = claimedRows[0];
  if (!claimed) {
    return { ready: false as const };
  }

  const items = Array.isArray(claimed.items)
    ? (claimed.items as SerializedZtcImageMessage[])
    : [];
  const batchedFormData = buildBatchedImageFormData(items);

  console.log("[Meta webhook timing]", {
    event: "ztc_image_batch_ready",
    batchKey,
    mode: args.mode,
    workerId: args.worker.id,
    batchId: claimed.id,
    batchSize: items.length,
    messageIds: items.map((image) => image.messageId).filter(Boolean),
  });

  return {
    ready: true as const,
    formData: batchedFormData,
    batchId: claimed.id,
    batchSize: items.length,
  };
}

async function deleteZtcImageBatch(batchId: string | null | undefined) {
  if (!batchId) return;
  await prisma.$executeRaw`
    DELETE FROM "ZtcInboundMediaBatch"
    WHERE "id" = ${batchId}
  `;
}

async function runWhatsappRoutingForMeta(args: {
  message: any;
  value: any;
  businessPhoneNumberId: string;
}) {
  const routingStartedAt = Date.now();
  const { message, value, businessPhoneNumberId } = args;
  const messageIdForLog = message?.id ?? null;
  let routeOutcome = "started";
  const webhookIdentity = extractMetaWebhookIdentity({
    value,
    message,
    businessPhoneNumberId,
  });
  const resolveStartedAt = Date.now();
  const resolved = await resolveMetaWhatsAppIdentity(webhookIdentity);
  logMetaWebhookTiming("resolve_meta_identity", resolveStartedAt, {
    messageId: messageIdForLog,
    identityKey: resolved.identityKey,
    hasUser: Boolean(resolved.user),
    hasWorker: Boolean(resolved.worker),
    replyTarget: resolved.replyTarget,
  });

  let formData = await toWhatsAppFormData(message, resolved);

  let lockHeld = false;
  let lockKey: string | null = null;
  let ztcImageBatchId: string | null = null;

  try {
    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const numMediaRaw = getString(formData, "NumMedia");
    let numMedia = Number(numMediaRaw || "0");
    let messageId = getString(formData, "MessageId") || null;

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      return;
    }

    const normalizeStartedAt = Date.now();
    const phone = await normalizePhone(waId, from);
    logMetaWebhookTiming("normalize_phone", normalizeStartedAt, {
      messageId,
      waId,
      from,
      phone,
    });

    const identityKey = resolved.identityKey || waId || from;
    if (!identityKey) {
      routeOutcome = "missing_identity";
      console.warn("Meta webhook message has no usable phone or BSUID", {
        messageId: message?.id,
        type: message?.type,
      });
      return;
    }

    const workerLookupStartedAt = Date.now();
    const worker = resolved.worker?.id
      ? resolved.worker
      : phone
        ? await prisma.workers.findFirst({
            where: { phone },
          })
        : null;
    logMetaWebhookTiming("worker_lookup", workerLookupStartedAt, {
      messageId,
      phone,
      reusedResolvedWorker: Boolean(resolved.worker?.id),
      hasWorker: Boolean(worker),
      workerId: worker?.id ?? null,
      organizationId: worker?.organizationId ?? null,
      role: worker?.role ?? null,
    });

    const workerFlowRuntime = worker ? await resolveWorkerFlowRuntime(worker) : null;
    const usesAdvancedProductionWorkflow =
      workerFlowRuntime?.productionConfig?.strategies.whatsappWorker === "ztc-worker-v1";
    const usesAdvancedQualityWorkflow =
      workerFlowRuntime?.productionConfig?.strategies.whatsappQuality === "ztc-quality-v1";
    const ztcFlowContext = usesAdvancedProductionWorkflow && worker
      ? await resolveAdvancedProductionWorkflowContextForWorker(worker)
      : null;
    const ztcWorker = ztcFlowContext
      ? ({ ...worker, ztcFlowContext } as NonNullable<typeof worker> & { ztcFlowContext: typeof ztcFlowContext })
      : null;

    if (ztcWorker && isSingleMetaImageFormData(formData)) {
      const mode: ZtcImageBatchMode =
        usesAdvancedQualityWorkflow && isZtcQualityWorkerRole(worker.role)
          ? "ztc_quality"
          : "ztc_worker";
      const batchDecision = await stageZtcImageBatch({
        identityKey,
        worker: ztcWorker,
        mode,
        formData,
        businessPhoneNumberId,
        ackRecipient: resolved.replyTarget || from,
      });

      if (!batchDecision.ready) {
        routeOutcome = "ztc_image_batch_deferred";
        return;
      }

      formData = batchDecision.formData;
      ztcImageBatchId = batchDecision.batchId;
      numMedia = Number(getString(formData, "NumMedia") || "0") || 0;
      messageId = getString(formData, "MessageId") || messageId;
    }

    const lockStartedAt = Date.now();
    const acquired = await acquireRoutingLock(identityKey, messageId);
    logMetaWebhookTiming("routing_lock_acquire", lockStartedAt, {
      messageId,
      identityKey,
      acquired,
    });

    if (!acquired) {
      routeOutcome = "lock_timeout";
      console.warn("Meta webhook routing lock timed out", {
        identityKey,
        messageId,
        type: message?.type,
        numMedia,
      });
      return;
    }

    lockHeld = true;
    lockKey = identityKey;

    if (worker) {
      if (ztcWorker) {
        if (usesAdvancedQualityWorkflow && isZtcQualityWorkerRole(worker.role)) {
          const handlerStartedAt = Date.now();
          await handleZtcQualityRoute({ worker: ztcWorker as any, formData });
          routeOutcome = "ztc_quality_worker";
          logMetaWebhookTiming("ztc_quality_route", handlerStartedAt, {
            messageId,
            workerId: worker.id,
          });
          return;
        }

        const handlerStartedAt = Date.now();
        await handleZtcWorkerRoute({ worker: ztcWorker, formData });
        routeOutcome = "ztc_worker";
        logMetaWebhookTiming("ztc_worker_route", handlerStartedAt, {
          messageId,
          workerId: worker.id,
        });
        return;
      }

      const workerPhone = worker.phone || phone;
      if (workerPhone) {
        const handlerStartedAt = Date.now();
        await handleWorkerRoute({ phone: workerPhone, formData });
        logMetaWebhookTiming("legacy_worker_route", handlerStartedAt, {
          messageId,
          workerId: worker.id,
        });
      }
      routeOutcome = "legacy_worker";
      return;
    }

    const user = resolved.user;

    if (!user) {
      routeOutcome = "unregistered_contact";
      if (resolved.webhookIdentity.bsuid && !resolved.webhookIdentity.phone && resolved.replyTarget) {
        await sendMetaContactRequest({
          businessPhoneNumberId,
          recipient: resolved.replyTarget,
        });
      } else if (resolved.replyTarget) {
        await sendMetaGraphMessage({
          businessPhoneNumberId,
          recipient: resolved.replyTarget,
          body: {
            text: {
              body: "Sorry, this WhatsApp contact is not registered. Please contact admin.",
            },
          },
        });
      }
      return;
    }

    const handlerStartedAt = Date.now();
    await handleSiteManagerRoute({ from, formData, user });
    routeOutcome = "site_manager";
    logMetaWebhookTiming("site_manager_route", handlerStartedAt, {
      messageId,
      userId: user.id,
    });
  } catch (err) {
    routeOutcome = "error";
    console.error("runWhatsappRoutingForMeta error", err);

    const fallbackTarget = resolvedSafeReplyTarget(message, value, businessPhoneNumberId);
    if (fallbackTarget) {
      await sendMetaGraphMessage({
        businessPhoneNumberId,
        recipient: fallbackTarget,
        body: {
          text: {
            body: "Sorry, an error occurred processing your message.",
          },
        },
      });
    }
  } finally {
    if (ztcImageBatchId) {
      await deleteZtcImageBatch(ztcImageBatchId).catch((e) => {
        console.error("deleteZtcImageBatch error", e);
      });
    }

    if (lockHeld && lockKey) {
      const releaseStartedAt = Date.now();
      await releaseTextLock(lockKey).catch((e) => {
        console.error("releaseTextLock error", e);
      });
      logMetaWebhookTiming("routing_lock_release", releaseStartedAt, {
        messageId: messageIdForLog,
        identityKey: lockKey,
      });
    }

    logMetaWebhookTiming("run_whatsapp_routing_for_meta_total", routingStartedAt, {
      messageId: messageIdForLog,
      type: message?.type ?? null,
      outcome: routeOutcome,
    });
  }
}

function resolvedSafeReplyTarget(message: any, value: any, businessPhoneNumberId: string) {
  const identity = extractMetaWebhookIdentity({ value, message, businessPhoneNumberId });
  return identity.phone || identity.parentBsuid || identity.bsuid;
}

async function handleContactsMessage(args: { value: any; message: any; businessPhoneNumberId: string }) {
  const identity = extractMetaWebhookIdentity({
    value: args.value,
    message: args.message,
    businessPhoneNumberId: args.businessPhoneNumberId,
  });
  const resolved = await resolveMetaWhatsAppIdentity(identity);

  if (resolved.replyTarget) {
    await sendMetaGraphMessage({
      businessPhoneNumberId: args.businessPhoneNumberId,
      recipient: resolved.replyTarget,
      body: {
        text: {
          body: "Thanks, your WhatsApp contact info was received.",
        },
      },
    });
  }
}

async function handleUserIdUpdate(args: { value: any; businessPhoneNumberId: string }) {
  const update = Array.isArray(args.value?.user_id_update)
    ? args.value.user_id_update[0]
    : null;
  if (!update) return;

  await applyMetaUserIdUpdate({
    businessPhoneNumberId: args.businessPhoneNumberId,
    previousBsuid: update?.user_id?.previous,
    currentBsuid: update?.user_id?.current,
    previousParentBsuid: update?.parent_user_id?.previous,
    currentParentBsuid: update?.parent_user_id?.current,
    phone: update?.wa_id,
  });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    console.log("Incoming webhook message:", JSON.stringify(body, null, 2));

    const change = body?.entry?.[0]?.changes?.[0];
    const value = change?.value;
    const field = change?.field;
    const messages = Array.isArray(value?.messages) ? value.messages : [];
    const business_phone_number_id = value?.metadata?.phone_number_id;

    if (field === "user_id_update" && business_phone_number_id) {
      await handleUserIdUpdate({ value, businessPhoneNumberId: business_phone_number_id });
      return new Response("OK", { status: 200 });
    }

    if (Array.isArray(value?.statuses)) {
      console.log("Meta status webhook received", {
        field,
        phoneNumberId: business_phone_number_id,
        statuses: value.statuses.map((status: any) => ({
          id: status?.id,
          status: status?.status,
          recipientId: status?.recipient_id,
          recipientUserId: status?.recipient_user_id,
          recipientParentUserId: status?.recipient_parent_user_id,
          errors: status?.errors,
        })),
      });
      return new Response("OK", { status: 200 });
    }

    if (messages.length > 1) {
      console.log("Meta webhook contains multiple messages", {
        phoneNumberId: business_phone_number_id,
        messageCount: messages.length,
        messageIds: messages.map((message: any) => message?.id).filter(Boolean),
        messageTypes: messages.map((message: any) => message?.type).filter(Boolean),
      });
    }

    for (const message of messages) {
      if (!message || !business_phone_number_id) continue;

      if (message.id && hasProcessedMetaMessage(message.id)) {
        continue;
      }

      if (!isReadableMetaMessage(message)) {
        logUnsupportedMetaMessage(message);
        continue;
      }

      if (message.id && isRoutableMetaMessage(message)) {
        await sendMetaTypingIndicator(business_phone_number_id, message.id, message.from || null).catch((error) => {
          console.error("Meta typing/read indicator failed", error);
        });
      }

      if (message.type === "contacts") {
        await handleContactsMessage({
          value,
          message,
          businessPhoneNumberId: business_phone_number_id,
        });
        continue;
      }

      //-----------------BOOKING APPOINTMENT BOT (PRISMA)-----------------------

      let handledByBooking = false;

      if (message.type === "text" && typeof message.text?.body === "string") {
        const text = message.text.body.trim().toLowerCase();
        const webhookIdentity = extractMetaWebhookIdentity({
          value,
          message,
          businessPhoneNumberId: business_phone_number_id,
        });
        const resolvedIdentity = await resolveMetaWhatsAppIdentity(webhookIdentity);
        const user = resolvedIdentity.identityKey;
        const replyRecipient = resolvedIdentity.replyTarget;

        // START BOOKING
        if (text === "book" && user && replyRecipient) {
          await startSession(user);

          await sendMetaGraphMessage({
            businessPhoneNumberId: business_phone_number_id,
            recipient: replyRecipient,
            body: {
              text: {
                body: "📅 Booking started.\n\nWhat service do you want?",
              },
            },
          });

          handledByBooking = true;
        }

        const session = !handledByBooking && user ? await getSession(user) : null;

        if (session && user && replyRecipient) {
          // STEP 1 — SERVICE
          if (session.step === "service") {
            await updateSession(user, {
              service: text,
              step: "date",
            });

            await sendMetaGraphMessage({
              businessPhoneNumberId: business_phone_number_id,
              recipient: replyRecipient,
              body: {
                text: {
                  body: "Great 👍\n\nChoose a date (YYYY-MM-DD)",
                },
              },
            });

            handledByBooking = true;
          }

          // STEP 2 — DATE
          if (!handledByBooking && session.step === "date") {
            await updateSession(user, {
              date: text,
              step: "time",
            });

            await sendMetaGraphMessage({
              businessPhoneNumberId: business_phone_number_id,
              recipient: replyRecipient,
              body: {
                text: {
                  body: "Perfect.\n\nChoose a time (HH:MM)",
                },
              },
            });

            handledByBooking = true;
          }

          // STEP 3 — TIME
          if (!handledByBooking && session.step === "time") {
            await updateSession(user, {
              time: text,
            });

            await sendMetaGraphMessage({
              businessPhoneNumberId: business_phone_number_id,
              recipient: replyRecipient,
              body: {
                text: {
                  body: `✅ Booking confirmed!\n\nService: ${session.service}\nDate: ${session.date}\nTime: ${text}\n\nWe will see you soon!`,
                },
              },
            });

            await deleteSession(user);

            handledByBooking = true;
          }
        }
      }

      if (handledByBooking) continue;

      // 2) Run the shared role-based WhatsApp routing.
      if (isRoutableMetaMessage(message)) {
        await runWithMetaReplyContext(
          {
            businessPhoneNumberId: business_phone_number_id,
            incomingMessageId: message.id || null,
            incomingFrom: message.from || null,
          },
          async () =>
            runWhatsappRoutingForMeta({
              message,
              value,
              businessPhoneNumberId: business_phone_number_id,
            })
        );
      }

      // 3) Mark message as read
      if (message.id && isReadableMetaMessage(message)) {
        await graphSendMessage(business_phone_number_id, {
          messaging_product: "whatsapp",
          status: "read",
          message_id: message.id,
        }).catch((error) => {
          console.error("Meta mark-as-read failed", error);
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("OK", { status: 200 });
  }
}
