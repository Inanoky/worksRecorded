"use server"

import { writeFile } from 'fs/promises';
import fs from 'fs';
import OpenAI from "openai";
import talkToWhatsappAgent from "@/components/AI/Whatsapp/agent";
import {prisma} from "@/app/utils/db";


// For Next.js, use the experimental Edge Runtime only if needed;
// Otherwise, this works with the default Node.js runtime.

export async function POST(req) {
  console.log(`POST call received`)

  const formData = await req.formData();
  //-----------------------below just logs save to delete------------------------------
  console.log('--- Received formData ---');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    console.log('-------------------------');
    //---------------------------------------------------------------------------------------


  const NumMedia = formData.get("NumMedia");
  const MediaUrl0 = formData.get("MediaUrl0");
  const MediaContentType0 = formData.get("MediaContentType0");



  console.log(NumMedia)

  if (NumMedia === "1" && MediaContentType0 && MediaContentType0.startsWith("audio")) {
    // Step 1: Download audio from Twilio (with basic auth)
    const accountSid = process.env.TWILLIO_ACCOUNT_SID
    const authToken = process.env.TWILLIO_ACCOUNT_TOKEN
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const res = await fetch(MediaUrl0, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      }
    });

    // Step 2: Save audio to local file
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const filename = `voice-message-${Date.now()}.ogg`;

    await writeFile(filename, buf);

    console.log(`Saved voice message as ${filename}`);

    // 3. Transcribe with OpenAI Whisper
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcriptResult = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filename),
      model: "whisper-1",
      // language: "lv", // Uncomment to force Latvian, etc
    });
    const transcript = transcriptResult.text || "(No text recognized)";

    console.log("Transcript:", transcript);

    const userMessage = transcript
    const aiMessage = await talkToWhatsappAgent(transcript,"123")

        // 4. Respond to the user in WhatsApp
    return new Response(
      `<Response><Message>
      Transcription: ${transcript}
      AI message: ${aiMessage}
      </Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }


    // ---- TEXT MESSAGE ----
  if (NumMedia === "0") {
    const body = formData.get("Body") || "";
    console.log("Received text:", body);

    const aiMessage = await talkToWhatsappAgent(body, "123");
    return new Response(
      `<Response><Message>${aiMessage}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }








  // Fallback: not an audio message
  return new Response(
    `<Response><Message>Received your message!</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}
