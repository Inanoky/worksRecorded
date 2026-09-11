const mockHandleSiteManagerRoute = jest.fn();
const mockHandleTgemInvoiceWhatsappRoute = jest.fn();

jest.mock("@/flows/default-construction/backend", () => ({
	handleSiteManagerRoute: (...args: unknown[]) =>
		mockHandleSiteManagerRoute(...args),
}));
jest.mock("@/flows/tgem-invoice-approval/backend", () => ({
	handleTgemInvoiceWhatsappRoute: (...args: unknown[]) =>
		mockHandleTgemInvoiceWhatsappRoute(...args),
}));

import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { routeRegisteredWhatsappUserByFlow } from "./registered-user-whatsapp-runtime-server";

describe("registered WhatsApp user flow routing", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("routes TGEM users only to the invoice flow", async () => {
		const args = {
			flowModuleKey: FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL,
			from: "whatsapp:+37120000000",
			formData: new FormData(),
			user: { id: "user-1" },
		};

		await expect(routeRegisteredWhatsappUserByFlow(args)).resolves.toBe(
			"tgem_invoice",
		);
		expect(mockHandleTgemInvoiceWhatsappRoute).toHaveBeenCalledWith(args);
		expect(mockHandleSiteManagerRoute).not.toHaveBeenCalled();
	});

	it.each([
		FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
		FLOW_MODULE_KEYS.DEFAULT_PRODUCTION,
		FLOW_MODULE_KEYS.ZTC_PRODUCTION,
	])("preserves the site-manager route for %s", async (flowModuleKey) => {
		const args = {
			flowModuleKey,
			from: "whatsapp:+37120000000",
			formData: new FormData(),
			user: { id: "user-1" },
		};

		await expect(routeRegisteredWhatsappUserByFlow(args)).resolves.toBe(
			"site_manager",
		);
		expect(mockHandleSiteManagerRoute).toHaveBeenCalledWith(args);
		expect(mockHandleTgemInvoiceWhatsappRoute).not.toHaveBeenCalled();
	});
});
