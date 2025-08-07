"use server";

import OpenAI from "openai";
import { Readable } from "stream";
import talkToWhatsappAgent from "@/components/AI/Whatsapp/agent";
import { prisma } from "@/app/utils/db";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const SENDER_NUMBER = 'whatsapp:+13135131153';

// Buffer-to-stream helper for OpenAI Whisper
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function POST(req) {
  const formData = await req.formData();
  setImmediate(() => handleMessage(formData));
  return new Response("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" }
  });
}

async function handleMessage(formData) {
  try {
    console.log('--- FORM DATA ---');
    for (const [k, v] of formData.entries()) console.log(`${k}: ${v}`);
    console.log('-----------------');

    const from = formData.get("From");
    const smsStatus = formData.get("SmsStatus");

    // Only process user messages
    if (smsStatus && smsStatus !== "received") {
      console.log(`Not a user message (system/status webhook). SmsStatus: ${smsStatus}. Skipping.`);
      return;
    }

    const WaId = formData.get("WaId");
    const NumMedia = formData.get("NumMedia");
    const MediaUrl0 = formData.get("MediaUrl0");
    const MediaContentType0 = formData.get("MediaContentType0");
    const body = (formData.get("Body") || "").trim();

    const phone = WaId || (from || "").replace("whatsapp:+", "");
    console.log(`User phone resolved: ${phone}`);

    // Fetch user from DB
    const user = await prisma.user.findFirst({
      where: { phone },
      include: { Site: true }
    });
    if (!user) {
      console.log("User not found in DB");
      await sendMessage(from, "Sorry, this phone number is not registered. Please contact admin.");
      return;
    }
    console.log(`User found: ${user.firstName} ${user.lastName} (${user.id})`);
    console.log(`User lastSelectedSiteIdforWhatsapp: ${user.lastSelectedSiteIdforWhatsapp}`);
    console.log(`User has ${user.Site.length} projects/sites.`);

    const siteList = user.Site.map((site, idx) => `${idx + 1} - ${site.name}`).join('\n');
    console.log('Project siteList:\n' + siteList);

    // Handle "change" command
    if (body.toLowerCase() === "change") {
      console.log("User requested project change");
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSelectedSiteIdforWhatsapp: null }
      });
      await sendMessage(from, `You have cleared your project selection.\nPlease choose your project by replying with the number:\n${siteList}`);
      return;
    }

    // Handle initial project selection
    if (!user.lastSelectedSiteIdforWhatsapp) {
      const n = parseInt(body, 10);
      console.log(`No project selected yet. User replied: "${body}", parsed as number:`, n);
      if (body && !isNaN(n) && n >= 1 && n <= user.Site.length) {
        const selectedSite = user.Site[n - 1];
        console.log(`Valid project selection: #${n} - ${selectedSite.name} (${selectedSite.id})`);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSelectedSiteIdforWhatsapp: selectedSite.id }
        });
        await sendMessage(from, `System: You are now talking to project "${selectedSite.name}". To change the project, type "Change".`);
        return;
      } else {
        console.log("Invalid or missing project selection. Asking user to choose again.");
        await sendMessage(from, `Hi ${user.firstName || ""}! Please choose your project by replying with the number:\n${siteList}`);
        return;
      }
    }

    // === AUDIO HANDLING, IN-MEMORY ===
    if (NumMedia === "1" && MediaContentType0 && MediaContentType0.startsWith("audio")) {
      try {
        console.log("Processing audio message (in-memory buffer)...");
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
        const res = await fetch(MediaUrl0, { headers: { Authorization: `Basic ${basicAuth}` } });
        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`Audio buffer downloaded (${buf.length} bytes)`);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const stream = bufferToStream(buf);
        const transcriptResult = await openai.audio.transcriptions.create({
          file: stream,
          filename: "voice-message.ogg",
          model: "whisper-1",
        });
        const transcript = transcriptResult.text || "(No text recognized)";
        console.log("Transcript:", transcript);

        const aiMessage = await talkToWhatsappAgent(transcript, user.lastSelectedSiteIdforWhatsapp, user.id);
        console.log("AI message (audio):", aiMessage);

        await sendMessage(from, `Transcription: ${transcript}\nAI message: ${aiMessage}`);
      } catch (err) {
        console.error("Audio handling error", err);
        await sendMessage(from, "Sorry, we could not process your audio message.");
      }
      return;
    }

    // === TEXT HANDLING ===
    if (NumMedia === "0") {
      console.log("Processing text message...");
      const aiMessage = await talkToWhatsappAgent(body, user.lastSelectedSiteIdforWhatsapp, user.id);
      console.log("AI message (text):", aiMessage);
      await sendMessage(from, aiMessage);
      return;
    }

    // Fallback
    console.log("Fallback: not an audio or text message. Sending generic reply.");
    await sendMessage(from, "Received your message!");
  } catch (err) {
    console.error("Error in handleMessage:", err);
    try {
      const from = formData.get("From");
      if (from && from !== SENDER_NUMBER) {
        await sendMessage(from, "Sorry, an error occurred processing your message.");
      }
    } catch (err2) {
      console.error("Error sending error message to user:", err2);
    }
  }
}

async function sendMessage(to, message) {
  console.log(`Attempting to send message to: ${to}\nBody: ${message}`);
  if (!to || !message) {
    console.log('sendMessage: Missing "to" or "message". Aborting.');
    return;
  }
  if (to === SENDER_NUMBER) {
    console.log('sendMessage: "to" is sender number. Aborting.');
    return;
  }
  try {
    const res = await client.messages.create({
      from: SENDER_NUMBER,
      to,
      body: message,
    });
    console.log('Message sent via Twilio. SID:', res.sid);
  } catch (err) {
    console.error("Twilio send error:", err);
  }
}
