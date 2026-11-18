import environment from "@/test/fixtures/ai-evals/production-diary-environment.json";
import {
	productionDiaryCases,
	productionDiaryEnvironment,
} from "./production-diary-cases";
import { reviewedDiaryCorpus } from "./reviewed-diary-cases";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

it("replays the production category vocabulary with bounded, sanitized history", () => {
	expect(environment.workOptions).toHaveLength(101);
	for (const evalCase of productionDiaryCases) {
		const { config, extractionContext } = productionDiaryEnvironment(evalCase);
		expect(Object.values(config.Works.DropDownOptions ?? {})).toEqual(
			environment.workOptions,
		);
		expect(extractionContext.metadata).toMatchObject({
			recentRecordCount: 5,
			truncated: true,
		});
		expect(extractionContext.text.length).toBeLessThan(12000);
		expect(extractionContext.text).toContain("[context truncated");
		expect(config.otherSettings).toEqual(
			reviewedDiaryCorpus.project.config.otherSettings,
		);
		expect(JSON.stringify({ evalCase, config, extractionContext })).not.toMatch(
			/kp_|https:\/\/|936fe1a6|18b7b5a5|\+371/,
		);
	}
});

it.each(productionDiaryCases)(
	"validates the specified outcome for $id and rejects lost works or changed values",
	(evalCase) => {
		const rows = evalCase.expectedRecords.map((row) => ({
			...row,
			comment: row.commentSignals.join(" "),
		}));
		expect(
			validateReviewedDiaryCase(
				evalCase,
				rows,
				reviewedDiaryCorpus.project.positions,
			).status,
		).toBe("pass");
		expect(
			validateReviewedDiaryCase(
				evalCase,
				rows.slice(1),
				reviewedDiaryCorpus.project.positions,
			).status,
		).toBe("fail");
		expect(
			validateReviewedDiaryCase(
				evalCase,
				rows.map((row) => ({ ...row, amount: 999 })),
				reviewedDiaryCorpus.project.positions,
			).status,
		).toBe("fail");
	},
);

it("does not accept another category or an invented Forma2 assignment for a generic work", () => {
	const evalCase = productionDiaryCases[2];
	const rows = evalCase.expectedRecords.map((row) => ({
		...row,
		comment: row.commentSignals.join(" "),
	}));
	rows[1].work = "Equipment installation";
	expect(
		validateReviewedDiaryCase(
			evalCase,
			rows,
			reviewedDiaryCorpus.project.positions,
		).status,
	).toBe("fail");
	rows[1].work = "Trenching";
	rows[1].forma2PositionId = reviewedDiaryCorpus.project.positions[0].id;
	expect(
		validateReviewedDiaryCase(
			evalCase,
			rows,
			reviewedDiaryCorpus.project.positions,
		).status,
	).toBe("fail");
});
