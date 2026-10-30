import { mapCommonDiaryListRecord } from "@/lib/site-diary/list-record";
import { readFimaCollaboration } from "./diary-collaboration";
import {
	type FimaDiaryWorkspace,
	fimaDiaryRowMatches,
	hydrateFimaDiaryRows,
	mergeFimaDiaryDelta,
	selectFimaDiaryPage,
} from "./diary-workspace";

const row = (id: string) => ({
	...mapCommonDiaryListRecord({
		id,
		Date: new Date("2026-10-20"),
		createdAt: new Date("2026-10-20"),
		Works: "Montāža",
		Location: "21-18",
	}),
	fimaNumber: 3383,
});
const config = {
	otherSettings: { bisCaseId: "668714", bisCaseNumber: "BIS-BL-668714-524" },
} as FimaDiaryWorkspace["config"];
const workspace = (): FimaDiaryWorkspace => ({
	siteId: "project",
	revision: "v1",
	configVersion: "c1",
	versions: {},
	config,
	rows: Array.from({ length: 151 }, (_, i) => row(String(i).padStart(3, "0"))),
	bisEnabled: true,
	organizationLanguage: "lv",
});
it("filters the entire project before paginating and exports all matching rows", () => {
	const data = workspace();
	data.rows[0].Works = "Unique work";
	expect(selectFimaDiaryPage(data, { page: 2 }).rows).toHaveLength(75);
	expect(
		selectFimaDiaryPage(data, { page: 15, workFilter: "Unique work" }),
	).toMatchObject({ page: 1, totalCount: 1, rows: [{ id: "000" }] });
	expect(selectFimaDiaryPage(data, {}, true).rows).toHaveLength(151);
	expect(data.rows[0].id).toBe("000");
});
it.each([
	"FIMA-003383",
	"668714",
	"BIS-BL-668714-524",
	"KT-2026-21",
	"1240",
	"montāža",
])("matches identifiers and work text: %s", (keyword) => {
	const record = {
		...row("a"),
		fimaBisRecords: [{ id: "778899", number: "1240" }],
		fimaActCoverage: {
			caseId: "668714",
			checkedAt: "2026-10-30",
			acts: [
				{
					id: "222",
					number: "KT-2026-21",
					date: null,
					status: "approved",
					collection: "construction_work_acts",
					works: [],
				},
			],
		},
	};
	expect(fimaDiaryRowMatches(record, { keyword }, config)).toBe(true);
	expect(fimaDiaryRowMatches(record, { keyword: "nonexistent" }, config)).toBe(
		false,
	);
});
it("combines actual BIS status, human workflow, presence, dates, work and location", () => {
	const record = {
		...row("a"),
		BISId: "123",
		bisStatus: "approving",
		fimaCollaboration: readFimaCollaboration({
			fimaCollaboration: { status: "coordinate_with_fima" },
		}),
	};
	const filters = {
		bisStatus: "pending",
		review: "coordinate_with_fima",
		bis: "present",
		materials: "missing",
		examples: "missing",
		workFilter: "Montāža",
		floorFilter: "21-18",
		dateFrom: "2026-10-20",
		dateTo: "2026-10-20",
	} as const;
	expect(fimaDiaryRowMatches(record, filters, config)).toBe(true);
	expect(
		fimaDiaryRowMatches(record, { ...filters, bisStatus: "approved" }, config),
	).toBe(false);
	expect(
		fimaDiaryRowMatches(record, { ...filters, dateFrom: "2026-10-21" }, config),
	).toBe(false);
});
it("merges changed/new/deleted rows and retains unaffected objects and private human state", () => {
	const current = workspace();
	const untouched = current.rows[0];
	const next = mergeFimaDiaryDelta(current, {
		siteId: "project",
		revision: "v2",
		configVersion: "c1",
		versions: { "001": "new", new: "new" },
		rows: [{ ...row("001"), Comments: "Human correction" }, row("new")],
		removed: ["002"],
	});
	expect(next.rows.find((row) => row.id === "000")).toBe(untouched);
	expect(next.rows.find((row) => row.id === "001")?.Comments).toBe(
		"Human correction",
	);
	expect(next.rows.some((row) => row.id === "002")).toBe(false);
	expect(next.rows.some((row) => row.id === "new")).toBe(true);
	expect(current.rows).toHaveLength(151);
	expect(next.config).toBe(config);
	expect(() =>
		mergeFimaDiaryDelta(current, { siteId: "other" } as never),
	).toThrow();
});
it("hydrates JSON dates without cloning unaffected cached objects", () => {
	const current = row("a");
	expect(hydrateFimaDiaryRows([current])[0]).toBe(current);
	const loaded = hydrateFimaDiaryRows([JSON.parse(JSON.stringify(current))])[0];
	expect(loaded.Date).toBeInstanceOf(Date);
	expect(loaded.Date_Custom_1).toBeUndefined();
});
