import { groupFimaDiaryRows } from "./diary-table";

it("groups timestamps by Latvian work day and sorts days, preserving each day's input order", () => {
	const rows = [
		{ id: "old", Date: "2026-09-01T08:00:00Z" },
		{ id: "late", Date: "2026-09-01T22:00:00Z" },
		{ id: "new", Date: new Date("2026-09-02T08:00:00Z") },
		{ id: "missing", Date: null },
		{ id: "invalid", Date: "invalid" },
	];
	const groups = groupFimaDiaryRows(rows);
	expect(groups.map((group) => group.key)).toEqual([
		"2026-09-02",
		"2026-09-01",
		"undated",
	]);
	expect(groups[0].rows.map((row) => row.id)).toEqual(["late", "new"]);
	expect(groups[2].rows.map((row) => row.id)).toEqual(["missing", "invalid"]);
	expect(rows.map((row) => row.id)).toEqual([
		"old",
		"late",
		"new",
		"missing",
		"invalid",
	]);
});
