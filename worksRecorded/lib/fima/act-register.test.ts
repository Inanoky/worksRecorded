import {
	actChoices,
	actKey,
	allocateFimaActNumbers,
	type FimaActDiaryRecord,
	type FimaActSite,
	makeFimaActRows,
	readFimaActRegister,
	readTrackedFimaActs,
} from "./act-register";

const siteId = "d65ac3f1-e84f-4948-8a08-aaecfd19e97b";
const at = "2026-10-30T08:00:00Z";
const act = {
	id: "7901440",
	collection: "other_acceptance_acts",
	number: null,
	date: "2026-10-29",
	status: "draft",
	works: [{ id: "7895298", quantity: null }],
};
const site = (acts: unknown[]): FimaActSite => ({
	id: siteId,
	name: "Olaine",
	bisCaseId: "668714",
	config: {
		otherSettings: {
			fimaBisActCoverage: { version: 1, caseId: "668714", fetchedAt: at, acts },
		},
	},
});
const record = (drafts: unknown = null): FimaActDiaryRecord => ({
	id: "row",
	fimaNumber: 3997,
	BISId: "7895298",
	Date: null,
	Works: "AEW vadu montāža",
	Works_Custom_1: null,
	Location: "21-1",
	Amounts: 204,
	Units: "m",
	bisStatus: "approved",
	metadata: {
		kuceImport: {
			bisLinks: [
				{ id: "7895298", number: "714" },
				{ id: "7895299", number: "715" },
				{ id: "7895300", type: "received_construction_product", number: "716" },
			],
		},
	},
	drafts,
});
const draft = {
	...act,
	caseId: "668714",
	checkedAt: at,
	nativeAccomplishedWorksLinked: false,
	linkSource: "worksrecorded_draft_attachment",
	plannedWorks: [{ id: "7895298", quantity: 204 }],
	attachmentIds: ["17132126"],
	projectPageIds: ["3490655"],
};

it("keeps manually attached work planned and never multiplies repeated whole-Act draft metadata", () => {
	const rows = [
		record({ records: [draft] }),
		{ ...record({ records: [draft] }), id: "second" },
	];
	const before = JSON.parse(JSON.stringify(rows));
	const [result] = readTrackedFimaActs(site([{ ...act, ...draft }]), rows);
	expect(result.works).toEqual([]);
	expect(result.plannedWorks).toEqual([{ id: "7895298", quantity: 204 }]);
	expect(result.records).toHaveLength(2);
	expect(result.attachmentIds).toEqual(["17132126"]);
	expect(rows).toEqual(before);
});
it("lets a newer native BIS scan replace stale draft status and inclusion without losing saved references", () => {
	const [result] = readTrackedFimaActs(
		site([
			{
				...act,
				status: "approving",
				checkedAt: "2026-10-30T09:00:00Z",
				works: [{ id: "7895298", quantity: 204 }],
			},
		]),
		[record({ records: [draft] })],
	);
	expect(result.status).toBe("approving");
	expect(result.works).toEqual([{ id: "7895298", quantity: 204 }]);
	expect(result.projectPageIds).toEqual(["3490655"]);
});
it("reconstructs a persistent draft missing from cache and rejects a different case", () => {
	const rows = [
		record({ records: [draft, { ...draft, id: "999", caseId: "668708" }] }),
	];
	expect(readTrackedFimaActs(site([]), rows).map((row) => row.id)).toEqual([
		act.id,
	]);
	const wrong = site([act]);
	wrong.bisCaseId = "668708";
	expect(readTrackedFimaActs(wrong, rows).map((row) => row.id)).toEqual([
		"999",
	]);
});
it("joins every performed-work counterpart while excluding receipts and strips record metadata from the client", () => {
	const current = site([
		{ ...act, works: [{ id: "7895299", quantity: 2 }] },
		{ ...act, id: "900", works: [{ id: "7895300", quantity: 3 }] },
	]);
	const acts = readTrackedFimaActs(current, [record()]);
	expect(acts.find((row) => row.id === act.id)?.records).toHaveLength(1);
	expect(acts.find((row) => row.id === "900")?.records).toHaveLength(0);
	const register = allocateFimaActNumbers(
		readFimaActRegister(null),
		acts.map((row) => row.key),
	);
	const rows = makeFimaActRows(
		siteId,
		acts,
		register,
		actChoices(current, acts),
	);
	const detail = rows.find((row) => row.id === act.id);
	expect(detail?.siteId).toBe(siteId);
	expect(detail?.examples).toEqual([]);
	expect(detail?.records[0].fimaBisRecords.map((link) => link.number)).toEqual([
		"714",
		"715",
	]);
	expect(detail?.records[0]).not.toHaveProperty("metadata");
	expect(detail?.records[0]).not.toHaveProperty("drafts");
});
it("allocates stable numbers across ordering, removal, BIS number assignment and new imports", () => {
	const key = actKey(act.collection, act.id);
	const first = allocateFimaActNumbers(readFimaActRegister(null), [
		key,
		actKey(act.collection, "2"),
		key,
	]);
	const saved = JSON.parse(JSON.stringify(first));
	const second = allocateFimaActNumbers(first, [
		key,
		"other_acceptance_acts/1",
	]);
	expect(second.entries[key].number).toBe(first.entries[key].number);
	expect(second.entries["other_acceptance_acts/1"].number).toBe(3);
	expect(second.entries["other_acceptance_acts/2"]).toEqual(
		first.entries["other_acceptance_acts/2"],
	);
	expect(first).toEqual(saved);
	const rows = makeFimaActRows(
		siteId,
		readTrackedFimaActs(site([{ ...act, number: "KT-33" }])),
		second,
		[],
	);
	expect(rows[0].localNumber).toBe("FIMA-AKT-000002");
});
it("fails closed on malformed register data instead of resetting user history", () => {
	expect(() =>
		readFimaActRegister({ otherSettings: { fimaActRegister: { version: 2 } } }),
	).toThrow();
});
it("does not resolve a saved example through a different BIS case", () => {
	const current = site([act]);
	const acts = readTrackedFimaActs(current);
	const register = allocateFimaActNumbers(
		readFimaActRegister(null),
		acts.map((row) => row.key),
	);
	register.entries[acts[0].key].examples = [
		{ siteId, caseId: "668708", collection: act.collection, id: act.id },
	];
	expect(
		makeFimaActRows(siteId, acts, register, actChoices(current, acts))[0]
			.examples[0],
	).toMatchObject({ caseId: "668708", unavailable: true });
});
