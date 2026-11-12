jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({ getUser: mockGetUser }),
}));
jest.mock(
	"@/flows/default-construction/backend/construction-project-access",
	() => ({ requireConstructionProjectAccess: jest.fn() }),
);
jest.mock("@/lib/utils/db", () => ({
	prisma: { sitediaryrecords: { findMany: jest.fn() } },
}));
jest.mock("@/server/actions/bis-diary-references", () => ({
	getBisDiaryReferences: jest.fn(),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getBisAvailableResponsiblePersons: jest.fn(),
	getBisCaseAvailableMaterials: jest.fn(),
	getBisCharacterMeasures: jest.fn(),
	getSiteGalleryAttachments: jest.fn(),
	syncDeletedSiteDiaryBisRecords: jest.fn(),
}));

import { setImmediate } from "node:timers";
import { GET, POST } from "@/app/api/sites/[siteId]/bis-diary/route";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { ProjectAccessError } from "@/flows/default-construction/visual/project-access-error";
import { prisma } from "@/lib/utils/db";
import { getBisDiaryReferences } from "@/server/actions/bis-diary-references";
import {
	getBisAvailableResponsiblePersons,
	getBisCaseAvailableMaterials,
	getBisCharacterMeasures,
	getSiteGalleryAttachments,
	syncDeletedSiteDiaryBisRecords,
} from "@/server/actions/site-diary-actions";

const mockGetUser = jest.fn();
const context = () => ({ params: Promise.resolve({ siteId: "site" }) });
const request = (kind: string) =>
	({
		url: `https://app.example/api/sites/site/bis-diary?kind=${kind}`,
	}) as Request;
const post = (origin = "https://app.example") =>
	({
		url: "https://app.example/api/sites/site/bis-diary",
		headers: { get: () => origin },
	}) as unknown as Request;
const originalResponse = global.Response;
beforeAll(() => {
	global.Response = {
		json: (
			data: unknown,
			options: { status?: number; headers?: Record<string, string> } = {},
		) => ({
			status: options.status ?? 200,
			json: async () => data,
			headers: {
				get: (key: string) =>
					Object.entries(options.headers ?? {}).find(
						([name]) => name.toLowerCase() === key.toLowerCase(),
					)?.[1] ?? null,
			},
		}),
	} as unknown as typeof Response;
});
afterAll(() => {
	global.Response = originalResponse;
});

beforeEach(() => {
	jest.resetAllMocks();
	mockGetUser.mockResolvedValue({ id: "user" });
	jest
		.mocked(requireConstructionProjectAccess)
		.mockResolvedValue({ bisCaseId: "100" } as never);
	for (const load of [
		getBisAvailableResponsiblePersons,
		getBisCaseAvailableMaterials,
		getBisCharacterMeasures,
		getSiteGalleryAttachments,
	])
		jest.mocked(load).mockResolvedValue([]);
	jest
		.mocked(prisma.sitediaryrecords.findMany)
		.mockResolvedValue([
			{ id: "record", BISId: "100", bisStatus: "approved" },
		] as never);
});

test("checks authentication and construction project access before reading BIS", async () => {
	mockGetUser.mockResolvedValueOnce(null);
	expect((await GET(request("materials"), context())).status).toBe(401);
	expect(getBisCaseAvailableMaterials).not.toHaveBeenCalled();
	jest
		.mocked(requireConstructionProjectAccess)
		.mockRejectedValueOnce(new ProjectAccessError("Denied"));
	expect((await GET(request("materials"), context())).status).toBe(403);
	expect(getBisCaseAvailableMaterials).not.toHaveBeenCalled();
	expect(requireConstructionProjectAccess).toHaveBeenCalledWith("user", "site");
});

test.each([
	["materials", getBisCaseAvailableMaterials],
	["attachments", getSiteGalleryAttachments],
	["measurements", getBisCharacterMeasures],
	["responsiblePeople", getBisAvailableResponsiblePersons],
] as const)("loads only the requested %s list", async (kind, loader) => {
	const result = await GET(request(kind), context());
	expect(result.status).toBe(200);
	expect(await result.json()).toEqual({ data: [] });
	expect(loader).toHaveBeenCalledWith("site");
	expect(syncDeletedSiteDiaryBisRecords).not.toHaveBeenCalled();
	expect(result.headers.get("cache-control")).toContain("no-store");
});

test("loads project references and supports an explicit refresh", async () => {
	await GET(request("references"), context());
	expect(getBisDiaryReferences).toHaveBeenCalledWith("site", false);
	await GET(
		{ url: `${request("references").url}&refresh=1` } as Request,
		context(),
	);
	expect(getBisDiaryReferences).toHaveBeenLastCalledWith("site", true);
});

test("rejects unknown lists, cross-origin syncs and unavailable BIS calls", async () => {
	expect((await GET(request("constructor"), context())).status).toBe(400);
	expect(
		(await POST(post("https://elsewhere.example"), context())).status,
	).toBe(403);
	expect(syncDeletedSiteDiaryBisRecords).not.toHaveBeenCalled();
	jest
		.mocked(getBisCaseAvailableMaterials)
		.mockRejectedValueOnce(new Error("Private details"));
	const result = await GET(request("materials"), context());
	expect(result.status).toBe(502);
	expect(JSON.stringify(await result.json())).not.toContain("Private details");
});

test("syncs the full diary and returns only BIS links after it finishes", async () => {
	let finish!: () => void;
	jest.mocked(syncDeletedSiteDiaryBisRecords).mockReturnValueOnce(
		new Promise((resolve) => {
			finish = () => resolve({ checked: 1, cleared: 0, clearedRecordIds: [] });
		}),
	);
	const pending = POST(post(), context());
	await new Promise((resolve) => setImmediate(resolve));
	expect(syncDeletedSiteDiaryBisRecords).toHaveBeenCalledWith("site", true);
	expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
	expect((await GET(request("measurements"), context())).status).toBe(200);
	finish();
	const result = await pending;
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith({
		where: { siteId: "site", archivedAt: null },
		select: { id: true, BISId: true, bisStatus: true },
	});
	expect(await result.json()).toEqual({
		records: [{ id: "record", BISId: "100", bisStatus: "approved" }],
	});
});
