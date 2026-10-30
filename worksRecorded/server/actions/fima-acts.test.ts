import type { Prisma } from "@prisma/client";

const requireUserMock = jest.fn();
const orgCheckMock = jest.fn();
const findSite = jest.fn();
const query = jest.fn();
const execute = jest.fn();
const transaction = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: requireUserMock }));
jest.mock("./shared-actions", () => ({ orgCheck: orgCheckMock }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findFirst: findSite },
		user: {
			findUnique: jest.fn(async () => ({
				firstName: "Ieva",
				lastName: "Test",
			})),
		},
		$transaction: transaction,
		$queryRaw: query,
		$executeRaw: execute,
	},
}));

import {
	ensureFimaActNumbers,
	saveFimaActRegister,
} from "@/flows/default-construction/backend/fima-acts";
import { readFimaActRegister } from "@/lib/fima/act-register";
import {
	getFimaActReferenceDetail,
	getFimaActSetting,
	getFimaActsForSite,
	saveFimaActSettings,
} from "./fima-acts";

const siteId = "d65ac3f1-e84f-4948-8a08-aaecfd19e97b";
const sourceId = "6e037a84-2c23-47a8-b49c-94993bd3cf0e";
const collection = "other_acceptance_acts";
const requestId = "1e037a84-2c23-47a8-b49c-94993bd3cf0e";
const scope = { siteId, collection, id: "100", expectedRevision: 0, requestId };
const source = { siteId: sourceId, caseId: "668708", collection, id: "200" };
let config: { otherSettings: Record<string, unknown> };
let sourceStatus: string;
beforeEach(() => {
	jest.clearAllMocks();
	sourceStatus = "approved";
	config = {
		otherSettings: {
			fimaCollaboration: true,
			protected: "preserve",
			fimaBisActCoverage: {
				version: 1,
				caseId: "668714",
				fetchedAt: "2026-10-30T08:00:00Z",
				acts: [
					{
						id: "100",
						collection,
						number: null,
						date: null,
						status: "draft",
						works: [],
					},
				],
			},
		},
	};
	requireUserMock.mockResolvedValue({ id: "user" });
	orgCheckMock.mockResolvedValue({ organizationId: "org" });
	findSite.mockImplementation(async () => ({
		id: siteId,
		name: "Olaine",
		bisCaseId: "668714",
		siteDiaryRecordsMap: config,
	}));
	query.mockImplementation(async (first: TemplateStringsArray | Prisma.Sql) => {
		const sql = ("strings" in first ? first.strings : first).join("");
		if (sql.includes("FOR UPDATE"))
			return [{ id: siteId, name: "Olaine", bisCaseId: "668714", config }];
		if (sql.includes("sitediaryrecords")) return [];
		return [
			{
				id: sourceId,
				name: "Main",
				bisCaseId: "668708",
				config: {
					otherSettings: {
						fimaBisActCoverage: {
							version: 1,
							caseId: "668708",
							fetchedAt: "2026-10-30T08:00:00Z",
							acts: [
								{
									id: "200",
									collection,
									number: "KT-21",
									date: null,
									status: sourceStatus,
									works: [],
								},
							],
						},
					},
				},
			},
		];
	});
	execute.mockImplementation(
		async (_sql: TemplateStringsArray, value: string) => {
			config.otherSettings.fimaActRegister = JSON.parse(value);
			return 1;
		},
	);
	transaction.mockImplementation(
		async (
			callback: (db: {
				$queryRaw: typeof query;
				$executeRaw: typeof execute;
			}) => Promise<unknown>,
		) => callback({ $queryRaw: query, $executeRaw: execute }),
	);
});
it("saves explicit cross-project Act examples under a site lock, without editing any daily record", async () => {
	const before = JSON.parse(JSON.stringify(config));
	const result = await saveFimaActSettings({
		...scope,
		kind: "examples",
		examples: [source, source],
	});
	expect(result.examples).toEqual([source]);
	expect(result.revision).toBe(1);
	expect(result.history[0]).toMatchObject({
		kind: "examples",
		text: "KT-21",
		actorName: "Ieva Test",
	});
	const [sql, ...parameters] = execute.mock.calls[0];
	expect(sql.join("")).toContain("'{otherSettings,fimaActRegister}'");
	expect(sql.join("")).not.toContain("sitediaryrecords");
	expect(parameters).toEqual(expect.arrayContaining([siteId, "org"]));
	expect({ ...config.otherSettings, fimaActRegister: undefined }).toEqual({
		...before.otherSettings,
		fimaActRegister: undefined,
	});
});
it("adds only explicitly entered Act comments and handles retries idempotently", async () => {
	const input = {
		...scope,
		kind: "comment" as const,
		text: "Cilvēka komentārs",
	};
	const saved = await saveFimaActSettings(input);
	expect(saved.history[0]).toMatchObject({
		text: input.text,
		kind: "comment",
		actorId: "user",
	});
	expect(await saveFimaActSettings(input)).toEqual(saved);
	expect(execute).toHaveBeenCalledTimes(1);
	await expect(
		saveFimaActSettings({
			...input,
			requestId: "2e037a84-2c23-47a8-b49c-94993bd3cf0e",
		}),
	).rejects.toThrow("Akts ir mainīts");
});
it.each(["draft", "rejected"])(
	"rejects an ineligible %s source",
	async (status) => {
		sourceStatus = status;
		await expect(
			saveFimaActSettings({ ...scope, kind: "examples", examples: [source] }),
		).rejects.toThrow("parauga aktu");
		expect(execute).not.toHaveBeenCalled();
	},
);
it("rejects cross-organization, stale-case and self examples", async () => {
	for (const reference of [
		{ ...source, siteId: "2e037a84-2c23-47a8-b49c-94993bd3cf0e" },
		{ ...source, caseId: "123" },
		{ siteId, caseId: "668714", collection, id: "100" },
	]) {
		await expect(
			saveFimaActSettings({
				...scope,
				kind: "examples",
				examples: [reference],
			}),
		).rejects.toThrow("parauga aktu");
	}
	expect(execute).not.toHaveBeenCalled();
});
it("checks access before fetching, assigning numbers, saving or comparing", async () => {
	orgCheckMock.mockResolvedValue(false);
	await expect(getFimaActsForSite(siteId)).rejects.toThrow("Nav piekļuves");
	await expect(
		saveFimaActSettings({ ...scope, kind: "comment", text: "Test" }),
	).rejects.toThrow("Nav piekļuves");
	await expect(
		getFimaActReferenceDetail({ siteId, reference: source }),
	).rejects.toThrow("Nav piekļuves");
	expect(query).not.toHaveBeenCalled();
	expect(transaction).not.toHaveBeenCalled();
});
it("rejects non-FIMA projects and missing targets", async () => {
	findSite.mockResolvedValueOnce({
		bisCaseId: "668714",
		siteDiaryRecordsMap: {},
	});
	await expect(getFimaActsForSite(siteId)).rejects.toThrow("nav pieejami");
	await expect(
		saveFimaActSettings({ ...scope, id: "999", kind: "comment", text: "Test" }),
	).rejects.toThrow("nav pieejams");
	expect(execute).not.toHaveBeenCalled();
});
it("allocates numbers once and preserves observed acts during a concurrent refresh", async () => {
	const first = await ensureFimaActNumbers("org", siteId, {
		caseId: "668714",
		keys: [`${collection}/99`],
	});
	expect(first.entries[`${collection}/99`]).toBeDefined();
	await ensureFimaActNumbers("org", siteId, { caseId: "668714", keys: [] });
	expect(execute).toHaveBeenCalledTimes(1);
	await expect(
		ensureFimaActNumbers("org", siteId, { caseId: "123", keys: [] }),
	).rejects.toThrow("BIS lieta ir mainīta");
});
it("rejects failed scoped updates", async () => {
	execute.mockResolvedValueOnce(0);
	await expect(
		saveFimaActRegister(
			{ $queryRaw: query, $executeRaw: execute },
			"org",
			siteId,
			readFimaActRegister(null),
		),
	).rejects.toThrow("Neizdevās");
});
it("prepares the complete comparison catalogue in the project payload", async () => {
	const data = await getFimaActsForSite(siteId);
	expect(data.rows.map((row) => row.id)).toEqual(["100"]);
	expect(data.references).toEqual([
		expect.objectContaining({
			siteId: sourceId,
			caseId: "668708",
			id: "200",
			collection,
			works: [],
			records: [],
		}),
	]);
	expect(JSON.stringify(data.references)).not.toContain("fimaCollaboration");
});
it.each([
	"updated",
	"ai_prepared",
	"coordinate_with_fima",
	"bis_draft",
	"ready_for_approval",
	"approved",
	"do_not_create",
	"needs_changes",
	null,
] as const)(
	"saves the Act workflow badge %s independently of the BIS status",
	async (status) => {
		const next = await saveFimaActSettings({
			...scope,
			kind: "status",
			status,
		});
		expect(next.status).toBe(status);
		expect(next.history[0]).toMatchObject({
			kind: "status",
			actorName: "Ieva Test",
		});
		expect(next.history[0].text).toContain("Nav atzīmes →");
		expect(config.otherSettings.fimaBisActCoverage).toMatchObject({
			acts: [{ status: "draft" }],
		});
		expect(next.history.filter((event) => event.kind === "comment")).toEqual(
			[],
		);
	},
);

it("loads just the scoped Act settings for comment history without writes", async () => {
	const setting = { number: 1, revision: 4, examples: [], history: [] };
	config.otherSettings.fimaActRegister = {
		version: 1,
		nextNumber: 2,
		entries: { [`${collection}/100`]: setting },
	};
	expect(await getFimaActSetting({ siteId, collection, id: "100" })).toEqual(
		setting,
	);
	expect(transaction).not.toHaveBeenCalled();
	expect(query).not.toHaveBeenCalled();
	expect(execute).not.toHaveBeenCalled();
});
it("rejects history access outside the user's organization", async () => {
	orgCheckMock.mockResolvedValue(null);
	await expect(
		getFimaActSetting({ siteId, collection, id: "100" }),
	).rejects.toThrow("Nav piekļuves");
	expect(query).not.toHaveBeenCalled();
});
