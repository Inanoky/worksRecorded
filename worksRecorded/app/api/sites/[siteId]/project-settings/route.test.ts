/** @jest-environment node */

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { readProjectSettings } from "@/app/dashboard/sites/[siteId]/settings/load-settings";
import { getWorkspaceAccess } from "@/components/projects/workspace-access";
import { GET } from "./route";

jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: jest.fn(),
}));
jest.mock("@/components/projects/workspace-access", () => ({
	getWorkspaceAccess: jest.fn(),
}));
jest.mock("@/app/dashboard/sites/[siteId]/settings/load-settings", () => ({
	readProjectSettings: jest.fn(),
}));

const getUser = jest.fn();
const params = Promise.resolve({ siteId: "site" });
const request = new Request("http://localhost/api/sites/site/project-settings");
const workspace = {
	siteId: "site",
	userId: "user",
	organizationId: "org",
	name: "Site",
	flowModuleKey: "default-construction",
	visualPreload: true,
} as const;

beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(getKindeServerSession).mockReturnValue({ getUser } as never);
});

it("requires a signed-in user and an authorized Līmeni workspace before loading settings", async () => {
	getUser.mockResolvedValueOnce(null);
	expect((await GET(request, { params })).status).toBe(401);
	expect(getWorkspaceAccess).not.toHaveBeenCalled();
	getUser.mockResolvedValue({ id: workspace.userId });
	jest
		.mocked(getWorkspaceAccess)
		.mockResolvedValueOnce({ ...workspace, visualPreload: false });
	expect((await GET(request, { params })).status).toBe(404);
	expect(readProjectSettings).not.toHaveBeenCalled();
});

it("returns private settings for the authorized project without caching them in the HTTP cache", async () => {
	getUser.mockResolvedValue({ id: workspace.userId });
	jest.mocked(getWorkspaceAccess).mockResolvedValue(workspace);
	jest
		.mocked(readProjectSettings)
		.mockResolvedValue({ siteId: workspace.siteId } as Awaited<
			ReturnType<typeof readProjectSettings>
		>);
	const response = await GET(request, { params });
	expect(getWorkspaceAccess).toHaveBeenCalledWith(workspace.siteId);
	expect(readProjectSettings).toHaveBeenCalledWith(workspace);
	expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	expect(await response.json()).toEqual({ siteId: workspace.siteId });
});
