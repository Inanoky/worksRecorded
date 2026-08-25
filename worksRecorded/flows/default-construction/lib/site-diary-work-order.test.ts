import {
	compareGroupedDefaultConstructionSiteDiaryWorks,
	compareSiteDiaryWorks,
	DEFAULT_CONSTRUCTION_SYSTEM_WORKS,
	groupDefaultConstructionSiteDiaryWorks,
	isDefaultConstructionSystemWork,
	sortDefaultConstructionSiteDiaryWorks,
} from "./site-diary-work-order";

describe("site diary work ordering", () => {
	it("sorts dotted estimate prefixes numerically", () => {
		const works = [
			"18.1 Dažādi darbi",
			"1.10 Demontāžas darbi",
			"2.1 Grīdu flīzēšana",
			"1.9 Demontāžas darbi",
			"13.2 Sienu krāsošana",
		];

		expect(works.sort(compareSiteDiaryWorks)).toEqual([
			"1.9 Demontāžas darbi",
			"1.10 Demontāžas darbi",
			"2.1 Grīdu flīzēšana",
			"13.2 Sienu krāsošana",
			"18.1 Dažādi darbi",
		]);
	});

	it("places unnumbered operational options after numbered works", () => {
		const works = [
			"Piezīmes",
			"18.1 Dažādi darbi",
			"Inspekcija",
			"1.1 Demontāža",
		];

		expect(works.sort(compareSiteDiaryWorks)).toEqual([
			"1.1 Demontāža",
			"18.1 Dažādi darbi",
			"Inspekcija",
			"Piezīmes",
		]);
	});

	it("identifies default construction system works case-insensitively", () => {
		expect(isDefaultConstructionSystemWork(" piezīmes ")).toBe(true);
		expect(isDefaultConstructionSystemWork("Pielāgots darbs")).toBe(false);
	});

	it("groups default construction works after custom and Forma 2 works", () => {
		const works = [
			"Piezīmes",
			"18.1 Dažādi darbi",
			"Uzkopšanas darbi",
			"1.10 Demontāžas darbi",
			"1.9 Demontāžas darbi",
			"Inspekcija",
		];

		expect(works.sort(compareGroupedDefaultConstructionSiteDiaryWorks)).toEqual([
			"1.9 Demontāžas darbi",
			"1.10 Demontāžas darbi",
			"18.1 Dažādi darbi",
			"Inspekcija",
			"Piezīmes",
			"Uzkopšanas darbi",
		]);
	});

	it("keeps default works sorted inside their separate group", () => {
		const sorted = sortDefaultConstructionSiteDiaryWorks([
			"Piezīmes",
			"Materiālu piegāde",
			"1.1 Sagatavošana",
			"Kavēšanās",
			"Apkures sistēmas un ventilācijas darbi",
		]);

		expect(sorted).toEqual([
			"1.1 Sagatavošana",
			"Apkures sistēmas un ventilācijas darbi",
			"Kavēšanās",
			"Materiālu piegāde",
			"Piezīmes",
		]);
	});

	it("returns grouped options without dropping unknown selected values", () => {
		const selected = "Ārpus saraksta izvēlēts darbs";
		const grouped = groupDefaultConstructionSiteDiaryWorks(
			[
				{ label: "Piezīmes" },
				{ label: selected },
				{ label: "2.1 Flīzēšana" },
				{ label: "Uzkopšanas darbi" },
			],
			(option) => option.label,
		);

		expect(grouped.customWorks.map((option) => option.label)).toEqual([
			"2.1 Flīzēšana",
			selected,
		]);
		expect(grouped.defaultWorks.map((option) => option.label)).toEqual([
			"Piezīmes",
			"Uzkopšanas darbi",
		]);
	});

	it("keeps the exported default work list aligned with grouping", () => {
		expect(
			DEFAULT_CONSTRUCTION_SYSTEM_WORKS.every(isDefaultConstructionSystemWork),
		).toBe(true);
	});
});
