const findMany = jest.fn();
const count = jest.fn();
jest.mock("@/lib/utils/db", () => ({
	prisma: { sitediaryrecords: { findMany, count } },
}));

import { buildFimaDiaryPageWhere, loadFimaDiaryPage } from "./fima-diary-page";

beforeEach(() => {
	jest.clearAllMocks();
	findMany.mockResolvedValue([]);
	count.mockResolvedValue(200);
});

it("requires both organization ownership and the FIMA flag for every query", async () => {
	await loadFimaDiaryPage("fima-org", { page: 2, projectId: "project" });
	const where = expect.objectContaining({
		archivedAt: null,
		siteId: "project",
		Site: {
			organizationId: "fima-org",
			siteDiaryRecordsMap: {
				path: ["otherSettings", "fimaCollaboration"],
				equals: true,
			},
		},
	});
	expect(findMany).toHaveBeenCalledWith(
		expect.objectContaining({ where, skip: 50, take: 50 }),
	);
	expect(count).toHaveBeenCalledWith({ where });
	expect(findMany.mock.calls[0][0].select.Site.select).not.toHaveProperty(
		"siteDiaryRecordsMap",
	);
});

it("preserves project filters, keyword fields, dates and the 75-row page size", async () => {
	const filters = {
		projectView: true,
		page: 2,
		projectId: "project",
		workFilter: "Walls",
		floorFilter: "Floor 1",
		keyword: "night",
		dateFrom: "2026-10-01",
		dateTo: "2026-10-03",
	};
	const where = buildFimaDiaryPageWhere("org", filters);
	expect(where).toMatchObject({
		Works: "Walls",
		Location: "Floor 1",
		Date: { gte: new Date("2026-10-01"), lt: new Date("2026-10-04") },
	});
	expect(where.OR).toContainEqual({
		Works_Custom_2: { contains: "night", mode: "insensitive" },
	});
	await loadFimaDiaryPage("org", filters);
	expect(findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where,
			skip: 75,
			take: 75,
			orderBy: [{ Date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
		}),
	);
});

it("returns only the latest comment and current materials, not extraction metadata or full history", async () => {
	const first = { id: "old", kind: "comment", text: "Old" };
	const latest = { id: "new", kind: "comment", text: "New" };
	const state = {
		version: 3,
		materials: [{ id: "material" }],
		history: [first, { kind: "status" }, latest],
		bisMaterials: { fetchedAt: "today", entries: [] },
	};
	findMany.mockResolvedValue([
		{
			id: "row",
			siteId: "site",
			Amounts: 2,
			User: { firstName: "A" },
			Site: { name: "Site", bisCaseId: "case" },
			evalMetadata: {
				secretExtraction: "not-for-list",
				fimaCollaboration: state,
			},
		},
	]);
	const result = await loadFimaDiaryPage("org", {});
	expect(result.rows[0]).toMatchObject({
		Amounts: 2,
		fimaCollaboration: {
			version: 3,
			history: [latest],
			materials: state.materials,
			bisMaterials: state.bisMaterials,
		},
	});
	expect(result.rows[0]).not.toHaveProperty("evalMetadata");
	expect(result.rows[0]).not.toHaveProperty("User");
});

it("clamps a deleted last page and never requests unlimited history", async () => {
	count.mockResolvedValue(51);
	const result = await loadFimaDiaryPage("org", { page: 20 });
	expect(result).toMatchObject({ page: 2, totalPages: 2, pageSize: 50 });
	expect(findMany).toHaveBeenLastCalledWith(
		expect.objectContaining({ skip: 50, take: 50 }),
	);
});

it("maps project numeric fields to the existing diary format", async () => {
	findMany.mockResolvedValue([
		{ id: "row", Amounts: 2, Site: null, evalMetadata: null },
	]);
	const result = await loadFimaDiaryPage("org", { projectView: true });
	expect(result.rows[0]).toMatchObject({
		Amounts: "2",
		fimaCollaboration: { history: [], version: 0 },
	});
});
