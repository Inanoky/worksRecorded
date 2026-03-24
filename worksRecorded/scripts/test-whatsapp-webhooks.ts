/**
 * Manual webhook smoke test for Twilio + Meta WhatsApp routes.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npx tsx scripts/test-whatsapp-webhooks.ts
 *
 * Optional env vars:
 *   TEST_PHONE_E164=+37120000000
 *   META_PHONE_NUMBER_ID=123456789012345
 *   META_WA_ID=37120000000
 */

type Provider = "twilio" | "meta";
type Scenario = "receive" | "action" | "change" | "ai_reply" | "image_upload";

type TestCase = {
  name: string;
  provider: Provider;
  scenario: Scenario;
  run: () => Promise<{ ok: boolean; details: string }>;
};

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_PHONE_E164 = process.env.TEST_PHONE_E164 || "+37120000000";
const META_WA_ID = process.env.META_WA_ID || TEST_PHONE_E164.replace("+", "");
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || "123456789012345";

function makeTwilioForm(
  body: string,
  from = `whatsapp:${TEST_PHONE_E164}`,
  options?: { imageUpload?: boolean }
): URLSearchParams {
  const form = new URLSearchParams();
  form.set("SmsStatus", "received");
  form.set("From", from);
  form.set("WaId", from.replace("whatsapp:+", ""));
  form.set("Body", body);
  if (options?.imageUpload) {
    form.set("NumMedia", "1");
    form.set("MediaUrl0", "https://example.com/test-image.jpg");
    form.set("MediaContentType0", "image/jpeg");
  } else {
    form.set("NumMedia", "0");
  }
  form.set("MessageSid", `SM_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  return form;
}

function makeMetaPayload(text: string, options?: { imageUpload?: boolean }) {
  const message = options?.imageUpload
    ? {
        from: META_WA_ID,
        id: `wamid.TEST_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        timestamp: `${Math.floor(Date.now() / 1000)}`,
        type: "image",
        image: {
          id: `MEDIA_${Date.now()}`,
          mime_type: "image/jpeg",
          caption: text,
        },
      }
    : {
        from: META_WA_ID,
        id: `wamid.TEST_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        timestamp: `${Math.floor(Date.now() / 1000)}`,
        type: "text",
        text: { body: text },
      };

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_TEST",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: TEST_PHONE_E164,
                phone_number_id: META_PHONE_NUMBER_ID,
              },
              contacts: [{ wa_id: META_WA_ID, profile: { name: "Webhook Test User" } }],
              messages: [message],
            },
          },
        ],
      },
    ],
  };
}

async function callTwilio(body: string, options?: { imageUpload?: boolean }) {
  const res = await fetch(`${BASE_URL}/api/webhook/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: makeTwilioForm(body, `whatsapp:${TEST_PHONE_E164}`, options).toString(),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function callMeta(body: string, options?: { imageUpload?: boolean }) {
  const res = await fetch(`${BASE_URL}/api/webhook/meta/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(makeMetaPayload(body, options)),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function runHttpCheck(
  provider: Provider,
  scenario: Scenario,
  textBody: string,
  options?: { imageUpload?: boolean }
): Promise<{ ok: boolean; details: string }> {
  const out =
    provider === "twilio"
      ? await callTwilio(textBody, options)
      : await callMeta(textBody, options);
  const ok = out.status === 200;

  const details = [
    `provider=${provider}`,
    `scenario=${scenario}`,
    `status=${out.status}`,
    `response=${JSON.stringify(out.body)}`,
  ].join(" | ");

  return { ok, details };
}

async function main() {
  const tests: TestCase[] = [
    {
      name: "Twilio receive message",
      provider: "twilio",
      scenario: "receive",
      run: () => runHttpCheck("twilio", "receive", "Hello, this is webhook receive test"),
    },
    {
      name: "Twilio action functionality",
      provider: "twilio",
      scenario: "action",
      run: () => runHttpCheck("twilio", "action", "action"),
    },
    {
      name: "Twilio change functionality",
      provider: "twilio",
      scenario: "change",
      run: () => runHttpCheck("twilio", "change", "Change"),
    },
    {
      name: "Twilio AI reply functionality",
      provider: "twilio",
      scenario: "ai_reply",
      run: () => runHttpCheck("twilio", "ai_reply", "Please summarize today's site progress"),
    },
    {
      name: "Twilio image upload functionality",
      provider: "twilio",
      scenario: "image_upload",
      run: () =>
        runHttpCheck("twilio", "image_upload", "Image upload smoke test", {
          imageUpload: true,
        }),
    },
    {
      name: "Meta receive message",
      provider: "meta",
      scenario: "receive",
      run: () => runHttpCheck("meta", "receive", "Hello, this is webhook receive test"),
    },
    {
      name: "Meta action functionality",
      provider: "meta",
      scenario: "action",
      run: () => runHttpCheck("meta", "action", "AcTiOn"),
    },
    {
      name: "Meta change functionality",
      provider: "meta",
      scenario: "change",
      run: () => runHttpCheck("meta", "change", "Change"),
    },
    {
      name: "Meta AI reply functionality",
      provider: "meta",
      scenario: "ai_reply",
      run: () => runHttpCheck("meta", "ai_reply", "What tasks are pending for this week?"),
    },
    {
      name: "Meta image upload functionality",
      provider: "meta",
      scenario: "image_upload",
      run: () =>
        runHttpCheck("meta", "image_upload", "Image upload smoke test", {
          imageUpload: true,
        }),
    },
  ];

  console.log(`\nRunning webhook smoke tests against: ${BASE_URL}`);
  console.log(
    `Using TEST_PHONE_E164=${TEST_PHONE_E164}, META_WA_ID=${META_WA_ID}, META_PHONE_NUMBER_ID=${META_PHONE_NUMBER_ID}\n`
  );

  let passed = 0;
  for (const t of tests) {
    const res = await t.run();
    if (res.ok) {
      passed += 1;
      console.log(`✅ ${t.name}`);
    } else {
      console.log(`❌ ${t.name}`);
    }
    console.log(`   ${res.details}`);
  }

  console.log(`\n${passed}/${tests.length} tests returned HTTP 200.`);
  console.log(
    "Note: This script validates webhook request handling. Outbound reply content/duplication should be verified in provider logs (Twilio/Meta) and app logs."
  );

  if (passed !== tests.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("❌ Test runner failed:", err);
  process.exit(1);
});
