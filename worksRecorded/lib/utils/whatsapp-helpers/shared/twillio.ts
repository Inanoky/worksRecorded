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

export async function sendMessage(to: string | null, message: string) {
  if (!to || !message) return;
  if (to === SENDER_NUMBER) return;

  const metaCtx = metaReplyContext.getStore();
  if (metaCtx) {
    await sendMetaMessage(metaCtx, to, message);
    return;
  }

  try {
    const res = await client.messages.create({ from: SENDER_NUMBER, to, body: message });
    console.log("📤 Twilio SID:", res.sid);
  } catch (err) {
    console.error("❌ Twilio send error:", err);
  }
}
