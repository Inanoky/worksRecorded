import { reconcileDiaryQuantityUnit } from "./diary-quantity-units";

test("fills missing units and normalizes equivalent notation without changing quantity", () => {
	expect(reconcileDiaryQuantityUnit({ Amounts: 5 }, "m2")).toEqual({
		Units: "m2",
	});
	expect(reconcileDiaryQuantityUnit({ Amounts: 5, Units: "m²" }, "m2")).toEqual(
		{ Units: "m2" },
	);
	expect(
		reconcileDiaryQuantityUnit({ Amounts: 5, Units: "pcs" }, "gab."),
	).toEqual({ Units: "gab." });
});

test.each([
	[100, "cm", "m", 1],
	[1, "m²", "cm2", 10000],
	[1000, "l", "m³", 1],
	[1000, "kg", "tn.", 1],
	[60, "min", "stundas", 1],
	[0, "cm", "m", 0],
])(
	"converts %s %s to %s together with its quantity",
	(amount, source, target, expected) => {
		expect(
			reconcileDiaryQuantityUnit({ Amounts: amount, Units: source }, target),
		).toEqual({
			Units: target,
			Amounts: expected,
		});
	},
);

test("clears incompatible quantities and preserves the source amount in comments", () => {
	const patch = reconcileDiaryQuantityUnit(
		{ Amounts: "100,5", Units: "m²", Comments: "Sākotnējais komentārs" },
		"m³",
	);
	expect(patch).toMatchObject({ Units: "m³", Amounts: null });
	expect(patch.Comments).toContain("100.5 m²");
	expect(patch.Comments).toContain("Tāmes mērvienība m³");
	expect(patch.Comments).toContain("Sākotnējais komentārs");
	expect(reconcileDiaryQuantityUnit({ Amounts: null, ...patch }, "m³")).toEqual(
		{ Units: "m³" },
	);
});

test("clears both plan and fact on mismatch and converts both together when compatible", () => {
	const source = { Units: "m²", Amounts: 100, Comments_Custom_1: "80" };
	const patch = reconcileDiaryQuantityUnit(source, "m³", true);
	expect(patch).toMatchObject({
		Amounts: null,
		Comments_Custom_1: null,
		Units: "m³",
	});
	expect(patch.Comments).toContain("plāns 100 m², fakts 80 m²");
	expect(
		reconcileDiaryQuantityUnit(
			{ Units: "cm", Amounts: 100, Comments_Custom_1: "50" },
			"m",
			true,
		),
	).toEqual({
		Units: "m",
		Amounts: 1,
		Comments_Custom_1: "0.5",
	});
	expect(
		reconcileDiaryQuantityUnit({ ...source, ...patch }, "m³", true),
	).toEqual({ Units: "m³" });
});

test("converts both planned and actual quantities and clears both on incompatibility", () => {
	const row = { Units: "cm", Amounts: 100, Comments_Custom_1: "50" };
	expect(reconcileDiaryQuantityUnit(row, "m", true)).toEqual({
		Units: "m",
		Amounts: 1,
		Comments_Custom_1: "0.5",
	});
	const patch = reconcileDiaryQuantityUnit(row, "m3", true);
	expect(patch).toMatchObject({
		Units: "m3",
		Amounts: null,
		Comments_Custom_1: null,
	});
	expect(patch.Comments).toContain("plāns 100 cm, fakts 50 cm");
});

test("preserves unrelated custom comments and leaves rows without a configured unit alone", () => {
	expect(
		reconcileDiaryQuantityUnit(
			{ Units: "m2", Amounts: 10, Comments_Custom_1: "Papildu komentārs" },
			"m3",
		),
	).not.toHaveProperty("Comments_Custom_1");
	expect(
		reconcileDiaryQuantityUnit({ Units: "m2", Amounts: 10 }, undefined),
	).toEqual({});
});
