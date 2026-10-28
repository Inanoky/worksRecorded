import { getForma2CostShares } from "./forma2-analytics";
import type { Forma2ClientCosts } from "./forma2-client-costs";

export type SpendingKind = "work" | "material" | "mechanism";
export type SpendingPeriod = "day" | "week" | "month";
export type SpendingWorkGroup = { id: string; label: string; color: string };
export type SpendingEntry = {
	id: string;
	sourceId: string;
	sourceType: "work" | "material";
	date: string | null;
	label: string;
	sectionId: string;
	section: string;
	positionId: string;
	position: string;
	kind: SpendingKind;
	cents: number | null;
	invoiceUrl: string | null;
	invoiceNumber: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Europe/Riga",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

export function spendingWorkTimeline(
	entries: SpendingEntry[],
	positionGroups: Record<string, string>,
	groups: SpendingWorkGroup[],
	options: { from: string; to: string; period: SpendingPeriod },
) {
	const running = new Map(groups.map((group) => [group.id, 0]));
	const dates = spendingTimeline(entries, options).points.map(
		(point) => point.date,
	);
	const buckets = new Map<string, Map<string, number>>();
	for (const entry of entries) {
		if (!entry.date || entry.date < options.from || entry.date > options.to)
			continue;
		const date = spendingBucket(entry.date, options.period);
		const values = buckets.get(date) ?? new Map<string, number>();
		const group = positionGroups[entry.positionId] ?? "other";
		values.set(group, (values.get(group) ?? 0) + (entry.cents ?? 0));
		buckets.set(date, values);
	}
	return dates.map((date) => {
		for (const group of groups)
			running.set(
				group.id,
				(running.get(group.id) ?? 0) + (buckets.get(date)?.get(group.id) ?? 0),
			);
		return {
			date,
			values: Object.fromEntries(
				[...running].map(([id, cents]) => [id, cents / 100]),
			),
		};
	});
}

export function spendingDate(value: string | null) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : null;
}

export function buildSpendingEntries(data: Forma2ClientCosts): SpendingEntry[] {
	const positions = new Map(data.positions.map((row) => [row.id, row]));
	const allocations = new Map(
		data.allocations.map((row) => [`${row.sourceType}:${row.sourceId}`, row]),
	);
	return data.sources.flatMap((source) => {
		const allocation = allocations.get(`${source.type}:${source.id}`);
		const shares = getForma2CostShares(source, allocation, positions);
		const used = shares.reduce(
			(sum, row) => sum + Math.round((row.actualCost ?? 0) * 100),
			0,
		);
		const remainder =
			source.actualCost == null
				? null
				: Math.round(source.actualCost * 100) - used;
		const portions = [...shares];
		if (!shares.length || (remainder != null && remainder !== 0))
			portions.push({
				positionId: "",
				quantity: null,
				actualCost: remainder == null ? null : remainder / 100,
			});
		return portions.map((share) => {
			const position = positions.get(share.positionId);
			let section = position;
			const visited = new Set<string>();
			while (section?.parentId && !visited.has(section.id)) {
				visited.add(section.id);
				const parent = positions.get(section.parentId);
				if (!parent) break;
				section = parent;
			}
			return {
				id: `${source.type}:${source.id}:${share.positionId}`,
				sourceId: source.id,
				sourceType: source.type,
				date: spendingDate(source.date),
				label: source.label,
				sectionId: section?.id ?? "unassigned",
				section: section?.name ?? "Nav piesaistīts",
				positionId: position?.id ?? "unassigned",
				position: position?.name ?? "Nav piesaistīts",
				kind:
					source.type === "work"
						? ("work" as const)
						: allocation?.costKind === "mechanism"
							? ("mechanism" as const)
							: ("material" as const),
				cents:
					share.actualCost == null ? null : Math.round(share.actualCost * 100),
				invoiceUrl: source.invoiceUrl ?? null,
				invoiceNumber: source.invoiceNumber ?? null,
			};
		});
	});
}

export function spendingBucket(date: string, period: SpendingPeriod) {
	if (period === "month") return `${date.slice(0, 7)}-01`;
	if (period === "day") return date;
	const value = new Date(`${date}T12:00:00Z`);
	value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
	return value.toISOString().slice(0, 10);
}

export function spendingTimeline(
	entries: SpendingEntry[],
	options: {
		from: string;
		to: string;
		period: SpendingPeriod;
		cumulative?: boolean;
		sectionId?: string;
		positionId?: string;
	},
) {
	const selected = entries.filter(
		(row) =>
			(!options.sectionId || row.sectionId === options.sectionId) &&
			(!options.positionId || row.positionId === options.positionId),
	);
	const filtered = selected.filter(
		(row) => row.date && row.date >= options.from && row.date <= options.to,
	);
	const totals = { work: 0, material: 0, mechanism: 0, total: 0 };
	const buckets = new Map<
		string,
		{
			date: string;
			work: number;
			material: number;
			mechanism: number;
			total: number;
		}
	>();
	const from = new Date(`${options.from}T12:00:00Z`);
	const to = new Date(`${options.to}T12:00:00Z`);
	if (
		!Number.isFinite(from.getTime()) ||
		!Number.isFinite(to.getTime()) ||
		from > to
	)
		throw new Error("invalid-date-range");
	const date = new Date(from);
	while (date <= to) {
		const key = spendingBucket(date.toISOString().slice(0, 10), options.period);
		if (!buckets.has(key))
			buckets.set(key, {
				date: key,
				work: 0,
				material: 0,
				mechanism: 0,
				total: 0,
			});
		date.setUTCDate(date.getUTCDate() + 1);
	}
	for (const row of filtered) {
		if (row.cents == null || !row.date) continue;
		totals[row.kind] += row.cents;
		totals.total += row.cents;
		const bucket = buckets.get(spendingBucket(row.date, options.period));
		if (bucket) {
			bucket[row.kind] += row.cents;
			bucket.total += row.cents;
		}
	}
	const running = { work: 0, material: 0, mechanism: 0, total: 0 };
	const points = [...buckets.values()].map((bucket) => {
		for (const kind of ["work", "material", "mechanism", "total"] as const)
			running[kind] += bucket[kind];
		const values = options.cumulative ? running : bucket;
		return {
			date: bucket.date,
			work: values.work / 100,
			material: values.material / 100,
			mechanism: values.mechanism / 100,
			total: values.total / 100,
		};
	});
	return {
		entries: filtered,
		points,
		totals: {
			work: totals.work / 100,
			material: totals.material / 100,
			mechanism: totals.mechanism / 100,
			total: totals.total / 100,
		},
		missingCostRecords: new Set(
			filtered
				.filter((row) => row.cents == null)
				.map((row) => `${row.sourceType}:${row.sourceId}`),
		).size,
		undatedCost:
			selected
				.filter((row) => !row.date)
				.reduce((sum, row) => sum + (row.cents ?? 0), 0) / 100,
	};
}
