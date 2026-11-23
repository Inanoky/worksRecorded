jest.mock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
	sendMetaGraphMessage: jest.fn(),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
	getMetaReplyContext: jest.fn(),
	sendMessage: jest.fn(),
}));

import type { TgemUploadDraft } from "@/lib/tgem-invoice-approval/upload-drafts";
import { sendMetaGraphMessage } from "@/lib/utils/whatsapp-helpers/meta/sender";
import {
	getMetaReplyContext,
	sendMessage,
} from "@/lib/utils/whatsapp-helpers/shared/sender";
import {
	parseTgemDraftButton,
	sendTgemDraftReply,
	tgemDraftReply,
} from "./draft-messages";

const draft = (count: number, pending = 0) =>
	({
		id: "00000000-0000-4000-8000-000000000001",
		revision: 8,
		status: "collecting",
		source: "whatsapp",
		files: [
			...Array.from({ length: count }, () => ({ status: "ready" })),
			...Array.from({ length: pending }, () => ({ status: "uploading" })),
		],
	}) as TgemUploadDraft;

describe("Latvian TGEM draft choices", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest
			.mocked(getMetaReplyContext)
			.mockReturnValue({ businessPhoneNumberId: "business-1" });
	});
	it.each([1, 2, 4, 10])(
		"offers one-click processing for %s saved documents",
		(count) => {
			const reply = tgemDraftReply(draft(count), "Projekts A");
			expect(reply.text).toContain("Projekts A");
			expect(reply.text).toContain(`${count}/10`);
			expect(reply.buttons.map((button) => button.title)).toEqual([
				"Apstrādāt",
			]);
			for (const button of reply.buttons) {
				expect(button.title.length).toBeLessThanOrEqual(20);
				expect(button.id.length).toBeLessThanOrEqual(256);
				expect(parseTgemDraftButton(button.id)).toMatchObject({ revision: 8 });
			}
			expect(reply.text).toContain("Apstrāde vēl nav sākta");
			expect(reply.text).toContain("kopā kā viens rēķins");
			if (count === 10)
				expect(reply.text).toContain("Sasniegts 10 dokumentu limits");
			else expect(reply.text).toContain("vienkārši nosūtiet nākamo failu");
		},
	);

	it("waits for pending uploads before offering processing", () => {
		const reply = tgemDraftReply(draft(2, 1), "Projekts A");
		expect(reply.buttons).toEqual([]);
		expect(reply.text).toContain("Vēl tiek saglabāts 1 dokuments");
	});

	it("sends native interactive reply buttons with a structured draft ID", async () => {
		jest
			.mocked(getMetaReplyContext)
			.mockReturnValue({ businessPhoneNumberId: "business-1" });
		await sendTgemDraftReply("+37120000000", draft(1), "Projekts A");
		expect(sendMetaGraphMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				businessPhoneNumberId: "business-1",
				recipient: "+37120000000",
				body: {
					type: "interactive",
					interactive: {
						type: "button",
						body: { text: expect.any(String) },
						action: {
							buttons: [
								{
									type: "reply",
									reply: {
										id: "tgem:00000000-0000-4000-8000-000000000001:8:submit",
										title: "Apstrādāt",
									},
								},
							],
						},
					},
				},
			}),
		);
	});

	it("offers a working text command when Meta rejects interactive buttons", async () => {
		jest
			.mocked(sendMetaGraphMessage)
			.mockRejectedValueOnce(new Error("Meta send rejected"));
		await sendTgemDraftReply("+37120000000", draft(1), "Projekts A");
		expect(sendMessage).toHaveBeenCalledWith(
			"+37120000000",
			expect.stringContaining("Varat arī rakstīt: Apstrādāt."),
		);
	});

	it("uses a text acknowledgement while uploads are pending", async () => {
		await sendTgemDraftReply("+37120000000", draft(2, 1), "Projekts A");
		expect(sendMetaGraphMessage).not.toHaveBeenCalled();
		expect(sendMessage).toHaveBeenCalledWith(
			"+37120000000",
			expect.stringContaining("Vēl tiek saglabāts 1 dokuments"),
		);
	});

	it("keeps the reply inside Meta's body limit for long project names", () => {
		expect(
			tgemDraftReply(draft(10), "P".repeat(2000)).text.length,
		).toBeLessThanOrEqual(1024);
	});

	it.each([
		"",
		"tgem:other:1:submit",
		"tgem:00000000-0000-4000-8000-000000000001:9007199254740992:submit",
		"tgem:00000000-0000-4000-8000-000000000001:1:delete",
		"tgem:00000000-0000-4000-8000-000000000001:1:cancel",
	])("rejects invalid button %s", (value) => {
		expect(parseTgemDraftButton(value)).toBeNull();
	});
});
