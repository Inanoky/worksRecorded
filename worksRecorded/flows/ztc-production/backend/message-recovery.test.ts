import { prisma } from "@/lib/utils/db";
import { sendMetaGraphMessage } from "@/lib/utils/whatsapp-helpers/meta/sender";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
	retainZtcMessageFormData,
	retainZtcUploadedMedia,
	runWithZtcMessageRecovery,
	ZTC_MESSAGE_BUDGET_MS,
	ZTC_TECHNICAL_FAILURE_REPLY,
	ZtcMessageRetentionError,
} from "./message-recovery";
import {
	assertZtcMessageActive,
	getZtcMessageRecoveryContext,
	markZtcRecoveryAwaitingBatch,
	setZtcRecoveryBatch,
	ZtcMessageDeadlineError,
} from "./message-recovery-context";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		ztcInboundMediaBatch: { create: jest.fn(), findFirst: jest.fn() },
		$executeRaw: jest.fn(),
	},
}));
jest.mock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
	sendMetaGraphMessage: jest.fn(),
}));

const args = {
	worker: { id: "worker-1", organizationId: "ztc-org" },
	message: { id: "wamid.1", type: "text", text: { body: "Sāku darbu 08:00" } },
	metadata: { phone_number_id: "ztc-business" },
	businessPhoneNumberId: "ztc-business",
	recipient: "37120000001",
};

function statuses() {
	return (prisma.$executeRaw as jest.Mock).mock.calls
		.filter(([sql]) => String(sql).includes('"status" ='))
		.map((call) => call[1]);
}

beforeEach(() => {
	jest.resetAllMocks();
	(prisma.ztcInboundMediaBatch.create as jest.Mock).mockResolvedValue({});
	(prisma.ztcInboundMediaBatch.findFirst as jest.Mock).mockResolvedValue(null);
	(prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
	(sendMetaGraphMessage as jest.Mock).mockResolvedValue({});
	jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

it.each([
	"LLM unavailable",
	"database unavailable",
	"media unavailable",
	"ZtcTimeoutError",
])(
	"retains the message and sends the approved Latvian fallback for %s",
	async (reason) => {
		const error = new Error(reason);
		const run = jest.fn(async () => {
			expect(prisma.ztcInboundMediaBatch.create).toHaveBeenCalledTimes(1);
			throw error;
		});
		await expect(runWithZtcMessageRecovery(args, run)).rejects.toBe(error);
		expect(prisma.ztcInboundMediaBatch.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				mode: "ztc_recovery",
				status: "processing",
				batchKey: "ztc_recovery:wamid.1",
				items: expect.objectContaining({ message: args.message }),
			}),
		});
		expect(statuses()).toEqual(["pending_review"]);
		expect(sendMetaGraphMessage).toHaveBeenCalledTimes(1);
		expect(sendMetaGraphMessage).toHaveBeenCalledWith({
			businessPhoneNumberId: "ztc-business",
			recipient: "37120000001",
			body: { text: { body: ZTC_TECHNICAL_FAILURE_REPLY } },
		});
		expect(run).toHaveBeenCalledTimes(1);
	},
);

it("marks success without sending a fallback", async () => {
	await runWithZtcMessageRecovery(args, async () => {});
	expect(statuses()).toEqual(["completed"]);
	expect(sendMetaGraphMessage).not.toHaveBeenCalled();
	expect(getZtcMessageRecoveryContext()).toBeUndefined();
});

it("keeps the original IDs and permanent media references for failed albums", async () => {
	await expect(
		runWithZtcMessageRecovery(args, async () => {
			const formData = new FormData();
			formData.set("MessageId", args.message.id);
			formData.set("Body", "Pabeidzu darbu");
			formData.set("MediaUrl0", "https://meta.test/temporary-photo");
			await retainZtcMessageFormData(formData);
			formData.set(
				"MetaBatchMessageIds",
				JSON.stringify([args.message.id, "wamid.2"]),
			);
			setZtcRecoveryBatch(formData);
			await retainZtcUploadedMedia(
				"https://files.test/permanent-photo",
				"image/jpeg",
			);
			throw new Error("LLM unavailable");
		}),
	).rejects.toThrow("LLM unavailable");
	const writes = (prisma.$executeRaw as jest.Mock).mock.calls;
	expect(
		writes.some((call) =>
			call.includes(
				JSON.stringify({
					formData: [
						["MessageId", args.message.id],
						["Body", "Pabeidzu darbu"],
						["MediaUrl0", "https://meta.test/temporary-photo"],
					],
				}),
			),
		),
	).toBe(true);
	const pending = writes.find(([sql]) => String(sql).includes('"status" ='));
	expect(pending?.[4]).toEqual(["wamid.1", "wamid.2"]);
	expect(
		writes.some((call) =>
			call.includes(
				JSON.stringify([
					{
						url: "https://files.test/permanent-photo",
						contentType: "image/jpeg",
					},
				]),
			),
		),
	).toBe(true);
});

it("does not mark an album member completed before its batch is processed", async () => {
	await runWithZtcMessageRecovery(args, async () =>
		markZtcRecoveryAwaitingBatch(),
	);
	expect(statuses()).toEqual(["awaiting_batch"]);
});

it("uses the request arrival deadline and prevents late mutations and normal replies", async () => {
	jest.useFakeTimers();
	let finish!: () => void;
	let lateError: unknown;
	const pending = runWithWhatsappSourceContext(
		{ webhookStartedAtMs: Date.now() - 80_000 },
		() =>
			runWithZtcMessageRecovery(args, async () => {
				await new Promise<void>((resolve) => {
					finish = resolve;
				});
				try {
					assertZtcMessageActive();
				} catch (error) {
					lateError = error;
					throw error;
				}
			}),
	);
	const outcome = expect(pending).rejects.toBeInstanceOf(
		ZtcMessageDeadlineError,
	);
	await jest.advanceTimersByTimeAsync(ZTC_MESSAGE_BUDGET_MS - 80_000);
	await outcome;
	expect(sendMetaGraphMessage).toHaveBeenCalledTimes(1);
	finish();
	await jest.advanceTimersByTimeAsync(0);
	expect(lateError).toBeInstanceOf(ZtcMessageDeadlineError);
	expect(statuses()).toEqual(["pending_review"]);
});

it("does not run the handler after the shared deadline has already passed", async () => {
	const run = jest.fn();
	await expect(
		runWithWhatsappSourceContext(
			{ webhookStartedAtMs: Date.now() - ZTC_MESSAGE_BUDGET_MS },
			() => runWithZtcMessageRecovery(args, run),
		),
	).rejects.toBeInstanceOf(ZtcMessageDeadlineError);
	expect(run).not.toHaveBeenCalled();
});

it("preserves the original failure when status storage or WhatsApp delivery also fails", async () => {
	(prisma.$executeRaw as jest.Mock).mockRejectedValue(
		new Error("storage down"),
	);
	(sendMetaGraphMessage as jest.Mock).mockRejectedValue(
		new Error("WhatsApp down"),
	);
	await expect(
		runWithZtcMessageRecovery(args, async () => {
			throw new Error("original LLM error");
		}),
	).rejects.toThrow("original LLM error");
});

it("does not claim later processing if the original message cannot be retained", async () => {
	(prisma.ztcInboundMediaBatch.create as jest.Mock).mockRejectedValue(
		new Error("storage down"),
	);
	const run = jest.fn();
	await expect(runWithZtcMessageRecovery(args, run)).rejects.toBeInstanceOf(
		ZtcMessageRetentionError,
	);
	expect(run).not.toHaveBeenCalled();
	expect(sendMetaGraphMessage).toHaveBeenCalledWith(
		expect.objectContaining({
			body: {
				text: { body: expect.not.stringContaining("apstrādāsim vēlāk") },
			},
		}),
	);
});

it("does not affect any other flow outside the ZTC recovery scope", async () => {
	assertZtcMessageActive();
	await retainZtcMessageFormData(new FormData());
	await retainZtcUploadedMedia("https://files.test/photo", "image/jpeg");
	expect(prisma.$executeRaw).not.toHaveBeenCalled();
});

it("retains following messages for review instead of processing against a broken session", async () => {
	(prisma.ztcInboundMediaBatch.findFirst as jest.Mock).mockResolvedValue({
		id: "earlier-failed-message",
	});
	const run = jest.fn();
	await expect(runWithZtcMessageRecovery(args, run)).rejects.toThrow(
		"Earlier ZTC message requires recovery review",
	);
	expect(run).not.toHaveBeenCalled();
	expect(statuses()).toEqual(["pending_review"]);
	expect(sendMetaGraphMessage).toHaveBeenCalledTimes(1);
});

it("does not replay a message already retained after an uncertain receipt write", async () => {
	(prisma.ztcInboundMediaBatch.create as jest.Mock).mockRejectedValue(
		Object.assign(new Error("duplicate"), { code: "P2002" }),
	);
	const run = jest.fn();
	await expect(runWithZtcMessageRecovery(args, run)).rejects.toThrow(
		"already retained",
	);
	expect(run).not.toHaveBeenCalled();
	expect(sendMetaGraphMessage).toHaveBeenCalledWith(
		expect.objectContaining({
			body: { text: { body: ZTC_TECHNICAL_FAILURE_REPLY } },
		}),
	);
});
