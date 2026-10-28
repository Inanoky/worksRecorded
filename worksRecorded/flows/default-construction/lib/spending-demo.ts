import type { Forma2Position } from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";
import type { SpendingWorkGroup } from "./spending-timeline";

export function createSpendingDemo() {
	const workGroups: SpendingWorkGroup[] = [
		{ id: "sand", label: "Smilts", color: "#16a34a" },
		{ id: "xps", label: "XPS", color: "#eab308" },
		{ id: "estrich", label: "Estrich / betons", color: "#dc2626" },
		{ id: "film", label: "Plēve / hidroizolācija", color: "#2563eb" },
		{ id: "thermowhite", label: "ThermoWhite", color: "#ea580c" },
		{
			id: "pepi",
			label: "PEPI Trafo 7 putu polietilēna plēve, 7mm",
			color: "#34ea7a",
		},
		{ id: "other", label: "Citi darbi", color: "#9333ea" },
	];
	const base: Forma2Position = {
		id: "",
		code: "",
		categoryCode: "",
		categoryName: "",
		name: "",
		kind: "work",
		parentId: null,
		sourceRow: 0,
		unit: "",
		plannedQuantity: null,
		laborNormHoursPerUnit: null,
		hourlyRate: null,
		plannedWorkCost: 0,
		plannedMaterialCost: 0,
		plannedMechanismCost: 0,
		plannedTotalCost: 0,
	};
	const current: Forma2ClientCosts = {
		positions: [],
		sources: [],
		allocations: [],
	};
	const positionGroups: Record<string, string> = {};
	for (const [sectionIndex, section] of [
		"PA1.1",
		"PA1.2",
		"PA1.6",
		"PA1.7",
	].entries()) {
		current.positions.push({
			...base,
			id: section,
			code: section,
			name: section,
		});
		for (const [groupIndex, group] of workGroups.slice(0, 6).entries()) {
			const id = `${section}:${group.id}`;
			const quantity = [1100, 260, 680, 180][sectionIndex];
			const rate = [6, 19, 14, 2, 15, 3][groupIndex];
			positionGroups[id] = group.id;
			current.positions.push({
				...base,
				id,
				parentId: section,
				name: `${section} - ${group.label}`,
				unit: "m2",
				plannedQuantity: quantity,
				plannedWorkCost: quantity * rate * 0.25,
				plannedMaterialCost: quantity * rate * 0.7,
				plannedMechanismCost: quantity * rate * 0.05,
				plannedTotalCost: quantity * rate,
			});
			for (let week = 0; week < 7; week++) {
				const date = new Date(Date.UTC(2026, 8, 7 + week * 7))
					.toISOString()
					.slice(0, 10);
				const amount =
					quantity *
					([0.11, 0.08, 0.07, 0.06, 0.04, 0.075][groupIndex] -
						sectionIndex * 0.004);
				const sourceId = `${id}:${week}`;
				current.sources.push({
					id: sourceId,
					type: "work",
					label: `${section} - ${group.label}`,
					secondaryLabel: "Parauga ieraksts",
					selectedPositionId: id,
					date,
					unit: "m2",
					quantity: amount,
					quantitySource: "drawing",
					hours: amount / 8,
					actualCost: Math.round(amount * rate * 0.25 * 100) / 100,
				});
				current.sources.push({
					id: `material:${sourceId}`,
					type: "material",
					label: `${group.label} · parauga materiāli`,
					secondaryLabel: "Demonstrācijas rēķins",
					selectedPositionId: id,
					date,
					unit: "",
					quantity: null,
					hours: null,
					actualCost: Math.round(amount * rate * 0.62 * 100) / 100,
				});
			}
		}
	}
	current.positions.push(
		{ ...base, id: "extras", name: "Papildu darbi" },
		{
			...base,
			id: "extra-xps",
			parentId: "extras",
			name: "PA1.6 - XPS papildu materiāli",
		},
	);
	positionGroups["extra-xps"] = "xps";
	current.sources.push({
		id: "extra-material",
		type: "material",
		label: "XPS · parauga materiāli",
		secondaryLabel: "Demonstrācijas rēķins",
		date: "2026-10-19",
		unit: "",
		quantity: null,
		hours: null,
		actualCost: 1800,
	});
	current.allocations.push({
		sourceId: "extra-material",
		sourceType: "material",
		positionId: "extra-xps",
		method: "manual",
		confidence: 1,
		assignedAt: "2026-10-19",
	});
	const proposed = {
		...current,
		allocations: current.allocations.map((allocation) => ({ ...allocation })),
	};
	proposed.allocations[0].positionId = "PA1.6:xps";
	return {
		current,
		proposed,
		workGroups,
		positionGroups,
		reassignments: [
			{
				from: "PA1.6 - XPS papildu materiāli",
				to: "PA1.6 - XPS",
				amount: 1800,
			},
		],
	};
}
