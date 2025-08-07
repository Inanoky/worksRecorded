"use server";

import { writeFile } from 'fs/promises';
import fs from 'fs';
import OpenAI from "openai";
import talkToWhatsappAgent from "@/components/AI/Whatsapp/agent";
import { prisma } from "@/app/utils/db";

export async function POST(req) {
  console.log(`\n===== POST call received =====`);

  const formData = await req.formData();
  console.log('--- Received formData ---');
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }
  console.log('-------------------------');

  const NumMedia = formData.get("NumMedia");
  const MediaUrl0 = formData.get("MediaUrl0");
  const MediaContentType0 = formData.get("MediaContentType0");
  const body = (formData.get("Body") || "").trim();

  // Get phone from WaId or From
  const phone = formData.get("WaId") || (formData.get("From") || "").replace("whatsapp:+", "");
  console.log(`User phone resolved: ${phone}`);

  // Fetch user (with their projects/sites)
  const user = await prisma.user.findFirst({
    where: { phone },
    include: { Site: true }
  });

  if (!user) {
    console.log("User not found in DB");
    return new Response(
      `<Response><Message>
        Sorry, this phone number is not registered. Please contact admin.
      </Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
  console.log(`User found: ${user.firstName} ${user.lastName} (${user.id})`);
  console.log(`User lastSelectedSiteIdforWhatsapp: ${user.lastSelectedSiteIdforWhatsapp}`);
  console.log(`User has ${user.Site.length} projects/sites.`);

  // Project list as numbered list
  const siteList = user.Site.map((site, idx) => `${idx + 1} - ${site.name}`).join('\n');
  console.log('Project siteList:\n' + siteList);

  // Allow "change" command to reset selection
  if (body.toLowerCase() === "change") {
    console.log("User requested project change");
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSelectedSiteIdforWhatsapp: null },
    });
    return new Response(
      `<Response><Message>
You have cleared your project selection.
Please choose your project by replying with the number:\n${siteList}
      </Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }

  // If user has not selected a site yet, or project was just reset
  if (!user.lastSelectedSiteIdforWhatsapp) {
    console.log("No project selected yet. Checking user input for project number...");
    const n = parseInt(body, 10);
    console.log(`User replied: "${body}", parsed as number:`, n);
    if (body && !isNaN(n) && n >= 1 && n <= user.Site.length) {
      const selectedSite = user.Site[n - 1];
      console.log(`Valid project selection: #${n} - ${selectedSite.name} (${selectedSite.id})`);
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSelectedSiteIdforWhatsapp: selectedSite.id },
      });
      console.log(`Updated user with selected projectId: ${selectedSite.id}`);
      // System confirmation message
      return new Response(
        `<Response><Message>
System message: You are currently talking to project "${selectedSite.name}". To change the project at any time, type "Change".
        </Message></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    } else {
      console.log("Invalid or missing project selection. Asking user to choose again.");
      return new Response(
        `<Response><Message>
Hi ${user.firstName || ""}! Please choose your project by replying with the number:\n${siteList}
        </Message></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }
  }

  // Now we have a selected project/site for this user
  const siteId = user.lastSelectedSiteIdforWhatsapp;
  console.log(`Continuing with selected projectId: ${siteId}`);

  // AUDIO MESSAGE HANDLING
  if (NumMedia === "1" && MediaContentType0 && MediaContentType0.startsWith("audio")) {
    console.log("Processing audio message...");
    const accountSid = process.env.TWILLIO_ACCOUNT_SID
    const authToken = process.env.TWILLIO_ACCOUNT_TOKEN
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const res = await fetch(MediaUrl0, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      }
    });

    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const filename = `voice-message-${Date.now()}.ogg`;

    await writeFile(filename, buf);
    console.log(`Saved voice message as ${filename}`);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcriptResult = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filename),
      model: "whisper-1",
      // language: "lv", // Uncomment for Latvian, etc
    });
    const transcript = transcriptResult.text || "(No text recognized)";
    console.log("Transcript:", transcript);

    const aiMessage = await talkToWhatsappAgent(transcript, siteId);
    console.log("AI message (audio):", aiMessage);

    return new Response(
      `<Response><Message>
      Transcription: ${transcript}
      AI message: ${aiMessage}
      </Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }

  // TEXT MESSAGE HANDLING
  if (NumMedia === "0") {
    console.log("Processing text message...");
    const aiMessage = await talkToWhatsappAgent(body, siteId);
    console.log("AI message (text):", aiMessage);
    return new Response(
      `<Response><Message>${aiMessage}</Message></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }

  // Fallback: not an audio message
  console.log("Fallback: Message type not recognized.");
  return new Response(
    `<Response><Message>Received your message!</Message></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}
