import {
	calculateActualArea,
	chooseExistingProject,
	chooseExistingWork,
} from "./rules";
import type { BrowserDiaryEntry } from "./schema";

function entry(overrides: Partial<BrowserDiaryEntry> = {}): BrowserDiaryEntry {
	return {
		projectName: "Balasta dambis 2",
		workCategory: "estrich",
		workText: "Estrich",
		workDate: "2026-09-23",
		location: null,
		plannedAreaM2: 70,
		bagCount: null,
		thicknessMinMm: null,
		thicknessMaxMm: null,
		workerCount: null,
		hours: null,
		notes: null,
		attachmentIndexes: [],
		...overrides,
	};
}

describe("WhatsApp browser diary rules", () => {
	it("maps Preses nams to Balasta dambis 2", () => {
		const project = chooseExistingProject("Preses nams", [
			{
				name: "Balasta dambis 2",
				description: "Balasta dambis 2",
			},
		]);
		expect(project?.name).toBe("Balasta dambis 2");
	});

	it("does not merge projects with different street numbers", () => {
		const project = chooseExistingProject("Ķemeru iela 4, Rīga", [
			{
				name: "Ķemeru iela 4-6, Rīga",
				description: "Ķemeru iela 4-6, Rīga",
			},
		]);
		expect(project).toBeNull();
	});

	it("uses the Balasta 70 mm fallback for factual Estrich area", () => {
		expect(
			calculateActualArea({
				entry: entry({ bagCount: 28 }),
				projectName: "Balasta dambis 2",
				selectedWork: "Javas klona (estrich) grīda 70mm",
			}),
		).toBe(80);
	});

	it("does not assume 70 mm for another project", () => {
		expect(
			calculateActualArea({
				entry: entry({ bagCount: 19, projectName: "Ķemeru iela 4" }),
				projectName: "Ķemeru iela 4",
				selectedWork: "Betonēšanas darbi",
			}),
		).toBeNull();
	});

	it("uses 120 mm for līmes Thermowhite factual area", () => {
		expect(
			calculateActualArea({
				entry: entry({
					workCategory: "thermowhite",
					workText: "42 līmes",
					bagCount: 42,
					plannedAreaM2: null,
				}),
				projectName: "Ķemeru iela 4",
				selectedWork: "Putoplisterola granulas ar minerlo saistveli 120mm",
			}),
		).toBe(70);
	});

	it("uses the stated area as both plan and fact for film", () => {
		expect(
			calculateActualArea({
				entry: entry({ workCategory: "film", plannedAreaM2: 88 }),
				projectName: "Spilves 27",
				selectedWork: "Tvaika izolācija, PE plēve 200mk",
			}),
		).toBe(88);
	});

	it("applies the established over-thickness rule", () => {
		expect(
			calculateActualArea({
				entry: entry({
					plannedAreaM2: 135,
					thicknessMinMm: 80,
					thicknessMaxMm: 80,
				}),
				projectName: "Spilves 27",
				selectedWork: "Betona klona grīdu izbūve 70mm",
			}),
		).toBe(154.29);
	});

	it("maps only to an existing work option", () => {
		expect(
			chooseExistingWork(entry({ thicknessMinMm: 80, thicknessMaxMm: 80 }), {
				options: [
					"Piezīmes",
					"Papildu darbi",
					"Javas klona (estrich) grīda 70mm",
				],
				rates: [],
			}),
		).toBe("Javas klona (estrich) grīda 70mm");
	});

	it("does not choose an unrelated existing work option", () => {
		expect(
			chooseExistingWork(entry(), {
				options: ["Logu montāža", "Sienu krāsošana"],
				rates: [],
			}),
		).toBeNull();
	});
});
