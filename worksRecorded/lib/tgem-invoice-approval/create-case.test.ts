import { createTgemInvoiceCaseRecord } from "@/lib/tgem-invoice-approval/create-case";

describe("createTgemInvoiceCaseRecord", () => {
	it("uses the deterministic intake key for an idempotent upsert", async () => {
		const upsert = jest.fn().mockResolvedValue({ id: "case-1" });
		const database = { tgemInvoiceCase: { upsert } } as never;

		const input = {
			organizationId: "org-1",
			siteId: "site-1",
			submittedByUserId: "user-1",
			source: "whatsapp" as const,
			sourceMessageId: "wamid-1",
			sourceSender: "+37120000000",
			storageFile: { ufsUrl: "https://files.ufs.sh/f/invoice-1" },
			storageKey: "invoice-1",
			originalFilename: "invoice.pdf",
			contentType: "application/pdf",
		};

		await expect(createTgemInvoiceCaseRecord(database, input)).resolves.toEqual(
			{
				id: "case-1",
			},
		);
		await expect(createTgemInvoiceCaseRecord(database, input)).resolves.toEqual(
			{
				id: "case-1",
			},
		);

		expect(upsert).toHaveBeenCalledTimes(2);

		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idempotencyKey: "tgem-invoice:org-1:whatsapp:wamid-1" },
				update: {},
				create: expect.objectContaining({
					idempotencyKey: "tgem-invoice:org-1:whatsapp:wamid-1",
					organizationId: "org-1",
					siteId: "site-1",
					submittedByUserId: "user-1",
					documents: expect.objectContaining({ create: expect.any(Object) }),
					auditEvents: expect.objectContaining({ create: expect.any(Object) }),
				}),
			}),
		);
	});
});
