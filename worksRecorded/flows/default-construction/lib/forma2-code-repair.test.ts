import { normalizeDefaultConstructionForma2State } from "./forma2-analytics";
import { prepareForma2CodeRepair } from "./forma2-code-repair";

const oldWork = "1,10 Ūdensvads - Caurule 2,5 mm";
const newWork = "1.10 Ūdensvads - Caurule 2,5 mm";
const state = {
	otherAnalytics: { description: "Summa 2,5 EUR" },
	defaultConstructionForma2: {
		document: {
			id: "document-id",
			positions: [
				{
					id: "persisted-id",
					code: "1,10",
					categoryCode: "1",
					name: "Caurule 2,5 mm",
					plannedQuantity: 10.5,
					plannedTotalCost: 123.45,
				},
			],
		},
		allocations: [
			{
				sourceId: "diary-id",
				positionId: "persisted-id",
				split: { parts: [{ positionId: "persisted-id", value: 25.5 }] },
			},
		],
		materialRules: [{ positionId: "persisted-id" }],
	},
};
const config = {
	Works: { DropDownOptions: { [oldWork]: oldWork, other: "Caurule 2,5 mm" } },
	otherSettings: {
		defaultConstructionForma2WorkSync: {
			documentId: "document-id",
			entries: [{ positionId: "persisted-id", work: oldWork }],
		},
		defaultConstructionProductivity: {
			works: [
				{ work: oldWork, hourlyCost: 12.5, laborNormHoursPerUnit: "2,5" },
			],
		},
	},
};

it("repairs code and work references while preserving IDs, splits, costs and descriptive commas", () => {
	const result = prepareForma2CodeRepair(state, config);
	expect(result.changedPositions).toBe(1);
	expect(result.workRenames.get(oldWork)).toBe(newWork);
	expect(result.analytics).toEqual({
		...state,
		defaultConstructionForma2: {
			...state.defaultConstructionForma2,
			document: {
				...state.defaultConstructionForma2.document,
				positions: [
					{
						...state.defaultConstructionForma2.document.positions[0],
						code: "1.10",
					},
				],
			},
		},
	});
	expect(result.config).toMatchObject({
		Works: { DropDownOptions: { [newWork]: newWork, other: "Caurule 2,5 mm" } },
		otherSettings: {
			defaultConstructionForma2WorkSync: {
				entries: [{ positionId: "persisted-id", work: newWork }],
			},
			defaultConstructionProductivity: {
				works: [
					{ work: newWork, hourlyCost: 12.5, laborNormHoursPerUnit: "2,5" },
				],
			},
		},
	});
	expect(state.defaultConstructionForma2.document.positions[0].code).toBe(
		"1,10",
	);
});

it("makes a repeated repair a no-op", () => {
	const first = prepareForma2CodeRepair(state, config);
	const second = prepareForma2CodeRepair(first.analytics, first.config);
	expect(second.changedPositions).toBe(0);
	expect(second.workRenames.size).toBe(0);
	expect(second.analytics).toEqual(first.analytics);
	expect(second.config).toEqual(first.config);
});

it("normalizes legacy data on read while keeping the persisted position ID and allocations", () => {
	const normalized = normalizeDefaultConstructionForma2State(
		state.defaultConstructionForma2,
	);
	expect(normalized.document?.positions[0]).toMatchObject({
		id: "persisted-id",
		code: "1.10",
		plannedTotalCost: 123.45,
	});
	expect(normalized.allocations).toEqual(
		state.defaultConstructionForma2.allocations,
	);
});

it("refuses code collisions instead of merging distinct assigned positions", () => {
	const original = state.defaultConstructionForma2.document.positions[0];
	expect(() =>
		prepareForma2CodeRepair(
			{
				defaultConstructionForma2: {
					document: {
						positions: [
							original,
							{ ...original, id: "other-id", code: "1.10" },
						],
					},
				},
			},
			config,
		),
	).toThrow("Position code collision");
});

it("repairs old work labels even when position codes were already corrected", () => {
	const normalized = prepareForma2CodeRepair(state, config);
	const result = prepareForma2CodeRepair(normalized.analytics, config);
	expect(result.changedPositions).toBe(0);
	expect(result.workRenames.get(oldWork)).toBe(newWork);
});

it("refuses conflicting productivity settings under the same corrected work name", () => {
	expect(() =>
		prepareForma2CodeRepair(state, {
			...config,
			rates: { [oldWork]: 15, [newWork]: 20 },
		}),
	).toThrow("Work name collision");
});
