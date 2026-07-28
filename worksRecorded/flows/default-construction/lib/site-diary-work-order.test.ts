import { compareSiteDiaryWorks } from "./site-diary-work-order";

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
});
