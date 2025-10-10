// app/utils/workersWorkflow.ts
"use server";

import { prisma } from "@/app/utils/db";
import talkToClockInAgent from "@/server/ai/agents/Whatsapp/ClockinAgentForWorkerRoute/agent";
import twilio from "twilio";
import OpenAI, { toFile } from "openai";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);
const SENDER_NUMBER = "whatsapp:+13135131153";

/**
 * Handles incoming worker WhatsApp messages,
 * finds the worker by phone, and sends to AI agent.
 * Supports both text and audio (voice) messages.
 */
export async function handleWorkerMessage(phone: string, formData: FormData) {
  // Parse incoming message body and media info
  const body = (formData.get("Body") || "").toString().trim();
  const from = formData.get("From") as string;
  const NumMedia = (formData.get("NumMedia") || "0").toString();

  let messageText = body;

  // === Audio message transcription support ===
  if (NumMedia === "1") {
    const MediaUrl0 = formData.get("MediaUrl0") as string | null;
    const MediaContentType0 = (formData.get("MediaContentType0") || "").toString();

    if (MediaUrl0 && MediaContentType0.startsWith("audio")) {
      try {
        console.log("🎤 Audio message detected");
        const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const res = await fetch(MediaUrl0, {
          headers: { Authorization: `Basic ${basicAuth}` },
        });
        const buf = Buffer.from(await res.arrayBuffer());
        const file = await toFile(buf, "voice-message.ogg");

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcriptResult = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
        });

        messageText = transcriptResult.text || "(No text recognized)";
        console.log("📝 Transcription result:", messageText);
      } catch (err) {
        console.error("Failed to transcribe audio message:", err);
        // Fallback: will use plain body
      }
    }
  }

  // Log incoming message details
  console.log("[handleWorkerMessage] Received message");
  console.log("  Phone:", phone);
  console.log("  WhatsApp From:", from);
  console.log("  Body:", body);
  console.log("  Used Text:", messageText);

  try {
    // Find worker by phone number
    const worker = await prisma.workers.findFirst({
      where: { phone },
    });

    console.log("  Worker lookup result:", worker);

    if (!worker) {
      console.warn("[handleWorkerMessage] No worker found for phone:", phone);
      await sendMessage(from, "Worker not found in system.");
      return;
    }

    // Worker found, send to AI agent
    console.log("[handleWorkerMessage] Sending to talkToClockInAgent...");
    const message = await talkToClockInAgent(messageText, worker.id);
    await sendMessage(from, message);

  } catch (error) {
    console.error("Worker workflow error:", error);
    await sendMessage(from, "Error processing message.");
  }
}

/**
 * Helper to send WhatsApp messages via Twilio.
 */
async function sendMessage(to: string, message: string) {
  try {
    console.log("[sendMessage] Sending message:", { to, message });
    await client.messages.create({
      from: SENDER_NUMBER,
      to,
      body: message,
    });
    console.log("[sendMessage] Message sent successfully.");
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}
