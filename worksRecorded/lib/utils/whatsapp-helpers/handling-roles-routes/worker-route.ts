"use server";

import { prisma } from "@/lib/utils/db";
import talkToClockInAgent from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/agent";
import OpenAI, { toFile } from "openai";
import { sendMessage } from "../shared/sender";
// UPDATE: Ensure this import path is correct for your file structure
// (assuming handleImage.ts is in the same directory as this file based on surrounding context)
import { handleImage } from "../shared/handleImage";
import { inferAudioExtension, storeWhatsAppAudioFromUrl } from "../shared/handleAudio";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
// NOTE: I am using './handleImage' as a placeholder. You used '../shared/handleImage',
// ensure the path matches where you placed the updated handleImage.ts file.

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
  let sourceAudioUrl: string | null = null;

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

    if (MediaUrl0 && MediaContentType0.startsWith("audio")) {
      try {
        console.log("🎤 Audio message detected");
        const { buffer: buf, originalAudioUrl, skeletonRecordId } = await storeWhatsAppAudioFromUrl(
          MediaUrl0, 
          MediaContentType0, 
          { workerId: worker.id, siteId: worker.siteId }
        );
        sourceAudioUrl = originalAudioUrl;
        const ext = inferAudioExtension(MediaContentType0);
        const file = await toFile(buf, `voice-message.${ext}`);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcriptResult = await openai.audio.transcriptions.create({
          file,
          model: "gpt-4o-transcribe",
        });

        messageText = transcriptResult.text || "(No text recognized)";
        console.log("📝 Transcription result:", messageText);

        // Update the routing context with the skeleton record ID
        const message = await runWithWhatsappSourceContext(
          { originalAudioUrl: sourceAudioUrl, originalAudioRecordId: skeletonRecordId },
          () => talkToClockInAgent(messageText, worker.id),
        );
        await sendMessage(from, message);
        return; // Important: return here because we've handled the audio message

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
}
