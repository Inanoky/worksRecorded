jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn(() => ({
		uploadFiles: jest.fn(),
	})),
}));

import { buildMetaMaterialLangSmithExtra } from "./metaImageHandler";

describe("Meta image material trace labels", () => {
	it("labels material image classification with workflow metadata and sender", () => {
		const extra = buildMetaMaterialLangSmithExtra({
			name: "MetaMaterialImageClassification",
			model: "gpt-test",
			publicUrl: "https://ufs.sh/f/invoice.jpg",
			context: {
				userId: "user-1",
				orgId: "org-1",
				siteId: "site-1",
				senderFirstName: "Janis",
				senderLastName: "Rumba",
				senderName: "Janis Rumba",
				senderInitials: "JR",
				senderLabel: "Janis Rumba",
			},
		});

		expect(extra.name).toBe("Meta Image Classification - Janis Rumba");
		expect(extra.tags).toEqual(expect.arrayContaining([
			"meta-image",
			"workflow:meta-material:image-classification",
			"message-type:image",
			"media-purpose:material_invoice",
			"sender:Janis-Rumba",
		]));
		expect(extra.tags).not.toContain("https://ufs.sh/f/invoice.jpg");
		expect(extra.metadata).toMatchObject({
			workflowId: "meta-material:image-classification",
			workflowName: "Meta material image classification",
			messageType: "image",
			mediaPurpose: "material_invoice",
			imageHost: "ufs.sh",
			senderLabel: "Janis Rumba",
		});
	});

	it("labels invoice extraction differently from classification", () => {
		const extra = buildMetaMaterialLangSmithExtra({
			name: "MetaMaterialInvoiceExtraction",
			model: "gpt-test",
			publicUrl: "https://ufs.sh/f/invoice.jpg",
			context: {
				userId: "user-1",
				orgId: "org-1",
				siteId: "site-1",
				senderLabel: "Janis Rumba",
			},
		});

		expect(extra.name).toBe("Meta Invoice Extraction - Janis Rumba");
		expect(extra.tags).toEqual(expect.arrayContaining([
			"invoice-extraction",
			"workflow:meta-material:invoice-extraction",
		]));
		expect(extra.metadata).toMatchObject({
			workflowId: "meta-material:invoice-extraction",
			workflowName: "Meta material invoice extraction",
		});
	});
});
