export type EnrichedEmailPayloadItem = {
  userId: string;
  email: string;
  subject: string;
  body: string;
  pdfs: { filename: string; buffer: Buffer }[]; // per-PDF state will pass a 1-length array
  siteId: string;
  messageId?: string;
};


export type AuditPdfRow = {
  messageId?: string;
  siteId: string;
  filename: string;
  summary: string;
  health: number;
};