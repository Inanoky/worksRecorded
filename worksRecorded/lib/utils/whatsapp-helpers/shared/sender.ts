import { AsyncLocalStorage } from "node:async_hooks";
import {
  buildMetaRecipientPayload,
  sendMetaGraphMessage,
} from "@/lib/utils/whatsapp-helpers/meta/sender";

type MetaReplyContext = {
  businessPhoneNumberId: string;
  incomingMessageId?: string | null;
  incomingFrom?: string | null;
};

const metaReplyContext = new AsyncLocalStorage<MetaReplyContext>();

function normalizeMetaRecipient(to: string | null): string | null {
  if (!to) return null;
  const payload = buildMetaRecipientPayload(to);
  if (!payload) return null;
  return "to" in payload ? payload.to : payload.recipient;
}

async function sendMetaMessage(ctx: MetaReplyContext, to: string | null, message: string) {
  const recipient = normalizeMetaRecipient(to);
  if (!recipient) return;

  try {
    await sendMetaGraphMessage({
      businessPhoneNumberId: ctx.businessPhoneNumberId,
      recipient,
      body: {
        text: { body: message },
      },
    });
  } catch (error) {
    console.error("Meta send error:", error);
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

export async function sendTypingIndicator(to?: string | null) {
  const metaCtx = metaReplyContext.getStore();
  if (!metaCtx?.incomingMessageId) return;

  const recipient = normalizeMetaRecipient(to ?? metaCtx.incomingFrom ?? null);

  try {
    await sendMetaGraphMessage({
      businessPhoneNumberId: metaCtx.businessPhoneNumberId,
      recipient,
      body: {
        status: "read",
        message_id: metaCtx.incomingMessageId,
        typing_indicator: {
          type: "text",
        },
      },
    });
  } catch (error) {
    console.error("Meta typing indicator send error:", error);
  }
}

function sanitizeOutgoingWhatsappText(message: string): string {
  return message.replace(/\*/g, "");
}

function requireMetaReplyContext() {
  const metaCtx = metaReplyContext.getStore();
  if (!metaCtx) {
    throw new Error(
      "Cannot send WhatsApp message without Meta reply context. Wrap the handler in runWithMetaReplyContext."
    );
  }
  return metaCtx;
}

export async function sendMessage(to: string | null, message: string) {
  if (!to || !message) return;

  const cleanMessage = sanitizeOutgoingWhatsappText(message);
  await sendMetaMessage(requireMetaReplyContext(), to, cleanMessage);
}

export async function sendLocationRequest(to: string | null, prompt?: string) {
  if (!to) return;

  const metaCtx = requireMetaReplyContext();
  const recipient = normalizeMetaRecipient(to);
  if (!recipient) return;

  try {
    await sendMetaGraphMessage({
      businessPhoneNumberId: metaCtx.businessPhoneNumberId,
      recipient,
      body: {
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
      },
    });
  } catch (error) {
    console.error("Meta location request send error:", error);
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

  const metaCtx = requireMetaReplyContext();
  const recipient = normalizeMetaRecipient(to);
  if (!recipient) return;

  try {
    await sendMetaGraphMessage({
      businessPhoneNumberId: metaCtx.businessPhoneNumberId,
      recipient,
      body: {
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
      },
    });
  } catch (error) {
    console.error("Meta clock-in card send error:", error);
    await sendMessage(to, `${title}\n${body}\n${args.url}`);
  }
}
