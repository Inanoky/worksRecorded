import { GET } from "@/app/api/sites/[siteId]/construction-project/bootstrap/route";
import { getDashboardBisStatusForCase } from "@/lib/bis/dashboard-status";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { ProjectAccessError } from "../visual/project-access-error";
import { requireConstructionProjectAccess } from "./construction-project-access";

jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("./construction-project-access", () => ({
	requireConstructionProjectAccess: jest.fn(),
}));
jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatusForCase: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$queryRaw: jest.fn(),
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
		siteName: "Project",
		siteDiaryRecordsMap: {},
		organizationId: "org",
		bisCaseId: null,
		organizationLanguage: "lv",
		diaryConfig: { Works: {} },
	});
	jest.mocked(prisma.$queryRaw).mockResolvedValue([
		{
			rows: [
				{
					id: "record",
					Date: new Date("2026-11-09"),
					createdAt: new Date("2026-11-09"),
					Date_Custom_1: null,
					Date_Custom_2: null,
					Photos: [],
				},
			],
			mediaPhotos: [],
		},
	] as never);
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
				organizationLanguage: "lv",
			},
			diary: { rows: [{ id: "record" }], mediaPhotos: [] },
			drawings: [],
			config: { Works: {} },
		},
	});
	expect(payload.snapshot.version).toMatch(/^bootstrap:[a-f0-9]{64}$/);
	expect(requireConstructionProjectAccess).toHaveBeenCalledTimes(1);
	expect(getDashboardBisStatusForCase).not.toHaveBeenCalled();
	expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
});

it("checks BIS only when the authorized project has a BIS case", async () => {
	jest.mocked(requireConstructionProjectAccess).mockResolvedValue({
		siteName: "Project",
		siteDiaryRecordsMap: {},
		organizationId: "org",
		bisCaseId: "case",
		organizationLanguage: "lv",
		diaryConfig: { Works: {} },
	});
	jest
		.mocked(getDashboardBisStatusForCase)
		.mockResolvedValue({ enabled: true, unavailable: false });
	const response = await GET(
		new Request("https://test/api/sites/site/construction-project/bootstrap"),
		scope,
	);
	expect((await response.json()).snapshot.settings.bisEnabled).toBe(true);
	expect(getDashboardBisStatusForCase).toHaveBeenCalledWith(
		"user",
		"site",
		true,
		"case",
	);
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
	expect(prisma.$queryRaw).not.toHaveBeenCalled();
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
