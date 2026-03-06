// worksRecorded/app/api/webhook/Meta/route.ts
// Next.js App Router webhook endpoint (GET verify + POST events)

import { randomUUID } from "crypto";

import {
  getSession,
  startSession,
  updateSession,
  deleteSession,
} from "@/app/api/webhook/meta/webhook/helperes" 
import { sendToGpt } from "@/server/actions/META/RoutingHandlers/metaImageHandler";

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

      // 1) If user sends "action" -> send a Flow message
      if (
        message.type === "text" &&
        typeof message.text?.body === "string" &&
        message.text.body.toLowerCase().includes("action")
      ) {
        const flowId = "1267728872124719";

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
              },
            },
          },
        });
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
              body: "📅 Booking started.\n\nWhat service do you want?"
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
                body: "Great 👍\n\nChoose a date (YYYY-MM-DD)"
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
                body: "Perfect.\n\nChoose a time (HH:MM)"
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
                body: `✅ Booking confirmed!

Service: ${session.service}
Date: ${session.date}
Time: ${text}

We will see you soon!`,
              },
            });

            await deleteSession(user);

            return new Response("OK", { status: 200 });
          }

        }
      }

      // 2) Handle Flow response
      if (message.type === "interactive" && message.interactive?.type === "nfm_reply") {

        const responseJsonStr = message.interactive.nfm_reply.response_json;

        let payload: any;

        try {
          payload = JSON.parse(responseJsonStr);
        } catch (e) {
          console.error("Invalid response_json:", responseJsonStr);
          return new Response("OK", { status: 200 });
        }

        const formName = payload.formName;

        await graphSendMessage(business_phone_number_id, {
          messaging_product: "whatsapp",
          to: message.from,
          text: { body: `${formName} is Submitted` },
        });

        if (formName === "material_form") {


          const responseJsonStr = message.interactive.nfm_reply.response_json;

              let payload: any;

              try {
                payload = JSON.parse(responseJsonStr);
              } catch (e) {
                console.error("Invalid response_json:", responseJsonStr);
                return new Response("OK", { status: 200 });
              }


          const mediaId = payload?.photo?.[0]?.id?.toString();

          console.log(`material_form_triggered ${mediaId}`)

          await sendToGpt(mediaId)

          // future pipeline
          // 1 download image
          // 2 AI extraction
          // 3 store database
          // 4 show dashboard

        }

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