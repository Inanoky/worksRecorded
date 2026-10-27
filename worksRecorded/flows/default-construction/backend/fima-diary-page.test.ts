const findMany = jest.fn();
const count = jest.fn();
const sitesFindMany = jest.fn();
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		sitediaryrecords: { findMany, count },
		site: { findMany: sitesFindMany },
	},
}));

import { buildFimaDiaryFilterWhere } from "./fima-diary-filters";
import { buildFimaDiaryPageWhere, loadFimaDiaryPage } from "./fima-diary-page";

beforeEach(() => {
	jest.clearAllMocks();
	findMany.mockResolvedValue([]);
	count.mockResolvedValue(200);
	sitesFindMany.mockResolvedValue([]);
});

it("loads act indexes once per project and returns only coverage for the row's current BIS link", async () => {
	findMany.mockResolvedValue([
		{
			id: "row",
			siteId: "project",
			BISId: "587",
			Site: { name: "Olaine", bisCaseId: "668714" },
			evalMetadata: null,
		},
	]);
	sitesFindMany.mockResolvedValue([
		{
			id: "project",
			bisCaseId: "668714",
			siteDiaryRecordsMap: {
				otherSettings: {
					fimaBisActCoverage: {
						version: 1,
						caseId: "668714",
						fetchedAt: "2026-10-27T10:00:00Z",
						acts: [
							{
								id: "101",
								collection: "other_acceptance_acts",
								number: "KT-16",
								status: "approved",
								date: "2026-10-07",
								works: [{ id: "587", quantity: 3 }],
							},
						],
					},
				},
			},
		},
	]);
	const result = await loadFimaDiaryPage("org", {
		projectId: "project",
		projectView: true,
	});
	expect(result.rows[0].fimaActCoverage?.acts[0]).toMatchObject({
		id: "101",
		works: [{ id: "587", quantity: 3 }],
	});
	expect(sitesFindMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { organizationId: "org", id: { in: ["project"] } },
		}),
	);
	expect(result.rows[0].Site).toEqual({ name: "Olaine" });
});

it.each([true, false])(
	"finds formatted FIMA IDs before pagination (project view: %s)",
	async (projectView) => {
		count.mockResolvedValue(1);
		findMany.mockResolvedValue([
			{ id: "row-3383", fimaNumber: 3383, Site: null, evalMetadata: null },
		]);
		const filters = {
			projectView,
			keyword: "FIMA-003383",
			projectId: "project",
			review: "coordinate_with_fima",
		} as const;
		const result = await loadFimaDiaryPage("org", filters);
		const where = findMany.mock.calls[0][0].where;
		expect(where.OR).toContainEqual({ fimaNumber: 3383 });
		expect(where).toMatchObject({
			archivedAt: null,
			siteId: "project",
			Site: { organizationId: "org" },
			AND: buildFimaDiaryFilterWhere(filters),
		});
		expect(count).toHaveBeenCalledWith({ where });
		expect(result.rows).toEqual([
			expect.objectContaining({ id: "row-3383", fimaNumber: 3383 }),
		]);
		expect(result.totalCount).toBe(1);
	},
);

it.each(["FIMA-0", "FIMA-2147483648", "night"])(
	"keeps non-ID or invalid search %s as ordinary text",
	(keyword) => {
		const where = buildFimaDiaryPageWhere("org", {
			keyword,
			projectView: true,
		});
		expect(where.OR).not.toContainEqual(
			expect.objectContaining({ fimaNumber: expect.anything() }),
		);
		expect(where.OR).toContainEqual({
			Works: { contains: keyword, mode: "insensitive" },
		});
	},
);

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
	const latestStatus = {
		id: "badge",
		kind: "status",
		actorName: "Anna",
		text: "Rīcība: Labot",
	};
	const state = {
		version: 3,
		materials: [{ id: "material" }],
		history: [first, latestStatus, latest],
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
			history: [latestStatus, latest],
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

it("applies combined workflow filters to both records and total count before pagination", async () => {
	const filters = {
		projectId: "project",
		page: 2,
		review: "needs_changes",
		bis: "missing",
		materials: "missing",
		examples: "present",
	} as const;
	await loadFimaDiaryPage("fima-org", filters);
	const where = findMany.mock.calls[0][0].where;
	expect(where.AND).toEqual(buildFimaDiaryFilterWhere(filters));
	expect(where.AND).toHaveLength(4);
	expect(count).toHaveBeenCalledWith({ where });
	expect(where.Site.organizationId).toBe("fima-org");
});

it("maps project numeric fields to the existing diary format", async () => {
	findMany.mockResolvedValue([
		{ id: "row", fimaNumber: 42, Amounts: 2, Site: null, evalMetadata: null },
	]);
	const result = await loadFimaDiaryPage("org", { projectView: true });
	expect(result.rows[0]).toMatchObject({
		fimaNumber: 42,
		Amounts: "2",
		fimaCollaboration: { history: [], version: 0 },
	});
});

it("includes the source KUCE descriptions beside examples in a paginated response", async () => {
	findMany
		.mockResolvedValueOnce([
			{
				id: "target",
				siteId: "project",
				Site: null,
				evalMetadata: {
					fimaCollaboration: {
						examples: {
							entries: [
								{
									id: "123",
									label: "BIS 123",
									url: "https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/123",
								},
							],
						},
					},
				},
			},
		])
		.mockResolvedValueOnce([
			{
				id: "source",
				siteId: "another-project",
				fimaNumber: 42,
				Works: "Source KUCE work",
				BISId: "123",
				evalMetadata: null,
			},
		]);
	const result = await loadFimaDiaryPage("org", { projectView: true });
	expect(result.rows[0]).toMatchObject({
		id: "target",
		fimaExampleSources: {
			"123": [
				{
					id: "source",
					siteId: "another-project",
					fimaNumber: 42,
					work: "Source KUCE work",
				},
			],
		},
	});
	expect(result.rows[0]).not.toHaveProperty("evalMetadata");
});
