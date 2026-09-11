const mockSendMessage = jest.fn();
const mockGetOrganizationLanguageByUserId = jest.fn();

jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
	sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: (...args: unknown[]) =>
		mockGetOrganizationLanguageByUserId(...args),
}));

import { handleTgemInvoiceWhatsappRoute } from "./whatsapp-route";

describe("TGEM WhatsApp isolation handler", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetOrganizationLanguageByUserId.mockResolvedValue("lv");
	});

	it("directs the user to the TGEM dashboard without processing media", async () => {
		const formData = new FormData();
		formData.set("NumMedia", "1");
		formData.set("MediaContentType0", "image/jpeg");

		await handleTgemInvoiceWhatsappRoute({
			from: "whatsapp:+37120000000",
			formData,
			user: { id: "user-1" },
		});

		expect(mockGetOrganizationLanguageByUserId).toHaveBeenCalledWith("user-1");
		expect(mockSendMessage).toHaveBeenCalledWith(
			"whatsapp:+37120000000",
			"Rēķinu augšupielāde WhatsApp vēl nav pieejama. Lūdzu, augšupielādējiet rēķinu TGEM panelī.",
		);
	});
});
