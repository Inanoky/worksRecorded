CREATE TABLE "TgemInvoiceCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "submittedByUserId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceMessageId" TEXT,
    "sourceSender" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "ocrStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "invoiceNumber" TEXT,
    "supplierName" TEXT,
    "supplierRegistrationNo" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "currency" TEXT,
    "subtotal" DECIMAL(65,30),
    "vat" DECIMAL(65,30),
    "total" DECIMAL(65,30),
    "bankAccount" TEXT,
    "reference" TEXT,
    "validationSummary" JSONB,
    "extractionSummary" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TgemInvoiceCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceDocument" (
    "id" TEXT NOT NULL,
    "invoiceCaseId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'uploadthing',
    "storageKey" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER,
    "sha256" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TgemInvoiceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceOcrPage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "text" TEXT,
    "blocks" JSONB,
    "renderedImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TgemInvoiceOcrPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceCaseId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "unitPrice" DECIMAL(65,30),
    "total" DECIMAL(65,30),
    "currency" TEXT,
    "projectId" TEXT,
    "costCode" TEXT,
    "category" TEXT,
    "suggestedProjectId" TEXT,
    "suggestedCostCode" TEXT,
    "suggestedCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "sourceText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TgemInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceApprovalStep" (
    "id" TEXT NOT NULL,
    "invoiceCaseId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "approverUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "comment" TEXT,
    "dueAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TgemInvoiceApprovalStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TgemInvoiceAuditEvent" (
    "id" TEXT NOT NULL,
    "invoiceCaseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TgemInvoiceAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TgemInvoiceCase_idempotencyKey_key"
ON "TgemInvoiceCase"("idempotencyKey");

CREATE INDEX "TgemInvoiceCase_organizationId_status_createdAt_idx"
ON "TgemInvoiceCase"("organizationId", "status", "createdAt");

CREATE INDEX "TgemInvoiceCase_siteId_status_createdAt_idx"
ON "TgemInvoiceCase"("siteId", "status", "createdAt");

CREATE INDEX "TgemInvoiceCase_organizationId_source_sourceMessageId_idx"
ON "TgemInvoiceCase"("organizationId", "source", "sourceMessageId");

CREATE INDEX "TgemInvoiceDocument_invoiceCaseId_createdAt_idx"
ON "TgemInvoiceDocument"("invoiceCaseId", "createdAt");

CREATE INDEX "TgemInvoiceDocument_sha256_idx"
ON "TgemInvoiceDocument"("sha256");

CREATE UNIQUE INDEX "TgemInvoiceOcrPage_documentId_pageNumber_key"
ON "TgemInvoiceOcrPage"("documentId", "pageNumber");

CREATE INDEX "TgemInvoiceOcrPage_documentId_status_idx"
ON "TgemInvoiceOcrPage"("documentId", "status");

CREATE UNIQUE INDEX "TgemInvoiceLine_invoiceCaseId_lineNumber_key"
ON "TgemInvoiceLine"("invoiceCaseId", "lineNumber");

CREATE INDEX "TgemInvoiceLine_invoiceCaseId_projectId_idx"
ON "TgemInvoiceLine"("invoiceCaseId", "projectId");

CREATE INDEX "TgemInvoiceLine_invoiceCaseId_costCode_idx"
ON "TgemInvoiceLine"("invoiceCaseId", "costCode");

CREATE UNIQUE INDEX "TgemInvoiceApprovalStep_invoiceCaseId_stepOrder_key"
ON "TgemInvoiceApprovalStep"("invoiceCaseId", "stepOrder");

CREATE INDEX "TgemInvoiceApprovalStep_approverUserId_status_dueAt_idx"
ON "TgemInvoiceApprovalStep"("approverUserId", "status", "dueAt");

CREATE INDEX "TgemInvoiceAuditEvent_invoiceCaseId_createdAt_idx"
ON "TgemInvoiceAuditEvent"("invoiceCaseId", "createdAt");

CREATE INDEX "TgemInvoiceAuditEvent_organizationId_createdAt_idx"
ON "TgemInvoiceAuditEvent"("organizationId", "createdAt");

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceDocument"
ADD CONSTRAINT "TgemInvoiceDocument_invoiceCaseId_fkey"
FOREIGN KEY ("invoiceCaseId") REFERENCES "TgemInvoiceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceOcrPage"
ADD CONSTRAINT "TgemInvoiceOcrPage_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "TgemInvoiceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceLine"
ADD CONSTRAINT "TgemInvoiceLine_invoiceCaseId_fkey"
FOREIGN KEY ("invoiceCaseId") REFERENCES "TgemInvoiceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalStep"
ADD CONSTRAINT "TgemInvoiceApprovalStep_invoiceCaseId_fkey"
FOREIGN KEY ("invoiceCaseId") REFERENCES "TgemInvoiceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceApprovalStep"
ADD CONSTRAINT "TgemInvoiceApprovalStep_approverUserId_fkey"
FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceAuditEvent"
ADD CONSTRAINT "TgemInvoiceAuditEvent_invoiceCaseId_fkey"
FOREIGN KEY ("invoiceCaseId") REFERENCES "TgemInvoiceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceAuditEvent"
ADD CONSTRAINT "TgemInvoiceAuditEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TgemInvoiceAuditEvent"
ADD CONSTRAINT "TgemInvoiceAuditEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
