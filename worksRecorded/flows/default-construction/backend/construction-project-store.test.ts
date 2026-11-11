import { GET, POST } from "@/app/api/sites/[siteId]/construction-project/route";
import { prisma } from "@/lib/utils/db";
import { getConfig } from "@/server/actions/site-diary-actions";
import { readConstructionProjectManifest } from "../visual/project-revision-store";
import type { LimeniProjectSnapshot } from "../visual/project-snapshot-store";
import { mergeProjectDelta, type ProjectDelta } from "../visual/project-sync";
import { fetchProjectSync } from "../visual/project-sync-client";
import { requireConstructionProjectAccess } from "./construction-project-access";

jest.mock("./construction-project-access", () => ({
	requireConstructionProjectAccess: jest.fn(async () => ({
		organizationId: "org",
	})),
}));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: async () => ({ id: "user" }),
}));
jest.mock("../visual/project-revision-store", () => ({
	readConstructionProjectManifest: jest.fn(),
}));
jest.mock("../visual/project-snapshot-store", () => ({
	ProjectAccessError: jest.requireActual("../visual/project-access-error")
		.ProjectAccessError,
	loadLimeniProjectAssets: jest.fn(),
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: async () => ({ enabled: false }),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: async () => "lv",
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: jest.fn(async () => ({})),
	getLimeniDiarySnapshot: jest.fn(),
}));
jest.mock("./forma2-analytics-actions", () => ({
	getDefaultConstructionForma2Results: async () => ({ resultRows: [] }),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: { findMany: jest.fn() },
		photos: { findMany: jest.fn() },
	},
}));
const original = {
	Request: global.Request,
	Response: global.Response,
	fetch: global.fetch,
};
const scope = { params: Promise.resolve({ siteId: "site" }) };
const hash = "a".repeat(64),
	other = "b".repeat(64);
let records: Array<{ id: string; Works: string; Date: Date; createdAt: Date }>;
beforeAll(() =>
	Object.assign(
		global,
		jest.requireActual("next/dist/compiled/@edge-runtime/primitives/fetch"),
	),
);
afterAll(() => Object.assign(global, original));
beforeEach(() => {
	jest.clearAllMocks();
	records = ["keep", "edit", "remove"].map((id) => ({
		id,
		Works: id,
		Date: new Date("2026-11-06"),
		createdAt: new Date("2026-11-06"),
	}));
	jest.mocked(readConstructionProjectManifest).mockResolvedValue({
		organizationId: "org",
		revision: "r1",
		sourceVersions: { diary: hash },
		diaryRowVersions: { keep: hash, edit: hash, remove: hash },
	});
	jest.mocked(prisma.sitediaryrecords.findMany).mockImplementation((async (
		args: Parameters<typeof prisma.sitediaryrecords.findMany>[0],
	) => {
		const ids = (args?.where?.id as { in?: string[] })?.in;
		return records.filter((row) => !ids || ids.includes(row.id)) as never;
	}) as never);
	jest.mocked(prisma.photos.findMany).mockResolvedValue([]);
	global.fetch = jest.fn(async (url, options) => {
		const request = new Request(new URL(String(url), "https://test"), options);
		return options?.method === "POST"
			? POST(request, scope)
			: GET(request, scope);
	});
});
it("runs bootstrap, edited/deleted rows, and a single-request unchanged check for a standard project", async () => {
	const signal = new AbortController().signal;
	const first = (await (
		await fetchProjectSync("site", null, signal, "construction")
	).json()) as LimeniProjectSnapshot;
	expect(first.settings.organizationId).toBe("org");
	expect(first.drawings).toEqual([]);
	expect(first.diary.rows).toHaveLength(3);
	records = records
		.filter((row) => row.id !== "remove")
		.map((row) => (row.id === "edit" ? { ...row, Works: "Updated" } : row));
	jest.mocked(readConstructionProjectManifest).mockResolvedValue({
		organizationId: "org",
		revision: "r2",
		sourceVersions: { diary: other },
		diaryRowVersions: { keep: hash, edit: other },
	});
	jest.mocked(prisma.sitediaryrecords.findMany).mockClear();
	const delta = (await (
		await fetchProjectSync("site", first, signal, "construction")
	).json()) as ProjectDelta;
	expect(delta.diaryRows?.changed.map((row) => row.id)).toEqual(["edit"]);
	expect(delta.diaryRows?.order).toEqual(["keep", "edit"]);
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				siteId: "site",
				organizationId: "org",
				archivedAt: null,
				id: { in: ["edit"] },
			},
		}),
	);
	const merged = mergeProjectDelta(first, delta);
	expect(merged.diary.rows[0]).toBe(first.diary.rows[0]);
	expect(merged.diary.rows[1].Works).toBe("Updated");
	expect(getConfig).toHaveBeenCalledTimes(1);
	jest.mocked(prisma.sitediaryrecords.findMany).mockClear();
	expect(
		(await fetchProjectSync("site", merged, signal, "construction")).status,
	).toBe(304);
	expect(global.fetch).toHaveBeenCalledTimes(4);
	expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
	expect(requireConstructionProjectAccess).toHaveBeenCalledWith("user", "site");
});
