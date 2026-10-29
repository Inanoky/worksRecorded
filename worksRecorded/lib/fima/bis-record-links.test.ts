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

it("links material receipts without a performed-work ID and deduplicates creation metadata", () => {
	const receipts = [
		{ id: "7895558", number: "705", type: "received_construction_product" },
		{ id: "7895578", number: "706", type: "received_construction_product" },
	];
	expect(
		readFimaBisRecordLinks({
			fimaMaterialReceiptPlan: { bisRecords: receipts },
			fimaBisDraftCreation: { records: receipts },
		}),
	).toEqual(receipts);
	expect(getFimaBisRecordUrl("7895558", "received_construction_product")).toBe(
		"https://bis.gov.lv/bisp/lv/portal/logbooks/received_construction_products/7895558/edit",
	);
});

it("retains receipt types when projected links are read again beside an active work", () => {
	const receipt = {
		id: "7900422",
		number: "713",
		type: "received_construction_product",
	};
	expect(
		readFimaBisRecordLinks({ kuceImport: { bisLinks: [receipt] } }, "123"),
	).toEqual([{ id: "123", number: null }, receipt]);
	expect(
		readFimaBisRecordLinks({ kuceImport: { bisLinks: [receipt] } }, "7900422"),
	).toEqual([receipt]);
});

it("recovers explicit created documents but excludes examples, plans and stale work counterparts", () => {
	const metadata = {
		fimaBisDraftCreation20261029: {
			records: [{ id: "7900366", number: "420", type: "performed_work" }],
		},
		fimaMaterialReceiptPlan: { bisRecords: [{ id: "7900422", number: "713" }] },
		fimaCollaboration: { examples: { entries: [{ id: "5026340" }] } },
		fimaBisDraftCreation: {
			records: [{ id: "pending" }, { id: "999", type: "unknown" }],
		},
	};
	expect(readFimaBisRecordLinks(metadata)).toEqual([
		{ id: "7900366", number: "420" },
		{ id: "7900422", number: "713", type: "received_construction_product" },
	]);
	expect(readFimaBisRecordLinks(metadata, "222")).toEqual([
		{ id: "222", number: null },
		{ id: "7900422", number: "713", type: "received_construction_product" },
	]);
});
