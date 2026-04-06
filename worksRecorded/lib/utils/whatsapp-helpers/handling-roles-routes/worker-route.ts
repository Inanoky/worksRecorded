"use server";

import { prisma } from "@/lib/utils/db";
import talkToClockInAgent from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/agent";
import OpenAI, { toFile } from "openai";
import { sendMessage } from "../shared/twillio";
// UPDATE: Ensure this import path is correct for your file structure
// (assuming handleImage.ts is in the same directory as this file based on surrounding context)
import { handleImage } from "../shared/handleImage";
// NOTE: I am using './handleImage' as a placeholder. You used '../shared/handleImage',
// ensure the path matches where you placed the updated handleImage.ts file.

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const metaAccessToken = process.env.META_ACCESS_TOKEN || "";

function inferAudioExtension(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("m4a") || normalized.includes("mp4")) return "m4a";
  return "ogg";
}

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
  const numMedia = parseInt(NumMedia, 10); // NEW: parse NumMedia for general checks

  let messageText = body;

  // Find worker by phone number (FIRST LOOKUP)
  const worker = await prisma.workers.findFirst({
    where: { phone },
  });
  console.log("  Worker lookup result:", worker);

  if (!worker) {
    console.warn("[handleWorkerMessage] No worker found for phone:", phone);
    await sendMessage(from, "Worker not found in system.");
    return;
  }


  // === NEW: Image message handling ===
  if (numMedia > 0) {
    // We only call handleImage if there is media, and it will check for image type inside.
    const siteId = worker.siteId; // Worker's site ID is needed for photo submission

    // Skip if worker doesn't have an assigned site.
    if (!siteId) {
        await sendMessage(from, "Sorry, you must be assigned to a site to submit photos.");
        return;
    }

    // NEW: Check if it's an image and handle it
    const imageHandled = await handleImage({
        formData,
        numMedia,
        workerId: worker.id, // Pass workerId
        siteId: siteId, // Pass siteId
        to: from,
        body: body,
        photographerName: [worker.name, worker.surname].filter(Boolean).join(" "),
        agent: talkToClockInAgent,
    });

    if (imageHandled) {
        // If an image was handled, we are done with this message.
        return;
    }
  }

  // === Audio message transcription support ===
  if (NumMedia === "1") {
    const MediaUrl0 = formData.get("MediaUrl0") as string | null;
    const MediaContentType0 = (formData.get("MediaContentType0") || "").toString();
    const MediaProvider0 = (formData.get("MediaProvider0") || "").toString().toLowerCase();

    if (MediaUrl0 && MediaContentType0.startsWith("audio")) {
      try {
        console.log("🎤 Audio message detected");
        const headers: Record<string, string> = {};
        if (MediaProvider0 === "meta") {
          if (!metaAccessToken) {
            throw new Error("Missing META_ACCESS_TOKEN for Meta media download");
          }
          headers.Authorization = `Bearer ${metaAccessToken}`;
        } else {
          const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
          headers.Authorization = `Basic ${basicAuth}`;
        }

        const res = await fetch(MediaUrl0, { headers });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(
            `Failed to fetch audio media (${MediaProvider0 || "twilio"}): ${res.status} ${res.statusText} ${errText}`
          );
        }

        const buf = Buffer.from(await res.arrayBuffer());
        const ext = inferAudioExtension(MediaContentType0);
        const file = await toFile(buf, `voice-message.${ext}`);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcriptResult = await openai.audio.transcriptions.create({
          file,
          model: "gpt-4o-transcribe",
        });

        messageText = transcriptResult.text || "(No text recognized)";
        console.log("📝 Transcription result:", messageText);
      } catch (err) {
        console.error("Failed to transcribe audio message:", err);
        await sendMessage(
          from,
          "Sorry, I couldn’t transcribe this voice message. Please try again or send your request as text."
        );
        return;
      }
    }
  }

  // Log incoming message details
  console.log("[handleWorkerMessage] Received message");
  console.log("  Phone:", phone);
  console.log("  WhatsApp From:", from);
  console.log("  Body:", body);
  console.log("  Used Text:", messageText);

  // The second `worker` lookup and check block has been REMOVED here.
  try {
    // Worker found, send to AI agent (only if messageText is not empty or non-transcribed audio)
    // NOTE: This assumes that if an image was handled, the function returned earlier.
    if (messageText.length === 0) {
        // Handles cases where there was no message body and no transcribable audio
        return;
    }

    console.log("[handleWorkerMessage] Sending to talkToClockInAgent...");
    // We use the worker object retrieved at the start of the function.
    const message = await talkToClockInAgent(messageText, worker.id);
    await sendMessage(from, message);

  } catch (error) {
    console.error("Worker workflow error:", error);
    await sendMessage(from, "Error processing message.");
  }
}
