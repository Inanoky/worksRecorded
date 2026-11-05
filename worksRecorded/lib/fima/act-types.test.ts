import {
	fimaActTypeSchema,
	fimaActTypes,
	inferFimaActType,
	inferLinkedFimaActType,
} from "./act-types";

it("keeps installation components and wire operations in their actual act types", () => {
	expect(
		inferFimaActType("Kontakttīkla konsoļu stiprinājumu montāžas akts gar B"),
	).toBe("console_brackets");
	expect(inferFimaActType("Kontakttīkla konsoļu montāžas akts gar B")).toBe(
		"consoles",
	);
	expect(
		inferFimaActType("Kontakttīkla spriegošanas ierīču atsvaru montāžas akts"),
	).toBe("counterweights");
	expect(inferFimaActType("Spriegošanas ierīču montāžas akts")).toBe(
		"tensioning_devices",
	);
	expect(
		inferFimaActType("Nesējtroses vada (viduspunktiem) montāžas akts"),
	).toBe("midpoint_carrying_wire");
	expect(inferFimaActType("Nesējtroses vada montāžas akts")).toBe(
		"carrying_wire",
	);
	expect(inferFimaActType("Nesējtroses vada demontāžas akts")).toBeNull();
});

it("requires every linked act to establish the same category", () => {
	expect(
		inferLinkedFimaActType({
			acts: [
				{ title: "Kontaktvada montāžas akts gar B CAT II-02" },
				{ title: "Kontaktvada montāžas akts gar B CAT II-06" },
			],
		}),
	).toBe("contact_wire");
	expect(
		inferLinkedFimaActType({
			acts: [
				{ title: "Kontaktvada montāžas akts" },
				{ title: "Nesējtroses vada montāžas akts" },
			],
		}),
	).toBeNull();
	expect(inferLinkedFimaActType({ acts: [{ title: "Cits akts" }] })).toBeNull();
	expect(inferLinkedFimaActType({ acts: [] })).toBeNull();
});

it("accepts the demolition category and recognizes the completed demolition act wording", () => {
	expect(fimaActTypeSchema.parse("demolition")).toBe("demolition");
	expect(fimaActTypes.demolition).toBe(
		"Esošā kontakttīkla un konsoļu demontāža",
	);
	expect(
		inferFimaActType(
			"Esošā kontakttīkla un konsoļu demontāža gar B (pāra) sliežu ceļu posmā Torņakalns - Olaine",
		),
	).toBe("demolition");
	expect(
		inferLinkedFimaActType({
			acts: [
				{
					title:
						"Esošā kontakttīkla un konsoļu demontāža gar A (nepāra) sliežu ceļu",
				},
				{
					title:
						"Esošā kontakttīkla un konsoļu demontāža gar B (pāra) sliežu ceļu",
				},
			],
		}),
	).toBe("demolition");
});

it("maps old and broadened act titles into the same category families", () => {
	expect(
		inferFimaActType("Konsoļu 6-10kV (ar stiprinājumiem) montāžas akts"),
	).toBe("voltage_consoles");
	expect(inferFimaActType("6–10 kV līnijas un konsoļu darbi")).toBe(
		"voltage_consoles",
	);
	expect(
		inferLinkedFimaActType({
			acts: [
				{ title: "Nesējtroses vada (viduspunktiem) montāžas akts" },
				{ title: "Viduspunkta enkuru sistēmas montāžas akts" },
			],
		}),
	).toBe("midpoint_carrying_wire");
	expect(inferFimaActType("Viļņvada kronšteinu uzstādīšanas akts")).toBe(
		"waveguide",
	);
	expect(inferFimaActType("Viļņvada līnijas demontāžas akts")).toBe(
		"waveguide",
	);
	expect(
		inferFimaActType(
			"Pārsprieguma novadīšanas sistēmas elementu montāžas akts",
		),
	).toBe("surge_protection");
	expect(inferFimaActType("Gaisvadu līnijas regulēšanas akts")).toBe(
		"overhead_line_regulation",
	);
});
