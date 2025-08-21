// app/poller/pollGmail.ts
"use server";

/**
 * Flow (per PDF state):
 *  1) Build PdfState[] from unread Gmail (one state per PDF)
 *  2) Enrich that state with siteId (siteIdCheck)
 *  3) Audit that single PDF (gmailInvoiceAuditNarrative with one-item payload)
 *  4) Upload PDF to Uploadthing (UTApi) → url
 *  5) Save to DB (saveInvoiceToFromGmailDB) with siteId + url + health + auditSummary
 *  6) After all PDFs of an email are saved → mark that email as READ
 */

import { prisma } from "@/app/utils/db";
import siteIdCheck from "@/components/AI/GmailWorkflow/siteIdCheck";
import gmailInvoiceAuditNarrative from "@/components/AI/GmailWorkflow/agent";
import { UTApi } from "uploadthing/server";
import { saveInvoiceToFromGmailDB } from "@/app/actions";

// If your runtime doesn't expose File globally, uncomment:
// import { File } from "undici";

// --------- Basic env + Gmail client setup (unchanged) ---------
console.log("🔑 Loaded ENV vars:");
console.log({
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN,
});

const { google } = require("googleapis");
const utapi = new UTApi();

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REFRESH_TOKEN) {
  console.error("❌ Missing Gmail API credentials in .env!");
  process.exit(1);
}

const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN!;

console.log("⚡ Setting up Gmail API auth...");
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "http://localhost");
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// --------- Types ---------

// ⬇️ Per-PDF processing state
type PdfState = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdf: { filename: string; buffer: Buffer }; // single PDF for this state
  messageId: string;
  siteId: string;                 // filled by enrichment
  url?: string;                   // filled after Uploadthing
  health?: number | null;         // filled by audit
  auditSummary?: string;          // filled by audit
};

// --------- Helpers: upload + MIME decoding + PDF collection ---------

/** Upload one PDF buffer to Uploadthing using UTApi. Returns the public URL and logs it. */
async function uploadPdfAndReturnUrl(filename: string, buffer: Buffer): Promise<string> {
  const file = new File([buffer], filename, { type: "application/pdf" });
  const res = await utapi.uploadFiles(file);
  if (!res?.data?.url) throw new Error(`❌ Uploadthing failed for ${filename}`);
  console.log(`☁️ Uploaded ${filename} → ${res.data.url}`);
  return res.data.url;
}

/** Gmail base64url → Buffer */
function decodeBase64Url(data: string): Buffer {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

/** Extract the first text/plain body from a Gmail message payload */
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

/** Recursively collect all PDF parts (inline or attachment) from a Gmail payload */
function collectPdfParts(payload: any, out: any[] = []) {
  if (!payload) return out;
  const isPdf = payload.mimeType === "application/pdf";
  const hasBody = payload.body && (payload.body.data || payload.body.attachmentId);
  if (isPdf && hasBody) out.push(payload);
  if (payload.parts) for (const p of payload.parts) collectPdfParts(p, out);
  return out;
}

/** Mark a Gmail message as READ (remove UNREAD label). */
async function markMessageRead(messageId: string) {
  try {
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
    console.log(`📬 Marked message as READ → ${messageId}`);
  } catch (e) {
    console.error(`❌ Failed to mark message as READ (${messageId}):`, e?.message ?? e);
  }
}

// --------- Gmail fetch (unchanged) ---------

type EmailPayloadItem = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdfs: { filename: string; buffer: Buffer }[];
  messageId: string;
};

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

    // Only process emails from users that exist in your DB
    const user = await prisma.user.findFirst({ where: { email: senderEmail } });
    if (!user) continue;

    // Collect all PDF parts (inline or attachments)
    const pdfParts = collectPdfParts(full.data.payload);
    if (!pdfParts.length) continue;

    // Download PDFs
    const pdfs: { filename: string; buffer: Buffer }[] = [];
    for (const part of pdfParts) {
      const filename = part.filename || "attachment.pdf";

      if (part.body?.data) {
        // Inline base64 data
        const buffer = decodeBase64Url(part.body.data);
        pdfs.push({ filename, buffer });
      } else if (part.body?.attachmentId) {
        // Separate attachment endpoint
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

// --------- Expand to per-PDF states ---------

function expandToPdfStates(items: EmailPayloadItem[]): PdfState[] {
  const states: PdfState[] = [];
  for (const it of items) {
    for (const pdf of it.pdfs) {
      states.push({
        userId: it.userId,
        email: it.email,
        subject: it.subject,
        body: it.body,
        pdf, // single PDF
        messageId: it.messageId,
        siteId: "not_set", // to be filled
        url: undefined,
        health: null,
        auditSummary: "",
      });
    }
  }
  return states;
}

// --------- Single-state processors (enrich → audit → upload → save) ---------

async function enrichState(state: PdfState): Promise<PdfState> {
  // Call siteIdCheck with a single-item array; pass only THIS pdf
  const enriched = await siteIdCheck([
    {
      userId: state.userId,
      email: state.email,
      subject: state.subject,
      body: state.body,
      pdfs: [state.pdf],
      siteId: "not_found",
      messageId: state.messageId,
    },
  ]);

  const siteId = enriched?.[0]?.siteId ?? "not_found";
  return { ...state, siteId };
}

async function auditState(state: PdfState): Promise<PdfState> {
  // Call gmailInvoiceAuditNarrative with one item (only THIS pdf)
  const raw = await gmailInvoiceAuditNarrative([
    {
      userId: state.userId,
      email: state.email,
      subject: state.subject,
      body: state.body,
      pdfs: [state.pdf],
      siteId: state.siteId,
      messageId: state.messageId,
    },
  ]);

  // Normalize: function may return object[] or JSON string
  const arr = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  const row = arr?.[0] ?? {};

  // Some versions use `summary`, others `auditSummary`
  const summary: string = row.summary ?? row.auditSummary ?? "";
  const healthVal = row.health != null ? Number(row.health) : NaN;
  const health: number | null = Number.isFinite(healthVal) ? healthVal : null;

  return { ...state, auditSummary: summary, health };
}

async function uploadState(state: PdfState): Promise<PdfState> {
  const url = await uploadPdfAndReturnUrl(state.pdf.filename, state.pdf.buffer);
  return { ...state, url };
}

async function saveState(state: PdfState): Promise<void> {
  const formData = new FormData();
  formData.append("siteId", state.siteId ?? "not_found");
    formData.append("userId", state.userId);                              // ⬅️ NEW
  formData.append("fileUrls", JSON.stringify([state.url]));     // single-PDF array
  formData.append("health", state.health != null ? String(state.health) : "");
  formData.append("auditSummary", state.auditSummary ?? "");
  await saveInvoiceToFromGmailDB(undefined, formData);
}

// --------- Runner: process all states sequentially (N×Z) ---------

const emailPayload = await buildPayloadFromUnread()
  .then((items) => {
    console.log(`✅ Built payload with ${items.length} email item(s).`);
    for (const it of items) {
      console.log("—");
      console.log(`👤 userId: ${it.userId}`);
      console.log(`📧 email: ${it.email}`);
      console.log(`✉️  subject: ${it.subject}`);
      console.log(`📜 body: ${it.body.slice(0, 80)}...`);
      console.log(`📎 pdfs: ${it.pdfs.length} file(s)`);
      console.log(`🆔 messageId: ${it.messageId}`);
    }
    return items;
  })
  .catch((err) => {
    console.error("❌ Error polling Gmail:", err?.response?.data ?? err?.message ?? err);
    process.exit(1);
  });

// Build per-PDF states
let states = expandToPdfStates(emailPayload);
console.log(`🧩 Expanded to ${states.length} per-PDF state(s).`);

// 🆕 Track totals & progress per email to mark as READ when done
const totalPdfsByMessage = new Map<string, number>();
for (const it of emailPayload) totalPdfsByMessage.set(it.messageId, it.pdfs.length);

const savedPdfsByMessage = new Map<string, number>();
const markedAsRead = new Set<string>();

// Process each state in order (sequential N×Z)
let idx = 0;
for (const original of states) {
  idx += 1;
  console.log(`\n▶️  [${idx}/${states.length}] Processing PDF: ${original.pdf.filename}`);

  try {
    const s1 = await enrichState(original);
    console.log(`   🎯 siteId = ${s1.siteId}`);

    const s2 = await auditState(s1);
    console.log(`   🩺 health = ${s2.health ?? "n/a"}`);
    if (s2.auditSummary) console.log(`   📝 summary: ${s2.auditSummary.slice(0, 140)}…`);

    const s3 = await uploadState(s2);
    console.log(`   🔗 url = ${s3.url}`);

    await saveState(s3);
    console.log("   💾 saved to DB");

    // ✅ After a successful save, update per-message progress
    const msgId = s3.messageId;
    const saved = (savedPdfsByMessage.get(msgId) ?? 0) + 1;
    savedPdfsByMessage.set(msgId, saved);

    const total = totalPdfsByMessage.get(msgId) ?? 0;
    if (saved >= total && !markedAsRead.has(msgId)) {
      // All PDFs for this email saved → mark message as READ
      await markMessageRead(msgId);
      markedAsRead.add(msgId);
    }
  } catch (err) {
    console.error("   ❌ Failed processing this PDF:", err);
    // Do NOT increment saved count here; email remains UNREAD if not all PDFs succeeded.
  }
}

console.log("✅ Completed per-PDF workflow.");
