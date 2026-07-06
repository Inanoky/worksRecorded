import OpenAI, { toFile } from "openai";
import { UTApi } from "uploadthing/server";
import { getString, fetchWhatsAppMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/sender";
import { AgentFn } from "./types";
import { getUploadThingUfsUrl } from "@/lib/utils/uploadthing-file-url";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";

const WHATSAPP_SAFE_LIMIT = 1400;
const utapi = new UTApi();

function describeUrlForLog(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

export function inferAudioExtension(contentType: string) {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("m4a") || normalized.includes("mp4")) return "m4a";
  return "ogg";
}

export async function uploadSourceAudio(buf: Buffer, contentType: string) {
  const ext = inferAudioExtension(contentType);
  const file = new File([buf], `whatsapp_voice_${Date.now()}.${ext}`, {
    type: contentType || "audio/ogg",
  });
  const uploaded = await utapi.uploadFiles([file]);
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  if (first?.error || !first?.data) {
    console.error("❌ [handleAudio] failed to upload source audio", first?.error);
    return null;
  }

  const publicUrl = getUploadThingUfsUrl(first.data);
  if (!publicUrl) {
    console.error("❌ [handleAudio] upload completed without ufsUrl", {
      hasUfsUrl: Boolean(first.data?.ufsUrl),
      uploadedUrl: describeUrlForLog(first.data?.ufsUrl ?? first.data?.url),
    });
    return null;
  }

  console.log("[originalAudioUrl][handleAudio] source audio upload completed", {
    hasUploadThingData: Boolean(first.data),
    uploadedUrl: describeUrlForLog(publicUrl),
  });

  return publicUrl;
}

export async function storeWhatsAppAudioFromUrl(
  mediaUrl: string,
  contentType: string,
  _meta?: { userId?: string | null; workerId?: string | null; siteId?: string | null }
) {
  console.log("[originalAudioUrl][audioStorage] downloading source audio", {
    mediaUrl: describeUrlForLog(mediaUrl),
    contentType,
  });

  const buffer = await fetchWhatsAppMediaAsBuffer(mediaUrl);
  console.log("[originalAudioUrl][audioStorage] source audio downloaded", {
    byteLength: buffer.length,
    contentType,
  });

  const originalAudioUrl = await uploadSourceAudio(buffer, contentType);
  console.log("[originalAudioUrl][audioStorage] source audio stored", {
    originalAudioUrl: describeUrlForLog(originalAudioUrl),
    byteLength: buffer.length,
  });

  return {
    buffer,
    originalAudioUrl,
  };
}

async function sendWithLengthCheck(
  to: string | null,
  text: string,
) {
  if (!to) return;

  if (text.length <= WHATSAPP_SAFE_LIMIT) {
    await sendMessage(to, text);
    return;
  }

  await sendMessage(
    to,
    "Your message is a bit too long to transcribe, but it is saved and stored online."
  );
}

/**
 * Try to handle a single audio clip (MediaUrl0).
 * Uses Whisper for transcription, then calls the injected agent with the transcript.
 * Returns true if handled, false if no audio was present.
 */
export async function handleAudio(args: {
  formData: FormData;
  user: any;
  to: string | null;
  agent: AgentFn; // <- inject agent here
}): Promise<boolean> {
  const { formData, user, to, agent } = args;

  const mediaUrl0 = getString(formData, "MediaUrl0");
  const ct0 = (getString(formData, "MediaContentType0") || "").toLowerCase();
  console.log("[originalAudioUrl][handleAudio] media check", {
    hasMediaUrl: Boolean(mediaUrl0),
    mediaUrl: describeUrlForLog(mediaUrl0),
    contentType: ct0,
  });
  if (!ct0.startsWith("audio")) return false;

  try {
    const siteId = user?.lastSelectedSiteIdforWhatsapp;
    const { buffer: buf, originalAudioUrl: sourceAudioUrl } =
      await storeWhatsAppAudioFromUrl(mediaUrl0!, ct0, { userId: user?.id, siteId });

    const ext = inferAudioExtension(ct0);
    const file = await toFile(buf, `voice-message.${ext}`);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const tr = await openai.audio.transcriptions.create({ file, model: "gpt-4o-transcribe" });
    const transcript = tr.text || "(No text recognized)";
    console.log("[originalAudioUrl][handleAudio] transcription completed", {
      transcriptLength: transcript.length,
      sourceAudioUrl: describeUrlForLog(sourceAudioUrl),
      userId: user?.id,
      siteId,
    });

    const aiMessage = await runWithWhatsappSourceContext(
      { originalAudioUrl: sourceAudioUrl },
      () => agent(transcript, siteId, user.id, sourceAudioUrl),
    );
    console.log("[originalAudioUrl][handleAudio] agent returned", {
      sourceAudioUrl: describeUrlForLog(sourceAudioUrl),
      aiMessageLength: typeof aiMessage === "string" ? aiMessage.length : null,
    });

    await sendWithLengthCheck(to, aiMessage);

  } catch (err) {
    console.error("❌ [handleAudio] error", err);
    await sendMessage(to, "Sorry, we could not process your audio message.");
  }

  return true;
}
