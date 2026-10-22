import { prisma } from "@/lib/utils/db";
import { loadProjectRevision } from "./project-revision-store";
import { requireVisualAccess } from "./store";

jest.mock("@/lib/utils/db", () => ({ prisma: { $queryRaw: jest.fn() } }));
jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("./project-snapshot-store", () => ({
	projectAccessFailure: (error: unknown) => {
		throw error;
	},
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(prisma.$queryRaw).mockResolvedValue([{ revision: "same-data" }]);
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "org" } as never);
});
afterEach(() => jest.restoreAllMocks());

it("revalidates computed snapshots when deployment code changes even if the database does not", async () => {
	const environment = jest.replaceProperty(process, "env", {
		...process.env,
		VERCEL_GIT_COMMIT_SHA: "before",
	});
	const before = await loadProjectRevision("user", "site");
	expect(await loadProjectRevision("user", "site")).toBe(before);
	environment.replaceValue({ ...process.env, VERCEL_GIT_COMMIT_SHA: "after" });
	expect(await loadProjectRevision("user", "site")).not.toBe(before);
});

it("uses a stable revision when deployment metadata is unavailable", async () => {
	jest.replaceProperty(process, "env", {
		...process.env,
		VERCEL_GIT_COMMIT_SHA: "",
	});
	const first = await loadProjectRevision("user", "site");
	expect(first).not.toBe("project-v2-same-data");
	expect(await loadProjectRevision("user", "site")).toBe(first);
});

it("checks project access before reading a cached revision", async () => {
	jest.mocked(requireVisualAccess).mockRejectedValue(new Error("Denied"));
	await expect(loadProjectRevision("user", "site")).rejects.toThrow("Denied");
	expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
