import { createSpendingDemo } from "./spending-demo";
import { spendingForecast } from "./spending-forecast";
import { buildSpendingEntries, spendingTimeline } from "./spending-timeline";

it("keeps demo allocation changes cost-neutral and supplies measured progress and forecast data", () => {
	const { current, proposed } = createSpendingDemo();
	const options = {
		from: "2026-09-01",
		to: "2026-10-26",
		period: "week" as const,
		cumulative: true,
	};
	const before = spendingTimeline(buildSpendingEntries(current), options);
	const after = spendingTimeline(buildSpendingEntries(proposed), options);
	expect(after.totals).toEqual(before.totals);
	expect(after.points.at(-1)?.total).toBe(after.totals.total);
	const forecast = spendingForecast(proposed, options.to);
	expect(forecast.progress).toBeGreaterThan(0);
	expect(forecast.finalCost).toBeGreaterThan(after.totals.total);
	expect(proposed.sources.every((source) => !source.invoiceUrl)).toBe(true);
});
