import {
	buildDiaryActPayload,
	type DiaryActInput,
	type DiaryActPreparation,
	diaryActSchema,
} from "./diary-act";

const input: DiaryActInput = {
	siteId: "11111111-1111-4111-8111-111111111111",
	requestId: "22222222-2222-4222-8222-222222222222",
	recordIds: ["33333333-3333-4333-8333-333333333333"],
	kind: "certificate",
	eventDate: "2026-11-12",
	eventTime: "08:00",
	name: "Grīda",
	description: "Betonēšana",
	mark: "BK",
	code: "1",
	caseActId: "181",
	estimateByRecord: {},
	revision: "revision",
};
const preparation: DiaryActPreparation = {
	revision: "revision",
	plans: [],
	works: [
		{
			recordId: input.recordIds[0],
			bisId: "10",
			description: "Betonēšana",
			date: "2026-11-10",
			quantity: 12.5,
			measurement: "59",
			estimateId: "100",
		},
	],
	estimates: [
		{
			id: "100",
			label: "1.1 Betonēšana",
			number: "1.1",
			description: "Betonēšana",
			quantity: "100.0",
			measure: "59",
		},
	],
};

test("groups approved works by the selected BIS estimate position", () => {
	const second = {
		...preparation.works[0],
		recordId: "second",
		bisId: "11",
		quantity: 2.5,
	};
	const payload = buildDiaryActPayload(
		input,
		{ ...preparation, works: [...preparation.works, second] },
		42,
	);
	expect(payload.data.type).toBe("accomplished_work_certificate");
	expect(payload.data.attributes.case_construction_round_id).toBe(42);
	expect(payload.data.relationships.certificate_details).toMatchObject({
		data: [
			{
				attributes: {
					estimate_position_id: 100,
					quantity: "15",
					accomplished_work_ids: [10, 11],
					previous_quantity: null,
				},
			},
		],
	});
});

test("covered-work act links the actual performed-work IDs and quantities", () => {
	const payload = buildDiaryActPayload(
		{ ...input, kind: "covered" },
		preparation,
		null,
	);
	expect(payload.data.relationships.detail).toMatchObject({
		data: { attributes: { logbook_case_act_id: 181, name: "Grīda" } },
	});
	expect(payload.data.relationships.accomplished_works).toEqual({
		data: [
			{ type: "logbooks_join", attributes: { child_id: 10, quantity: "12.5" } },
		],
	});
	expect(payload.data.relationships.certificate_details).toBeUndefined();
});

test("rejects missing estimates, incompatible units and backdated acts", () => {
	expect(() =>
		buildDiaryActPayload(
			{ ...input, estimateByRecord: { [input.recordIds[0]]: "999" } },
			preparation,
			null,
		),
	).toThrow("pozīciju");
	expect(() =>
		buildDiaryActPayload(
			input,
			{
				...preparation,
				estimates: [{ ...preparation.estimates[0], measure: "60" }],
			},
			null,
		),
	).toThrow("mērvienības");
	expect(() =>
		buildDiaryActPayload(
			{ ...input, eventDate: "2026-11-01" },
			preparation,
			null,
		),
	).toThrow("datums");
});

test("validates real dates and the required covered-work plan reference", () => {
	expect(
		diaryActSchema.safeParse({ ...input, eventDate: "2026-02-30" }).success,
	).toBe(false);
	expect(
		diaryActSchema.safeParse({ ...input, kind: "covered", caseActId: "" })
			.success,
	).toBe(false);
	expect(diaryActSchema.safeParse(input).success).toBe(true);
});

test("includes source drawings once and sums material use across selected works", () => {
	const first = {
		...preparation.works[0],
		materialUses: [{ id: "25", quantity: 2 }],
		projectPageIds: ["123"],
	};
	const second = {
		...first,
		bisId: "11",
		recordId: "other",
		materialUses: [{ id: "25", quantity: 3 }],
	};
	const payload = buildDiaryActPayload(
		{ ...input, kind: "covered" },
		{ ...preparation, works: [first, second] },
		null,
	);
	expect(payload.data.relationships.used_materials).toEqual({
		data: [
			{
				type: "construction_materials_join",
				attributes: { construction_material_id: 25, quantity: "5" },
			},
		],
	});
	expect(payload.data.relationships.project_pages).toEqual({
		data: [
			{ type: "project_pages_join", attributes: { project_page_id: 123 } },
		],
	});
});
