import { getMetaGraphBaseUrl } from "@/lib/utils/whatsapp-helpers/meta/config";

export type MetaRecipient = {
  phone?: string | null;
  bsuid?: string | null;
  parentBsuid?: string | null;
  raw?: string | null;
};

export type MetaRecipientPayload = { to: string } | { recipient: string };

export function normalizeMetaPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/^whatsapp:/i, "").replace(/\D/g, "");
  return digits || null;
}

export function isLikelyBsuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[A-Z]{2}\.(?:ENT\.)?[A-Za-z0-9]{1,128}$/i.test(value.trim());
}

export function buildMetaRecipientPayload(recipient: MetaRecipient | string | null | undefined): MetaRecipientPayload | null {
  if (!recipient) return null;

  if (typeof recipient === "string") {
    const trimmed = recipient.trim();
    if (!trimmed) return null;
    if (isLikelyBsuid(trimmed)) return { recipient: trimmed };
    const phone = normalizeMetaPhone(trimmed);
    return phone ? { to: phone } : null;
  }

  const parentBsuid = recipient.parentBsuid?.trim();
  if (parentBsuid && isLikelyBsuid(parentBsuid)) return { recipient: parentBsuid };

  const bsuid = recipient.bsuid?.trim();
  if (bsuid && isLikelyBsuid(bsuid)) return { recipient: bsuid };

  const phone = normalizeMetaPhone(recipient.phone || recipient.raw);
  if (phone) return { to: phone };

  const raw = recipient.raw?.trim();
  if (raw && isLikelyBsuid(raw)) return { recipient: raw };

  return null;
}

export async function sendMetaGraphMessage(args: {
  businessPhoneNumberId: string;
  token?: string | null;
  recipient?: MetaRecipient | string | null;
  body: Record<string, unknown>;
}) {
  const token = args.token || process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("Missing META_ACCESS_TOKEN");

  const recipientPayload = buildMetaRecipientPayload(args.recipient);
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    ...(recipientPayload || {}),
    ...args.body,
  };

  if (!body.type && body.text) {
    body.type = "text";
  }

  const res = await fetch(`${getMetaGraphBaseUrl()}/${args.businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta send failed (${res.status}): ${text || res.statusText}`);
  }

  return res;
}

export async function sendMetaContactRequest(args: {
  businessPhoneNumberId: string;
  recipient: MetaRecipient | string;
  bodyText?: string;
}) {
  return sendMetaGraphMessage({
    businessPhoneNumberId: args.businessPhoneNumberId,
    recipient: args.recipient,
    body: {
      recipient_type: "individual",
      type: "interactive",
      interactive: {
        type: "contact_request",
        body: {
          text:
            args.bodyText ||
            "Please share your WhatsApp contact info so we can link this chat to your WorksRecorded account.",
        },
        action: {
          name: "request_contact_info",
        },
      },
    },
  });
}
