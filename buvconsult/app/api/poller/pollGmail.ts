// app/poller/pollGmail.ts
"use server";

import { prisma } from "@/lib/utils/db";
import siteIdCheck from "@/server/ai-flows/agents/gmail-workflow-agent/site-id-check";
import gmailInvoiceAuditNarrative from "@/server/ai-flows/agents/gmail-workflow-agent/agent";
import { UTApi } from "uploadthing/server";
import { saveInvoiceToFromGmailDB } from "@/server/actions/shared-actions";
import { releaseLock,tryAcquireLock } from "@/app/api/poller/cronLock";

// If your runtime doesn't expose File globally, uncomment:
// import { File } from "undici";

const { google } = require("googleapis");
const utapi = new UTApi();

// ---------- Gmail auth (module-scoped, reused across invocations) ----------
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REFRESH_TOKEN) {
  throw new Error("Missing Gmail API credentials in env");
}
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "http://localhost"
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// ---------- Types ----------
type PdfState = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdf: { filename: string; buffer: Buffer };
  messageId: string;
  siteId: string;
  url?: string;
  health?: number | null;
  auditSummary?: string;
};

type EmailPayloadItem = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdfs: { filename: string; buffer: Buffer }[];
  messageId: string;
};

// ---------- Helpers ----------
const PDF_EXT_RE = /\.pdf$/i;
function ensurePdfFilename(name?: string) {
  const base = (name || "invoice.pdf").split(/[\\/]/).pop() || "invoice.pdf";
  if (!PDF_EXT_RE.test(base)) {
    const dot = base.lastIndexOf(".");
    const stem = dot >= 0 ? base.slice(0, dot) : base;
    return `${stem}.pdf`;
  }
  return base.replace(/\.pdf$/i, ".pdf");
}

async function uploadPdfAndReturnUrl(filename: string, buffer: Buffer): Promise<string> {
  const safeName = ensurePdfFilename(filename);
  const file = new File([buffer], safeName, { type: "application/pdf" });
  const res = await utapi.uploadFiles(file);
  if (!res?.data?.url) throw new Error(`Uploadthing failed for ${safeName}`);
  return res.data.url;
}

function decodeBase64Url(data: string): Buffer {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function getPlainText(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data).toString("utf-8");
  }
  if (payload.parts) for (const p of payload.parts) {
    const t = getPlainText(p);
    if (t) return t;
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

async function markMessageRead(messageId: string) {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

async function verifySaved(url: string, siteId: string): Promise<boolean> {
  const count = await prisma.invoices.count({ where: { url, SiteId: siteId } });
  return count > 0;
}

// ---------- Gmail fetch ----------
async function buildPayloadFromUnread(): Promise<EmailPayloadItem[]> {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread", // TIP: you can narrow with 'newer_than:5m' if needed
    maxResults: 50,
  });

  const messages = res.data.messages ?? [];
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

    const user = await prisma.user.findFirst({ where: { email: senderEmail } });
    if (!user) continue;

    const pdfParts = collectPdfParts(full.data.payload);
    if (!pdfParts.length) continue;

    const pdfs: { filename: string; buffer: Buffer }[] = [];
    for (const part of pdfParts) {
      const filename = ensurePdfFilename(part.filename || "attachment.pdf");
      if (part.body?.data) {
        pdfs.push({ filename, buffer: decodeBase64Url(part.body.data) });
      } else if (part.body?.attachmentId) {
        const att = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId,
          id: part.body.attachmentId,
        });
        const data = att.data.data as string | undefined;
        if (data) pdfs.push({ filename, buffer: decodeBase64Url(data) });
      }
    }
    if (!pdfs.length) continue;

    payload.push({ userId: user.id, email: senderEmail, subject, body: bodyText, pdfs, messageId });
  }

  return payload;
}

function expandToPdfStates(items: EmailPayloadItem[]): PdfState[] {
  const states: PdfState[] = [];
  for (const it of items) for (const pdf of it.pdfs) {
    states.push({
      userId: it.userId,
      email: it.email,
      subject: it.subject,
      body: it.body,
      pdf,
      messageId: it.messageId,
      siteId: "not_set",
      url: undefined,
      health: null,
      auditSummary: "",
    });
  }
  return states;
}

async function enrichState(state: PdfState): Promise<PdfState> {
  const enriched = await siteIdCheck([
    { userId: state.userId, email: state.email, subject: state.subject, body: state.body, pdfs: [state.pdf], siteId: "not_found", messageId: state.messageId },
  ]);
  const siteId = enriched?.[0]?.siteId ?? "not_found";
  return { ...state, siteId };
}

async function auditState(state: PdfState): Promise<PdfState> {
  const raw = await gmailInvoiceAuditNarrative([
    { userId: state.userId, email: state.email, subject: state.subject, body: state.body, pdfs: [state.pdf], siteId: state.siteId, messageId: state.messageId },
  ]);
  const arr = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  const row = arr?.[0] ?? {};
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
  formData.append("userId", state.userId);
  formData.append("fileUrls", JSON.stringify([state.url]));
  formData.append("health", state.health != null ? String(state.health) : "");
  formData.append("auditSummary", state.auditSummary ?? "");
  await saveInvoiceToFromGmailDB(undefined, formData);
  const ok = await verifySaved(state.url!, state.siteId);
  if (!ok) throw new Error(`DB save verification failed for url=${state.url} siteId=${state.siteId}`);
}

// ---------- Exported runner ----------
// ---------- Exported runner ----------
export async function runPoller() {
  const got = await tryAcquireLock();

  if (!got) {
    console.log("Poller skipped (already running)");
    return { skipped: true };
  }

  try {
    const emailPayload = await buildPayloadFromUnread();

    const states = expandToPdfStates(emailPayload);
    const totalPdfsByMessage = new Map<string, number>();
    for (const it of emailPayload) {
      totalPdfsByMessage.set(it.messageId, it.pdfs.length);
    }

    // fire ALL pdfs in parallel
    const results = await Promise.all(
      states.map(async (original) => {
        try {
          const s1 = await enrichState(original);
          const s2 = await auditState(s1);
          const s3 = await uploadState(s2);
          await saveState(s3);

          return {
            messageId: s3.messageId,
            success: true as const,
          };
        } catch (err) {
          console.error("Poller PDF failure:", (err as any)?.message ?? err);
          return {
            messageId: original.messageId,
            success: false as const,
          };
        }
      })
    );

    // aggregate per message
    const savedPdfsByMessage = new Map<string, number>();
    const failedPdfsByMessage = new Map<string, number>();

    for (const r of results) {
      if (r.success) {
        savedPdfsByMessage.set(
          r.messageId,
          (savedPdfsByMessage.get(r.messageId) ?? 0) + 1
        );
      } else {
        failedPdfsByMessage.set(
          r.messageId,
          (failedPdfsByMessage.get(r.messageId) ?? 0) + 1
        );
      }
    }

    // mark messages read if all PDFs for that message were saved successfully
    let markedRead = 0;
    for (const [messageId, total] of totalPdfsByMessage.entries()) {
      const saved = savedPdfsByMessage.get(messageId) ?? 0;
      const failed = failedPdfsByMessage.get(messageId) ?? 0;

      if (saved >= total && failed === 0) {
        await markMessageRead(messageId);
        markedRead += 1;
      }
    }

    const processed = results.length;
    const savedTotal = results.filter((r) => r.success).length;
    const failedTotal = results.filter((r) => !r.success).length;

    return {
      emails: emailPayload.length,
      pdfs: states.length,
      processed,
      saved: savedTotal,
      failed: failedTotal,
      markedRead,
    };
  } finally {
    await releaseLock();
  }
}

