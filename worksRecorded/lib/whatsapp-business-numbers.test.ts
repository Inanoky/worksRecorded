const findUnique = jest.fn();
const update = jest.fn();
const findMany = jest.fn();
const sendUpdate = jest.fn();
const findFirst = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		whatsAppBusinessNumber: { findFirst },
		whatsAppTaskSendItem: { findUnique, findMany, update },
		whatsAppTaskSend: { update: sendUpdate },
	},
}));

import {
	getActiveWhatsAppBusinessNumber,
	persistWhatsAppTaskStatus,
	sanitizeInboundWhatsAppText,
} from "./whatsapp-business-numbers";

beforeEach(() => {
	jest.clearAllMocks();
});

it("loads only an active receiving-number mapping", async () => {
	findFirst.mockResolvedValue({ id: "number" });
	expect(await getActiveWhatsAppBusinessNumber("phone-id")).toEqual({
		id: "number",
	});
	expect(findFirst).toHaveBeenCalledWith({
		where: { businessPhoneNumberId: "phone-id", active: true },
	});
});

it("keeps visible inbound text and removes control characters", () => {
	expect(sanitizeInboundWhatsAppText("  A\u0000B\nC\tD\u007f  ")).toBe(
		"AB\nC\tD",
	);
	expect(sanitizeInboundWhatsAppText("\u0000\u0001")).toBeNull();
});

it("advances delivery status without downgrading", async () => {
	findUnique.mockResolvedValue({
		id: "item",
		status: "sent",
		sentAt: new Date("2026-10-20T10:00:00Z"),
	});
	expect(
		await persistWhatsAppTaskStatus({ id: "wamid.1", status: "delivered" }),
	).toBe(true);
	expect(update).toHaveBeenCalledWith({
		where: { id: "item" },
		data: expect.objectContaining({
			status: "delivered",
			deliveredAt: expect.any(Date),
		}),
	});

	update.mockClear();
	findUnique.mockResolvedValue({
		id: "item",
		status: "read",
		sentAt: new Date(),
	});
	expect(
		await persistWhatsAppTaskStatus({ id: "wamid.1", status: "delivered" }),
	).toBe(false);
	expect(update).not.toHaveBeenCalled();
});

it("records a terminal delivery failure and ignores unknown IDs", async () => {
	findUnique.mockResolvedValueOnce({
		id: "item",
		sendId: "send-1",
		status: "sent",
		sentAt: new Date(),
	});
	findMany.mockResolvedValue([{ status: "failed" }]);
	expect(
		await persistWhatsAppTaskStatus({
			id: "wamid.1",
			status: "failed",
			errors: [{ code: 131000 }],
		}),
	).toBe(true);
	expect(update).toHaveBeenCalledWith({
		where: { id: "item" },
		data: expect.objectContaining({
			status: "failed",
			failedAt: expect.any(Date),
			providerError: '[{"code":131000}]',
		}),
	});
	expect(sendUpdate).toHaveBeenCalledWith({
		where: { id: "send-1" },
		data: expect.objectContaining({
			status: "failed",
			completedAt: expect.any(Date),
		}),
	});

	findUnique.mockResolvedValueOnce(null);
	expect(
		await persistWhatsAppTaskStatus({ id: "missing", status: "sent" }),
	).toBe(false);

	update.mockClear();
	findUnique.mockResolvedValueOnce({
		id: "item",
		status: "read",
		sentAt: new Date(),
	});
	expect(
		await persistWhatsAppTaskStatus({ id: "wamid.1", status: "failed" }),
	).toBe(false);
	expect(update).not.toHaveBeenCalled();
});
