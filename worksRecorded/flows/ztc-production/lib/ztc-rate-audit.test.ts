import { buildZtcRateAuditChanges } from "@/flows/ztc-production/lib/ztc-rate-audit";

const baseRates = [
	{
		projectName: "Visi projekti",
		works: [
			{ task: "Minerālvate Knauf Expert", rate: "0.9", unit: "m2" as const },
		],
		additionalDetails: [],
		additionalWorks: [],
	},
];

describe("buildZtcRateAuditChanges", () => {
	it("records added, removed and edited rates", () => {
		const changes = buildZtcRateAuditChanges(baseRates, [
			{
				projectName: "Visi projekti",
				works: [{ task: "Minerālvate Knauf Expert", rate: "1.1", unit: "m2" }],
				additionalDetails: [{ task: "Enkurs", rate: "2", unit: "gab" }],
				additionalWorks: [],
			},
		]);

		expect(changes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					action: "updated",
					entity: "rate",
					task: "Minerālvate Knauf Expert",
				}),
				expect.objectContaining({
					action: "added",
					entity: "rate",
					task: "Enkurs",
				}),
			]),
		);
	});

	it("returns no changes for identical rates", () => {
		expect(
			buildZtcRateAuditChanges(
				baseRates,
				JSON.parse(JSON.stringify(baseRates)),
			),
		).toEqual([]);
	});
});
