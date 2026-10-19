import { fimaDiaryColumns, groupFimaDiaryRows } from "./diary-table";

it("places the local FIMA number between the date and BIS record number", () => {
	expect(fimaDiaryColumns.slice(0, 3).map((column) => column.label)).toEqual([
		"Datums",
		"FIMA Nr.",
		"BIS ieraksta Nr.",
	]);
	expect(fimaDiaryColumns[1].order).toBeGreaterThan(fimaDiaryColumns[0].order);
	expect(fimaDiaryColumns[1].order).toBeLessThan(fimaDiaryColumns[2].order);
});

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
