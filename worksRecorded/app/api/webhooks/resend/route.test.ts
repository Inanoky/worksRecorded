const mockVerify = jest.fn();
const mockEnqueueTgemInboundEmail = jest.fn();

jest.mock("next/server", () => ({
	NextResponse: {
		json: (body: unknown, init?: { status?: number }) => ({
			status: init?.status ?? 200,
			json: async () => body,
		}),
	},
}));

jest.mock("resend", () => ({
	Resend: jest.fn().mockImplementation(() => ({
		webhooks: { verify: (...args: unknown[]) => mockVerify(...args) },
	})),
}));

jest.mock("@/lib/tgem-invoice-approval/workflow-client", () => ({
	enqueueTgemInboundEmail: (...args: unknown[]) =>
		mockEnqueueTgemInboundEmail(...args),
}));

import { POST } from "@/app/api/webhooks/resend/route";

function webhookRequest() {
	const headers = new Map([
		["svix-id", "message-1"],
		["svix-timestamp", "1234567890"],
		["svix-signature", "signature-1"],
	]);
	return {
		headers: { get: (name: string) => headers.get(name) ?? null },
		text: async () => JSON.stringify({ type: "email.received" }),
	} as Request;
}

describe("Resend inbound webhook", () => {
	const previousSecret = process.env.RESEND_WEBHOOK_SECRET;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
	});

	afterAll(() => {
		if (previousSecret === undefined) {
			delete process.env.RESEND_WEBHOOK_SECRET;
		} else {
			process.env.RESEND_WEBHOOK_SECRET = previousSecret;
		}
	});

	it("verifies and queues an email without processing it inline", async () => {
		mockVerify.mockReturnValue({
			type: "email.received",
			data: { email_id: "email-1" },
		});
		mockEnqueueTgemInboundEmail.mockResolvedValue({ runId: "run-1" });

		const response = await POST(webhookRequest());

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ status: "queued" });
		expect(mockVerify).toHaveBeenCalledWith({
			payload: JSON.stringify({ type: "email.received" }),
			webhookSecret: "whsec_test",
			headers: {
				id: "message-1",
				timestamp: "1234567890",
				signature: "signature-1",
			},
		});
		expect(mockEnqueueTgemInboundEmail).toHaveBeenCalledWith("email-1");
	});

	it("rejects an invalid webhook signature", async () => {
		mockVerify.mockImplementation(() => {
			throw new Error("invalid signature");
		});

		const response = await POST(webhookRequest());

		expect(response.status).toBe(400);
		expect(mockEnqueueTgemInboundEmail).not.toHaveBeenCalled();
	});

	it("returns a retryable error when the queue is unavailable", async () => {
		mockVerify.mockReturnValue({
			type: "email.received",
			data: { email_id: "email-1" },
		});
		mockEnqueueTgemInboundEmail.mockRejectedValue(
			new Error("queue unavailable"),
		);

		const response = await POST(webhookRequest());

		expect(response.status).toBe(503);
	});
});
