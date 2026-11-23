const mockDb = {
	tgemInvoiceCase: { findUnique: jest.fn() },
	tgemInvoiceUploadDraft: { findUnique: jest.fn() },
	tgemInvoiceAuditEvent: { findMany: jest.fn(), create: jest.fn() },
	$queryRaw: jest.fn(),
	$transaction: jest.fn(),
};
const mockSend = jest.fn();
jest.mock("@/lib/utils/db", () => ({ prisma: mockDb }));
jest.mock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
	sendMetaGraphMessage: (...args: unknown[]) => mockSend(...args),
}));

import { notifyTgemInvoiceProcessing } from "./processing-notification";

describe("TGEM WhatsApp processing completion", () => {
	let draft: ReturnType<typeof makeDraft>;
	let history: Array<{
		eventType: string;
		payload: Record<string, unknown>;
		createdAt: Date;
	}>;
	let inTransaction: boolean;
	function makeDraft() {
		return {
			source: "whatsapp",
			status: "submitted",
			organizationId: "org-1",
			businessPhoneNumberId: "business-1",
			sender: "whatsapp:+37120000000",
			updatedAt: new Date(),
			site: { name: "Projekts A" },
			invoices: [1, 2].map((number) => ({
				id: `case-${number}`,
				status: "in_approval",
				ocrStatus: "complete",
				extractionStatus: "complete",
				archivedAt: null as Date | null,
				packageReviewRequired: false,
				_count: { documents: 1 },
				auditEvents: [
					{
						eventType: "invoice_processing_job_finished",
						createdAt: new Date(Date.now() - 500),
					},
					{
						eventType: "invoice_processing_started",
						createdAt: new Date(Date.now() - 1000),
					},
				],
			})),
		};
	}
	beforeEach(() => {
		jest.resetAllMocks();
		draft = makeDraft();
		history = [];
		inTransaction = false;
		let queue = Promise.resolve();
		mockDb.$transaction.mockImplementation(
			(callback: (database: typeof mockDb) => Promise<unknown>) => {
				const current = queue.then(async () => {
					inTransaction = true;
					try {
						return await callback(mockDb);
					} finally {
						inTransaction = false;
					}
				});
				queue = current.then(
					() => undefined,
					() => undefined,
				);
				return current;
			},
		);
		mockDb.tgemInvoiceCase.findUnique.mockResolvedValue({
			source: "whatsapp",
			uploadDraftId: "draft-1",
		});
		mockDb.tgemInvoiceUploadDraft.findUnique.mockImplementation(
			async () => draft,
		);
		mockDb.tgemInvoiceAuditEvent.findMany.mockImplementation(async () =>
			[...history].reverse(),
		);
		mockDb.tgemInvoiceAuditEvent.create.mockImplementation(async ({ data }) => {
			const event = { ...data, createdAt: new Date() };
			history.push(event);
			return event;
		});
		mockSend.mockImplementation(async () => {
			expect(inTransaction).toBe(false);
			return {
				json: async () => ({ messages: [{ id: "wamid.confirmation" }] }),
			};
		});
	});

	it("waits for every separate invoice and sends one completion to the original channel", async () => {
		draft.invoices[1].status = "processing";
		draft.invoices[1].auditEvents = [
			{ eventType: "invoice_processing_started", createdAt: new Date() },
		];
		expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe(
			"waiting",
		);
		expect(mockSend).not.toHaveBeenCalled();
		draft.invoices[1].status = "in_approval";
		expect((await notifyTgemInvoiceProcessing("case-2")).outcome).toBe("sent");
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				businessPhoneNumberId: "business-1",
				recipient: "whatsapp:+37120000000",
				body: {
					type: "text",
					text: {
						body: expect.stringMatching(
							/Visi 2 dokumenti.*kā 2 atsevišķi rēķini.*Projekts A/,
						),
					},
				},
				signal: expect.any(Object),
			}),
		);
		expect(history.at(-1)).toMatchObject({
			eventType: "invoice_processing_notification_accepted",
			payload: expect.objectContaining({ metaMessageId: "wamid.confirmation" }),
		});
		expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe(
			"already_sent",
		);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	it("confirms all pages of a grouped invoice without presenting attachments as separate invoices", async () => {
		draft.invoices = [draft.invoices[0]];
		draft.invoices[0]._count.documents = 3;
		await notifyTgemInvoiceProcessing("case-1");
		expect(mockSend.mock.calls[0][0].body.text.body).toMatch(
			/Visi 3 dokumenti.*kā viens rēķins/,
		);
	});

	it("suppresses concurrent completion replies for the same draft", async () => {
		await Promise.all([
			notifyTgemInvoiceProcessing("case-1"),
			notifyTgemInvoiceProcessing("case-2"),
		]);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	it("can retry a failed notification without changing invoice processing", async () => {
		mockSend.mockRejectedValueOnce(new Error('Meta send failed: {"code":2}'));
		await expect(notifyTgemInvoiceProcessing("case-1")).rejects.toThrow(
			"Meta send failed",
		);
		expect(history.at(-1)).toMatchObject({
			eventType: "invoice_processing_notification_failed",
			payload: expect.objectContaining({ errorCode: "2" }),
		});
		expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe("sent");
		expect(mockSend).toHaveBeenCalledTimes(2);
	});

	it("does not send free-form messages after the submission service window expires", async () => {
		draft.updatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
		expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe(
			"window_expired",
		);
		expect(mockSend).not.toHaveBeenCalled();
	});

	it("reports a failed invoice instead of claiming the whole batch succeeded", async () => {
		draft.invoices[1].status = "failed_processing";
		draft.invoices[1].extractionStatus = "failed";
		await notifyTgemInvoiceProcessing("case-1");
		expect(mockSend.mock.calls[0][0].body.text.body).toContain(
			"Veiksmīgi apstrādāti rēķini: 1/2",
		);
		expect(mockSend.mock.calls[0][0].body.text.body).toContain(
			"Vienu rēķinu neizdevās apstrādāt",
		);
	});

	it("does not report a failure while another invoice is still eligible for processing retries", async () => {
		draft.invoices[1].status = "failed_processing";
		draft.invoices[1].auditEvents = [
			{ eventType: "invoice_processing_started", createdAt: new Date() },
		];
		expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe(
			"waiting",
		);
		expect(mockSend).not.toHaveBeenCalled();
		expect((await notifyTgemInvoiceProcessing("case-2", true)).outcome).toBe(
			"sent",
		);
	});

	it("sends an updated completion after a failed invoice is retried successfully", async () => {
		draft.invoices[1].status = "failed_processing";
		await notifyTgemInvoiceProcessing("case-1");
		draft.invoices[1].status = "in_approval";
		draft.invoices[1].auditEvents = [
			{ eventType: "invoice_processing_started", createdAt: new Date() },
		];
		expect((await notifyTgemInvoiceProcessing("case-2")).outcome).toBe("sent");
		expect(mockSend).toHaveBeenCalledTimes(2);
		expect(mockSend.mock.calls[1][0].body.text.body).toContain(
			"veiksmīgi apstrādāti",
		);
	});

	it.each(["dashboard", "email"])(
		"does not send WhatsApp completion messages for %s",
		async (source) => {
			mockDb.tgemInvoiceCase.findUnique.mockResolvedValue({
				source,
				uploadDraftId: "draft-1",
			});
			expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe(
				"not_applicable",
			);
			expect(mockSend).not.toHaveBeenCalled();
		},
	);

	it("recovers a notification claim whose sender stopped before completing", async () => {
		history.push({
			eventType: "invoice_processing_notification_claimed",
			payload: { attemptId: "old" },
			createdAt: new Date(Date.now() - 180_000),
		});
		expect((await notifyTgemInvoiceProcessing("case-1")).outcome).toBe("sent");
	});
});
