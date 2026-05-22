import twilio from "twilio";
import { AsyncLocalStorage } from "node:async_hooks";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

export const SENDER_NUMBER = "whatsapp:+13135131153";
type MetaReplyContext = {
  businessPhoneNumberId: string;
};

const metaReplyContext = new AsyncLocalStorage<MetaReplyContext>();

function normalizeMetaRecipient(to: string | null): string | null {
  if (!to) return null;
  return to
    .replace(/^whatsapp:/i, "")
    .replace(/^\+/, "")
    .replace(/\D/g, "");
}

async function sendMetaMessage(ctx: MetaReplyContext, to: string | null, message: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const recipient = normalizeMetaRecipient(to);
  if (!token || !recipient) return;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${ctx.businessPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        text: { body: message },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("❌ Meta send error:", res.status, res.statusText, errBody);
  }
}

export async function runWithMetaReplyContext<T>(
  context: MetaReplyContext,
  fn: () => Promise<T>
): Promise<T> {
  return metaReplyContext.run(context, fn);
}

export function getMetaReplyContext() {
  return metaReplyContext.getStore() ?? null;
}

function sanitizeOutgoingWhatsappText(message: string): string {
  return message.replace(/\*/g, "");
}

export async function sendMessage(to: string | null, message: string) {
  if (!to || !message) return;
  if (to === SENDER_NUMBER) return;

  const cleanMessage = sanitizeOutgoingWhatsappText(message);
  const metaCtx = metaReplyContext.getStore();
  if (metaCtx) {
    await sendMetaMessage(metaCtx, to, cleanMessage);
    return;
  }

  try {
    const res = await client.messages.create({ from: SENDER_NUMBER, to, body: cleanMessage });
    console.log("📤 Twilio SID:", res.sid);
  } catch (err) {
    console.error("❌ Twilio send error:", err);
  }
}

export async function sendLocationRequest(to: string | null, prompt?: string) {
  if (!to) return;

  const metaCtx = metaReplyContext.getStore();
  if (!metaCtx) {
    await sendMessage(
      to,
      prompt ||
        "Please share your current location so we can validate your site clock-in."
    );
    return;
  }

  const token = process.env.META_ACCESS_TOKEN;
  const recipient = normalizeMetaRecipient(to);
  if (!token || !recipient) return;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${metaCtx.businessPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "location_request_message",
          body: {
            text:
              prompt ||
              "Please share your current location so we can validate your site clock-in.",
          },
          action: {
            name: "send_location",
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("❌ Meta location request send error:", res.status, res.statusText, errBody);
  }
}

export async function sendClockInCard(
  to: string | null,
  args: {
    title?: string;
    body?: string;
    buttonText?: string;
    url: string;
  }
) {
  if (!to) return;
  const title = args.title || "Clock in";
  const body = args.body || "Tap button below to clock in with GPS verification.";
  const buttonText = args.buttonText || "Clock in";

  const metaCtx = metaReplyContext.getStore();
  if (!metaCtx) {
    await sendMessage(to, `${title}\n${body}\n${args.url}`);
    return;
  }

  const token = process.env.META_ACCESS_TOKEN;
  const recipient = normalizeMetaRecipient(to);
  if (!token || !recipient) return;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${metaCtx.businessPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "interactive",
        interactive: {
          type: "cta_url",
          header: { type: "text", text: title },
          body: { text: body },
          action: {
            name: "cta_url",
            parameters: {
              display_text: buttonText,
              url: args.url,
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("❌ Meta clock-in card send error:", res.status, res.statusText, errBody);
    await sendMessage(to, `${title}\n${body}\n${args.url}`);
  }
}
