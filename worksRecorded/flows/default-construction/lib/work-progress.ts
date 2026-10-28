import { buildForma2AnalyticsView } from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";
import { getForma2QuantityExclusion } from "./forma2-quantities";
import { type SpendingWorkGroup, spendingDate } from "./spending-timeline";

const day = 86_400_000;
const stamp = (date: string) => Date.parse(`${date}T12:00:00Z`);
const dateAt = (time: number) => new Date(time).toISOString().slice(0, 10);

export function workProgress(
	data: Forma2ClientCosts,
	groups: SpendingWorkGroup[],
	positionGroups: Record<string, string>,
	asOf: string,
	sectionId = "",
) {
	const positionsById = new Map(
		data.positions.map((position) => [position.id, position]),
	);
	const rootId = (id: string) => {
		let position = positionsById.get(id);
		const visited = new Set<string>();
		while (position?.parentId && !visited.has(position.id)) {
			visited.add(position.id);
			position = positionsById.get(position.parentId);
		}
		return position?.id;
	};
	const positions = data.positions.filter(
		(position) =>
			position.plannedQuantity != null &&
			position.plannedQuantity > 0 &&
			!getForma2QuantityExclusion(0, position.unit, "m2") &&
			(!sectionId || rootId(position.id) === sectionId),
	);
	const included = new Map(
		positions.map((position) => [position.id, position]),
	);
	const measured = buildForma2AnalyticsView({
		...data,
		includeSuggestions: false,
	})
		.mappingRows.flatMap((source) => {
			const date = spendingDate(source.date);
			const position = included.get(source.assignedPositionId ?? "");
			return source.type === "work" &&
				source.quantitySource === "drawing" &&
				position &&
				date &&
				date <= asOf &&
				!getForma2QuantityExclusion(source.quantity, source.unit, position.unit)
				? [{ positionId: position.id, date, quantity: source.quantity ?? 0 }]
				: [];
		})
		.sort((left, right) => left.date.localeCompare(right.date));
	const activeGroups = groups.filter((group) =>
		positions.some(
			(position) => (positionGroups[position.id] ?? "other") === group.id,
		),
	);
	const groupPositions = new Map(
		activeGroups.map((group) => [
			group.id,
			positions.filter(
				(position) => (positionGroups[position.id] ?? "other") === group.id,
			),
		]),
	);
	const quantities = new Map<string, number>();
	const snapshot = () =>
		Object.fromEntries(
			activeGroups.map((group) => {
				const rows = groupPositions.get(group.id) ?? [];
				const actual = rows.reduce(
					(sum, position) =>
						sum + Math.max(0, quantities.get(position.id) ?? 0),
					0,
				);
				const completed = rows.reduce(
					(sum, position) =>
						sum +
						Math.max(
							0,
							Math.min(
								position.plannedQuantity ?? 0,
								quantities.get(position.id) ?? 0,
							),
						),
					0,
				);
				return [group.id, { actual, completed }];
			}),
		);
	const first = measured[0]?.date ?? asOf;
	const pastDate = dateAt(stamp(asOf) - 28 * day);
	let past = snapshot();
	let index = 0;
	const points: { date: string; values: ReturnType<typeof snapshot> }[] = [];
	for (let time = stamp(first); time <= stamp(asOf); time += day) {
		const date = dateAt(time);
		while (index < measured.length && measured[index].date <= date) {
			const record = measured[index++];
			quantities.set(
				record.positionId,
				(quantities.get(record.positionId) ?? 0) + record.quantity,
			);
		}
		const values = snapshot();
		if (date <= pastDate) past = values;
		points.push({ date, values });
	}
	const latest = snapshot();
	const summaries = activeGroups.map((group) => {
		const planned = (groupPositions.get(group.id) ?? []).reduce(
			(sum, position) => sum + (position.plannedQuantity ?? 0),
			0,
		);
		const { actual, completed } = latest[group.id];
		const remaining = Math.max(0, planned - completed);
		const recentCompleted = Math.max(0, completed - past[group.id].completed);
		const daysRemaining =
			remaining < 0.000001
				? 0
				: recentCompleted > 0
					? Math.ceil((remaining * 28) / recentCompleted)
					: null;
		return {
			...group,
			planned,
			actual,
			completed,
			progress: completed / planned,
			remaining,
			recentPerDay: recentCompleted / 28,
			daysRemaining,
			finishDate:
				daysRemaining == null
					? null
					: dateAt(stamp(asOf) + daysRemaining * day),
		};
	});
	const dates = new Set(
		points
			.filter((point, i) => i % 7 === 0 || point.date === asOf)
			.map((point) => point.date),
	);
	for (const group of summaries) {
		if (!group.daysRemaining) continue;
		const steps = Math.min(12, group.daysRemaining);
		for (let step = 1; step <= steps; step++)
			dates.add(
				dateAt(
					stamp(asOf) + Math.ceil((group.daysRemaining * step) / steps) * day,
				),
			);
	}
	const history = new Map(points.map((point) => [point.date, point.values]));
	const chart = [...dates].sort().map((date) => ({
		date,
		time: stamp(date),
		values: Object.fromEntries(
			summaries.map((group) => {
				const recorded = history.get(date)?.[group.id];
				const elapsed = (stamp(date) - stamp(asOf)) / day;
				const fraction =
					group.daysRemaining && elapsed >= 0 && elapsed <= group.daysRemaining
						? elapsed / group.daysRemaining
						: null;
				return [
					group.id,
					{
						actual: recorded?.actual ?? null,
						percent: recorded
							? (recorded.completed / group.planned) * 100
							: null,
						forecast:
							fraction == null
								? null
								: group.actual + group.remaining * fraction,
						forecastPercent:
							fraction == null
								? null
								: ((group.completed + group.remaining * fraction) /
										group.planned) *
									100,
					},
				];
			}),
		),
	}));
	return { summaries, points: chart, measuredRecords: measured.length, asOf };
}
