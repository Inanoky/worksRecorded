import { normalizeSbPlanValue, readSbPlan, SB_PLAN_FIELDS } from "./model";

describe("SB STOMME inline fields", () => {
	it("uses independent custom fields without changing actual diary fields", () => {
		expect(Object.values(SB_PLAN_FIELDS)).toEqual([
			"Works_Custom_1",
			"Comments_Custom_2",
			"Works_Custom_2",
		]);
		expect(
			readSbPlan({
				Works_Custom_1: "Walls",
				Comments_Custom_2: "0",
				Works_Custom_2: "Rain",
			}),
		).toEqual({ plannedWork: "Walls", plannedAmount: "0", weather: "Rain" });
	});
	it("accepts zero, decimal commas and clearing quantities", () => {
		expect(normalizeSbPlanValue("plannedAmount", "12,50")).toBe("12.5");
		expect(normalizeSbPlanValue("plannedAmount", "0")).toBe("0");
		expect(normalizeSbPlanValue("plannedAmount", " ")).toBeNull();
	});
	it.each(["-1", "NaN", "Infinity", "1e5", "10 gab", "1,2,3", "1000000001"])(
		"rejects invalid quantity %s",
		(value) => {
			expect(() => normalizeSbPlanValue("plannedAmount", value)).toThrow();
		},
	);
	it("preserves multiline plans within diary field limits", () => {
		expect(normalizeSbPlanValue("plannedWork", "Walls\nFloor 2")).toBe(
			"Walls\nFloor 2",
		);
		expect(() =>
			normalizeSbPlanValue("plannedWork", "x".repeat(201)),
		).toThrow();
	});
});
