/** @jest-environment node */

import { loadWorkspaceAccess } from "@/components/projects/workspace-access";
import { readFimaForma2Workspace } from "@/flows/default-construction/backend/forma2-data-read";
import { GET } from "./route";

jest.mock("@/components/projects/workspace-access", () => ({
	loadWorkspaceAccess: jest.fn(),
}));
jest.mock("@/flows/default-construction/backend/forma2-data-read", () => ({
	readFimaForma2Workspace: jest.fn(),
}));

const siteId = "d65ac3f1-e84f-4948-8a08-aaecfd19e97b";
const url = `https://example.test/api/fima/project-forma2?project=${siteId}`;

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(loadWorkspaceAccess).mockResolvedValue({
		descriptor: {
			siteId,
			userId: "user",
			organizationId: "org",
			name: "Olaine stacija",
			flowModuleKey: "default-construction",
			fimaForma2: true,
		},
		organizationLanguage: "lv",
		bisCaseId: "668714",
		bisCaseNumber: null,
		siteDiaryRecordsMap: {},
	});
	jest.mocked(readFimaForma2Workspace).mockResolvedValue({
		input: {
			siteName: "Olaine stacija",
			document: null,
			clientCosts: { positions: [], sources: [], allocations: [] },
		},
		diary: {},
	});
});

it("sends the client inputs and skips the payload when its revision matches", async () => {
	const response = await GET(new Request(url));
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		siteId,
		organizationLanguage: "lv",
		input: { siteName: "Olaine stacija", document: null },
	});
	const unchanged = await GET(
		new Request(url, {
			headers: { "If-None-Match": response.headers.get("etag") ?? "" },
		}),
	);
	expect(unchanged.status).toBe(304);
	expect(await unchanged.text()).toBe("");
});

it("denies requests for projects outside the FIMA workspace", async () => {
	const access = await loadWorkspaceAccess(siteId);
	jest.mocked(loadWorkspaceAccess).mockResolvedValue({
		...access,
		descriptor: { ...access.descriptor, fimaForma2: false },
	});
	expect((await GET(new Request(url))).status).toBe(403);
	expect(readFimaForma2Workspace).not.toHaveBeenCalled();
});
