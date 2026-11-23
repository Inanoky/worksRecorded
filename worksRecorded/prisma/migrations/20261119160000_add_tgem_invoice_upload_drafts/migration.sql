CREATE TABLE "TgemInvoiceUploadDraft" (
	"source" TEXT NOT NULL DEFAULT 'whatsapp',
  "id" TEXT NOT NULL,
  "activeKey" TEXT,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "businessPhoneNumberId" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'collecting',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "submissionMode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TgemInvoiceUploadDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TgemInvoiceUploadDraft_activeKey_key" ON "TgemInvoiceUploadDraft"("activeKey");
CREATE INDEX "TgemInvoiceUploadDraft_organizationId_userId_status_idx" ON "TgemInvoiceUploadDraft"("organizationId", "userId", "status");
ALTER TABLE "TgemInvoiceUploadDraft" ADD CONSTRAINT "TgemInvoiceUploadDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemInvoiceUploadDraft" ADD CONSTRAINT "TgemInvoiceUploadDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TgemInvoiceUploadDraft" ADD CONSTRAINT "TgemInvoiceUploadDraft_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TgemInvoiceDraftFile" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploading',
  "position" INTEGER NOT NULL DEFAULT 0,
  "storageKey" TEXT,
  "canonicalUrl" TEXT,
  "originalFilename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER,
  "sha256" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TgemInvoiceDraftFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TgemInvoiceDraftFile_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "TgemInvoiceUploadDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TgemInvoiceDraftFile_sourceKey_key" ON "TgemInvoiceDraftFile"("sourceKey");
CREATE INDEX "TgemInvoiceDraftFile_draftId_status_createdAt_idx" ON "TgemInvoiceDraftFile"("draftId", "status", "createdAt");

ALTER TABLE "TgemInvoiceCase" ADD COLUMN "uploadDraftId" TEXT, ADD COLUMN "primaryDocumentId" TEXT, ADD COLUMN "packageReviewRequired" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "packageReviewReason" TEXT;
CREATE INDEX "TgemInvoiceCase_uploadDraftId_idx" ON "TgemInvoiceCase"("uploadDraftId");
ALTER TABLE "TgemInvoiceCase" ADD CONSTRAINT "TgemInvoiceCase_uploadDraftId_fkey" FOREIGN KEY ("uploadDraftId") REFERENCES "TgemInvoiceUploadDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TgemInvoiceCase" ADD CONSTRAINT "TgemInvoiceCase_primaryDocumentId_fkey" FOREIGN KEY ("primaryDocumentId") REFERENCES "TgemInvoiceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TgemInvoiceDocument" ADD COLUMN "uploadDraftFileId" TEXT, ADD COLUMN "documentOrder" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "TgemInvoiceDocument_uploadDraftFileId_key" ON "TgemInvoiceDocument"("uploadDraftFileId");
ALTER TABLE "TgemInvoiceDocument" ADD CONSTRAINT "TgemInvoiceDocument_uploadDraftFileId_fkey" FOREIGN KEY ("uploadDraftFileId") REFERENCES "TgemInvoiceDraftFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
