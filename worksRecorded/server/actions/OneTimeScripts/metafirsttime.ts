function must(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeToMetaDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) throw new Error(`Invalid phone number: ${phone}`);
  return digits;
}

async function sendMetaFirstContact() {
  const token = must("META_ACCESS_TOKEN", process.env.META_ACCESS_TOKEN);
  const businessPhoneNumberId = must("META_PHONE_NUMBER_ID", process.env.META_PHONE_NUMBER_ID);

  const to = normalizeToMetaDigits(process.env.TARGET_PHONE || "+37120579225");
  const templateName = process.env.META_TEMPLATE_NAME || "reminder_custom";
  const languageCode = process.env.META_TEMPLATE_LANGUAGE || "en";

  // For reminder_custom this maps to {{1}} in template body.
  const reminderText =
    process.env.META_TEMPLATE_PARAM_1 ||
    "This is an automated reminder to complete your pending update.";

  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: reminderText }],
        },
      ],
    },
  };

  const res = await fetch(`https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Meta send failed (${res.status}): ${JSON.stringify(payload)}`);
  }

  const message = payload?.messages?.[0];
  const contact = payload?.contacts?.[0];

  console.log("✅ Meta API accepted template message", {
    toInput: contact?.input,
    waId: contact?.wa_id,
    messageId: message?.id,
    messageStatus: message?.message_status,
  });

  console.log(
    "ℹ️ Note: 'accepted' means Meta accepted the request, not that it was delivered/read. " +
      "Check your WhatsApp webhook 'statuses' events for sent/delivered/read/failed updates."
  );
}

sendMetaFirstContact().catch((error) => {
  console.error("❌ Failed to send Meta first-contact template message:", error);
  process.exitCode = 1;
});