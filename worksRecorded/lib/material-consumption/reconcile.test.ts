import { buildMaterialConsumption } from "./extract";
import type { MaterialObservation } from "./model";
import { summarizeMaterialConsumption } from "./model";
import { reconcileMaterialReview } from "./reconcile";
import { materialRecordsFingerprint } from "./store";

jest.mock("@/lib/utils/db", () => ({ prisma: {} }));
jest.mock("@/lib/utils/super-user", () => ({ isSuperUserId: () => false }));

const projects = [
	{ id: "a", name: "Project A" },
	{ id: "b", name: "Project B" },
];
const review = {
	version: 1 as const,
	reviewedAt: "2026-11-19T10:00:00Z",
	organizationId: "org",
	coverage: "",
	projects: [],
	observations: [],
};
function observation(
	changes: Partial<MaterialObservation> = {},
): MaterialObservation {
	return {
		id: "consumed",
		sourceKey: "message",
		siteId: "a",
		date: "2026-11-13",
		material: "cement",
		kind: "consumed",
		bags: 25,
		status: "reported",
		reason: null,
		quote: "25 bags",
		originalText: "25 bags consumed; 30 delivered",
		recordIds: ["parent", "child"],
		sourceMessageIds: ["wa"],
		reporter: "Reporter",
		location: null,
		photos: ["https://example.com/photo"],
		basis: "source",
		...changes,
	};
}
function correction(
	entry: MaterialObservation,
	changes: Parameters<
		typeof reconcileMaterialReview
	>[0]["corrections"][number]["changes"],
) {
	return {
		id: entry.id,
		expectedFingerprint: materialRecordsFingerprint([entry]),
		changes,
	};
}

it("preserves the other material components and split provenance when correcting one date", () => {
	const consumed = observation();
	const delivered = observation({
		id: "delivered",
		kind: "delivered",
		bags: 30,
	});
	const result = reconcileMaterialReview({
		review,
		projects,
		entries: [consumed, delivered],
		corrections: [correction(delivered, { date: "2026-11-14" })],
		reviewedAt: "2026-11-19T11:00:00Z",
	});
	expect(result.observations).toHaveLength(2);
	expect(result.observations.find((entry) => entry.id === "consumed")).toEqual({
		...consumed,
		basis: "reviewed",
	});
	expect(result.observations.find((entry) => entry.id === "delivered")).toEqual(
		{ ...delivered, date: "2026-11-14", basis: "reviewed" },
	);
	const entries = buildMaterialConsumption({
		records: [
			{ id: "parent", siteId: "a", originalUserComment: consumed.originalText },
			{ id: "child", siteId: "a", originalUserComment: consumed.originalText },
		],
		projects,
		reviewed: result.observations,
	});
	expect(entries).toHaveLength(2);
	expect(summarizeMaterialConsumption(projects, entries)[0]).toMatchObject({
		cementBags: 25,
		cementDelivered: 30,
	});
});

it("reassigns the second project component without duplicating or changing bags", () => {
	const first = observation({ basis: "reviewed", recordIds: [] });
	const second = observation({
		id: "second",
		bags: 15,
		basis: "reviewed",
		recordIds: [],
	});
	const result = reconcileMaterialReview({
		review: { ...review, observations: [first, second] },
		entries: [first, second],
		projects,
		corrections: [correction(second, { siteId: "b" })],
		reviewedAt: "2026-11-19T11:00:00Z",
	});
	expect(result.observations).toHaveLength(2);
	expect(
		summarizeMaterialConsumption(projects, result.observations).map(
			(project) => project.cementBags,
		),
	).toEqual([25, 15]);
});

it("holds an uncertain date for review without inventing a new date or bag count", () => {
	const entry = observation();
	const result = reconcileMaterialReview({
		review,
		entries: [entry],
		projects,
		corrections: [
			correction(entry, {
				status: "needs_review",
				reason: "Source dates conflict",
			}),
		],
		reviewedAt: "2026-11-19T11:00:00Z",
	});
	expect(result.observations[0]).toMatchObject({
		date: entry.date,
		bags: entry.bags,
		status: "needs_review",
	});
	expect(
		summarizeMaterialConsumption(projects, result.observations)[0],
	).toMatchObject({ cementBags: 0, reviewCount: 1 });
});

it("rejects changed evidence, unknown projects and attempts to change material quantities", () => {
	const entry = observation();
	const args = {
		review,
		entries: [entry],
		projects,
		reviewedAt: "2026-11-19T11:00:00Z",
	};
	expect(() =>
		reconcileMaterialReview({
			...args,
			entries: [{ ...entry, bags: 26 }],
			corrections: [correction(entry, { date: "2026-11-14" })],
		}),
	).toThrow("changed");
	expect(() =>
		reconcileMaterialReview({
			...args,
			corrections: [correction(entry, { siteId: "outside" })],
		}),
	).toThrow("outside");
	expect(() =>
		reconcileMaterialReview({
			...args,
			corrections: [
				{ ...correction(entry, {}), changes: { bags: 999 } as never },
			],
		}),
	).toThrow();
});
