ALTER TABLE "TgemInvoiceCase"
DROP CONSTRAINT "TgemInvoiceCase_invoiceType_check";

ALTER TABLE "TgemInvoiceCase"
ADD CONSTRAINT "TgemInvoiceCase_invoiceType_check"
CHECK ("invoiceType" IN ('credit', 'debit', 'receipt'));
