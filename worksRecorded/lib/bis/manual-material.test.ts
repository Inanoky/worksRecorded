import { manualMaterialSchema } from "./manual-material";

const input = {
	id: "11111111-1111-4111-8111-111111111111",
	siteId: "22222222-2222-4222-8222-222222222222",
	name: "  Betons  ",
	quantity: 10,
	measurementUnit: "m³",
	cost: null,
	materialDate: "2026-11-12",
	invoiceDate: null,
	invoiceNr: "",
	supplierName: "",
};

test("preserves unknown cost as null and trims names", () => {
	expect(manualMaterialSchema.parse(input)).toMatchObject({
		name: "Betons",
		quantity: 10,
		cost: null,
		invoiceNr: null,
		supplierName: null,
	});
});

test.each([
	{ quantity: -1 },
	{ quantity: Number.NaN },
	{ cost: -2 },
	{ name: " " },
	{ measurementUnit: "" },
	{ materialDate: "2026-02-30" },
	{ siteId: "other" },
	{ BISId: "123" },
])("rejects invalid or extra manual material fields %j", (change) => {
	expect(manualMaterialSchema.safeParse({ ...input, ...change }).success).toBe(
		false,
	);
});
