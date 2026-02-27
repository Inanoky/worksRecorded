// worksRecorded/server/actions/META/sendFlow.ts
// bun run server/actions/META/sendFlow.ts +37124885690

function must(name: string, v?: string) {
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const GRAPH_API_TOKEN = process.env.META_ACCESS_TOKEN

// Meta WhatsApp business phone number ID
const PHONE_NUMBER_ID = "1043684732153236";

// Your Flow ID
const FLOW_ID = "1267728872124719";

const to = process.argv[2] || "+37124885690";

async function main() {
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "flow",
          header: { type: "text", text: "WorksRecorded Construction form" },
          body: { text: "Complete form" },
          footer: { text: "Tap to open" },
          action: {
            name: "flow",
            parameters: {
              flow_id: FLOW_ID,
              flow_message_version: "3",
              flow_token: `wr_${Date.now()}`,
              flow_cta: "Sign",
              flow_action: "navigate",
      
            },
          },
        },
      }),
    }
  );

  const text = await res.text();
  console.log(text);

  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});