import { hasSourceCalculation } from "./quantityEvidence";

const source =
	"Iebūvēta caurule 22 metri. Tranšejas rakšana, pozīcija 2.2.11, 3,33 kubikmetri uz tekošo metru.";
const row = {
	Works: "2.11 Sadzīves kanalizācija - Tranšejas rakšana",
	Amounts: 73.26,
	Units: "m3",
	calculationEvidence: {
		lengthQuote: "Iebūvēta caurule 22 metri.",
		rateQuote:
			"Tranšejas rakšana, pozīcija 2.2.11, 3,33 kubikmetri uz tekošo metru.",
	},
};

it("validates a calculated volume from exact work-specific current source quotes", () => {
	expect(hasSourceCalculation(row, source)).toBe(true);
	const preciseSource = source.replace("22 metri", "22,09 metri");
	const precise = {
		...row,
		Amounts: 73.56,
		calculationEvidence: {
			...row.calculationEvidence,
			lengthQuote: "Iebūvēta caurule 22,09 metri.",
		},
	};
	expect(hasSourceCalculation(precise, preciseSource)).toBe(true);
});

it("accepts an explicit spoken rate with omitted uz before tekošo metru", () => {
	const source =
		"Iebūvēta caurule 22 metri. Tranšejas aizbēršana ar apjomu 2,87 kubikmetrus tekošo metru.";
	expect(
		hasSourceCalculation(
			{
				Works: "2.14 Tranšejas aizbēršana",
				Amounts: 63.14,
				Units: "m3",
				calculationEvidence: {
					lengthQuote: "Iebūvēta caurule 22 metri.",
					rateQuote:
						"Tranšejas aizbēršana ar apjomu 2,87 kubikmetrus tekošo metru.",
				},
			},
			source,
		),
	).toBe(true);
});

it.each([
	"wrong-amount",
	"unquoted",
	"wrong-work",
	"missing-rate-unit",
	"material-dimension",
	"hours",
	"wrong-unit",
])("refuses %s as calculation evidence", (kind) => {
	const invalid = JSON.parse(JSON.stringify(row));
	let input = source;
	if (kind === "wrong-amount") invalid.Amounts = 22;
	if (kind === "unquoted")
		invalid.calculationEvidence.lengthQuote = "Iebūvēti 100 metri";
	if (kind === "wrong-work") invalid.Works = "Ūdensvada akas izbūve";
	if (kind === "missing-rate-unit") {
		input = source.replace("uz tekošo metru", "pavisam");
		invalid.calculationEvidence.rateQuote =
			row.calculationEvidence.rateQuote.replace("uz tekošo metru", "pavisam");
	}
	if (kind === "material-dimension" || kind === "hours") {
		const replacement = kind === "hours" ? "22 stundas" : "22 mm";
		input = source.replace("22 metri", replacement);
		invalid.calculationEvidence.lengthQuote =
			row.calculationEvidence.lengthQuote.replace("22 metri", replacement);
	}
	if (kind === "wrong-unit") invalid.Units = "m2";
	expect(hasSourceCalculation(invalid, input)).toBe(false);
});
