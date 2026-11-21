import { buildForma2ActCoverage } from "./forma2-act-coverage";
import {
	buildForma2AnalyticsView,
	type Forma2ActualSource,
	type Forma2Position,
} from "./forma2-analytics";

const position: Forma2Position = {
	id: "console",
	code: "01",
	categoryCode: "",
	categoryName: "",
	name: "Konsoles montāža",
	kind: "work",
	parentId: null,
	sourceRow: 1,
	unit: "komplekts",
	plannedQuantity: 40,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: 0,
	plannedMaterialCost: 0,
	plannedMechanismCost: 0,
	plannedTotalCost: 0,
};

const source: Forma2ActualSource = {
	id: "diary",
	type: "work",
	label: position.name,
	secondaryLabel: "",
	selectedPositionId: position.id,
	date: null,
	unit: position.unit,
	quantity: 20,
	hours: null,
	actualCost: null,
};

function act(id: string, status: string, quantity: number | null) {
	return {
		id,
		collection: "other_acceptance_acts",
		key: `other_acceptance_acts/${id}`,
		number: null,
		status,
		works: [{ id: "101", quantity }],
	};
}

it("measures approved native quantities against the existing execution total", () => {
	const view = buildForma2AnalyticsView({
		positions: [position],
		sources: [
			source,
			{ ...source, id: "uncovered", quantity: 10 },
			{ ...source, id: "other-unit", unit: "m", quantity: 50 },
		],
		allocations: [],
	});
	const acts = [
		act("1", "approved", 12),
		act("2", "approved", 8),
		act("3", "approving", 20),
		act("4", "draft", 20),
		act("5", "approved", null),
		{ ...act("6", "approved", 50), works: [{ id: "102", quantity: 50 }] },
		act("7", "approved", 20),
	];
	const coverage = buildForma2ActCoverage({
		caseId: "12",
		documentId: "example",
		positions: [position],
		works: view.mappingRows,
		bisWorkIdsByRecord: new Map([
			["diary", ["101"]],
			["other-unit", ["102"]],
		]),
		acts,
		assignments: acts.slice(0, 6).map((entry) => ({
			actKey: entry.key,
			positionId: position.id,
		})),
	});
	expect(view.resultRows[0].actualQuantity).toBe(30);
	expect(coverage.coveredByPosition.console).toBe(12);
	expect(coverage.acts[5]).toMatchObject({ matchedWorks: 0, nativeWorks: 1 });
	expect(coverage.acts[6].positionId).toBeNull();
});

it.each([
	{ label: source.label, selectedPositionId: "other", unit: source.unit },
	{ label: "Stiprinājuma montāža", selectedPositionId: null, unit: "" },
])(
	"excludes an ambiguous BIS link from the covered quantity",
	(conflictingRow) => {
		const other = { ...position, id: "other" };
		const view = buildForma2AnalyticsView({
			positions: [position, other],
			sources: [source, { ...source, id: "other-row", ...conflictingRow }],
			allocations: [],
		});
		const acts = [act("1", "approved", 50)];
		expect(
			buildForma2ActCoverage({
				caseId: "12",
				documentId: "example",
				positions: [position, other],
				works: view.mappingRows,
				bisWorkIdsByRecord: new Map([
					["diary", ["101"]],
					["other-row", ["101"]],
				]),
				acts,
				assignments: [{ actKey: acts[0].key, positionId: position.id }],
			}).coveredByPosition,
		).toEqual({});
	},
);
