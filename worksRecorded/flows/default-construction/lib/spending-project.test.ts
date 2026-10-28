import { createSpendingDemo } from "./spending-demo";
import { projectSpendingInput } from "./spending-project";
import { buildSpendingEntries } from "./spending-timeline";

it("uses saved project costs and allocations unchanged with original source messages", () => {
	const costs = createSpendingDemo().current;
	const input = projectSpendingInput({
		data: { siteName: "Project", clientCosts: costs },
		config: {},
		rows: [
			{
				id: "source",
				originalUserComment: "Original message",
				Comments: "Processed text",
			},
		],
	});
	expect(input.current).toBe(costs);
	expect(input.proposed).toBe(costs);
	expect(input.reassignments).toEqual([]);
	expect(input.projectData).toBe(true);
	expect(input.sourceTexts.source).toBe("Original message");
	expect(buildSpendingEntries(input.current)).toEqual(
		buildSpendingEntries(costs),
	);
});

it("uses the configured Izpildshēmas work names and colours", () => {
	const costs = createSpendingDemo().current;
	const input = projectSpendingInput({
		data: { siteName: "Project", clientCosts: costs },
		rows: [],
		config: {
			otherSettings: {
				limeniVisualLayers: {
					version: 1,
					categories: [
						{ id: "other", label: "Other", color: "#9333ea" },
						{ id: "xps", label: "XPS insulation", color: "#eab308" },
					],
					works: [{ work: "Alias", positionId: "PA1.6:xps", layerId: "xps" }],
					zones: [],
					redirects: {},
				},
			},
		},
	});
	expect(input.positionGroups["PA1.6:xps"]).toBe("xps");
	expect(input.workGroups.find((group) => group.id === "xps")?.label).toBe(
		"XPS insulation",
	);
});
