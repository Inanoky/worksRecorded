// worksRecorded/app/api/webhook/Meta/route.ts
// Next.js App Router webhook endpoint (GET verify + POST events)
export const maxDuration = 300;

import { prisma } from "@/lib/utils/db";
import {
  getString,
  normalizePhone,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { handleWorkerRoute } from "@/lib/utils/whatsapp-helpers/handling-roles-routes/worker";

import { handleSiteManagerRoute } from "@/lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";
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
  ZTC_ORGANIZATION_ID,
} from "@/app/api/webhook/meta/webhook/ZTC/ztc-workflow";
import {
  handleZtcQualityRoute,
  isZtcQualityWorkerRole,
} from "@/app/api/webhook/meta/webhook/ZTC/ztc-quality-workflow";

const { WEBHOOK_VERIFY_TOKEN, META_ACCESS_TOKEN } = process.env;

const LOCK_TTL_MS = 90_000;
const ROUTING_LOCK_WAIT_MS = 120_000;
const ROUTING_LOCK_RETRY_MS = 500;
const PROCESSED_MESSAGE_TTL_MS = 10 * 60_000;
const processedMetaMessages =
  (globalThis as any).__processedMetaMessages ||
  new Map<string, number>();

(globalThis as any).__processedMetaMessages = processedMetaMessages;

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
  formData.set("NumMedia", numMedia);

  if (hasImage) {
    const mediaInfo = await getMetaMediaInfo(message.image.id);
    if (mediaInfo) {
      formData.set("MediaUrl0", mediaInfo.url);
      formData.set("MediaContentType0", mediaInfo.mimeType);
      formData.set("MediaProvider0", "meta");
    }
  }

  if (hasAudio) {
    const mediaInfo = await getMetaMediaInfo(message.audio.id);
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

  return formData;
}

async function runWhatsappRoutingForMeta(args: {
  message: any;
  value: any;
  businessPhoneNumberId: string;
}) {
  const { message, value, businessPhoneNumberId } = args;
  const webhookIdentity = extractMetaWebhookIdentity({
    value,
    message,
    businessPhoneNumberId,
  });
  const resolved = await resolveMetaWhatsAppIdentity(webhookIdentity);
  const formData = await toWhatsAppFormData(message, resolved);

  let lockHeld = false;
  let lockKey: string | null = null;

  try {
    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const numMediaRaw = getString(formData, "NumMedia");
    const numMedia = Number(numMediaRaw || "0");
    const messageId = getString(formData, "MessageId") || null;

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      return;
    }

    const phone = await normalizePhone(waId, from);
    const identityKey = resolved.identityKey || waId || from;
    if (!identityKey) {
      console.warn("Meta webhook message has no usable phone or BSUID", {
        messageId: message?.id,
        type: message?.type,
      });
      return;
    }

    const acquired = await acquireRoutingLock(identityKey, messageId);
    if (!acquired) {
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

    const worker = phone
      ? await prisma.workers.findFirst({
          where: { phone },
        })
      : null;

    if (worker) {
      if (worker.organizationId === ZTC_ORGANIZATION_ID) {
        const roleRows = await prisma.$queryRaw<Array<{ role: string | null }>>`
          SELECT role FROM "workers" WHERE id = ${worker.id} LIMIT 1
        `;
        if (isZtcQualityWorkerRole(roleRows[0]?.role)) {
          await handleZtcQualityRoute({ worker: worker as any, formData });
          return;
        }

        await handleZtcWorkerRoute({ worker, formData });
        return;
      }

      await handleWorkerRoute({ phone, formData });
      return;
    }

    const resolvedWorker = resolved.worker;

    if (resolvedWorker?.phone) {
      await handleWorkerRoute({ phone: resolvedWorker.phone, formData });
      return;
    }

    const user = resolved.user;

    if (!user) {
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

    await handleSiteManagerRoute({ from, formData, user });
  } catch (err) {
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
    if (lockHeld && lockKey) {
      await releaseTextLock(lockKey).catch((e) => {
        console.error("releaseTextLock error", e);
      });
    }
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
