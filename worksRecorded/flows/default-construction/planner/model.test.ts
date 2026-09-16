import {
	type Actual,
	addDays,
	assertFuture,
	comparePlans,
	dateSchema,
	type Plan,
	planMatchKey,
	plannerToday,
	weekStart,
} from "./model";

const plan: Plan = {
	id: "plan",
	date: "2026-09-14",
	work: "Sienas",
	location: "1. stāvs",
	unit: "m²",
	quantity: 10,
	version: 1,
};
const actual: Actual = {
	id: "actual",
	date: plan.date,
	work: " Sienas ",
	location: plan.location,
	unit: "m2",
	quantity: 12,
	comments: "Done",
};
describe("construction weekly comparison", () => {
	it("matches only the same date, task, location and unit, including safe unit spelling normalization", () => {
		expect(planMatchKey(" Sienas ", "1.  stāvs", "m²")).toBe(
			planMatchKey("sienas", "1. stāvs", "m2"),
		);
		expect(comparePlans([plan], [actual], "2026-09-16")).toMatchObject([
			{ status: "over", actualQuantity: 12, plan },
		]);
		for (const change of [
			{ date: "2026-09-15" },
			{ location: "2. stāvs" },
			{ unit: "m3" },
			{ work: "Grīda" },
		]) {
			expect(
				comparePlans([plan], [{ ...actual, ...change }], "2026-09-16"),
			).toHaveLength(2);
		}
	});
	it("sums repeated actual records without duplicating planned quantity", () => {
		const rows = comparePlans(
			[plan],
			[
				{ ...actual, quantity: 5 },
				{ ...actual, id: "second", quantity: 8 },
			],
			"2026-09-16",
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			actualQuantity: 13,
			actualIds: ["actual", "second"],
			status: "over",
			plan: { quantity: 10 },
		});
	});
	it.each([
		[5, "under"],
		[10, "equal"],
		[11, "over"],
		[0, "under"],
		[null, "unknown"],
	])("compares actual %s as %s", (quantity, status) => {
		expect(
			comparePlans(
				[plan],
				[{ ...actual, quantity: quantity as number | null }],
				"2026-09-16",
			)[0].status,
		).toBe(status);
	});
	it("keeps unmatched plans and unplanned actuals with missing sides", () => {
		expect(comparePlans([plan], [], "2026-09-16")[0]).toMatchObject({
			actualWork: null,
			actualQuantity: null,
			status: "under",
		});
		expect(comparePlans([], [actual], "2026-09-16")[0]).toMatchObject({
			plan: null,
			actualQuantity: 12,
			status: "unplanned",
		});
	});
	it("does not mark future plans overdue or incomplete totals as definite", () => {
		expect(comparePlans([plan], [], "2026-09-13")[0].status).toBe("future");
		expect(
			comparePlans(
				[plan],
				[actual, { ...actual, id: "unknown", quantity: null }],
				"2026-09-16",
			)[0],
		).toMatchObject({ actualQuantity: null, status: "unknown" });
	});
	it.each([
		[13, "over"],
		[10, "under"],
		[12, "equal"],
		[null, "unknown"],
	])("compares future actual %s against plan 12", (quantity, status) => {
		expect(
			comparePlans(
				[{ ...plan, quantity: 12 }],
				[{ ...actual, quantity: quantity as number | null }],
				"2026-09-13",
			)[0].status,
		).toBe(status);
	});
	it("locks today and past dates and uses the Riga date boundary", () => {
		expect(plannerToday(new Date("2026-09-15T21:30:00Z"))).toBe("2026-09-16");
		expect(() => assertFuture("2026-09-16", "2026-09-16")).toThrow();
		expect(() => assertFuture("2026-09-15", "2026-09-16")).toThrow();
		expect(() => assertFuture("2026-09-17", "2026-09-16")).not.toThrow();
	});
	it("handles weeks across months and years and rejects impossible dates", () => {
		expect(weekStart("2027-01-01")).toBe("2026-12-28");
		expect(addDays("2026-12-28", 6)).toBe("2027-01-03");
		expect(dateSchema.safeParse("2026-02-30").success).toBe(false);
	});
});
