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

const { WEBHOOK_VERIFY_TOKEN, META_ACCESS_TOKEN } = process.env;

const LOCK_TTL_MS = 90_000;
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

function mustGetEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
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
    if (mediaInfo) {
      formData.set("MediaUrl0", mediaInfo.url);
      formData.set("MediaContentType0", mediaInfo.mimeType);
      formData.set("MediaProvider0", "meta");
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
    const isText = !Number.isNaN(numMedia) ? numMedia === 0 : true;
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

    if (isText) {
      const acquired = await tryAcquireTextLock(identityKey, messageId);
      if (!acquired) return;

      lockHeld = true;
      lockKey = identityKey;
    }

    const worker = phone
      ? await prisma.workers.findFirst({
          where: { phone },
        })
      : null;

    if (worker) {
      if (worker.organizationId === ZTC_ORGANIZATION_ID) {
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
  return identity.parentBsuid || identity.bsuid || identity.phone;
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
    const message = value?.messages?.[0];
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

    if (message && business_phone_number_id) {
      if (message.id && hasProcessedMetaMessage(message.id)) {
        return new Response("OK", { status: 200 });
      }

      if (message.id && (message.type === "text" || message.type === "image" || message.type === "audio")) {
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
        return new Response("OK", { status: 200 });
      }

      //-----------------BOOKING APPOINTMENT BOT (PRISMA)-----------------------

      if (message.type === "text" && typeof message.text?.body === "string") {
        const text = message.text.body.trim().toLowerCase();
        const webhookIdentity = extractMetaWebhookIdentity({
          value,
          message,
          businessPhoneNumberId: business_phone_number_id,
        });
        const user = webhookIdentity.parentBsuid || webhookIdentity.bsuid || webhookIdentity.phone;

        // START BOOKING
        if (text === "book" && user) {
          await startSession(user);

          await sendMetaGraphMessage({
            businessPhoneNumberId: business_phone_number_id,
            recipient: user,
            body: {
              text: {
                body: "📅 Booking started.\n\nWhat service do you want?",
              },
            },
          });

          return new Response("OK", { status: 200 });
        }

        const session = user ? await getSession(user) : null;

        if (session && user) {
          // STEP 1 — SERVICE
          if (session.step === "service") {
            await updateSession(user, {
              service: text,
              step: "date",
            });

            await sendMetaGraphMessage({
              businessPhoneNumberId: business_phone_number_id,
              recipient: user,
              body: {
                text: {
                  body: "Great 👍\n\nChoose a date (YYYY-MM-DD)",
                },
              },
            });

            return new Response("OK", { status: 200 });
          }

          // STEP 2 — DATE
          if (session.step === "date") {
            await updateSession(user, {
              date: text,
              step: "time",
            });

            await sendMetaGraphMessage({
              businessPhoneNumberId: business_phone_number_id,
              recipient: user,
              body: {
                text: {
                  body: "Perfect.\n\nChoose a time (HH:MM)",
                },
              },
            });

            return new Response("OK", { status: 200 });
          }

          // STEP 3 — TIME
          if (session.step === "time") {
            await updateSession(user, {
              time: text,
            });

            await sendMetaGraphMessage({
              businessPhoneNumberId: business_phone_number_id,
              recipient: user,
              body: {
                text: {
                  body: `✅ Booking confirmed!\n\nService: ${session.service}\nDate: ${session.date}\nTime: ${text}\n\nWe will see you soon!`,
                },
              },
            });

            await deleteSession(user);

            return new Response("OK", { status: 200 });
          }
        }
      }

      // 2) Run the shared role-based WhatsApp routing.
      if (message.type === "text" || message.type === "image" || message.type === "audio") {
        await runWithMetaReplyContext(
          { businessPhoneNumberId: business_phone_number_id },
          async () =>
            runWhatsappRoutingForMeta({
              message,
              value,
              businessPhoneNumberId: business_phone_number_id,
            })
        );
      }

      // 3) Mark message as read
      if (message.id) {
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
