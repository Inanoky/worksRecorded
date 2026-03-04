// worksRecorded/app/api/webhook/Meta/route.ts
// Next.js App Router webhook endpoint (GET verify + POST events)
//
// Set env vars:
// - META_ACCESS_TOKEN
// - GRAPH_API_TOKEN
// - FLOW_ID
//
// URL in Meta webhook config should point to:
//   worksRecorded\app\api\webhook\meta\webhook\route.ts

import { randomUUID } from "crypto";

const { WEBHOOK_VERIFY_TOKEN, META_ACCESS_TOKEN, FLOW_ID } = process.env;

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
    // Must return the raw challenge string
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}


export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    console.log("Incoming webhook message:", JSON.stringify(body, null, 2));

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const business_phone_number_id =
      body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (message && business_phone_number_id) {
      // 1) If user sends "appointment" -> send a Flow message
      if (
        message.type === "text" &&
        typeof message.text?.body === "string" &&
        message.text.body.toLowerCase().includes("action")
      ) {
        const flowId = "1267728872124719"

        // You MUST replace this with your own identifier if you want to track
        const flowToken = randomUUID();

        await graphSendMessage(business_phone_number_id, {
          messaging_product: "whatsapp",
          to: message.from,
          type: "interactive",
          interactive: {
            type: "flow",
            header: { type: "text", text: "WorksRecorded form" },
            body: {
              text: "Construction",
            },
            footer: { text: "Click the button below to proceed" },
            action: {
              name: "flow",
              parameters: {
                flow_id: flowId,
                flow_message_version: "3",
                flow_token: flowToken,
                flow_cta: "Complete form",
                flow_action: "navigate",
                // mode: "draft", // uncomment to send a draft flow
              },
            },
          },
        });
      }

      // 2) Handle Flow response message
      if (message.type === "interactive" && message.interactive?.type === "nfm_reply") {

  

          const responseJsonStr = message.interactive.nfm_reply.response_json;

          //Tihis is just JSON parser, because payload is string

          let payload: any;
            try {
              payload = JSON.parse(responseJsonStr);
            } catch (e) {
              console.error("Invalid response_json:", responseJsonStr);
              return;
            }


          const formName = payload.formName;


        //Here we can start routing.
        //We search for formName "Always will be in payload!"
        
            //Sending response straight away, I think good to avoid timeout.
        await graphSendMessage(business_phone_number_id, {
          messaging_product: "whatsapp",
          to: message.from,
          text: { body: `${formName} is Submitted` },
        });

          if (formName === "material_form") {

            //Here we need: 
            // 1) first of all handle image. - metaImageHandler.ts, input - MEDIA_ID, output - UploadThings URL. 
            // 2) send image to open AI for extraction  - Input - UploadThings URL, output [{} {} {} ] - where each invoice line is a separate object
            // 3) storeMaterialAction.ts - input - structure JSON from above, stores in the Incoming material database. 
            // 4) displayOnline.tsx - component to display database



          }



      }

      // 3) Mark incoming message as read
      if (message.id) {
        await graphSendMessage(business_phone_number_id, {
          messaging_product: "whatsapp",
          status: "read",
          message_id: message.id,
        });
      }
    }

    // Always return 200 quickly so Meta doesn't retry
    return new Response("OK", { status: 200 });
  } catch (err) {
    // Still return 200 in most webhook setups to avoid retries from transient parsing issues.
    // If you prefer retries, change this to 500.
    console.error("Webhook handler error:", err);
    return new Response("OK", { status: 200 });
  }
}