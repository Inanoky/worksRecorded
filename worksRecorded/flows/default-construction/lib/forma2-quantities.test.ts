import {
	getForma2DiaryQuantity,
	getForma2ReportedQuantity,
	normalizeForma2QuantityUnit,
} from "./forma2-quantities";
import { enableDefaultConstructionQuantityProfile } from "./quantity-plan-actual";

describe("Forma 2 diary quantities", () => {
	const config = enableDefaultConstructionQuantityProfile({});

	it.each([67, 0, null])(
		"uses report quantity %p without falling back to fact",
		(planned) => {
			expect(
				getForma2ReportedQuantity({
					quantity: 74.67,
					reportedQuantity: planned,
				}),
			).toBe(planned);
		},
	);

	it("preserves regular quantities for sources without a separate report quantity", () => {
		expect(getForma2ReportedQuantity({ quantity: 12 })).toBe(12);
	});

	it("uses regular diary amounts without the plan/fact profile", () => {
		expect(
			getForma2DiaryQuantity({ Amounts: 67, Comments_Custom_1: "74.67" }, {}),
		).toBe(67);
	});

	it("uses factual rather than planned amounts with the profile", () => {
		expect(
			getForma2DiaryQuantity(
				{ Amounts: 67, Comments_Custom_1: "74,67" },
				config,
			),
		).toBe(74.67);
	});

	it.each([null, undefined, "", " ", "invalid"])(
		"does not substitute planned quantity for missing fact %p",
		(fact) => {
			expect(
				getForma2DiaryQuantity(
					{ Amounts: 67, Comments_Custom_1: fact },
					config,
				),
			).toBeNull();
		},
	);

	it("preserves an explicit factual zero", () => {
		expect(
			getForma2DiaryQuantity({ Amounts: 67, Comments_Custom_1: "0" }, config),
		).toBe(0);
	});

	it.each([
		["m²", "m2"],
		["m³", "m3"],
		["m^2", "m2"],
		["gab.", "gb"],
		["KPL.", "kpl"],
	])("recognizes equivalent units %s and %s", (left, right) => {
		expect(normalizeForma2QuantityUnit(left)).toBe(
			normalizeForma2QuantityUnit(right),
		);
	});
});
