"use server";

import { prisma } from "@/app/utils/db";
import siteIdCheck from "@/components/AI/GmailWorkflow/siteIdCheck";
import gmailInvoiceAuditNarrative from "@/components/AI/GmailWorkflow/agent";

console.log("🔑 Loaded ENV vars:");
console.log({
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN,
});

const { google } = require("googleapis");

// --- Sanity check ---
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REFRESH_TOKEN) {
  console.error("❌ Missing Gmail API credentials in .env!");
  process.exit(1);
}

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

console.log("⚡ Setting up Gmail API auth...");
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost");
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// ---------- Helpers ----------
function decodeBase64Url(data: string): Buffer {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function getPlainText(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data).toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = getPlainText(part);
      if (text) return text;
    }
  }
  return "";
}

function collectPdfParts(payload: any, out: any[] = []) {
  if (!payload) return out;
  const isPdf = payload.mimeType === "application/pdf";
  const hasBody = payload.body && (payload.body.data || payload.body.attachmentId);

  if (isPdf && hasBody) out.push(payload);
  if (payload.parts) for (const p of payload.parts) collectPdfParts(p, out);
  return out;
}

// ---------- Types ----------
type EmailPayloadItem = {
  userId: string;
  email: string; // sender
  subject: string;
  body: string;
  pdfs: { filename: string; buffer: Buffer }[];
  messageId: string;
};

// ---------- Main ----------
async function buildPayloadFromUnread(): Promise<EmailPayloadItem[]> {
  console.log("📥 Polling for unread emails...");
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults: 50,
  });

  const messages = res.data.messages ?? [];
  console.log(`🔎 Found ${messages.length} unread email(s).`);

  const payload: EmailPayloadItem[] = [];

  for (const msg of messages) {
    const messageId = msg.id!;
    const full = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = full.data.payload?.headers || [];
    const fromHeader = headers.find((h: any) => h.name === "From")?.value || "";
    const emailMatch = fromHeader.match(/<(.+)>/);
    const senderEmail = (emailMatch ? emailMatch[1] : fromHeader).trim().toLowerCase();

    const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
    const bodyText = getPlainText(full.data.payload) || "";

    // 1) Check if sender exists in DB
    const user = await prisma.user.findFirst({ where: { email: senderEmail } });
    if (!user) continue;

    // 2) Find all PDF parts
    const pdfParts = collectPdfParts(full.data.payload);
    if (!pdfParts.length) continue;

    // 3) Download/collect PDFs into memory
    const pdfs: { filename: string; buffer: Buffer }[] = [];
    for (const part of pdfParts) {
      const filename = part.filename || "attachment.pdf";

      if (part.body?.data) {
        const buffer = decodeBase64Url(part.body.data);
        pdfs.push({ filename, buffer });
      } else if (part.body?.attachmentId) {
        const att = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: part.body.attachmentId,
        });
        const data = att.data.data as string | undefined;
        if (data) {
          const buffer = decodeBase64Url(data);
          pdfs.push({ filename, buffer });
        }
      }
    }

    if (!pdfs.length) continue;

    payload.push({
      userId: user.id,
      email: senderEmail,
      subject,
      body: bodyText,
      pdfs,
      messageId,
    });
  }

  return payload;
}

// ---------- Runner ----------
const payload = await buildPayloadFromUnread()
  .then((payload) => {
    console.log(`✅ Built payload with ${payload.length} item(s).`);
    for (const item of payload) {
      console.log("—");
      console.log(`👤 userId: ${item.userId}`);
      console.log(`📧 email: ${item.email}`);
      console.log(`✉️  subject: ${item.subject}`);
      console.log(`📜 body: ${item.body.slice(0, 80)}...`);
      console.log(`📎 pdfs: ${item.pdfs.length} file(s)`);
      console.log(`🆔 messageId: ${item.messageId}`);
    }
    return payload;
  })
  .catch((err) => {
    console.error("❌ Error polling Gmail:", err?.response?.data ?? err?.message ?? err);
    process.exit(1);
  });

const enriched = await siteIdCheck(payload);
console.log("🎯 Enriched payload:", enriched);


const results = await gmailInvoiceAuditNarrative(enriched);
console.log("📝 GPT audit results:", results);
