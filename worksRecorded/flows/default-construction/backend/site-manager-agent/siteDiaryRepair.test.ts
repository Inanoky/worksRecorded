import type { ConfigMap } from "./AIschemas";
import type { SiteDiaryExtractionCheckerResult } from "./siteDiaryExtractionChecker";
import {
	applySiteDiaryRepair,
	buildSiteDiaryRepairRequest,
	type SiteDiaryRepair,
	selectDiaryRepairCandidates,
} from "./siteDiaryRepair";

const config: ConfigMap = {
	Works: {
		Type: "dropdown",
		DropDownOptions: {
			water: "1.1 Ūdensvada PE100 OD63 caurules montāža",
			other: "1.10 Ūdensvada PE100 OD32 caurules montāža",
			sewer: "2.1 Kanalizācijas PP D200 caurules montāža",
			trench: "Trenching",
			notes: "Piezīmes",
		},
	},
	Units: { Type: "dropdown", DropDownOptions: { m: "m", m3: "m3" } },
	Location: { Type: "textInput" },
};
const source = "Iebūvēts ūdensvads OD63, 22 metri. Izrakta tranšeja 30 m3.";
const water = config.Works.DropDownOptions?.water as string;
const review: SiteDiaryExtractionCheckerResult = {
	verdict: "needs_model_repair",
	reason: "Jālabo kategorija",
	repairInstructions: "Izmanto ūdensvada pozīciju.",
	badSplitSignals: [],
	repairActions: [],
	expectedRecordCount: 1,
	coverageComplete: true,
	rowReviews: [
		{
			rowIndex: 0,
			status: "needs_review",
			reason: "Nepareizs darbs",
			sourceText: source,
		},
	],
};
const empty = (): SiteDiaryRepair => ({
	changes: [],
	replacements: [],
	additions: [],
	unresolvedRowIds: [],
	reason: "Labots",
});
const requestFor = (
	rows: Record<string, unknown>[] = [{ Works: "Piezīmes", Comments: source }],
	checker = review,
) =>
	buildSiteDiaryRepairRequest({
		rows,
		checker,
		source,
		config,
		referenceDate: "2026-11-18",
	});
const change = (
	field: "Works" | "Amounts" | "Units" | "Date" | "Comments" | "Location",
	value: string | number | null,
	rowId = "row-1",
) => ({
	rowId,
	field,
	value,
	sourceSpans: [source],
	calculationEvidence: null,
});
const replacement = (workCandidateId = "work-1") => ({
	workCandidateId,
	Date: "2026-11-18",
	Location: null,
	Comments: source,
	Amounts: null,
	Units: null,
	WorkersInvolved: null,
	TimeInvolved: null,
	calculationEvidence: null,
	sourceSpans: [source],
});

describe("targeted diary repair", () => {
	it("retains a configured category explicitly requested by the checker in a crowded catalog", () => {
		const crowded = {
			...config,
			Works: {
				Type: "dropdown",
				DropDownOptions: {
					...Object.fromEntries(
						Array.from({ length: 30 }, (_, i) => [
							String(i),
							`${i + 2}.11 Ūdensvada tranšejas rakšana grunts izvešana`,
						]),
					),
					trench: "Trenching",
					notes: "Piezīmes",
				},
			},
		};
		expect(
			selectDiaryRepairCandidates(
				crowded,
				"Ūdensvada tranšejai izrakti 66 kubikmetri grunts.",
				"Rindai mainīt Works uz Trenching.",
			).map((candidate) => candidate.work),
		).toContain("Trenching");
	});
	it("supports concise position-and-quantity source quotes", () => {
		const request = buildSiteDiaryRepairRequest({
			rows: [{ Works: "Piezīmes" }],
			checker: review,
			source: "1.1 22m",
			config,
			referenceDate: "2026-11-18",
		});
		const patch = { ...change("Works", "work-1"), sourceSpans: ["1.1 22m"] };
		expect(
			applySiteDiaryRepair(request, { ...empty(), changes: [patch] }).rows[0]
				.Works,
		).toBe(water);
	});
	it("ranks exact position references without confusing 1.1 with 1.10 or quantities", () => {
		expect(
			selectDiaryRepairCandidates(config, "Pabeigta pozīcija 1.1.")[0].work,
		).toBe(water);
		expect(
			selectDiaryRepairCandidates(config, "Pabeigta pozīcija 1.10.")[0].work,
		).toBe(config.Works.DropDownOptions?.other);
		expect(
			selectDiaryRepairCandidates(config, "Pabeigti 1.1 metri."),
		).toHaveLength(5);
	});
	it("retrieves Latvian speech and generic English work names, respecting dimensions", () => {
		const candidates = selectDiaryRepairCandidates(config, source);
		expect(candidates.map((c) => c.work)).toEqual(
			expect.arrayContaining([water, "Trenching"]),
		);
		expect(candidates.map((c) => c.work)).not.toContain(
			config.Works.DropDownOptions?.other,
		);
		expect(
			selectDiaryRepairCandidates(
				config,
				"Iebūvēta kanalizācijas caurule OD220.",
			).map((c) => c.work),
		).not.toContain(config.Works.DropDownOptions?.sewer);
		expect(
			selectDiaryRepairCandidates(
				config,
				"Iebūvēta kanalizācijas caurule 220 mm.",
				"Izmanto 2.1 Kanalizācijas PP D200 caurules montāža",
			).map((c) => c.work),
		).not.toContain(config.Works.DropDownOptions?.sewer);
	});
	it("uses only aliases pointing to configured project works", () => {
		const scoped = {
			...config,
			otherSettings: {
				defaultConstructionWorkAliases: {
					entries: [
						{ alias: "zilā truba viens", work: water },
						{ alias: "sarkanā truba", work: "Foreign work" },
					],
				},
			},
		} as unknown as ConfigMap;
		expect(
			selectDiaryRepairCandidates(scoped, "Iebūvēta zilā truba 1.")[0],
		).toMatchObject({ work: water, aliases: ["zilā truba viens"] });
		expect(
			selectDiaryRepairCandidates(config, "Iebūvēta zilā truba 1.").find(
				(c) => c.work === water,
			)?.aliases,
		).toEqual([]);
		expect(
			selectDiaryRepairCandidates(scoped, "Sarkanā truba.").some(
				(c) => c.work === "Foreign work",
			),
		).toBe(false);
	});
	it("keeps six accepted rows byte-for-byte while patching the seventh", () => {
		const good = Array.from({ length: 6 }, (_, i) => ({
			Works: "Trenching",
			Comments: `Apstiprināts ${i}`,
			Amounts: 30,
			Units: "m3",
			extra: { marker: i },
			calculationEvidence: null,
		}));
		const rows = [...good, { Works: "Piezīmes", Comments: source }];
		const checker = {
			...review,
			expectedRecordCount: 7,
			rowReviews: rows.map((_, rowIndex) => ({
				rowIndex,
				status:
					rowIndex === 6 ? ("needs_review" as const) : ("accept" as const),
				reason: "Pārbaudīts",
				sourceText: source,
			})),
			modelRepairTargets: [
				{
					rowIndex: 6,
					fields: ["Works" as const],
					allowStructuralChanges: false,
				},
			],
		};
		const request = requestFor(rows, checker);
		expect(request.targets.map((r) => r.rowId)).toEqual(["row-7"]);
		const before = JSON.stringify(rows);
		const output = applySiteDiaryRepair(request, {
			...empty(),
			changes: [change("Works", "work-1", "row-7")],
		});
		expect(output.rows.slice(0, 6)).toEqual(good);
		expect(output.lockedRowIndexes).toEqual([0, 1, 2, 3, 4, 5]);
		expect(output.rows[6].Works).toBe(water);
		expect(JSON.stringify(rows)).toBe(before);
		expect(() =>
			applySiteDiaryRepair(request, {
				...empty(),
				changes: [change("Comments", "Nevēlams", "row-1")],
			}),
		).toThrow("REPAIR_ROW_NOT_EDITABLE");
		expect(() =>
			applySiteDiaryRepair(request, {
				...empty(),
				changes: [change("Comments", "Nevēlams", "row-7")],
			}),
		).toThrow("REPAIR_FIELD_NOT_EDITABLE");
	});
	it("validates amount and unit together after all patches are merged", () => {
		const validate = jest.fn((row) => row.Amounts === 22 && row.Units === "m");
		const result = applySiteDiaryRepair(
			requestFor(),
			{ ...empty(), changes: [change("Amounts", 22), change("Units", "m")] },
			validate,
		);
		expect(result.rows[0]).toMatchObject({ Amounts: 22, Units: "m" });
		expect(validate).toHaveBeenCalledTimes(2);
		expect(() =>
			applySiteDiaryRepair(
				requestFor(),
				{ ...empty(), changes: [change("Amounts", 999)] },
				() => false,
			),
		).toThrow("REPAIR_UNSUPPORTED_VALUE");
	});
	it.each([
		[
			"unknown row",
			{ changes: [change("Works", "work-1", "row-99")] },
			"REPAIR_ROW_NOT_EDITABLE",
		],
		[
			"foreign work",
			{ changes: [change("Works", "work-999")] },
			"REPAIR_UNKNOWN_WORK",
		],
		["unit", { changes: [change("Units", "invented")] }, "REPAIR_UNKNOWN_UNIT"],
		[
			"date",
			{ changes: [change("Date", "2026-02-30")] },
			"REPAIR_INVALID_DATE",
		],
		[
			"negative amount",
			{ changes: [change("Amounts", -1)] },
			"REPAIR_INVALID_NUMBER",
		],
		[
			"duplicate field",
			{ changes: [change("Units", "m"), change("Units", "m3")] },
			"REPAIR_DUPLICATE_FIELD",
		],
		[
			"source",
			{
				changes: [
					{
						...change("Units", "m"),
						sourceSpans: ["Pilnīgi izdomāts teikums."],
					},
				],
			},
			"REPAIR_UNGROUNDED_SOURCE",
		],
		[
			"unresolved row edited",
			{ changes: [change("Units", "m")], unresolvedRowIds: ["row-1"] },
			"REPAIR_ROW_NOT_EDITABLE",
		],
		[
			"unknown unresolved row",
			{ unresolvedRowIds: ["row-9"] },
			"REPAIR_UNKNOWN_ROW",
		],
		["no changes", {}, "REPAIR_NO_CHANGES"],
	])("rejects invalid %s", (_, patch, error) => {
		expect(() =>
			applySiteDiaryRepair(requestFor(), { ...empty(), ...patch }),
		).toThrow(error);
	});
	it("tolerates punctuation in source quotes without changing source numbers", () => {
		const patch = change("Works", "work-1");
		patch.sourceSpans = [source.replace("metri.", "metri,")];
		expect(
			applySiteDiaryRepair(requestFor(), { ...empty(), changes: [patch] })
				.rows[0].Works,
		).toBe(water);
		patch.sourceSpans = [source.replace("22", "23")];
		expect(() =>
			applySiteDiaryRepair(requestFor(), { ...empty(), changes: [patch] }),
		).toThrow("REPAIR_UNGROUNDED_SOURCE");
	});
	it("splits one problematic row through a scoped replacement", () => {
		const request = requestFor(undefined, {
			...review,
			expectedRecordCount: 2,
		});
		const result = applySiteDiaryRepair(request, {
			...empty(),
			replacements: [
				{ rowIds: ["row-1"], rows: [replacement(), replacement("work-4")] },
			],
		});
		expect(result.rows.map((r) => r.Works)).toEqual([water, "Trenching"]);
		expect(() =>
			applySiteDiaryRepair(requestFor(), {
				...empty(),
				replacements: [{ rowIds: ["row-1"], rows: [replacement()] }],
			}),
		).toThrow("REPAIR_INVALID_REPLACEMENT");
	});
	it("merges only named problematic rows and retains locked rows in order", () => {
		const rows = [
			{ Works: water },
			{ Works: "Trenching", Amounts: 30, Units: "m3" },
			{ Works: water },
		];
		const request = requestFor(rows, {
			...review,
			expectedRecordCount: 2,
			rowReviews: [
				{
					rowIndex: 1,
					status: "accept",
					sourceText: source,
					reason: "Pareizi",
				},
			],
		});
		const output = applySiteDiaryRepair(request, {
			...empty(),
			replacements: [{ rowIds: ["row-3", "row-1"], rows: [replacement()] }],
		});
		expect(output.rows).toEqual([
			expect.objectContaining({ Works: water }),
			rows[1],
		]);
		expect(output.lockedRowIndexes).toEqual([1]);
	});
	it("adds a missing activity while leaving every accepted row locked", () => {
		const row = { Works: water, Amounts: 22, Units: "m" };
		const request = requestFor([row], {
			...review,
			expectedRecordCount: 2,
			coverageComplete: false,
			rowReviews: [
				{
					rowIndex: 0,
					status: "accept",
					sourceText: source,
					reason: "Pareizi",
				},
			],
		});
		expect(request.targets).toHaveLength(0);
		const result = applySiteDiaryRepair(request, {
			...empty(),
			additions: [replacement("work-4")],
		});
		expect(result.rows).toEqual([
			row,
			expect.objectContaining({ Works: "Trenching" }),
		]);
		expect(() =>
			applySiteDiaryRepair(requestFor(), {
				...empty(),
				additions: [replacement()],
			}),
		).toThrow("REPAIR_ADDITION_NOT_ALLOWED");
	});
	it("rejects mismatched counts and overlapping structural changes", () => {
		const request = requestFor(undefined, {
			...review,
			expectedRecordCount: 2,
		});
		expect(() =>
			applySiteDiaryRepair(request, {
				...empty(),
				replacements: [{ rowIds: ["row-1"], rows: [replacement()] }],
			}),
		).toThrow("REPAIR_EXPECTED_ROW_COUNT");
		expect(() =>
			applySiteDiaryRepair(request, {
				...empty(),
				replacements: [
					{ rowIds: ["row-1"], rows: [replacement()] },
					{ rowIds: ["row-1"], rows: [] },
				],
			}),
		).toThrow("REPAIR_INVALID_REPLACEMENT");
	});
});
