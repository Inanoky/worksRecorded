const requireVisualAccess = jest.fn();
const constructionPlanFindFirst = jest.fn();
const businessNumberFindFirst = jest.fn();
const sendFindUnique = jest.fn();
const sendCreate = jest.fn();
const sendUpdate = jest.fn();
const itemUpdate = jest.fn();
const itemUpdateMany = jest.fn();
const itemFindMany = jest.fn();
const sendFindUniqueOrThrow = jest.fn();
const resolveWasenderTaskRecipient = jest.fn();
const requireConnectedWasenderSession = jest.fn();
const stageWasenderTaskImage = jest.fn();
const discardWasenderTaskImages = jest.fn();
const sendFindFirst = jest.fn();
const originalFetch = global.fetch;

jest.mock("./store", () => ({ requireVisualAccess }));
jest.mock("./wasender-groups-store", () => ({ resolveWasenderTaskRecipient }));
jest.mock("./wasender-connections-store", () => ({
	requireConnectedWasenderSession,
}));
jest.mock("./wasender-task-images", () => ({
	stageWasenderTaskImage,
	discardWasenderTaskImages,
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		constructionPlan: { findFirst: constructionPlanFindFirst },
		whatsAppBusinessNumber: { findFirst: businessNumberFindFirst },
		whatsAppTaskSend: {
			findFirst: sendFindFirst,
			findUnique: sendFindUnique,
			findUniqueOrThrow: sendFindUniqueOrThrow,
			create: sendCreate,
			update: sendUpdate,
		},
		whatsAppTaskSendItem: {
			update: itemUpdate,
			updateMany: itemUpdateMany,
			findMany: itemFindMany,
		},
	},
}));

import {
	LIMENI_TASK_REPORTING_NOTE,
	PLANNING_WHATSAPP_MESSAGE_LIMIT,
} from "./planning-whatsapp";
import {
	refreshWasenderTaskSend,
	sendVisualPlanningWhatsAppTask,
} from "./planning-whatsapp-send";

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

function groupRequest() {
	const request = validRequest();
	return {
		...request,
		input: {
			...request.input,
			recipient: "",
			groupId: "120000000000000001@g.us",
			groupSender: "37120000001",
		},
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	process.env.LIMENI_META_ACCESS_TOKEN = "limeni-secret";
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
	discardWasenderTaskImages.mockResolvedValue(undefined);
	stageWasenderTaskImage.mockImplementation(
		async (itemId) => `https://example.com/${itemId}`,
	);
	const items = [
		{ id: "item-1", ordinal: 0, page: 1, section: null, status: "pending" },
		{ id: "item-2", ordinal: 1, page: 11, section: "PA1.6", status: "pending" },
	];
	sendCreate.mockImplementation(async ({ data }) => {
		items[1].section = data.items.create[1]?.section ?? null;
		return { id: "send-1", message: data.message, items };
	});
	itemUpdate.mockImplementation(async ({ where, data }) => {
		const item = items.find((candidate) => candidate.id === where.id);
		if (!item) throw new Error("Unknown test item");
		Object.assign(item, data);
		return {};
	});
	itemFindMany.mockImplementation(async ({ where }) =>
		items.filter((item) => !where.status || where.status === item.status),
	);
	itemUpdateMany.mockImplementation(async ({ where, data }) => {
		const item = items.find((candidate) => candidate.id === where.id);
		const allowed =
			typeof where.status === "string" ? [where.status] : where.status.in;
		if (!item || !allowed.includes(item.status)) return { count: 0 };
		Object.assign(item, data);
		return { count: 1 };
	});
	sendUpdate.mockResolvedValue({});
	sendFindUniqueOrThrow.mockImplementation(async () => ({
		id: "send-1",
		provider: sendCreate.mock.calls.at(-1)?.[0].data.provider ?? "meta",
		status: sendUpdate.mock.calls.at(-1)?.[0].data.status ?? "processing",
		items,
	}));
});

it("sends a task and section through WaSenderAPI and confirms them through receipts without resending", async () => {
	const request = groupRequest();
	resolveWasenderTaskRecipient.mockResolvedValue({
		token: "channel-token",
		phone: request.input.groupSender,
		connectionId: "connection-1",
		group: { id: request.input.groupId, name: "Projekta brigāde" },
	});
	let message = 0;
	let sent = false;
	const fetchMock = jest.fn(
		async (url: string, _init: RequestInit) =>
			({
				ok: true,
				json: async () =>
					url.endsWith("/send-message")
						? {
								success: true,
								data: { msgId: ++message, status: "in_progress" },
							}
						: {
								success: true,
								data: {
									msgId: Number(url.split("/").at(-2)),
									status: sent ? 2 : 1,
								},
							},
			}) as Response,
	);
	global.fetch = fetchMock as unknown as typeof fetch;

	await expect(sendVisualPlanningWhatsAppTask(request)).resolves.toMatchObject({
		status: "processing",
		items: [{ status: "queued" }, { status: "queued" }],
	});
	expect(resolveWasenderTaskRecipient).toHaveBeenCalledWith(
		{
			organizationId: "limeni-org",
			userId: request.userId,
			siteId: request.siteId,
		},
		request.input.groupId,
		request.input.groupSender,
	);
	expect(businessNumberFindFirst).not.toHaveBeenCalled();
	const posts = fetchMock.mock.calls.filter(
		([, init]) => init.method === "POST",
	);
	expect(posts).toHaveLength(2);
	for (const [url, init] of posts) {
		expect(url).toBe("https://wasenderapi.com/api/send-message");
		expect(new Headers(init.headers).get("Authorization")).toBe(
			"Bearer channel-token",
		);
		expect(JSON.parse(String(init.body)).to).toBe(request.input.groupId);
	}
	expect(JSON.parse(String(posts[0][1].body))).toMatchObject({
		text: expect.stringContaining(LIMENI_TASK_REPORTING_NOTE),
		imageUrl: "https://example.com/item-1",
	});
	expect(JSON.parse(String(posts[1][1].body))).toMatchObject({
		text: "Sekcija PA1.6",
		imageUrl: "https://example.com/item-2",
	});
	expect(sendCreate.mock.calls[0][0].data).toMatchObject({
		provider: "wasender",
		recipientLabel: "Projekta brigāde",
		senderAddress: request.input.groupSender,
		wasenderConnectionId: "connection-1",
	});
	sendFindFirst.mockResolvedValue({
		id: "send-1",
		wasenderConnectionId: "connection-1",
		status: "processing",
	});
	requireConnectedWasenderSession.mockResolvedValue({ token: "channel-token" });
	sent = true;
	await expect(
		refreshWasenderTaskSend(request.userId, request.siteId, "send-1"),
	).resolves.toMatchObject({
		status: "sent",
		items: [{ status: "sent" }, { status: "sent" }],
	});
	expect(
		fetchMock.mock.calls.filter(([, init]) => init.method === "POST"),
	).toHaveLength(2);
});

it("stops before sending when the group is outside the project allowlist", async () => {
	const request = groupRequest();
	resolveWasenderTaskRecipient.mockRejectedValue(
		new Error("Šī WhatsApp grupa nav iespējota projektam."),
	);
	global.fetch = jest.fn();
	await expect(sendVisualPlanningWhatsAppTask(request)).rejects.toThrow(
		"nav iespējota projektam",
	);
	expect(sendCreate).not.toHaveBeenCalled();
	expect(global.fetch).not.toHaveBeenCalled();
});

afterEach(() => {
	delete process.env.LIMENI_META_ACCESS_TOKEN;
	global.fetch = originalFetch;
});

it("sends every ordered image with the approved template", async () => {
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
	expect(messageBodies[0]).toMatchObject({
		to: "37120000000",
		type: "template",
		template: {
			name: "limeni_work_task",
			components: expect.arrayContaining([
				{
					type: "header",
					parameters: [{ type: "image", image: { id: "media-1" } }],
				},
			]),
		},
	});
	expect(sendCreate).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({
				message: `Pārbaudīt\ndarbu šeit\n\n${LIMENI_TASK_REPORTING_NOTE}`,
			}),
		}),
	);
	expect(messageBodies[1]).toMatchObject({
		type: "template",
		template: {
			components: expect.arrayContaining([
				{
					type: "header",
					parameters: [{ type: "image", image: { id: "media-2" } }],
				},
			]),
		},
	});
});

it("does not attempt a session image before the approved template", async () => {
	const fetchMock = jest.fn(
		async (url: RequestInfo | URL, init?: RequestInit) => {
			if (String(url).endsWith("/media"))
				return { ok: true, json: async () => ({ id: "media" }) } as Response;
			const body = JSON.parse(String(init?.body));
			expect(body.type).toBe("template");
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

it("uses approved templates without consulting inbound conversation history", async () => {
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
	const fetchMock = jest.fn(
		async (input: RequestInfo | URL, _init?: RequestInit) => {
			const url = String(input);
			if (url.endsWith("/media"))
				return {
					ok: true,
					status: 200,
					json: async () => ({ id: "media-id" }),
				} as Response;
			messageAttempt += 1;
			if (messageAttempt === 1)
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
		},
	);
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
	expect(first.items.map((item) => item.status)).toEqual(["failed", "sent"]);

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
		provider: "meta",
		message: sendCreate.mock.calls[0][0].data.message,
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
	const [, retryMessage] = fetchMock.mock.calls.at(-1) ?? [];
	expect(
		JSON.parse(String(retryMessage?.body)).template.components[1].parameters[1]
			.text,
	).toBe(`${input.message} ${LIMENI_TASK_REPORTING_NOTE}`);
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

it("sends a PT-10-1 drawing with the shared template and section code", async () => {
	const section = "PT-10-1";
	const plan = await constructionPlanFindFirst();
	constructionPlanFindFirst.mockResolvedValue({
		...plan,
		visualAreas: { ...plan.visualAreas, section },
	});
	const request = validRequest();
	request.input.images[1].section = section;
	const task = `*Darba uzdevums*\n\n${"A".repeat(
		PLANNING_WHATSAPP_MESSAGE_LIMIT -
			LIMENI_TASK_REPORTING_NOTE.length -
			2 -
			"*Darba uzdevums*\n\n".length,
	)}`;
	request.input.message = `${task}\n\n${LIMENI_TASK_REPORTING_NOTE}`;
	businessNumberFindFirst.mockResolvedValue({
		businessPhoneNumberId: "limeni-phone-id",
		credentialProfile: "limeni-dedicated",
		templateName: "limeni_work_task_v2",
		templateLanguage: "lv",
	});
	global.fetch = jest.fn(
		async (url: RequestInfo | URL) =>
			({
				ok: true,
				json: async () =>
					String(url).endsWith("/media")
						? { id: "media" }
						: { messages: [{ id: "wamid.clean" }] },
			}) as Response,
	) as typeof fetch;
	const result = await sendVisualPlanningWhatsAppTask(request);
	expect(result.status).toBe("sent");
	expect(result.items[1]).toMatchObject({ section, status: "sent" });
	const messages = jest
		.mocked(global.fetch)
		.mock.calls.filter(([url]) => String(url).endsWith("/messages"))
		.map(([, init]) => JSON.parse(String(init?.body)));
	expect(messages[0].template.name).toBe("limeni_work_task_v2");
	expect(
		messages[0].template.components[1].parameters.map(
			(parameter: { parameter_name: string }) => parameter.parameter_name,
		),
	).toEqual(["uzdevuma_apraksts", "objekts"]);
	expect(messages[0].template.components[1].parameters[1].text).toBe(
		"Testa objekts",
	);
	expect(messages[0].template.components[1].parameters[0].text).toBe(
		`${task.split("\n\n")[1]} ${LIMENI_TASK_REPORTING_NOTE}`,
	);
	expect(sendCreate.mock.calls[0][0].data.message).toBe(request.input.message);
	expect(messages[1].template).toEqual({
		name: "limeni_section_drawing_v1",
		language: { code: "lv" },
		components: [
			{
				type: "header",
				parameters: [{ type: "image", image: { id: "media" } }],
			},
			{
				type: "body",
				parameters: [
					{ type: "text", parameter_name: "sekcija", text: section },
				],
			},
		],
	});
});

it("rejects a task that fits only without the reporting note before sending anything", async () => {
	const request = validRequest();
	request.input.message = "A".repeat(PLANNING_WHATSAPP_MESSAGE_LIMIT);
	const fetchMock = jest.fn();
	global.fetch = fetchMock as typeof fetch;
	await expect(sendVisualPlanningWhatsAppTask(request)).rejects.toThrow(
		"Ziņa kopā ar piezīmi pārsniedz",
	);
	expect(sendCreate).not.toHaveBeenCalled();
	expect(fetchMock).not.toHaveBeenCalled();
});
