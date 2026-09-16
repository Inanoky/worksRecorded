import { z } from "zod";

export const PLANNER_TIME_ZONE = "Europe/Riga";
export const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => {
		const date = new Date(`${value}T00:00:00Z`);
		return (
			Number.isFinite(date.getTime()) &&
			date.toISOString().slice(0, 10) === value
		);
	}, "Nederīgs datums.");
export const planSchema = z
	.object({
		siteId: z.string().uuid(),
		id: z.string().uuid().optional(),
		version: z.number().int().positive().optional(),
		date: dateSchema,
		work: z.string().trim().min(1).max(200),
		location: z.string().trim().min(1).max(200),
		unit: z.string().trim().min(1).max(40),
		quantity: z.number().finite().positive().max(1e9),
	})
	.strict();

export type Plan = {
	id: string;
	date: string;
	work: string;
	location: string;
	unit: string;
	quantity: number;
	version: number;
};
export type Actual = {
	id: string;
	date: string;
	work: string;
	location: string;
	unit: string;
	quantity: number | null;
	comments: string;
};
export type Comparison = {
	key: string;
	date: string;
	location: string;
	unit: string;
	plan: Plan | null;
	actualWork: string | null;
	actualQuantity: number | null;
	comments: string;
	actualIds: string[];
	status: "over" | "under" | "equal" | "unknown" | "future" | "unplanned";
};

export function plannerToday(now = new Date()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: PLANNER_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}
export function addDays(date: string, amount: number) {
	const result = new Date(`${dateSchema.parse(date)}T00:00:00Z`);
	result.setUTCDate(result.getUTCDate() + amount);
	return result.toISOString().slice(0, 10);
}
export function weekStart(date: string) {
	const day = new Date(`${dateSchema.parse(date)}T00:00:00Z`).getUTCDay();
	return addDays(date, -((day + 6) % 7));
}
export function assertFuture(date: string, today: string) {
	if (date <= today)
		throw new Error("Šodienas un pagātnes plānu mainīt nedrīkst.");
}
export function normalizePlanText(value: string) {
	return value
		.normalize("NFKC")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase("lv");
}
export function planMatchKey(work: string, location: string, unit: string) {
	const normalizedUnit = normalizePlanText(unit).replace(/\.$/, "");
	return JSON.stringify([
		normalizePlanText(work),
		normalizePlanText(location),
		normalizedUnit,
	]);
}
export function comparePlans(
	plans: Plan[],
	actuals: Actual[],
	today: string,
): Comparison[] {
	const groups = new Map<string, Comparison>();
	for (const plan of plans) {
		const key = `${plan.date}:${planMatchKey(plan.work, plan.location, plan.unit)}`;
		groups.set(key, {
			key,
			date: plan.date,
			location: plan.location,
			unit: plan.unit,
			plan,
			actualWork: null,
			actualQuantity: null,
			comments: "",
			actualIds: [],
			status: "unknown",
		});
	}
	const unknownAmounts = new Set<string>();
	for (const actual of actuals) {
		const key = `${actual.date}:${planMatchKey(actual.work, actual.location, actual.unit)}`;
		const row =
			groups.get(key) ??
			({
				key,
				date: actual.date,
				location: actual.location,
				unit: actual.unit,
				plan: null,
				actualWork: null,
				actualQuantity: null,
				comments: "",
				actualIds: [],
				status: "unplanned",
			} as Comparison);
		row.actualWork = actual.work;
		row.actualIds.push(actual.id);
		if (actual.quantity === null || !Number.isFinite(actual.quantity))
			unknownAmounts.add(key);
		else row.actualQuantity = (row.actualQuantity ?? 0) + actual.quantity;
		row.comments = [row.comments, actual.comments].filter(Boolean).join("\n");
		groups.set(key, row);
	}
	for (const row of groups.values()) {
		if (unknownAmounts.has(row.key)) row.actualQuantity = null;
		if (!row.plan) row.status = "unplanned";
		else if (row.date > today && row.actualIds.length === 0)
			row.status = "future";
		else if (row.actualIds.length && row.actualQuantity === null)
			row.status = "unknown";
		else {
			const difference = (row.actualQuantity ?? 0) - row.plan.quantity;
			row.status =
				Math.abs(difference) < 1e-8
					? "equal"
					: difference > 0
						? "over"
						: "under";
		}
	}
	return Array.from(groups.values()).sort(
		(a, b) =>
			a.date.localeCompare(b.date) ||
			a.location.localeCompare(b.location) ||
			a.key.localeCompare(b.key),
	);
}
