import { buildForma2AnalyticsView } from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";
import {
	buildSpendingEntries,
	spendingDate,
	spendingTimeline,
} from "./spending-timeline";

const day = 86_400_000;
const shiftDate = (date: string, days: number) =>
	new Date(new Date(`${date}T12:00:00Z`).getTime() + days * day)
		.toISOString()
		.slice(0, 10);

export function spendingForecast(data: Forma2ClientCosts, asOf: string) {
	const available = {
		...data,
		sources: data.sources.filter((source) => {
			const date = spendingDate(source.date);
			return !date || date <= asOf;
		}),
	};
	const contractPositions = data.positions.filter(
		(position) => position.plannedTotalCost > 0,
	);
	const contractIds = new Set(contractPositions.map((position) => position.id));
	const contractValue = contractPositions.reduce(
		(sum, position) => sum + position.plannedTotalCost,
		0,
	);
	const progressValue = (at: string) => {
		const measured = {
			...available,
			sources: available.sources.filter(
				(source) =>
					source.type === "work" &&
					source.quantitySource === "drawing" &&
					spendingDate(source.date) != null &&
					String(spendingDate(source.date)) <= at,
			),
		};
		return buildForma2AnalyticsView({
			...measured,
			includeSuggestions: false,
		}).resultRows.reduce((sum, row) => {
			const planned = row.directPlannedCosts ?? row;
			if (!row.plannedQuantity || row.plannedQuantity <= 0) return sum;
			const fraction = Math.max(
				0,
				Math.min(1, (row.actualQuantity ?? 0) / row.plannedQuantity),
			);
			return sum + Math.max(0, planned.plannedTotalCost) * fraction;
		}, 0);
	};
	const earned = progressValue(asOf);
	const recentEarned = Math.max(
		0,
		earned - progressValue(shiftDate(asOf, -28)),
	);
	const entries = buildSpendingEntries(available);
	const actual =
		entries.reduce((sum, entry) => sum + (entry.cents ?? 0), 0) / 100;
	const contractActual =
		entries.reduce(
			(sum, entry) =>
				sum + (contractIds.has(entry.positionId) ? (entry.cents ?? 0) : 0),
			0,
		) / 100;
	const remainingValue = Math.max(0, contractValue - earned);
	const remainingCost =
		contractValue <= 0
			? null
			: remainingValue === 0
				? 0
				: earned > 0 && contractActual > 0
					? (remainingValue * contractActual) / earned
					: null;
	const daysRemaining =
		remainingValue === 0
			? 0
			: recentEarned > 0
				? Math.ceil((remainingValue * 28) / recentEarned)
				: null;
	return {
		asOf,
		actual,
		contractActual,
		otherActual: actual - contractActual,
		contractValue,
		earned,
		progress: contractValue > 0 ? earned / contractValue : null,
		recentEarned,
		remainingCost,
		finalCost: remainingCost == null ? null : actual + remainingCost,
		daysRemaining,
		finishDate: daysRemaining == null ? null : shiftDate(asOf, daysRemaining),
		unknownCostRecords: new Set(
			entries
				.filter((entry) => entry.cents == null)
				.map((entry) => entry.sourceId),
		).size,
		unmeasuredContractValue: contractPositions.reduce(
			(sum, position) =>
				sum +
				(!(position.plannedQuantity && position.plannedQuantity > 0)
					? position.plannedTotalCost
					: 0),
			0,
		),
	};
}

export function spendingForecastPoints(data: Forma2ClientCosts, asOf: string) {
	const forecast = spendingForecast(data, asOf);
	const entries = buildSpendingEntries(data).filter(
		(entry) => entry.date && entry.date <= asOf,
	);
	const first = entries.map((entry) => String(entry.date)).sort()[0] ?? asOf;
	const history = spendingTimeline(entries, {
		from: first,
		to: asOf,
		period: "day",
		cumulative: true,
	}).points;
	const points: {
		date: string;
		actual: number | null;
		forecast: number | null;
	}[] = history
		.filter((point, index) => index % 7 === 0 || point.date === asOf)
		.map((point) => ({
			date: point.date,
			actual: point.total,
			forecast: point.date === asOf ? forecast.actual : null,
		}));
	if (
		forecast.finalCost != null &&
		forecast.daysRemaining &&
		forecast.finishDate
	) {
		const steps = Math.min(24, forecast.daysRemaining);
		for (let step = 1; step <= steps; step++) {
			const days = Math.ceil((forecast.daysRemaining * step) / steps);
			points.push({
				date: shiftDate(asOf, days),
				actual: null,
				forecast:
					forecast.actual +
					((forecast.finalCost - forecast.actual) * days) /
						forecast.daysRemaining,
			});
		}
	}
	return { forecast, points };
}
