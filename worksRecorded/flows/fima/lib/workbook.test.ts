import * as XLSX from "xlsx";
import { exportWorkbook, parseWorkbook } from "./workbook";

function book(grid: unknown[][], sheet = "KUCE vs BIS") {
	const w = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(grid), sheet);
	return XLSX.write(w, { type: "array", bookType: "xlsx" });
}
test("imports source and proposal separately and does not treat a related URL as a target", () => {
	const data = book([
		[
			"Lokālais ID",
			"Darbu datums",
			"KUCE darbu apraksts (oriģināls)",
			"Buvconsult piedāvātais BIS ieraksts",
			"Balsti",
			"Amounts",
			"Units",
			"Maiņa",
			"Darbinieku skaits",
			"Saite uz BIS ierakstu",
		],
		[
			"FIMA-039",
			"05.09.2026",
			"MW demontāža",
			"Reviewed text",
			"20-544//22-60",
			1469.06,
			"m",
			"19:00–05:00",
			8,
			"Related: https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/123",
		],
	]);
	const r = parseWorkbook(data, "report.xlsx", "2026-09", "register")[0];
	expect(r.proposal.sourceWork).toBe("MW demontāža");
	expect(r.proposal.description).toBe("Reviewed text");
	expect(r.bisId).toBeUndefined();
	expect(r.proposal.reviewed).toBe(false);
	expect(r.sources[0].cell).toBe("C2");
});
test("extracts both KUCE crews without multiplying or merging the physical work", () => {
	const g = Array.from({ length: 32 }, () => Array<unknown>(24).fill(""));
	for (const c of [2, 9]) {
		g[3][c] = "Worker one";
		g[4][c] = "Worker two";
		g[3][c + 2] = 19 / 24;
		g[3][c + 3] = 5 / 24;
		g[14][c] = "Olaine Station";
		g[16][c] = "MW demontāža";
		g[16][c + 2] = "21-18//22-60";
	}
	const r = parseWorkbook(book(g, "5-6"), "KUCE.xlsx", "2026-09", "kuce");
	expect(r).toHaveLength(2);
	expect(r[0].proposal.workers).toBe(2);
	expect(r[0].proposal.quantity).toBeNull();
	expect(r[0].proposal.start).toBe("19:00");
	expect(r[0].proposal.end).toBe("05:00");
	expect(r[0].sources[0].workers).toEqual(["Worker one", "Worker two"]);
});
test("rejects unknown layouts instead of reporting empty success", () => {
	expect(() =>
		parseWorkbook(book([["unknown"]]), "x.xlsx", "2026-09", "register"),
	).toThrow("Nav atpazītu");
});

test("round-trips register links, versions, dates and exact multiline descriptions", () => {
	const original = parseWorkbook(
		book([
			[
				"Lokālais ID",
				"Darbu datums",
				"KUCE oriģināls",
				"Buvconsult piedāvātais BIS ieraksts",
				"BIS lietas nosaukums",
				"FIMA komentārs – kas jālabo",
			],
			[
				"FIMA-010",
				"02.09.2026",
				"Kompensacijas montāža",
				"  Exact\nreviewed text  ",
				"Olaine",
				"Pārbaudīt rasējumu",
			],
		]),
		"a.xlsx",
		"2026-09",
		"register",
	)[0];
	expect(original.proposal.notes).toContain("Pārbaudīt rasējumu");
	expect(original.caseName).toBe("Olaine");
	const row = {
		...original,
		id: "r",
		localId: "FIMA-010",
		siteId: "s",
		version: 4,
		stage: "draft",
		bisId: "123",
		bisCaseId: "321",
		bisStatus: "draft",
		managed: false,
		snapshot: null,
		updatedAt: "2026-10-15",
	};
	const wb = exportWorkbook([row], { s: "Olaine" }, "https://example.test");
	wb.Sheets["KUCE vs BIS"].C2.v = "Open record";
	const read = parseWorkbook(
		XLSX.write(wb, { type: "array", bookType: "xlsx" }),
		"export.xlsx",
		"2026-09",
		"register",
	)[0];
	expect(read.version).toBe(4);
	expect(read.bisId).toBe("123");
	expect(read.proposal.date).toBe("2026-09-02");
	expect(read.proposal.description).toBe("  Exact\nreviewed text  ");
});
