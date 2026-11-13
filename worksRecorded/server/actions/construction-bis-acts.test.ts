jest.mock("@/lib/bis/client", () => ({
	bisClient: jest.fn(),
	BisClientError: class extends Error {
		constructor(
			public status: number,
			message: string,
		) {
			super(message);
		}
	},
}));
jest.mock(
	"@/flows/default-construction/backend/construction-project-access",
	() => ({ requireConstructionProjectAccess: jest.fn() }),
);
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: { findMany: jest.fn() },
		$transaction: jest.fn(),
	},
}));

import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { BisClientError, bisClient } from "@/lib/bis/client";
import type { DiaryActInput } from "@/lib/bis/diary-act";
import { prisma } from "@/lib/utils/db";
import {
	createConstructionBisAct,
	prepareConstructionBisAct,
} from "./construction-bis-acts";

const siteId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const list = jest.fn();
const request = jest.fn();
let config: any;
let approved: boolean;
const remoteAttributes = () => ({
	event_date: "2026-11-10",
	status: approved ? "approved" : "draft",
	description: "Grīda",
	case_construction_round_id: 42,
});

beforeEach(() => {
	jest.clearAllMocks();
	config = { otherSettings: { existingSetting: true } };
	approved = true;
	jest.mocked(bisClient).mockResolvedValue({
		site: { id: siteId, bisConstructionRoundId: "42" },
		bisCaseId: "999",
		userId: "user",
		base: "https://bis.gov.lv",
		list,
		request,
	} as any);
	jest.mocked(requireConstructionProjectAccess).mockResolvedValue({
		siteName: "Site",
		siteDiaryRecordsMap: {},
		organizationId: "org",
		bisCaseId: "999",
		organizationLanguage: "lv",
		diaryConfig: {},
	});
	jest
		.mocked(prisma.sitediaryrecords.findMany)
		.mockResolvedValue([{ id: recordId, BISId: "10" }] as any);
	jest.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
		fn({
			$queryRaw: async () => [{ siteDiaryRecordsMap: config }],
			site: {
				update: async ({ data }: any) => {
					config = data.siteDiaryRecordsMap;
				},
			},
		}),
	);
	list.mockImplementation(async (path: string) => {
		if (/^accomplished_works|^available_accomplished_works/.test(path))
			return [
				{ id: "10", type: "performed_work", attributes: remoteAttributes() },
			];
		if (path === "estimate_positions")
			return [
				{
					id: "100",
					attributes: {
						type: "element",
						description: "Grīda",
						position_number: "1.1",
						quantity: "100",
						measure: "59",
					},
				},
			];
		if (path.endsWith("/estimate_positions")) return [{ id: "100" }];
		return [];
	});
	request.mockImplementation(async (path: string, method?: string) => {
		if (method === "POST") return { data: { id: "500" } };
		if (path.endsWith("/detail"))
			return { data: { attributes: { quantity: "12.5", measurement: "59" } } };
		return { data: { id: "10", attributes: remoteAttributes() } };
	});
});

async function input(): Promise<DiaryActInput> {
	const prepared = await prepareConstructionBisAct({
		siteId,
		recordIds: [recordId],
		kind: "certificate",
	});
	return {
		siteId,
		recordIds: [recordId],
		requestId,
		kind: "certificate",
		eventDate: "2026-11-12",
		eventTime: "08:00",
		name: "",
		description: "",
		mark: "",
		code: "",
		caseActId: "",
		estimateByRecord: {},
		revision: prepared.revision,
	};
}

test("rechecks remote approval and creates only one act on retries", async () => {
	const value = await input();
	const first = await createConstructionBisAct(value);
	expect(first.id).toBe("500");
	expect(await createConstructionBisAct(value)).toEqual(first);
	expect(
		await createConstructionBisAct({
			...value,
			requestId: "44444444-4444-4444-8444-444444444444",
			eventTime: "08:01",
		}),
	).toEqual(first);
	expect(request.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(
		1,
	);
	expect(config.otherSettings.existingSetting).toBe(true);
	expect(config.otherSettings.bisDiaryActOperations[0]).toMatchObject({
		status: "complete",
		actorId: "user",
		recordIds: [recordId],
		caseId: "999",
	});
});

test("rejects an unapproved record before any write to BIS", async () => {
	const value = await input();
	approved = false;
	await expect(createConstructionBisAct(value)).rejects.toThrow(
		"nav apstiprināts",
	);
	expect(request.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(
		0,
	);
});

test("blocks an ambiguous POST retry even with a new request and edited details", async () => {
	const value = await input();
	request.mockImplementation(async (path: string, method?: string) => {
		if (method === "POST") throw new Error("Connection lost");
		if (path.endsWith("/detail"))
			return { data: { attributes: { quantity: "12.5", measurement: "59" } } };
		return { data: { attributes: remoteAttributes() } };
	});
	await expect(createConstructionBisAct(value)).rejects.toThrow("drošu");
	await expect(
		createConstructionBisAct({
			...value,
			requestId: "44444444-4444-4444-8444-444444444444",
			name: "Changed",
		}),
	).rejects.toThrow("jau sākta");
	expect(request.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(
		1,
	);
	expect(config.otherSettings.bisDiaryActOperations[0].status).toBe("unknown");
});

test("allows correction after a definite BIS validation rejection", async () => {
	const value = await input();
	const normal = request.getMockImplementation()!;
	let reject = true;
	request.mockImplementation(async (...args) => {
		if (args[1] === "POST" && reject) {
			reject = false;
			throw new BisClientError(422, "Invalid input");
		}
		return normal(...args);
	});
	await expect(createConstructionBisAct(value)).rejects.toThrow(
		"Invalid input",
	);
	expect(config.otherSettings.bisDiaryActOperations[0].status).toBe("failed");
	expect(
		(await createConstructionBisAct({ ...value, name: "Corrected" })).id,
	).toBe("500");
});

test("denies other projects and stops stale reviews", async () => {
	const value = await input();
	await expect(
		createConstructionBisAct({ ...value, revision: "old" }),
	).rejects.toThrow("dati mainījušies");
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	await expect(
		prepareConstructionBisAct({
			siteId,
			recordIds: [recordId],
			kind: "certificate",
		}),
	).rejects.toThrow("šī projekta");
	expect(request.mock.calls.filter((call) => call[1] === "POST")).toHaveLength(
		0,
	);
});

test("creates a covered-work draft with the selected plan and source quantities", async () => {
	const prepared = await prepareConstructionBisAct({
		siteId,
		recordIds: [recordId],
		kind: "covered",
	});
	const value = {
		...(await input()),
		kind: "covered" as const,
		caseActId: "181",
		name: "Grīdas pamatne",
		description: "Pamatne sagatavota",
		revision: prepared.revision,
	};
	expect((await createConstructionBisAct(value)).id).toBe("500");
	expect(request).toHaveBeenCalledWith(
		"covered_works_acceptance_acts",
		"POST",
		expect.objectContaining({
			data: expect.objectContaining({
				type: "covered_works_acceptance_act",
				relationships: expect.objectContaining({
					accomplished_works: {
						data: [
							{
								type: "logbooks_join",
								attributes: { child_id: 10, quantity: "12.5" },
							},
						],
					},
				}),
			}),
		}),
	);
});
