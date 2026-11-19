import { prisma } from "@/lib/utils/db";
import {
	materialRecordsFingerprint,
	readMaterialConsumption,
	saveReviewedMaterialConsumption,
} from "./store";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findMany: jest.fn() },
		sitediaryrecords: { findMany: jest.fn() },
		documents: { findMany: jest.fn() },
		$transaction: jest.fn(),
	},
}));
jest.mock("@/lib/utils/super-user", () => ({ isSuperUserId: () => false }));

beforeEach(() => jest.clearAllMocks());

it("scopes journal rows, projects and history to the same organization", async () => {
	jest
		.mocked(prisma.site.findMany)
		.mockResolvedValue([{ id: "a", name: "Project A" }] as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	jest.mocked(prisma.documents.findMany).mockResolvedValue([]);
	expect((await readMaterialConsumption("org-a")).projects).toHaveLength(1);
	expect(prisma.site.findMany).toHaveBeenCalledWith(
		expect.objectContaining({ where: { organizationId: "org-a" } }),
	);
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { organizationId: "org-a", Site: { organizationId: "org-a" } },
		}),
	);
	expect(prisma.documents.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				organizationId: "org-a",
				siteId: null,
				documentType: "material-consumption-review-v1",
			},
		}),
	);
});

it("normalizes nullable legacy photo arrays and date objects consistently for concurrency checks", () => {
	expect(
		materialRecordsFingerprint([
			{ id: "a", Date: new Date("2026-11-17T10:00:00Z"), Photos: [] },
		]),
	).toBe(
		materialRecordsFingerprint([
			{ Photos: null, Date: "2026-11-17T10:00:00.000Z", id: "a" },
		]),
	);
	expect(
		materialRecordsFingerprint([{ id: "a", Comments: "25 bags" }]),
	).not.toBe(materialRecordsFingerprint([{ id: "a", Comments: "30 bags" }]));
});

it("stops a reviewed-history write if the journal has changed", async () => {
	const tx = {
		user: {
			findUnique: jest
				.fn()
				.mockResolvedValue({ organizationId: "org-a", status: "active" }),
		},
		sitediaryrecords: {
			findMany: jest.fn().mockResolvedValue([{ id: "new" }]),
		},
		documents: { create: jest.fn() },
	};
	jest
		.mocked(prisma.$transaction)
		.mockImplementation(
			async (callback: unknown) =>
				(callback as (tx: unknown) => Promise<unknown>)(tx) as never,
		);
	await expect(
		saveReviewedMaterialConsumption({
			userId: "user",
			review: {
				version: 1,
				reviewedAt: "2026-11-19T10:00:00Z",
				organizationId: "org-a",
				coverage: "",
				projects: [],
				observations: [],
			},
			expectedFingerprint: materialRecordsFingerprint([]),
		}),
	).rejects.toThrow("Journal changed");
	expect(tx.documents.create).not.toHaveBeenCalled();
});

it("does not overwrite a newer material review", async () => {
	const tx = {
		user: {
			findUnique: jest
				.fn()
				.mockResolvedValue({ organizationId: "org-a", status: "active" }),
		},
		sitediaryrecords: { findMany: jest.fn().mockResolvedValue([]) },
		site: { findMany: jest.fn().mockResolvedValue([]) },
		documents: {
			findFirst: jest.fn().mockResolvedValue({ id: "newer-review" }),
			create: jest.fn(),
		},
	};
	jest
		.mocked(prisma.$transaction)
		.mockImplementation(
			async (callback: unknown) =>
				(callback as (tx: unknown) => Promise<unknown>)(tx) as never,
		);
	await expect(
		saveReviewedMaterialConsumption({
			userId: "user",
			review: {
				version: 1,
				reviewedAt: "2026-11-19T10:00:00Z",
				organizationId: "org-a",
				coverage: "",
				projects: [],
				observations: [],
			},
			expectedFingerprint: materialRecordsFingerprint([]),
			expectedReviewDocumentId: "previous-review",
		}),
	).rejects.toThrow("Material review changed");
	expect(tx.documents.create).not.toHaveBeenCalled();
});
