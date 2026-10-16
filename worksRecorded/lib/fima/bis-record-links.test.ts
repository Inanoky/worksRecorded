import {
	fimaBisRecordNumber,
	getFimaBisRecordUrl,
	readFimaBisRecordLinks,
} from "./bis-record-links";

it("uses the BIS document number for the current linked record", () => {
	expect(
		readFimaBisRecordLinks(
			{
				kuceImport: {
					bisLinks: [{ id: "7787127", number: "653", caseId: "668714" }],
				},
			},
			"7787127",
		),
	).toEqual([{ id: "7787127", number: "653" }]);
	expect(getFimaBisRecordUrl("7787127")).toBe(
		"https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/7787127/edit?entry_ids%5B%5D=7787127",
	);
});
it("does not label a recreated record with the old record's number", () => {
	expect(
		readFimaBisRecordLinks(
			{ kuceImport: { bisLinks: [{ id: "111", number: "367" }] } },
			"222",
		),
	).toEqual([{ id: "222", number: null }]);
});
it("uses a refreshed number for a newly linked record", () => {
	expect(
		readFimaBisRecordLinks(
			{
				kuceImport: { bisLinks: [{ id: "111", number: "367" }] },
				fimaCollaboration: {
					bisMaterials: { entries: [{ bisId: "222", number: "653" }] },
				},
			},
			"222",
		),
	).toEqual([{ id: "222", number: "653" }]);
});
it("preserves multiple historical links and deduplicates repeated references", () => {
	expect(
		readFimaBisRecordLinks({
			kuceImport: {
				bisLinks: [
					{ id: "111", number: "367" },
					{ id: "222", number: "368" },
					{ id: "111", number: "367" },
				],
			},
		}),
	).toEqual([
		{ id: "111", number: "367" },
		{ id: "222", number: "368" },
	]);
});
it("rejects malformed record IDs and never treats a case number as a record number", () => {
	expect(
		readFimaBisRecordLinks({
			kuceImport: {
				bisLinks: [
					{ id: "../bad", number: "123" },
					{ id: "111", number: "BIS-BL-668714" },
				],
			},
		}),
	).toEqual([{ id: "111", number: null }]);
	expect(getFimaBisRecordUrl("../bad")).toBeNull();
	expect(fimaBisRecordNumber(false)).toBeNull();
});
