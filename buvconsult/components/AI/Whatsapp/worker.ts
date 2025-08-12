"use server";

import OpenAI, { toFile } from "openai";
import { prisma } from "@/app/utils/db";
import twilio from "twilio";
import talkToWhatsappAgent from "@/components/AI/Whatsapp/agent";
import { UTApi } from "uploadthing/server";
import { savePhoto } from "@/app/photoActions";

export const maxDuration = 30

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);
const SENDER_NUMBER = "whatsapp:+13135131153";
const utapi = new UTApi();

export async function handleMessageFromJson(json: Record<string, any>) {
  console.log("🚀 handleMessageFromJson triggered");
  console.log("🔍 Incoming JSON:", JSON.stringify(json, null, 2));

  try {
    const from = json.From as string | null;
    const smsStatus = json.SmsStatus as string | null;
    const WaId = json.WaId as string | null;
    const NumMedia = (json.NumMedia || "0").toString();
    const body = (json.Body || "").toString().trim();

    console.log("📨 Parsed fields — from:", from, "| WaId:", WaId, "| NumMedia:", NumMedia, "| Body:", body, "| SmsStatus:", smsStatus);

    if (!from) {
      console.warn("⚠️ 'from' field is missing. Exiting.");
      return;
    }

    if (smsStatus && smsStatus !== "received") {
      console.warn("📭 Skipping non-received smsStatus:", smsStatus);
      return;
    }

    const phone = WaId || from.replace("whatsapp:+", "");
    console.log("📞 Normalized phone:", phone);

      let user = null;
      try {
        user = await prisma.user.findFirst({
          where: { phone },
          include: { Site: true },
        });
        console.log("🔍 Prisma query for phone returned:", user);
      } catch (err) {
        console.error("❌ Prisma query failed:", err);
      }

    if (!user) {
      console.warn("❌ No user found for phone:", phone);
      await sendMessage(from, "Sorry, this phone number is not registered. Please contact admin.");
      return;
    }

    console.log("👤 Found user:", user.id, "| Sites:", user.Site.length);

    // --- Handle "change" command ---
    if (body.toLowerCase() === "change") {
      console.log("🔁 Resetting selected site for user:", user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSelectedSiteIdforWhatsapp: null },
      });

      const siteList = user.Site.map((s, i) => `${i + 1} - ${s.name}`).join("\n");
      await sendMessage(from, `You have cleared your project selection.\nPlease choose your project by replying with the number:\n${siteList}`);
      return;
    }

    // --- Handle project selection ---
    if (!user.lastSelectedSiteIdforWhatsapp) {
      const n = parseInt(body, 10);
      const siteList = user.Site.map((s, i) => `${i + 1} - ${s.name}`).join("\n");

      if (!isNaN(n) && n >= 1 && n <= user.Site.length) {
        const selectedSite = user.Site[n - 1];
        console.log("✅ Project selected:", selectedSite.name);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastSelectedSiteIdforWhatsapp: selectedSite.id },
        });

        await sendMessage(from, `System: You are now talking to project "${selectedSite.name}". To change the project, type "Change".`);
      } else {
        console.warn("❌ Invalid site number selected:", body);
        await sendMessage(from, `Hi ${user.firstName || ""}! Please choose your project by replying with the number:\n${siteList}`);
      }
      return;
    }

    // --- Handle IMAGE ---
    const numMedia = parseInt(NumMedia, 10) || 0;
    if (numMedia > 0) {
      console.log("🖼️ Media detected, checking for images...");

      for (let i = 0; i < numMedia; i++) {
        const ct = (json[`MediaContentType${i}`] || "").toString().toLowerCase();
        console.log(`🔎 Media ${i} Content-Type:`, ct);

        if (ct.startsWith("image/")) {
          console.log(`🖼️ Image found at index ${i}`);
          const mediaUrl = json[`MediaUrl${i}`];
          const contentType = json[`MediaContentType${i}`] || "image/jpeg";

          try {
            const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
            const res = await fetch(mediaUrl!, { headers: { Authorization: `Basic ${basicAuth}` } });
            const ab = await res.arrayBuffer();

            const ext = contentType.split("/")[1] || "jpg";
            const fileName = `whatsapp_${Date.now()}.${ext}`;
            const file = new File([ab], fileName, { type: contentType });

            const uploaded = await utapi.uploadFiles([file]);
            const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;
            const publicUrl = first?.data?.ufsUrl ?? first?.data?.url;

            if (!publicUrl) {
              console.error("❌ Upload returned no public URL");
              await sendMessage(from, "Sorry, failed to store the image.");
              return;
            }

            console.log("✅ Image uploaded to:", publicUrl);

            await savePhoto({
              userId: user.id,
              siteId: user.lastSelectedSiteIdforWhatsapp,
              url: publicUrl,
              fileUrl: publicUrl,
              comment: body || null,
              location: null,
              date: new Date(),
            });

            await sendMessage(from, publicUrl);
          } catch (e) {
            console.error("❌ Image upload error:", e);
            await sendMessage(from, "Sorry, we couldn't process your image.");
          }
          return;
        }
      }
    }

    // --- Handle AUDIO ---
    const MediaUrl0 = json.MediaUrl0 as string | null;
    const MediaContentType0 = (json.MediaContentType0 || "").toString();
    if (NumMedia === "1" && MediaContentType0.startsWith("audio")) {
      try {
        console.log("🎤 Audio message detected");
        const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const res = await fetch(MediaUrl0!, { headers: { Authorization: `Basic ${basicAuth}` } });
        const buf = Buffer.from(await res.arrayBuffer());
        const file = await toFile(buf, "voice-message.ogg");

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcriptResult = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
        });

        const transcript = transcriptResult.text || "(No text recognized)";
        console.log("📝 Transcription:", transcript);

        const aiMessage = await talkToWhatsappAgent(transcript, user.lastSelectedSiteIdforWhatsapp, user.id);
        console.log("🤖 AI response:", aiMessage);

        await sendMessage(from, `Transcription: ${transcript}\nAI message: ${aiMessage}`);
      } catch (err) {
        console.error("❌ Audio handling error:", err);
        await sendMessage(from, "Sorry, could not process your audio message.");
      }
      return;
    }

    // --- Handle TEXT ---
    if (NumMedia === "0") {
      console.log("📩 Processing plain text message:", body);
      const aiMessage = await talkToWhatsappAgent(body, user.lastSelectedSiteIdforWhatsapp, user.id);
      console.log("🤖 AI response:", aiMessage);
      await sendMessage(from, aiMessage);
      return;
    }

    // --- Fallback ---
    console.warn("⚠️ Unhandled message type. Sending generic reply.");
    await sendMessage(from, "Received your message!");
  } catch (err) {
    console.error("❌ Top-level error in handleMessageFromJson:", err);
    try {
      const fallbackTo = json.From as string | null;
      if (fallbackTo && fallbackTo !== SENDER_NUMBER) {
        await sendMessage(fallbackTo, "Sorry, an error occurred processing your message.");
      }
    } catch (e) {
      console.error("❌ Failed to send fallback message:", e);
    }
  }
}

async function sendMessage(to: string | null, message: string) {
  if (!to || !message || to === SENDER_NUMBER) {
    console.warn("⚠️ sendMessage skipped:", { to, message });
    return;
  }
  try {
    const res = await client.messages.create({ from: SENDER_NUMBER, to, body: message });
    console.log("📤 Twilio message sent. SID:", res.sid);
  } catch (err) {
    console.error("❌ Twilio send error:", err);
  }
}
