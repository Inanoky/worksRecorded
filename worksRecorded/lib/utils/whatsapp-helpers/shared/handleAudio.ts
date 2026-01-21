import OpenAI, { toFile } from "openai";
import { getString, fetchTwilioMediaAsBuffer } from "@/lib/utils/whatsapp-helpers/shared/helpers";
import { sendMessage } from "@/lib/utils/whatsapp-helpers/shared/twillio";
import { AgentFn } from "./types";






const WHATSAPP_SAFE_LIMIT = 1400;

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
  if (!ct0.startsWith("audio")) return false;

  try {
    const buf = await fetchTwilioMediaAsBuffer(mediaUrl0!);
    const file = await toFile(buf, "voice-message.ogg");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const tr = await openai.audio.transcriptions.create({ file, model: "gpt-4o-transcribe" });
    const transcript = tr.text || "(No text recognized)";

    const aiMessage = await agent(transcript, user.lastSelectedSiteIdforWhatsapp, user.id);



    const out = `Transcription:\n${transcript}\n\nAI message:\n${aiMessage}`;
    await sendWithLengthCheck(to, out);



  } catch (err) {
    console.error("❌ [handleAudio] error", err);
    await sendMessage(to, "Sorry, we could not process your audio message.");
  }

  return true;
}
