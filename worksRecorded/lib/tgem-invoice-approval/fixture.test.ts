import {
	getTgemInvoiceFixtureIdempotencyKey,
	isTgemInvoiceFixtureModeEnabled,
} from "@/lib/tgem-invoice-approval/fixture";

describe("TGEM invoice fixture mode", () => {
	const originalMode = process.env.TGEM_INVOICE_FIXTURE_MODE;

	afterEach(() => {
		if (originalMode === undefined) {
			delete process.env.TGEM_INVOICE_FIXTURE_MODE;
		} else {
			process.env.TGEM_INVOICE_FIXTURE_MODE = originalMode;
		}
	});

	it("is disabled unless explicitly enabled", () => {
		delete process.env.TGEM_INVOICE_FIXTURE_MODE;
		expect(isTgemInvoiceFixtureModeEnabled()).toBe(false);

		process.env.TGEM_INVOICE_FIXTURE_MODE = "true";
		expect(isTgemInvoiceFixtureModeEnabled()).toBe(true);
	});

	it("builds one deterministic fixture key per organization and site", () => {
		expect(getTgemInvoiceFixtureIdempotencyKey("org-1", "site-1")).toBe(
			"tgem-invoice-fixture:org-1:site-1",
		);
	});
});
