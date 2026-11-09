import { GET } from "@/app/api/sites/[siteId]/construction-project/bootstrap/route";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getConfig } from "@/server/actions/site-diary-actions";
import { ProjectAccessError } from "../visual/project-access-error";
import { requireConstructionProjectAccess } from "./construction-project-access";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("./construction-project-access", () => ({
	requireConstructionProjectAccess: jest.fn(),
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: jest.fn(),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: jest.fn(),
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: { findMany: jest.fn(), groupBy: jest.fn() },
		photos: { findMany: jest.fn() },
	},
}));

const original = {
	Request: global.Request,
	Response: global.Response,
};
const scope = { params: Promise.resolve({ siteId: "site" }) };

beforeAll(() =>
	Object.assign(
		global,
		jest.requireActual("next/dist/compiled/@edge-runtime/primitives/fetch"),
	),
);
afterAll(() => Object.assign(global, original));
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest.mocked(requireConstructionProjectAccess).mockResolvedValue({
		organizationId: "org",
		bisCaseId: null,
	});
	jest.mocked(getOrganizationLanguageByUserId).mockResolvedValue("lv");
	jest.mocked(getConfig).mockResolvedValue({ Works: {} } as never);
	jest
		.mocked(prisma.sitediaryrecords.groupBy)
		.mockResolvedValue([
			{ Date: new Date("2026-11-09") },
			{ Date: new Date("2026-11-08") },
			{ Date: new Date("2026-11-07") },
		] as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "record",
			Date: new Date("2026-11-09"),
			createdAt: new Date("2026-11-09"),
			Photos: [],
		},
	] as never);
	jest.mocked(prisma.photos.findMany).mockResolvedValue([]);
});

it("returns a three-day bootstrap without loading Forma2, BIS, or a manifest", async () => {
	const response = await GET(
		new Request("https://test/api/sites/site/construction-project/bootstrap"),
		scope,
	);
	const payload = await response.json();
	expect(response.status).toBe(200);
	expect(response.headers.get("cache-control")).toBe("private, no-store");
	expect(payload).toMatchObject({
		kind: "construction-bootstrap",
		snapshot: {
			bootstrap: true,
			settings: {
				siteId: "site",
				organizationId: "org",
				bisEnabled: false,
			},
			diary: { rows: [{ id: "record" }], mediaPhotos: [] },
			drawings: [],
		},
	});
	expect(payload.snapshot.version).toMatch(/^bootstrap:[a-f0-9]{64}$/);
	expect(requireConstructionProjectAccess).toHaveBeenCalledTimes(1);
	expect(getConfig).toHaveBeenCalledWith("site", { flowId: "default" });
	expect(getDashboardBisStatus).not.toHaveBeenCalled();
	expect(prisma.sitediaryrecords.groupBy).toHaveBeenCalledWith(
		expect.objectContaining({
			by: ["Date"],
			take: 3,
		}),
	);
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				Date: {
					in: [
						new Date("2026-11-09"),
						new Date("2026-11-08"),
						new Date("2026-11-07"),
					],
				},
			}),
		}),
	);
});

it("checks BIS only when the authorized project has a BIS case", async () => {
	jest.mocked(requireConstructionProjectAccess).mockResolvedValue({
		organizationId: "org",
		bisCaseId: "case",
	});
	jest
		.mocked(getDashboardBisStatus)
		.mockResolvedValue({ enabled: true, unavailable: false });
	const response = await GET(
		new Request("https://test/api/sites/site/construction-project/bootstrap"),
		scope,
	);
	expect((await response.json()).snapshot.settings.bisEnabled).toBe(true);
	expect(getDashboardBisStatus).toHaveBeenCalledWith("user", "site", true);
});

it("returns forbidden without project data when default-construction access fails", async () => {
	jest
		.mocked(requireConstructionProjectAccess)
		.mockRejectedValue(new ProjectAccessError("Project access denied"));
	const response = await GET(
		new Request("https://test/api/sites/site/construction-project/bootstrap"),
		scope,
	);
	expect(response.status).toBe(403);
	expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
	expect(getConfig).not.toHaveBeenCalled();
});

it("returns unauthorized before checking project access", async () => {
	jest.mocked(requireUser).mockRejectedValue(new Error("No session"));
	const response = await GET(
		new Request("https://test/api/sites/site/construction-project/bootstrap"),
		scope,
	);
	expect(response.status).toBe(401);
	expect(requireConstructionProjectAccess).not.toHaveBeenCalled();
});
