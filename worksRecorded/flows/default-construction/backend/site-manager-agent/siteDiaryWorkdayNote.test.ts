import type { ConfigMap } from "./AIschemas";
import {
	acceptSourceBackedWorkdayNote,
	normalizeWorkdayNoteRows,
} from "./siteDiaryWorkdayNote";

const config: ConfigMap = {
	Works: { Type: "dropdown", DropDownOptions: { notes: "Piezīmes" } },
	Comments: { Type: "textInput" },
	TimeInvolved: { Type: "float" },
};

describe("source-backed workday notes", () => {
	it.each([
		["strādājam no 7.00 - 18.00", 11],
		["Vakar strādājām no 07:30 līdz 18:00.", 10.5],
		["Darba laiks 7.00–18.00", 11],
		["Strādāju no 22.00 - 6.00", null],
	])("preserves %s as one note with supported hours", (source, hours) => {
		const rows = normalizeWorkdayNoteRows(
			[
				{
					Date: "2026-09-16",
					Works: "Concrete works",
					Location: "Project",
					Amounts: 7,
					Units: "hour",
					WorkersInvolved: 1,
					TimeInvolved: 7,
					Works_Custom_1: "Invented work",
				},
			],
			source,
			config,
		);

		expect(rows).toEqual([
			{
				Date: "2026-09-16",
				Works: "Piezīmes",
				Comments: source,
				Location: null,
				Amounts: null,
				Units: null,
				WorkersInvolved: null,
				TimeInvolved: hours,
			},
		]);
		expect(acceptSourceBackedWorkdayNote(rows, source)).not.toBeNull();
	});

	it.each([
		"Vai strādājam no 7.00 - 18.00?",
		"strādājam no 7.00 - 18.00?",
		"Saglabā iepriekšējo ierakstu no 7.00 - 18.00",
		"strādājam no 7.00 - 18.00, ieklāti 45 m2 OSB",
		"strādājam no 7.00 - 18.00, 2 cilvēki",
		"strādājam no 7.60 - 18.00",
		"strādājam no 27.00 - 18.00",
		"Sveiki",
		"No plkst. 7.00",
	])("does not turn other messages into working-time notes: %s", (source) => {
		const rows = [{ Works: "Notes", Comments: source }];
		expect(normalizeWorkdayNoteRows(rows, source, config)).toBe(rows);
		expect(acceptSourceBackedWorkdayNote(rows, source)).toBeNull();
	});

	it("leaves row-count repairs and configurations without notes to the checker", () => {
		const source = "strādājam no 7.00 - 18.00";
		const rows = [{ Works: "Concrete works" }, { Works: "Painting" }];
		expect(normalizeWorkdayNoteRows(rows, source, config)).toBe(rows);
		expect(acceptSourceBackedWorkdayNote(rows, source)).toBeNull();
		const noNotes = {
			...config,
			Works: { Type: "dropdown", DropDownOptions: { work: "Concrete works" } },
		};
		expect(normalizeWorkdayNoteRows([rows[0]], source, noNotes)).toEqual([
			rows[0],
		]);
	});

	it.each([
		{ Works: "Concrete works" },
		{ Location: "Project" },
		{ Amounts: 7 },
		{ WorkersInvolved: 1 },
		{ TimeInvolved: 7 },
		{ Comments: "Betonēšana no 7.00 līdz 18.00" },
		{ Works_Custom_1: "Betonēšana" },
	])("keeps unsupported row fields blocking: %j", (unsupported) => {
		const source = "strādājam no 7.00 - 18.00";
		const rows = normalizeWorkdayNoteRows([{}], source, config);
		expect(
			acceptSourceBackedWorkdayNote([{ ...rows[0], ...unsupported }], source),
		).toBeNull();
	});
});
