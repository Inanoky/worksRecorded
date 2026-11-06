import { prisma } from "@/lib/utils/db";
import { emptyProposal } from "../lib/records";
import { fimaAccess } from "./access";
import { checkFimaWorkspace, syncFimaWorkspace } from "./workspace-sync";

jest.mock("./access", () => ({
	fimaAccess: jest.fn(async () => ({ userId: "user", organizationId: "org" })),
}));
jest.mock("@/server/actions/BIS/service", () => ({
	getBisBaseUrl: () => "https://bis.gov.lv",
}));
jest.mock("@/lib/utils/db", () => ({ prisma: { $transaction: jest.fn() } }));
const db = {
	$queryRaw: jest.fn(),
	fimaWorkRecord: { findMany: jest.fn() },
	site: { findMany: jest.fn() },
	fimaWorkTemplate: { findMany: jest.fn() },
	fimaBisOperation: { findMany: jest.fn() },
};
let rows: Array<{ id: string; version: string }>;
const record = (id: string) => ({
	id,
	proposal: emptyProposal("2026-11-06"),
	sources: [],
	updatedAt: new Date("2026-11-06"),
	version: 1,
});
beforeEach(() => {
	jest.clearAllMocks();
	rows = [
		{ id: "keep", version: "1" },
		{ id: "edit", version: "1" },
		{ id: "remove", version: "1" },
	];
	db.$queryRaw.mockImplementation(async (sql) =>
		sql.strings.join("").includes("AS sites")
			? [{ sites: "s", templates: "t", operations: "o" }]
			: rows,
	);
	db.fimaWorkRecord.findMany.mockImplementation(async ({ where }) =>
		where.id.in.map(record),
	);
	db.site.findMany.mockResolvedValue([]);
	db.fimaWorkTemplate.findMany.mockResolvedValue([]);
	db.fimaBisOperation.findMany.mockResolvedValue([]);
	jest
		.mocked(prisma.$transaction)
		.mockImplementation(async (fn: any) => fn(db));
});
it("uses one consistent snapshot and avoids all full-data loaders when unchanged", async () => {
	const first = await syncFimaWorkspace();
	if (first.kind !== "delta") throw new Error("Expected bootstrap");
	for (const table of [
		db.fimaWorkRecord,
		db.site,
		db.fimaWorkTemplate,
		db.fimaBisOperation,
	])
		table.findMany.mockClear();
	const next = await syncFimaWorkspace(undefined, first.delta.cache);
	expect(next).toEqual({
		kind: "unchanged",
		scope: JSON.stringify(["user:org", null]),
	});
	for (const table of [
		db.fimaWorkRecord,
		db.site,
		db.fimaWorkTemplate,
		db.fimaBisOperation,
	])
		expect(table.findMany).not.toHaveBeenCalled();
	expect(prisma.$transaction).toHaveBeenLastCalledWith(
		expect.any(Function),
		expect.objectContaining({ isolationLevel: "RepeatableRead" }),
	);
});
it("loads only changed IDs, scopes the query, and removes deleted records from the order", async () => {
	const first = await syncFimaWorkspace("site");
	if (first.kind !== "delta") throw new Error("Expected bootstrap");
	rows = [
		{ id: "keep", version: "1" },
		{ id: "edit", version: "2" },
	];
	db.fimaWorkRecord.findMany.mockClear();
	db.site.findMany.mockClear();
	const next = await syncFimaWorkspace("site", first.delta.cache);
	if (next.kind !== "delta") throw new Error("Expected changes");
	expect(next.delta.order).toEqual(["keep", "edit"]);
	expect(next.delta.records.map((r) => r.id)).toEqual(["edit"]);
	expect(db.fimaWorkRecord.findMany).toHaveBeenCalledWith({
		where: { organizationId: "org", siteId: "site", id: { in: ["edit"] } },
	});
	expect(db.site.findMany).not.toHaveBeenCalled();
});
it("checks authorization before querying a cached manifest", async () => {
	jest.mocked(fimaAccess).mockRejectedValueOnce(new Error("Denied"));
	await expect(syncFimaWorkspace("site")).rejects.toThrow("Denied");
	expect(prisma.$transaction).not.toHaveBeenCalled();
});
it("checks activity using a revision string and never invokes full-data loaders", async () => {
	const first = await syncFimaWorkspace();
	if (first.kind !== "delta") throw new Error("Expected bootstrap");
	db.fimaWorkRecord.findMany.mockClear();
	db.site.findMany.mockClear();
	expect(
		(await checkFimaWorkspace(undefined, first.delta.cache.revision)).kind,
	).toBe("unchanged");
	rows = [{ id: "edit", version: "changed" }];
	expect(
		(await checkFimaWorkspace(undefined, first.delta.cache.revision)).kind,
	).toBe("changed");
	expect(db.fimaWorkRecord.findMany).not.toHaveBeenCalled();
	expect(db.site.findMany).not.toHaveBeenCalled();
});
