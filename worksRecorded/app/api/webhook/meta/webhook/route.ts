// worksRecorded/app/api/webhook/Meta/route.ts
// Next.js App Router webhook endpoint (GET verify + POST events)
export const maxDuration = 60;

import { prisma } from "@/lib/utils/db";
import {
  getString,
  normalizePhone,
} from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { handleWorkerRoute } from "@/lib/utils/whatsapp-helpers/handling-roles-routes/worker";

import { handleSiteManagerRoute } from "@/lib/utils/whatsapp-helpers/handling-roles-routes/site-manager-route";
import { runWithMetaReplyContext } from "@/lib/utils/whatsapp-helpers/shared/twillio";
import {
  getSession,
  startSession,
  updateSession,
  deleteSession,
} from "@/app/api/webhook/meta/webhook/helperes";

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

async function tryAcquireTextLock(phone: string, messageSid?: string | null) {
  await cleanupStaleLock(phone);

  try {
    await prisma.whatsappTextLock.create({
      data: {
        phone,
        messageSid: messageSid || undefined,
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
    `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
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
  to: string
): Promise<void> {
  await graphSendMessage(businessPhoneNumberId, {
    messaging_product: "whatsapp",
    to,
    status: "read",
    message_id: messageId,
    typing_indicator: {
      type: "text",
    },
  });
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

  const res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
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

async function toTwilioLikeFormData(message: any): Promise<FormData> {
  const formData = new FormData();
  const textBody = typeof message?.text?.body === "string" ? message.text.body : "";
  const imageCaption =
    typeof message?.image?.caption === "string" ? message.image.caption : "";
  const body = textBody || imageCaption;
  const from = message?.from ? `whatsapp:+${message.from}` : "";
  const hasImage = Boolean(message?.image?.id);
  const hasAudio = Boolean(message?.audio?.id);
  const numMedia = hasImage || hasAudio ? "1" : "0";

  formData.set("SmsStatus", "received");
  formData.set("From", from);
  formData.set("WaId", message?.from ?? "");
  formData.set("Body", body);
  formData.set("MessageSid", message?.id ?? "");
  formData.set("SmsMessageSid", message?.id ?? "");
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
  businessPhoneNumberId: string;
}) {
  const { message, businessPhoneNumberId } = args;
  const formData = await toTwilioLikeFormData(message);

  let lockHeld = false;
  let lockPhone: string | null = null;

  try {
    const smsStatus = getString(formData, "SmsStatus");
    const from = getString(formData, "From");
    const waId = getString(formData, "WaId");
    const numMediaRaw = getString(formData, "NumMedia");
    const numMedia = Number(numMediaRaw || "0");
    const isText = !Number.isNaN(numMedia) ? numMedia === 0 : true;
    const messageSid = getString(formData, "MessageSid") || null;

    if (smsStatus && smsStatus.toLowerCase() !== "received") {
      return;
    }

    const phone = await normalizePhone(waId, from);

    if (isText) {
      const acquired = await tryAcquireTextLock(phone, messageSid);
      if (!acquired) return;

      lockHeld = true;
      lockPhone = phone;
    }

    const worker = await prisma.workers.findFirst({
      where: { phone },
    });

    if (worker) {
      await handleWorkerRoute({ phone, formData });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { phone },
      include: {
        organization: {
          include: {
            sites: true,
          },
        },
      },
    });

    if (!user) {
      await graphSendMessage(businessPhoneNumberId, {
        messaging_product: "whatsapp",
        to: message.from,
        text: {
          body: "Sorry, this phone number is not registered. Please contact admin.",
        },
      });
      return;
    }

    await handleSiteManagerRoute({ from, formData, user });
  } catch (err) {
    console.error("runWhatsappRoutingForMeta error", err);

    if (message?.from) {
      await graphSendMessage(businessPhoneNumberId, {
        messaging_product: "whatsapp",
        to: message.from,
        text: {
          body: "Sorry, an error occurred processing your message.",
        },
      });
    }
  } finally {
    if (lockHeld && lockPhone) {
      await releaseTextLock(lockPhone).catch((e) => {
        console.error("releaseTextLock error", e);
      });
    }
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    console.log("Incoming webhook message:", JSON.stringify(body, null, 2));

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const business_phone_number_id =
      body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (message && business_phone_number_id) {
      if (message.id && hasProcessedMetaMessage(message.id)) {
        return new Response("OK", { status: 200 });
      }

      if (message.id && (message.type === "text" || message.type === "image" || message.type === "audio")) {
        await sendMetaTypingIndicator(business_phone_number_id, message.id, message.from);
      }

      //-----------------BOOKING APPOINTMENT BOT (PRISMA)-----------------------

      if (message.type === "text" && typeof message.text?.body === "string") {
        const text = message.text.body.trim().toLowerCase();
        const user = message.from;

        // START BOOKING
        if (text === "book") {
          await startSession(user);

          await graphSendMessage(business_phone_number_id, {
            messaging_product: "whatsapp",
            to: user,
            text: {
              body: "📅 Booking started.\n\nWhat service do you want?",
            },
          });

          return new Response("OK", { status: 200 });
        }

        const session = await getSession(user);

        if (session) {
          // STEP 1 — SERVICE
          if (session.step === "service") {
            await updateSession(user, {
              service: text,
              step: "date",
            });

            await graphSendMessage(business_phone_number_id, {
              messaging_product: "whatsapp",
              to: user,
              text: {
                body: "Great 👍\n\nChoose a date (YYYY-MM-DD)",
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

            await graphSendMessage(business_phone_number_id, {
              messaging_product: "whatsapp",
              to: user,
              text: {
                body: "Perfect.\n\nChoose a time (HH:MM)",
              },
            });

            return new Response("OK", { status: 200 });
          }

          // STEP 3 — TIME
          if (session.step === "time") {
            await updateSession(user, {
              time: text,
            });

            await graphSendMessage(business_phone_number_id, {
              messaging_product: "whatsapp",
              to: user,
              text: {
                body: `✅ Booking confirmed!\n\nService: ${session.service}\nDate: ${session.date}\nTime: ${text}\n\nWe will see you soon!`,
              },
            });

            await deleteSession(user);

            return new Response("OK", { status: 200 });
          }
        }
      }

      // 2) Run the same role-based WhatsApp routing used by Twilio webhook.
      if (message.type === "text" || message.type === "image" || message.type === "audio") {
        await runWithMetaReplyContext(
          { businessPhoneNumberId: business_phone_number_id },
          async () =>
            runWhatsappRoutingForMeta({
              message,
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
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("OK", { status: 200 });
  }
}
