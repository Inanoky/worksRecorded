import {
	buildTgemInvoiceIntakeTraceInput,
	buildTgemInvoiceLangSmithConfig,
	buildTgemInvoiceProcessingTraceInput,
	buildTgemInvoiceProcessingTraceOutput,
} from "@/lib/tgem-invoice-approval/langsmith";

describe("TGEM invoice LangSmith tracing", () => {
	it("labels WhatsApp and web traces with one searchable workflow shape", () => {
		expect(
			buildTgemInvoiceLangSmithConfig({
				stage: "request",
				source: "whatsapp",
			}),
		).toMatchObject({
			name: "TGEM WhatsApp Invoice Request",
			tags: expect.arrayContaining([
				"flow:tgem-invoice-approval",
				"workflow:tgem-invoice:request",
				"source:whatsapp",
				"channel:whatsapp",
			]),
			metadata: {
				app: "works-recorded",
				flow: "tgem-invoice-approval",
				workflowId: "tgem-invoice:request",
				source: "whatsapp",
				channel: "whatsapp",
			},
		});
		expect(
			buildTgemInvoiceLangSmithConfig({
				stage: "intake",
				source: "dashboard",
			}),
		).toMatchObject({
			name: "TGEM Web Invoice Intake",
			tags: expect.arrayContaining(["source:dashboard", "channel:dashboard"]),
		});
	});

	it("sends correlation metadata without document content or storage secrets", () => {
		const intake = buildTgemInvoiceIntakeTraceInput({
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: "user-1",
			source: "whatsapp",
			sourceMessageId: "wamid-secret",
			storageKey: "storage-secret",
			contentType: "application/pdf",
			byteSize: 2_048,
		});
		const processing = buildTgemInvoiceProcessingTraceInput({
			invoiceCaseId: "case-1",
			documentId: "document-1",
			organizationId: "org-1",
			siteId: "site-1",
			actorUserId: "user-1",
			actorType: "whatsapp",
			source: "whatsapp",
			content: Buffer.from("private invoice bytes"),
			contentType: "application/pdf",
		});

		expect(intake).toEqual({
			organizationId: "org-1",
			siteId: "site-1",
			userId: "user-1",
			source: "whatsapp",
			contentType: "application/pdf",
			byteSize: 2_048,
			hasSourceMessageId: true,
			hasStorageKey: true,
		});
		expect(processing).toMatchObject({
			invoiceCaseId: "case-1",
			documentId: "document-1",
			byteSize: Buffer.byteLength("private invoice bytes"),
			contentAccess: "buffer",
		});
		expect(JSON.stringify({ intake, processing })).not.toContain("secret");
		expect(JSON.stringify(processing)).not.toContain("private invoice bytes");
	});

	it("summarizes processing results without extracted invoice fields", () => {
		expect(
			buildTgemInvoiceProcessingTraceOutput({
				provider: "openai",
				pageCount: 2,
				lineItemCount: 8,
				warningCount: 1,
				fields: { bankAccount: "LV00PRIVATE" },
			}),
		).toEqual({
			provider: "openai",
			pageCount: 2,
			lineItemCount: 8,
			warningCount: 1,
		});
	});
});
