"use server";

import OpenAI, { toFile } from "openai";
import { Readable } from "stream";
import talkToWhatsappAgent from "@/components/AI/Whatsapp/agent";
import { prisma } from "@/app/utils/db";
import twilio from "twilio";
import { UTApi } from "uploadthing/server";
import { savePhoto} from "@/app/photoActions";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);
const SENDER_NUMBER = "whatsapp:+13135131153";
const utapi = new UTApi();

function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function POST(req: Request) {
  const formData = await req.formData();
  setImmediate(() => handleMessage(formData));
  return new Response("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function handleMessage(formData: FormData) {
  try {
    const from = formData.get("From") as string | null;
    const smsStatus = formData.get("SmsStatus") as string | null;
    if (smsStatus && smsStatus !== "received") return;

    const WaId = formData.get("WaId") as string | null;
    const NumMedia = (formData.get("NumMedia") || "0").toString();
    const body = (formData.get("Body") || "").toString().trim();

    const phone = WaId || (from || "").replace("whatsapp:+", "");
    const user = await prisma.user.findFirst({ where: { phone }, include: { Site: true } });
    if (!user) {
      await sendMessage(from, "Sorry, this phone number is not registered. Please contact admin.");
      return;
    }

    // ----- Project selection flow -----
    if (body.toLowerCase() === "change") {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSelectedSiteIdforWhatsapp: null },
      });
      const siteList = user.Site.map((s, i) => `${i + 1} - ${s.name}`).join("\n");
      await sendMessage(
        from,
        `You have cleared your project selection.\nPlease choose your project by replying with the number:\n${siteList}`
      );
      return;
    }

    if (!user.lastSelectedSiteIdforWhatsapp) {
      const n = parseInt(body, 10);
      const siteList = user.Site.map((s, i) => `${i + 1} - ${s.name}`).join("\n");
      if (body && !isNaN(n) && n >= 1 && n <= user.Site.length) {
        const selectedSite = user.Site[n - 1];
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSelectedSiteIdforWhatsapp: selectedSite.id },
        });
        await sendMessage(
          from,
          `System: You are now talking to project "${selectedSite.name}". To change the project, type "Change".`
        );
      } else {
        await sendMessage(
          from,
          `Hi ${user.firstName || ""}! Please choose your project by replying with the number:\n${siteList}`
        );
      }
      return;
    }

    // ----- IMAGE -> UploadThing(imageUploader) -> savePhoto action -----
    const numMedia = parseInt(NumMedia, 10) || 0;
    if (numMedia > 0) {
      let imgIndex = -1;
      for (let i = 0; i < numMedia; i++) {
        const ct = (formData.get(`MediaContentType${i}`) || "").toString().toLowerCase();
        if (ct.startsWith("image/")) {
          imgIndex = i;
          break;
        }
      }

      if (imgIndex >= 0) {
        const mediaUrl = formData.get(`MediaUrl${imgIndex}`) as string | null;
        const contentType = (formData.get(`MediaContentType${imgIndex}`) || "image/jpeg").toString();

        try {
          const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
          const res = await fetch(mediaUrl!, { headers: { Authorization: `Basic ${basicAuth}` } });
          const ab = await res.arrayBuffer();

          // Build a File in-memory (Node 18+ typically has File)
          const ext = contentType.split("/")[1] || "jpg";
          const fileName = `whatsapp_${Date.now()}.${ext}`;
          const file = new File([ab], fileName, { type: contentType });

          // Upload to UploadThing (respects imageUploader)
          const uploaded = await utapi.uploadFiles([file]);
          const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;
          if (first?.error || !first?.data) {
            await sendMessage(from, "Sorry, failed to store the image.");
            return;
          }

          const { ufsUrl, url: legacyUrl } = first.data;
          const publicUrl = ufsUrl ?? legacyUrl;
          if (!publicUrl) {
            await sendMessage(from, "Sorry, failed to store the image.");
            return;
          }

          // Save to DB via action
          await savePhoto({
            userId: user.id,
            siteId: user.lastSelectedSiteIdforWhatsapp,
            url: publicUrl,
            fileUrl: publicUrl,
            comment: body || null, // WhatsApp caption, if any
            location: null,
            date: new Date(),
          });

          // Reply with the UploadThing URL
          await sendMessage(from, publicUrl);
        } catch (e) {
          console.error("Image upload/store error:", e);
          await sendMessage(from, "Sorry, we couldn't process your image.");
        }
        return;
      }
    }

    // ----- AUDIO -> Whisper -> Agent (unchanged) -----
    const MediaUrl0 = formData.get("MediaUrl0") as string | null;
    const MediaContentType0 = (formData.get("MediaContentType0") || "").toString();
    if (NumMedia === "1" && MediaContentType0.startsWith("audio")) {
      try {
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
        const aiMessage = await talkToWhatsappAgent(
          transcript,
          user.lastSelectedSiteIdforWhatsapp,
          user.id
        );
        await sendMessage(from, `Transcription: ${transcript}\nAI message: ${aiMessage}`);
      } catch (err) {
        console.error("Audio handling error", err);
        await sendMessage(from, "Sorry, we could not process your audio message.");
      }
      return;
    }

    // ----- TEXT -> Agent (unchanged) -----
    if (NumMedia === "0") {
      const aiMessage = await talkToWhatsappAgent(body, user.lastSelectedSiteIdforWhatsapp, user.id);
      await sendMessage(from, aiMessage);
      return;
    }

    await sendMessage(from, "Received your message!");
  } catch (err) {
    console.error("Error in handleMessage:", err);
    const from = formData.get("From") as string | null;
    if (from && from !== SENDER_NUMBER) {
      try {
        await sendMessage(from, "Sorry, an error occurred processing your message.");
      } catch {}
    }
  }
}

async function sendMessage(to: string | null, message: string) {
  if (!to || !message) return;
  if (to === SENDER_NUMBER) return;
  try {
    const res = await client.messages.create({ from: SENDER_NUMBER, to, body: message });
    console.log("Message sent via Twilio. SID:", res.sid);
  } catch (err) {
    console.error("Twilio send error:", err);
  }
}
