const mockCreate = jest.fn();
const mockSend = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockTransaction = jest.fn();
const mockMatch = jest.fn();

jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		chat: {
			completions: { create: (...args: unknown[]) => mockCreate(...args) },
		},
	})),
	toFile: jest.fn(),
}));
jest.mock("uploadthing/server", () => ({
	UTApi: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		ztcRecords: {
			findFirst: (...args: unknown[]) => mockFindFirst(...args),
			findMany: (...args: unknown[]) => mockFindMany(...args),
		},
		$transaction: (...args: unknown[]) => mockTransaction(...args),
	},
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/helpers", () => ({
	getString: (form: FormData, key: string) => String(form.get(key) ?? ""),
	fetchWhatsAppMediaAsBuffer: jest.fn(),
}));
jest.mock("@/lib/utils/whatsapp-helpers/shared/sender", () => ({
	getMetaReplyContext: jest.fn(),
	sendMessage: (...args: unknown[]) => mockSend(...args),
}));
jest.mock("@/lib/utils/whatsapp-helpers/meta/sender", () => ({
	sendMetaGraphMessage: jest.fn(),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: async () => ({
		Works: { DropDownOptions: { tl: "TL - Koka karkas 145mm" } },
		Units: { DropDownOptions: { m2: "m2", gab: "gab" } },
		otherSettings: {
			ztcDefaultTaskRates: {
				projects: [
					{
						projectName: "H13",
						works: [],
						additionalDetails: [],
						additionalWorks: [
							{
								task: "paneļu iepakošana",
								rate: "0.2",
								unit: "m2",
								relatesToElement: true,
							},
						],
					},
				],
			},
		},
	}),
}));
jest.mock("./canonical-entity-matching", () => ({
	matchZtcCanonicalEntities: (...args: unknown[]) => mockMatch(...args),
}));
jest.mock("./project-name-canonicalization", () => ({
	canonicalizeZtcExtractedProjectName: jest.fn(),
}));
jest.mock("./message-recovery", () => ({ retainZtcUploadedMedia: jest.fn() }));
jest.mock("@/flows/ztc-production/lib/ztc-task-amount-allocation", () => ({
	...jest.requireActual("@/flows/ztc-production/lib/ztc-task-identity"),
	rebalanceZtcCompletedTaskAmounts: async () => ({ updated: 0 }),
}));

import OpenAI from "openai";
import { withZtcMessageRecoveryContext } from "./message-recovery-context";
import { handleZtcWorkerRoute } from "./whatsapp-worker";

const text =
	"Pabeidzu papilddetalas kārbu iestrāde 1 gab papilddetaļas cilpu iestrāde 2 gab";
const evidence = {
	noneReason: null,
	details: [
		{
			description: "kārbu iestrāde",
			quantity: 1,
			sourceText: "kārbu iestrāde 1 gab",
		},
		{
			description: "cilpu iestrāde",
			quantity: 2,
			sourceText: "cilpu iestrāde 2 gab",
		},
	],
};
const worker = {
	id: "worker",
	name: "Test",
	surname: "Worker",
	phone: "37120000000",
	siteId: "site",
	organizationId: "org",
};
let parent: Record<string, unknown>;
let children: Array<Record<string, unknown>>;
let failChildren: boolean;

const response = (value: unknown) => ({
	choices: [{ message: { content: JSON.stringify(value) } }],
});
function classifier(isFinish = true) {
	return {
		isGibberish: false,
		isFinish,
		isAdditionalWork: false,
		additionalDetails: [],
		additionalWorkDescription: null,
		workOption: null,
		amountCompleted: null,
		units: null,
		issue: null,
		polishedText: text,
	};
}
function form(body = text) {
	const value = new FormData();
	value.set("Body", body);
	value.set("From", "whatsapp:+37120000000");
	value.set("NumMedia", "0");
	value.set("MessageId", "wamid.finish-test");
	return value;
}

beforeEach(() => {
	jest.resetAllMocks();
	(OpenAI as unknown as jest.Mock).mockImplementation(() => ({
		chat: {
			completions: { create: (...args: unknown[]) => mockCreate(...args) },
		},
	}));
	jest.useFakeTimers();
	jest.setSystemTime(new Date("2026-11-06T05:56:12.215Z"));
	jest.spyOn(console, "log").mockImplementation(() => {});
	jest.spyOn(console, "warn").mockImplementation(() => {});
	jest.spyOn(console, "error").mockImplementation(() => {});
	failChildren = false;
	children = [];
	parent = {
		id: "session",
		workerId: "worker",
		siteId: "site",
		organizationId: "org",
		Location: "H13",
		Location_Custom_1: "B1-3Wi1-1",
		Works: "paneļu iepakošana",
		Works_Custom_1: "Papilddarbi",
		Works_Custom_2: null,
		WorkersInvolved: null,
		Date: new Date("2026-11-06T05:36:15.238Z"),
		Date_Custom_1: new Date("2026-11-06T05:35:00Z"),
		Date_Custom_2: null,
		Location_Custom_2: "0.2",
		Units: "m2",
		Amounts: 12.83,
		TimeInvolved: null,
		pausedAt: null,
		pauseIntervals: [],
		Comments_Custom_1: null,
		Photos: ["drawing.jpg", "completed.jpg"],
		Comments: "Sākums: Papilddarbs paneļu iepakošana",
		originalUserComment: "Papilddarbs paneļu iepakošana",
		Comments_Custom_2: JSON.stringify({
			type: "ztc_drawing_context",
			projectName: "H13",
			elements: [
				{
					elementName: "B1-3Wi1-1",
					totalAreaM2: 12.83,
					works: [{ name: "TL - Koka karkas 145mm", amountM2: 12.83 }],
				},
			],
			additionalWorkContext: { origin: "fresh_drawing", parentSessionId: null },
		}),
	};
	mockFindFirst.mockImplementation(async () =>
		parent.Date_Custom_2 ? null : { ...parent },
	);
	mockFindMany.mockResolvedValue([]);
	mockMatch.mockResolvedValue({
		project: { name: "H13" },
		works: [
			{
				rawIndex: 0,
				source: "llm",
				rate: { task: "elektro kārbu iestrāde", rate: "1.5", unit: "gab" },
			},
			{
				rawIndex: 1,
				source: "llm",
				rate: { task: "cilpu iestrāde", rate: "1.2", unit: "gab" },
			},
		],
	});
	mockTransaction.mockImplementation(async (run) => {
		const next = { ...parent },
			nextChildren = [...children];
		const tx = {
			$queryRaw: jest.fn(),
			ztcRecords: {
				updateMany: async ({ data }: { data: Record<string, unknown> }) => {
					if (next.Date_Custom_2) return { count: 0 };
					Object.assign(next, data);
					return { count: 1 };
				},
				update: async ({ data }: { data: Record<string, unknown> }) =>
					Object.assign(next, data),
				findUniqueOrThrow: async () => next,
				findMany: async () =>
					nextChildren.map((child) => ({
						Comments_Custom_2: child.Comments_Custom_2,
					})),
				createMany: async ({
					data,
					skipDuplicates,
				}: {
					data: Array<Record<string, unknown>>;
					skipDuplicates?: boolean;
				}) => {
					if (failChildren) throw new Error("detail insert failed");
					for (const row of data)
						if (
							!skipDuplicates ||
							!nextChildren.some((child) => child.id === row.id)
						)
							nextChildren.push(row);
					return { count: data.length };
				},
			},
		};
		const result = await run(tx);
		parent = next;
		children = nextChildren;
		return result;
	});
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
});

it("replays the production zero-item classifier result and saves the box and loops before acknowledging completion", async () => {
	mockCreate
		.mockResolvedValueOnce(response(classifier()))
		.mockResolvedValueOnce(response(evidence));
	mockSend.mockImplementation(async (_to, message) => {
		expect(parent.Date_Custom_2).not.toBeNull();
		expect(children).toHaveLength(2);
		expect(message).toContain("Atsevišķi saglabātas papilddetāļas");
	});
	await handleZtcWorkerRoute({ formData: form(), worker });
	expect(
		children.map((row) => [row.Works, row.Amounts, row.Location_Custom_2]),
	).toEqual([
		["elektro kārbu iestrāde", 1, "1.5"],
		["cilpu iestrāde", 2, "1.2"],
	]);
	expect(parent.Amounts).toBe(12.83);
	expect(parent.TimeInvolved).toBe(0.33);
	expect(mockSend).toHaveBeenCalledTimes(1);
});

it("sends no completion success and keeps the parent open when the detail insert fails", async () => {
	mockCreate
		.mockResolvedValueOnce(response(classifier()))
		.mockResolvedValueOnce(response(evidence));
	failChildren = true;
	await expect(
		withZtcMessageRecoveryContext(
			{
				workerId: "worker",
				messageIds: ["wamid.finish-test"],
				deadline: Date.now() + 60000,
				stopped: false,
				awaitingBatch: false,
			},
			() => handleZtcWorkerRoute({ formData: form(), worker }),
		),
	).rejects.toThrow("detail insert failed");
	expect(parent.Date_Custom_2).toBeNull();
	expect(children).toEqual([]);
	expect(mockSend).not.toHaveBeenCalled();
});

it("asks for clarification and keeps the original report for review rather than silently closing with zero details", async () => {
	mockCreate
		.mockResolvedValueOnce(response(classifier()))
		.mockResolvedValueOnce(response({ details: [], noneReason: "no_details" }));
	await handleZtcWorkerRoute({ formData: form(), worker });
	expect(parent.Date_Custom_2).toBeNull();
	expect(children).toEqual([]);
	expect(JSON.parse(String(parent.Comments_Custom_2))).toMatchObject({
		ztcAdditionalDetailsReview: {
			required: true,
			inputText: text,
			sourceMessageId: "wamid.finish-test",
		},
	});
	expect(mockSend.mock.calls[0][1]).toContain("Darbs vēl nav noslēgts");
});

it("saves a standalone detail report against a fresh drawing without creating or closing a main job", async () => {
	parent.Works = null;
	parent.Date = null;
	const standalone = "Papilddetaļas kārbu iestrāde 1 gab";
	mockCreate
		.mockResolvedValueOnce(response(classifier(false)))
		.mockResolvedValueOnce(
			response({ noneReason: null, details: [evidence.details[0]] }),
		);
	await handleZtcWorkerRoute({ formData: form(standalone), worker });
	expect(children).toHaveLength(1);
	expect(children[0].Amounts).toBe(1);
	expect(
		JSON.parse(String(children[0].Comments_Custom_2)).parentSessionId,
	).toBeNull();
	expect(parent.Works).toBeNull();
	expect(parent.Date_Custom_2).toBeNull();
});

it("asks for the drawing instead of assigning a between-jobs report to an old panel", async () => {
	mockFindFirst.mockResolvedValue(null);
	mockCreate
		.mockResolvedValueOnce(response(classifier(false)))
		.mockResolvedValueOnce(
			response({ noneReason: null, details: [evidence.details[0]] }),
		);
	await handleZtcWorkerRoute({
		formData: form("Papilddetaļas kārbu iestrāde 1 gab"),
		worker,
	});
	expect(children).toEqual([]);
	expect(mockTransaction).not.toHaveBeenCalled();
	expect(mockSend.mock.calls[0][1]).toContain("attiecīgā paneļa rasējumu");
});

it("does not duplicate standalone detail pay when the same message is replayed with different model wording", async () => {
	parent.Works = null;
	parent.Date = null;
	const standalone = "Papilddetaļas kārbu iestrāde 1 gab";
	for (const description of [
		"kārbu iestrāde",
		"papilddetaļas kārbu iestrāde",
	]) {
		mockCreate
			.mockResolvedValueOnce(response(classifier(false)))
			.mockResolvedValueOnce(
				response({
					noneReason: null,
					details: [{ ...evidence.details[0], description }],
				}),
			);
		await handleZtcWorkerRoute({ formData: form(standalone), worker });
	}
	expect(children).toHaveLength(1);
});

it("resolves the review marker when the clarified finish is successfully saved", async () => {
	parent.Comments_Custom_2 = JSON.stringify({
		...JSON.parse(String(parent.Comments_Custom_2)),
		ztcAdditionalDetailsReview: { required: true, inputText: text },
	});
	mockCreate
		.mockResolvedValueOnce(response(classifier()))
		.mockResolvedValueOnce(response(evidence));
	await handleZtcWorkerRoute({ formData: form(), worker });
	expect(children).toHaveLength(2);
	expect(
		JSON.parse(String(parent.Comments_Custom_2)).ztcAdditionalDetailsReview
			.required,
	).toBe(false);
});
