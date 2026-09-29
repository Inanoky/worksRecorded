import type { TgemInvoiceOcrResult } from "@/lib/tgem-invoice-approval/ocr-types";
import { resolveTgemInvoiceProject } from "@/lib/tgem-invoice-approval/project-resolution";

const projects = [
	{
		id: "site-a",
		name: "Riga Central",
		description: "Central office",
		subdirectory: "RC-100",
		bisCaseNumber: null,
		bisCaseName: null,
	},
	{
		id: "site-b",
		name: "Jelgava Warehouse",
		description: "Warehouse",
		subdirectory: "JW-200",
		bisCaseNumber: null,
		bisCaseName: null,
	},
];

function result(text: string): TgemInvoiceOcrResult {
	return {
		provider: "openai",
		pages: [
			{
				pageNumber: 1,
				width: null,
				height: null,
				text,
				blocks: [],
				status: "complete",
			},
		],
		fields: {},
		lineItems: [],
	};
}

describe("resolveTgemInvoiceProject", () => {
	it("auto-assigns a clear exact email match", async () => {
		const resolved = await resolveTgemInvoiceProject({
			projects,
			sourceContext: { subject: "Invoice for RC-100" },
			result: result("Invoice"),
			transport: async () => ({ candidates: [], conflictDetected: false }),
		});

		expect(resolved.selectedSiteId).toBe("site-a");
		expect(resolved.confidence).toBe(0.99);
	});

	it("leaves close candidates unassigned", async () => {
		const resolved = await resolveTgemInvoiceProject({
			projects,
			sourceContext: { subject: "Invoice" },
			result: result("Invoice"),
			transport: async () => ({
				candidates: [
					{
						siteId: "site-a",
						confidence: 0.9,
						evidence: ["email_description"],
					},
					{
						siteId: "site-b",
						confidence: 0.82,
						evidence: ["document_address"],
					},
				],
				conflictDetected: false,
			}),
		});

		expect(resolved.selectedSiteId).toBeNull();
		expect(resolved.summary.reason).toBe("insufficient_margin");
	});

	it("leaves a best candidate below the confidence threshold unassigned", async () => {
		const resolved = await resolveTgemInvoiceProject({
			projects,
			sourceContext: { description: "Possibly the Riga project" },
			result: result("Invoice"),
			transport: async () => ({
				candidates: [
					{
						siteId: "site-a",
						confidence: 0.84,
						evidence: ["email_description"],
					},
				],
				conflictDetected: false,
			}),
		});

		expect(resolved.selectedSiteId).toBeNull();
		expect(resolved.summary.reason).toBe("low_confidence");
	});

	it("leaves conflicting strong evidence unassigned", async () => {
		const resolved = await resolveTgemInvoiceProject({
			projects,
			sourceContext: { subject: "RC-100" },
			result: result("Deliver to JW-200"),
			transport: async () => ({ candidates: [], conflictDetected: false }),
		});

		expect(resolved.selectedSiteId).toBeNull();
		expect(resolved.summary.reason).toBe("conflicting_evidence");
	});

	it("rejects model project IDs outside the organization candidate list", async () => {
		const resolved = await resolveTgemInvoiceProject({
			projects,
			sourceContext: {},
			result: result("Invoice"),
			transport: async () => ({
				candidates: [
					{
						siteId: "foreign-site",
						confidence: 1,
						evidence: ["document_project_code"],
					},
				],
				conflictDetected: false,
			}),
		});

		expect(resolved.selectedSiteId).toBeNull();
	});

	it("does not auto-assign from sender evidence alone", async () => {
		const resolved = await resolveTgemInvoiceProject({
			projects,
			sourceContext: { sender: "supplier@example.com" },
			result: result("Invoice"),
			transport: async () => ({
				candidates: [
					{
						siteId: "site-a",
						confidence: 0.98,
						evidence: ["email_sender"],
					},
				],
				conflictDetected: false,
			}),
		});

		expect(resolved.selectedSiteId).toBeNull();
		expect(resolved.summary.reason).toBe("insufficient_evidence");
	});
});
