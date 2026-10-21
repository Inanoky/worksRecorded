const requireVisualAccess = jest.fn();
const constructionPlanFindFirst = jest.fn();
const businessNumberFindFirst = jest.fn();
const sendFindUnique = jest.fn();
const sendCreate = jest.fn();
const sendUpdate = jest.fn();
const itemUpdate = jest.fn();
const itemFindMany = jest.fn();
const sendFindUniqueOrThrow = jest.fn();
const originalFetch = global.fetch;
const inboundFindFirst = jest.fn();

jest.mock("./store", () => ({ requireVisualAccess }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		metaInboundMessage: { findFirst: inboundFindFirst },
		constructionPlan: { findFirst: constructionPlanFindFirst },
		whatsAppBusinessNumber: { findFirst: businessNumberFindFirst },
		whatsAppTaskSend: {
			findUnique: sendFindUnique,
			findUniqueOrThrow: sendFindUniqueOrThrow,
			create: sendCreate,
			update: sendUpdate,
		},
		whatsAppTaskSendItem: { update: itemUpdate, findMany: itemFindMany },
	},
}));

import { sendVisualPlanningWhatsAppTask } from "./planning-whatsapp-send";

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
	"base64",
);

function imageFile(name: string) {
	return {
		name,
		type: "image/png",
		size: png.length,
		arrayBuffer: async () =>
			png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
	} as File;
}

function validRequest() {
	return {
		userId: "user-1",
		siteId: "site-1",
		input: {
			planId: "11111111-1111-4111-8111-111111111111",
			planVersion: 2,
			recipient: "37120000000",
			message: "Pārbaudīt darbu",
			clientRequestId: "22222222-2222-4222-8222-222222222222",
			images: [{ page: 1 }, { page: 11, section: "PA1.6" }],
		},
		files: [imageFile("page.png"), imageFile("section.png")],
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	process.env.LIMENI_META_ACCESS_TOKEN = "limeni-secret";
	inboundFindFirst.mockResolvedValue({ receivedAt: new Date() });
	requireVisualAccess.mockResolvedValue({ organizationId: "limeni-org" });
	constructionPlanFindFirst.mockResolvedValue({
		id: "11111111-1111-4111-8111-111111111111",
		site: { name: "Testa objekts" },
		visualAreas: {
			version: 1,
			areas: [
				{
					id: "area-1",
					page: 1,
					polygon: [
						{ x: 0.1, y: 0.1 },
						{ x: 0.3, y: 0.1 },
						{ x: 0.3, y: 0.3 },
					],
				},
			],
			section: "PA1.6",
		},
	});
	businessNumberFindFirst.mockResolvedValue({
		businessPhoneNumberId: "limeni-phone-id",
		credentialProfile: "limeni-dedicated",
		templateName: "limeni_work_task",
		templateLanguage: "lv",
	});
	sendFindUnique.mockResolvedValue(null);
	const items = [
		{ id: "item-1", ordinal: 0, page: 1, section: null, status: "pending" },
		{ id: "item-2", ordinal: 1, page: 11, section: "PA1.6", status: "pending" },
	];
	sendCreate.mockResolvedValue({ id: "send-1", items });
	itemUpdate.mockImplementation(async ({ where, data }) => {
		const item = items.find((candidate) => candidate.id === where.id);
		if (!item) throw new Error("Unknown test item");
		Object.assign(item, data);
		return {};
	});
	itemFindMany.mockImplementation(async () => items);
	sendUpdate.mockResolvedValue({});
	sendFindUniqueOrThrow.mockImplementation(async () => ({
		id: "send-1",
		status: sendUpdate.mock.calls.at(-1)?.[0].data.status ?? "processing",
		items,
	}));
});

afterEach(() => {
	delete process.env.LIMENI_META_ACCESS_TOKEN;
	global.fetch = originalFetch;
});

it("sends a formatted task caption and only the section name on its Griezums image", async () => {
	let media = 0;
	let message = 0;
	const fetchMock = jest.fn(
		async (input: RequestInfo | URL, _init?: RequestInit) => {
			const url = String(input);
			if (url.endsWith("/media"))
				return {
					ok: true,
					status: 200,
					json: async () => ({ id: `media-${++media}` }),
				} as Response;
			if (url.endsWith("/messages"))
				return {
					ok: true,
					status: 200,
					json: async () => ({ messages: [{ id: `wamid.${++message}` }] }),
				} as Response;
			return { ok: false, status: 404, json: async () => ({}) } as Response;
		},
	);
	global.fetch = fetchMock as typeof fetch;

	const result = await sendVisualPlanningWhatsAppTask({
		userId: "user-1",
		siteId: "site-1",
		input: {
			planId: "11111111-1111-4111-8111-111111111111",
			planVersion: 2,
			recipient: "+371 20000000",
			message: "Pārbaudīt\n\tdarbu     šeit",
			clientRequestId: "22222222-2222-4222-8222-222222222222",
			images: [{ page: 1 }, { page: 11, section: "PA1.6" }],
		},
		files: [imageFile("page.png"), imageFile("section.png")],
	});

	expect(result.status).toBe("sent");
	expect(fetchMock).toHaveBeenCalledTimes(4);
	for (const [, init] of fetchMock.mock.calls)
		expect(new Headers(init?.headers).get("Authorization")).toBe(
			"Bearer limeni-secret",
		);
	const messageBodies = fetchMock.mock.calls
		.filter(([input]) => String(input).endsWith("/messages"))
		.map(([, init]) => JSON.parse(String(init?.body)));
	expect(messageBodies).toHaveLength(2);
	expect(messageBodies[0]).toEqual(
		expect.objectContaining({
			to: "37120000000",
			type: "image",
		}),
	);
	expect(messageBodies[0].image).toEqual({
		id: "media-1",
		caption: "*Objekts:* Testa objekts\n\nPārbaudīt\ndarbu šeit",
	});
	expect(sendCreate).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ message: "Pārbaudīt\ndarbu šeit" }),
		}),
	);
	expect(messageBodies[1]).toMatchObject({
		type: "image",
		image: { id: "media-2", caption: "PA1.6" },
	});
	expect(messageBodies[1]).not.toHaveProperty("template");
});

it("uses the approved template only when Meta explicitly closes the reply window and keeps section text short", async () => {
	const fetchMock = jest.fn(
		async (url: RequestInfo | URL, init?: RequestInit) => {
			if (String(url).endsWith("/media"))
				return { ok: true, json: async () => ({ id: "media" }) } as Response;
			const body = JSON.parse(String(init?.body));
			if (body.type === "image")
				return {
					ok: false,
					status: 400,
					json: async () => ({ error: { code: 131047 } }),
				} as Response;
			return {
				ok: true,
				json: async () => ({ messages: [{ id: "wamid.template" }] }),
			} as Response;
		},
	);
	global.fetch = fetchMock as typeof fetch;
	const result = await sendVisualPlanningWhatsAppTask(validRequest());
	expect(result.status).toBe("sent");
	const templates = fetchMock.mock.calls
		.filter(
			([url, init]) =>
				String(url).endsWith("/messages") &&
				JSON.parse(String(init?.body)).type === "template",
		)
		.map(([, init]) => JSON.parse(String(init?.body)));
	expect(templates).toHaveLength(2);
	expect(templates[0].template.name).toBe("limeni_work_task");
	expect(templates[1].template.components[1].parameters).toEqual([
		{
			type: "text",
			parameter_name: "objekts",
			text: "Testa objekts — Sekcija PA1.6",
		},
		{ type: "text", parameter_name: "uzdevuma_apraksts", text: "PA1.6" },
		{ type: "text", parameter_name: "attelu_skaits", text: "1" },
	]);
});

it("uses approved templates immediately when there is no recent reply to this business number", async () => {
	inboundFindFirst.mockResolvedValue(null);
	global.fetch = jest.fn(
		async (url: RequestInfo | URL) =>
			({
				ok: true,
				json: async () =>
					String(url).endsWith("/media")
						? { id: "media" }
						: { messages: [{ id: "wamid.template" }] },
			}) as Response,
	) as typeof fetch;
	await sendVisualPlanningWhatsAppTask(validRequest());
	const messages = jest
		.mocked(global.fetch)
		.mock.calls.filter(([url]) => String(url).endsWith("/messages"))
		.map(([, init]) => JSON.parse(String(init?.body)));
	expect(messages.map((message) => message.type)).toEqual([
		"template",
		"template",
	]);
	expect(messages[1].template.components[1].parameters[1].text).toBe("PA1.6");
	expect(inboundFindFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				organizationId: "limeni-org",
				businessPhoneNumberId: "limeni-phone-id",
				sender: "37120000000",
				receivedAt: { gt: expect.any(Date) },
			}),
		}),
	);
});

it("never falls back to the shared Meta credential", async () => {
	delete process.env.LIMENI_META_ACCESS_TOKEN;
	process.env.META_ACCESS_TOKEN = "shared-secret";
	await expect(
		sendVisualPlanningWhatsAppTask({
			userId: "user-1",
			siteId: "site-1",
			input: {
				planId: "11111111-1111-4111-8111-111111111111",
				planVersion: 2,
				recipient: "37120000000",
				message: "Pārbaudīt darbu",
				clientRequestId: "22222222-2222-4222-8222-222222222222",
				images: [{ page: 1 }, { page: 11, section: "PA1.6" }],
			},
			files: [imageFile("page.png"), imageFile("section.png")],
		}),
	).rejects.toThrow("Missing LIMENI_META_ACCESS_TOKEN");
	delete process.env.META_ACCESS_TOKEN;
});

it("continues after a provider failure and retries only the failed item", async () => {
	let messageAttempt = 0;
	const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.endsWith("/media"))
			return {
				ok: true,
				status: 200,
				json: async () => ({ id: "media-id" }),
			} as Response;
		messageAttempt += 1;
		if (messageAttempt === 2)
			return {
				ok: false,
				status: 400,
				json: async () => ({ error: { code: 131000 } }),
			} as Response;
		return {
			ok: true,
			status: 200,
			json: async () => ({ messages: [{ id: `wamid.${messageAttempt}` }] }),
		} as Response;
	});
	global.fetch = fetchMock as typeof fetch;
	const input = {
		planId: "11111111-1111-4111-8111-111111111111",
		planVersion: 2,
		recipient: "37120000000",
		message: "Pārbaudīt darbu",
		clientRequestId: "22222222-2222-4222-8222-222222222222",
		images: [{ page: 1 }, { page: 11, section: "PA1.6" }],
	};
	const files = [imageFile("page.png"), imageFile("section.png")];
	const first = await sendVisualPlanningWhatsAppTask({
		userId: "user-1",
		siteId: "site-1",
		input,
		files,
	});
	expect(first.status).toBe("partial");
	expect(first.items.map((item) => item.status)).toEqual(["sent", "failed"]);

	const createdItems = sendCreate.mock.calls[0][0].data.items.create;
	const existingItems = first.items.map((item, ordinal) => ({
		id: `item-${ordinal + 1}`,
		...item,
		imageSha256: createdItems[ordinal].imageSha256,
	}));
	sendFindUnique.mockResolvedValue({
		id: "send-1",
		siteId: "site-1",
		planId: input.planId,
		planVersion: input.planVersion,
		recipient: input.recipient,
		message: input.message,
		items: existingItems,
	});
	itemFindMany.mockImplementation(async () => existingItems);
	itemUpdate.mockImplementation(async ({ where, data }) => {
		const item = existingItems.find((candidate) => candidate.id === where.id);
		if (!item) throw new Error("Unknown retry test item");
		Object.assign(item, data);
		return {};
	});
	sendFindUniqueOrThrow.mockImplementation(async () => ({
		id: "send-1",
		status: sendUpdate.mock.calls.at(-1)?.[0].data.status ?? "processing",
		items: existingItems,
	}));
	const callsBeforeRetry = fetchMock.mock.calls.length;
	const retried = await sendVisualPlanningWhatsAppTask({
		userId: "user-1",
		siteId: "site-1",
		input,
		files,
	});
	expect(retried.status).toBe("sent");
	expect(fetchMock.mock.calls.length - callsBeforeRetry).toBe(2);
});

it("denies access before resolving another organization's sender", async () => {
	requireVisualAccess.mockRejectedValue(new Error("Forbidden"));
	await expect(sendVisualPlanningWhatsAppTask(validRequest())).rejects.toThrow(
		"Forbidden",
	);
	expect(businessNumberFindFirst).not.toHaveBeenCalled();
});

it("rejects stale plan versions before any provider call", async () => {
	constructionPlanFindFirst.mockResolvedValue(null);
	const fetchMock = jest.fn();
	global.fetch = fetchMock as typeof fetch;
	await expect(sendVisualPlanningWhatsAppTask(validRequest())).rejects.toThrow(
		"Plāns ir mainīts",
	);
	expect(fetchMock).not.toHaveBeenCalled();
});

it("rejects malformed recipients and mismatched images", async () => {
	const malformedRecipient = validRequest();
	malformedRecipient.input.recipient = "not-a-phone";
	await expect(
		sendVisualPlanningWhatsAppTask(malformedRecipient),
	).rejects.toThrow("Nederīgs saņēmēja");

	const mismatchedFiles = validRequest();
	mismatchedFiles.files = [imageFile("page.png")];
	await expect(sendVisualPlanningWhatsAppTask(mismatchedFiles)).rejects.toThrow(
		"Trūkst darba uzdevuma attēlu",
	);
});

it("rejects an unexpected credential profile without a shared-token fallback", async () => {
	businessNumberFindFirst.mockResolvedValue({
		businessPhoneNumberId: "limeni-phone-id",
		credentialProfile: "works-recorded-shared",
		templateName: "limeni_work_task",
		templateLanguage: "lv",
	});
	await expect(sendVisualPlanningWhatsAppTask(validRequest())).rejects.toThrow(
		"Unsupported WhatsApp credential profile",
	);
});
