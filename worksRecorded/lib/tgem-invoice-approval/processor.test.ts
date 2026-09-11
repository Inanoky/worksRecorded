import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";
import {
	getTgemInvoiceProcessor,
	processTgemInvoice,
} from "@/lib/tgem-invoice-approval/processor";

function result(
	provider: TgemInvoiceOcrResult["provider"],
): TgemInvoiceOcrResult {
	return { provider, pages: [], fields: {}, lineItems: [] };
}

describe("TGEM invoice processor selection", () => {
	it("uses OpenAI by default", async () => {
		const openAiProcessor = jest.fn().mockResolvedValue(result("openai"));
		const googleProcessor = jest
			.fn()
			.mockResolvedValue(result("google-document-ai"));

		await expect(
			processTgemInvoice(
				{ content: Buffer.from("invoice"), mimeType: "image/png" },
				{ env: {}, openAiProcessor, googleProcessor },
			),
		).resolves.toMatchObject({ provider: "openai" });
		expect(openAiProcessor).toHaveBeenCalledTimes(1);
		expect(googleProcessor).not.toHaveBeenCalled();
	});

	it("keeps Google available only when explicitly selected", async () => {
		const openAiProcessor = jest.fn().mockResolvedValue(result("openai"));
		const googleProcessor = jest
			.fn()
			.mockResolvedValue(result("google-document-ai"));

		await expect(
			processTgemInvoice(
				{ content: Buffer.from("invoice"), mimeType: "application/pdf" },
				{
					env: { TGEM_INVOICE_PROCESSOR: "google" },
					openAiProcessor,
					googleProcessor,
				},
			),
		).resolves.toMatchObject({ provider: "google-document-ai" });
		expect(googleProcessor).toHaveBeenCalledTimes(1);
		expect(openAiProcessor).not.toHaveBeenCalled();
	});

	it("rejects unknown processor names", () => {
		expect(() =>
			getTgemInvoiceProcessor({ TGEM_INVOICE_PROCESSOR: "unknown" }),
		).toThrow("Unsupported TGEM invoice processor");
	});
});
