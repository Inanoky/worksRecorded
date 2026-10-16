import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { requireBisAccessTokenForSite } from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";
import { orgCheck } from "@/server/actions/shared-actions";
import { getBisCaseAvailableMaterials } from "@/server/actions/site-diary-actions";
import {
	getFimaDiaryCollaboration,
	refreshFimaBisMaterials,
	saveFimaDiaryCollaboration,
} from "./fima-diary-collaboration";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findUnique: jest.fn(), findMany: jest.fn() },
		user: { findUnique: jest.fn() },
		sitediaryrecords: { findFirst: jest.fn() },
		$transaction: jest.fn(),
		$executeRaw: jest.fn(),
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getBisCaseAvailableMaterials: jest.fn(),
}));
jest.mock("@/server/actions/BIS/service", () => ({
	getBisBaseUrl: jest.fn(),
	requireBisAccessTokenForSite: jest.fn(),
}));
jest.mock("@/server/actions/BIS/TestBisEnv/relay", () => ({
	bisFetch: jest.fn(),
}));
const scope = {
	siteId: "c39cb04c-8ce5-477d-acd0-99586a82d850",
	recordId: "record",
};
const requestId = "79867920-ab26-41a6-9bd8-f3ea10ffa452";
let metadata: Record<string, unknown>;
const tx = { $queryRaw: jest.fn(), sitediaryrecords: { update: jest.fn() } };
beforeEach(() => {
	jest.resetAllMocks();
	metadata = { kuceImport: { key: "preserve-original-source" } };
	jest.mocked(requireUser).mockResolvedValue({ id: "member" } as never);
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ id: scope.siteId, organizationId: "fima" } as never);
	jest.mocked(prisma.site.findUnique).mockResolvedValue({
		organizationId: "fima",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	} as never);
	jest
		.mocked(prisma.user.findUnique)
		.mockResolvedValue({ firstName: "Anna", lastName: "Bērziņa" } as never);
	jest
		.mocked(prisma.sitediaryrecords.findFirst)
		.mockImplementation((() =>
			Promise.resolve({ id: "record", evalMetadata: metadata })) as never);
	tx.$queryRaw.mockImplementation(async () => [{ evalMetadata: metadata }]);
	tx.sitediaryrecords.update.mockImplementation(async ({ data }) => {
		metadata = data.evalMetadata;
		return {};
	});
	jest
		.mocked(prisma.$transaction)
		.mockImplementation(
			async (fn: unknown) => (fn as (value: typeof tx) => unknown)(tx) as never,
		);
});
it("denies a user outside the project's organization", async () => {
	jest.mocked(orgCheck).mockResolvedValue(false);
	await expect(getFimaDiaryCollaboration(scope)).rejects.toThrow(
		"Nav piekļuves",
	);
	expect(prisma.sitediaryrecords.findFirst).not.toHaveBeenCalled();
});
it("does not enable collaboration for another organization's unconfigured project", async () => {
	jest.mocked(prisma.site.findUnique).mockResolvedValue({
		organizationId: "other",
		siteDiaryRecordsMap: {},
	} as never);
	await expect(getFimaDiaryCollaboration(scope)).rejects.toThrow(
		"nav ieslēgti",
	);
});
it("requires the record to belong to the requested site and organization", async () => {
	jest.mocked(prisma.sitediaryrecords.findFirst).mockResolvedValue(null);
	await expect(getFimaDiaryCollaboration(scope)).rejects.toThrow(
		"Ieraksts nav pieejams",
	);
	expect(prisma.sitediaryrecords.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId: scope.siteId,
				organizationId: "fima",
				archivedAt: null,
			}),
		}),
	);
});
it("appends authenticated comments without replacing KUCE provenance and retries safely", async () => {
	const args = {
		...scope,
		requestId,
		kind: "comment" as const,
		text: "  Pārbaudīts  ",
	};
	await saveFimaDiaryCollaboration(args);
	const state = await saveFimaDiaryCollaboration(args);
	expect(state.history).toHaveLength(1);
	expect(state.history[0]).toMatchObject({
		actorId: "member",
		actorName: "Anna Bērziņa",
		text: "Pārbaudīts",
	});
	expect(metadata.kuceImport).toEqual({ key: "preserve-original-source" });
});
it("prevents stale review edits", async () => {
	await saveFimaDiaryCollaboration({
		...scope,
		requestId,
		kind: "comment",
		text: "Jauns komentārs",
	});
	await expect(
		saveFimaDiaryCollaboration({
			...scope,
			requestId: "0bcc12cf-619b-47a5-a0ec-5a365a4ecc0c",
			kind: "status",
			status: "needs_changes",
			expectedVersion: 0,
		}),
	).rejects.toThrow("Ieraksts ir mainīts");
});
it("validates quantities and stores material names from BIS rather than client labels", async () => {
	jest.mocked(getBisCaseAvailableMaterials).mockResolvedValue([
		{
			id: "m1",
			label: "BIS oriģinālais nosaukums",
			measurementUnit: "gab.",
			availableQuantity: 4,
		},
	] as never);
	const args = {
		...scope,
		requestId,
		kind: "materials" as const,
		expectedVersion: 0,
		materials: [{ id: "m1", label: "Client text", unit: "m", quantity: 2 }],
	};
	const state = await saveFimaDiaryCollaboration(args);
	expect(state.materials[0]).toMatchObject({
		label: "BIS oriģinālais nosaukums",
		unit: "gab.",
	});
	await expect(
		saveFimaDiaryCollaboration({
			...args,
			materials: [{ ...args.materials[0], quantity: 5 }],
		}),
	).rejects.toThrow("vairs nav pieejams");
});

it("keeps the previous BIS material snapshot if BIS is unavailable", async () => {
	metadata.fimaCollaboration = {
		version: 1,
		status: "needs_changes",
		materials: [],
		history: [],
		bisMaterials: { fetchedAt: "2026-10-14T10:00:00Z", entries: [] },
	};
	const before = JSON.stringify(metadata);
	jest.mocked(prisma.site.findUnique).mockResolvedValue({
		organizationId: "fima",
		bisCaseId: "456",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	} as never);
	jest.mocked(prisma.sitediaryrecords.findFirst).mockResolvedValue({
		id: "record",
		BISId: "123",
		evalMetadata: metadata,
	} as never);
	jest
		.mocked(prisma.site.findMany)
		.mockResolvedValue([{ id: scope.siteId, bisCaseId: "456" }] as never);
	jest
		.mocked(requireBisAccessTokenForSite)
		.mockResolvedValue({ accessToken: "test-token" } as never);
	jest.mocked(bisFetch).mockResolvedValue({ ok: false, status: 503 } as never);
	await expect(refreshFimaBisMaterials(scope)).rejects.toThrow("503");
	expect(prisma.$executeRaw).not.toHaveBeenCalled();
	expect(JSON.stringify(metadata)).toBe(before);
});
