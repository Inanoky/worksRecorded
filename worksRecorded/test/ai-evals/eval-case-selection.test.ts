import {
	formatEvalSelectionFilters,
	formatEvalSelectionSummary,
	selectEvalCases,
} from "./eval-case-selection";

describe("AI eval case selection", () => {
	const cases = [
		{
			id: "smoke-save",
			tags: ["save", "latvian"],
			tier: "smoke" as const,
			priority: "critical" as const,
			turns: 1,
		},
		{
			id: "bis-guidance",
			tags: ["bis", "no-save"],
			tier: "regression" as const,
			priority: "standard" as const,
			turns: 2,
		},
		{
			id: "memory-extended",
			tags: ["memory"],
			tier: "extended" as const,
			priority: "extended" as const,
			turns: 1,
		},
	];

	it("selects all cases by default and counts interactions", () => {
		const selection = selectEvalCases({
			cases,
			argv: [],
			getInteractionIds: (evalCase) =>
				Array.from(
					{ length: evalCase.turns },
					(_, index) => `${evalCase.id}:turn-${index + 1}`,
				),
		});

		expect(selection.selectedCaseIds).toEqual([
			"smoke-save",
			"bis-guidance",
			"memory-extended",
		]);
		expect(selection.selectedInteractions).toBe(4);
		expect(selection.tierCounts).toEqual({
			smoke: 1,
			regression: 1,
			extended: 1,
		});
		expect(selection.priorityCounts).toEqual({
			critical: 1,
			standard: 1,
			extended: 1,
		});
	});

	it("filters by case id, interaction id, tag, tier, and priority", () => {
		const byCase = selectEvalCases({ cases, argv: ["--case", "bis-guidance"] });
		const byInteraction = selectEvalCases({
			cases,
			argv: ["--case", "bis-guidance:turn-2"],
			getInteractionIds: (evalCase) =>
				Array.from(
					{ length: evalCase.turns },
					(_, index) => `${evalCase.id}:turn-${index + 1}`,
				),
		});
		const byTag = selectEvalCases({ cases, argv: ["--tag", "bis"] });
		const byTier = selectEvalCases({ cases, argv: ["--tier=smoke"] });
		const byPriority = selectEvalCases({
			cases,
			argv: ["--priority", "critical"],
		});
		const byCritical = selectEvalCases({ cases, argv: ["--critical"] });

		expect(byCase.selectedCaseIds).toEqual(["bis-guidance"]);
		expect(byInteraction.selectedCaseIds).toEqual(["bis-guidance"]);
		expect(byTag.selectedCaseIds).toEqual(["bis-guidance"]);
		expect(byTier.selectedCaseIds).toEqual(["smoke-save"]);
		expect(byPriority.selectedCaseIds).toEqual(["smoke-save"]);
		expect(byCritical.selectedCaseIds).toEqual(["smoke-save"]);
	});

	it("supports comma-separated filters", () => {
		const selection = selectEvalCases({
			cases,
			argv: [
				"--tag",
				"bis,memory",
				"--tier",
				"regression,extended",
				"--priority",
				"standard,extended",
			],
		});

		expect(selection.selectedCaseIds).toEqual([
			"bis-guidance",
			"memory-extended",
		]);
	});

	it("fails when filters match no cases", () => {
		expect(() =>
			selectEvalCases({ cases, argv: ["--tag", "missing"] }),
		).toThrow("No eval cases matched filters: tag=missing.");
	});

	it("fails duplicate case and interaction ids", () => {
		expect(() =>
			selectEvalCases({
				cases: [cases[0], { ...cases[0] }],
				argv: [],
			}),
		).toThrow("Duplicate eval case id(s): smoke-save.");

		expect(() =>
			selectEvalCases({
				cases,
				argv: [],
				getInteractionIds: () => ["duplicate-interaction"],
			}),
		).toThrow("Duplicate eval interaction id(s): duplicate-interaction.");
	});

	it("formats filters and dry-run summaries", () => {
		const selection = selectEvalCases({
			cases,
			argv: ["--case", "bis-guidance", "--tag", "bis"],
		});

		expect(formatEvalSelectionFilters(selection.filters)).toBe(
			"case=bis-guidance tag=bis",
		);
		expect(formatEvalSelectionSummary(selection)).toContain(
			"Selected 1/3 cases and 1/3 interactions.",
		);
		expect(formatEvalSelectionSummary(selection)).toContain(
			"Selected priorities: critical=0, standard=1, extended=0",
		);
	});

	it("fails unknown priorities", () => {
		expect(() =>
			selectEvalCases({ cases, argv: ["--priority", "mandatory"] }),
		).toThrow(
			'Unknown eval priority "mandatory". Use one of: critical, standard, extended.',
		);
	});
});
