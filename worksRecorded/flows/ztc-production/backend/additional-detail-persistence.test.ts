import { getZtcPayrollValues } from "@/flows/ztc-production/lib/ztc-site-diary-utils";
import { prisma } from "@/lib/utils/db";
import {
	persistZtcSessionCompletion,
	prepareZtcAdditionalDetailRows,
} from "./additional-detail-persistence";
import { matchZtcCanonicalEntities } from "./canonical-entity-matching";

jest.mock("./canonical-entity-matching", () => ({
	matchZtcCanonicalEntities: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({ prisma: { $transaction: jest.fn() } }));

const session = {
	id: "packaging-session",
	workerId: "worker",
	siteId: "site",
	organizationId: "org",
	Date: new Date("2026-11-06T05:36:15.238Z"),
	Date_Custom_1: new Date("2026-11-06T05:35:00Z"),
	Location: "H13",
	Location_Custom_1: "B1-3Wi1-1",
	Works: "paneļu iepakošana",
	Works_Custom_2: null,
};
const completedAt = new Date("2026-11-06T05:56:12.215Z");
const details = [
	{ description: "kārbu iestrāde", quantity: 1 },
	{ description: "cilpu iestrāde", quantity: 2 },
];
const match = (rawIndex: number, task: string, rate: string) => ({
	rawIndex,
	rate: { task, rate, unit: "gab" },
	source: "llm",
});
const args = {
	session,
	completedAt,
	details,
	sourceMessageId: "wamid.finish",
	completedText:
		"Pabeidzu papilddetalas kārbu iestrāde 1 gab papilddetaļas cilpu iestrāde 2 gab",
};

beforeEach(() => {
	jest.resetAllMocks();
	(matchZtcCanonicalEntities as jest.Mock).mockResolvedValue({
		project: { name: "H13" },
		works: [
			match(0, "elektro kārbu iestrāde", "1.5"),
			match(1, "cilpu iestrāde", "1.2"),
		],
	});
});

it("prepares the actual box/loop report as two payable child rows with correct quantities and rates", async () => {
	const rows = await prepareZtcAdditionalDetailRows(args);
	expect(rows).toHaveLength(2);
	expect(
		rows.map((row) => [
			row.Works,
			row.Amounts,
			row.Location_Custom_2,
			row.Units,
		]),
	).toEqual([
		["elektro kārbu iestrāde", 1, "1.5", "gab"],
		["cilpu iestrāde", 2, "1.2", "gab"],
	]);
	expect(
		rows.reduce((sum, row) => sum + getZtcPayrollValues(row as never).sum, 0),
	).toBe(3.9);
	for (const row of rows) {
		expect(row).toMatchObject({
			Date: completedAt,
			Date_Custom_2: completedAt,
			TimeInvolved: 0,
			Location_Custom_1: "B1-3Wi1-1",
			Works_Custom_1: "Papilddetāļas",
		});
		expect(JSON.parse(String(row.Comments_Custom_2))).toMatchObject({
			parentSessionId: session.id,
			sourceMessageId: "wamid.finish",
		});
	}
});

it("uses the eligible matcher rather than the main job rate", async () => {
	await prepareZtcAdditionalDetailRows(args);
	expect(matchZtcCanonicalEntities).toHaveBeenCalledWith({
		siteId: "site",
		rawProjectName: "H13",
		rawWorks: ["kārbu iestrāde", "cilpu iestrāde"],
		category: "additionalDetails",
	});
});

it("keeps an unmatched part unpriced", async () => {
	(matchZtcCanonicalEntities as jest.Mock).mockResolvedValue({
		project: null,
		works: [],
	});
	const [row] = await prepareZtcAdditionalDetailRows({
		...args,
		details: [details[0]],
	});
	expect(row.Location_Custom_2).toBeNull();
	expect(row.Works).toBe("kārbu iestrāde");
	expect(JSON.parse(String(row.Comments_Custom_2))).toMatchObject({
		ztcRateMatch: { task: null },
		ztcAdditionalDetailsReview: { required: true, rateRequired: true },
	});
});

it("does not bill one piece when the worker supplied no quantity", async () => {
	const [row] = await prepareZtcAdditionalDetailRows({
		...args,
		details: [{ ...details[0], quantity: null }],
	});
	expect(row.Amounts).toBeNull();
	expect(getZtcPayrollValues(row as never).sum).toBe(0);
	expect(JSON.parse(String(row.Comments_Custom_2))).toMatchObject({
		ztcAdditionalDetailsReview: { quantityRequired: true },
	});
});

it("does not silently combine a known quantity with an unknown one", async () => {
	const [row] = await prepareZtcAdditionalDetailRows({
		...args,
		details: [details[0], { ...details[0], quantity: null }],
	});
	expect(row.Amounts).toBeNull();
});

it("assigns stable IDs for retries and different IDs to different messages", async () => {
	const first = await prepareZtcAdditionalDetailRows(args);
	const retry = await prepareZtcAdditionalDetailRows(args);
	const other = await prepareZtcAdditionalDetailRows({
		...args,
		sourceMessageId: "wamid.other",
	});
	expect(first.map((row) => row.id)).toEqual(retry.map((row) => row.id));
	expect(first[0].id).not.toBe(first[1].id);
	expect(first[0].id).not.toBe(other[0].id);
});

it.each([-1, 0, NaN, 1.5])(
	"rejects invalid piece quantity %s before any write",
	async (quantity) => {
		await expect(
			prepareZtcAdditionalDetailRows({
				...args,
				details: [{ ...details[0], quantity }],
			}),
		).rejects.toThrow();
		expect(prisma.$transaction).not.toHaveBeenCalled();
	},
);

function transactionState(failChildren = false) {
	let saved: { parent: Record<string, unknown>; children: unknown[] } = {
		parent: { ...session, Date_Custom_2: null },
		children: [],
	};
	(prisma.$transaction as jest.Mock).mockImplementation(async (run) => {
		const working = {
			parent: { ...saved.parent },
			children: [...saved.children],
		};
		const tx = {
			$queryRaw: jest.fn(),
			ztcRecords: {
				updateMany: jest.fn(async ({ data }) => {
					if (working.parent.Date_Custom_2) return { count: 0 };
					Object.assign(working.parent, data);
					return { count: 1 };
				}),
				findUniqueOrThrow: jest.fn(async () => working.parent),
				createMany: jest.fn(async ({ data }) => {
					if (failChildren) throw new Error("detail insert failed");
					working.children.push(...data);
					return { count: data.length };
				}),
			},
		};
		const result = await run(tx);
		saved = working;
		return result;
	});
	return () => saved;
}

it("commits parent completion and both extra details together", async () => {
	const state = transactionState();
	const rows = await prepareZtcAdditionalDetailRows(args);
	await expect(
		persistZtcSessionCompletion({
			recordId: session.id,
			organizationId: "org",
			data: { Date_Custom_2: completedAt },
			details: rows,
		}),
	).resolves.toMatchObject({ newlyCompleted: true });
	expect(state().parent.Date_Custom_2).toEqual(completedAt);
	expect(state().children).toHaveLength(2);
});

it("leaves the job open if inserting details fails", async () => {
	const state = transactionState(true);
	const rows = await prepareZtcAdditionalDetailRows(args);
	await expect(
		persistZtcSessionCompletion({
			recordId: session.id,
			organizationId: "org",
			data: { Date_Custom_2: completedAt },
			details: rows,
		}),
	).rejects.toThrow("detail insert failed");
	expect(state().parent.Date_Custom_2).toBeNull();
	expect(state().children).toEqual([]);
});

it("does not duplicate detail pay when completion is repeated", async () => {
	const state = transactionState();
	const rows = await prepareZtcAdditionalDetailRows(args);
	const complete = () =>
		persistZtcSessionCompletion({
			recordId: session.id,
			organizationId: "org",
			data: { Date_Custom_2: completedAt },
			details: rows,
		});
	await complete();
	await expect(complete()).resolves.toMatchObject({ newlyCompleted: false });
	expect(state().children).toHaveLength(2);
});
