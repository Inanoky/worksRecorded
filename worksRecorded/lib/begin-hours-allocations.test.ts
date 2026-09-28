import {
	BEGIN_STORAGE_MARKER,
	type BeginAllocation,
	type BeginDay,
	parseBeginDay,
	splitLegacyBeginHoursComment,
	withBeginAllocation,
} from "./begin-hours";

const day: BeginDay = {
	kind: BEGIN_STORAGE_MARKER,
	version: 1,
	date: "2026-09-25",
	importedAt: "2026-09-28T07:00:00Z",
	importedBy: "test",
	sourceCompany: "Test",
	capturedOn: "2026-09-28",
	rateCents: 1250,
	objects: ["Site"],
	entries: [],
	history: [],
};
const allocation: BeginAllocation = {
	recordId: "record",
	explanation: "761 / 60 / 2 = 6,34",
	hours: 761 / 60 / 2,
	workers: 2,
	source: "legacy-comment",
	savedAt: "2026-09-28T08:00:00Z",
	sourceImportedAt: day.importedAt,
};

it("reads old snapshots without allocation data", () => {
	expect(parseBeginDay(JSON.stringify(day))).toEqual(day);
});

it("roundtrips per-record explanations and previous revisions", () => {
	const updated = withBeginAllocation(day, allocation);
	expect(parseBeginDay(JSON.stringify(updated)).allocations).toEqual([
		allocation,
	]);
	expect(
		parseBeginDay({ ...updated, history: [updated] }).history[0].allocations,
	).toEqual([allocation]);
	expect(day.allocations).toBeUndefined();
});

it("replaces only the selected record's explanation and keeps other records", () => {
	const second = { ...allocation, recordId: "second" };
	const updated = withBeginAllocation(
		withBeginAllocation(withBeginAllocation(day, allocation), second),
		{ ...allocation, explanation: "Updated" },
	);
	expect(updated.allocations).toHaveLength(2);
	expect(
		updated.allocations?.find((item) => item.recordId === "record")
			?.explanation,
	).toBe("Updated");
	expect(updated.allocations).toContainEqual(second);
});

it.each([
	"Stundu uzskaite 28.09.2026.: Begin projekta kopstundas.",
	"Stundu aprēķins (lietotāja precizējums, 25.09.2026.): 761 / 60 / 2.",
	"Stundu sadalījums (aplēse, 25.09.2026.): Piešķirtas 0 stundas.",
])("moves only the labeled suffix: %s", (explanation) => {
	const comment = "Darba apraksts.\nOtrā rindkopa.";
	expect(splitLegacyBeginHoursComment(`${comment}\r\n${explanation}`)).toEqual({
		comment,
		explanation,
	});
	expect(splitLegacyBeginHoursComment(comment)).toBeNull();
});

it.each([
	null,
	"",
	"Strādāja 3 stundas, pabeigta plēve.",
	"Darbs. Stundu uzskaite 28.09.2026.: nevis atsevišķa sadaļa",
	"Stundu uzskaite nav norādīta.",
])("does not strip ambiguous work comments: %s", (comment) => {
	expect(splitLegacyBeginHoursComment(comment)).toBeNull();
});
