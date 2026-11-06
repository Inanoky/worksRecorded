import type {
	ZtcWorkspaceData,
	ZtcWorkspaceDelta,
	ZtcWorkspaceRevisions,
} from "./ztc-workspace-data";

export function ztcRevisionsEqual(
	a: ZtcWorkspaceRevisions,
	b: ZtcWorkspaceRevisions,
) {
	return a.rows === b.rows && a.config === b.config && a.media === b.media;
}

export function getZtcWorkspaceFilledDays(
	data: ZtcWorkspaceData | null,
	year: number,
	month: number,
) {
	if (!data) return [];
	const values = [
		...data.rows.flatMap((row) => [row.Date, row.Date_Custom_1]),
		...data.mediaOnlyDays.map((day) => day.date),
	];
	const days = new Set<number>();
	for (const value of values) {
		if (!value) continue;
		const date = value instanceof Date ? value : new Date(value);
		if (date.getFullYear() === year && date.getMonth() === month)
			days.add(date.getDate());
	}
	return [...days].sort((a, b) => a - b);
}

export function applyZtcWorkspaceDelta(
	base: ZtcWorkspaceData,
	delta: ZtcWorkspaceDelta,
): ZtcWorkspaceData {
	if (
		base.siteId !== delta.siteId ||
		delta.sync.siteId !== base.siteId ||
		!base.sync
	)
		throw new Error("Neatbilstošs ražošanas objekts.");
	let rows = base.rows;
	if (base.sync?.revisions.rows !== delta.sync.revisions.rows) {
		const records = new Map(base.rows.map((row) => [row.id, row]));
		for (const id of delta.deletedRowIds) records.delete(id);
		for (const row of delta.changedRows) records.set(row.id, row);
		rows = (delta.rowOrder ?? [...records.keys()]).map((id) => {
			const row = records.get(id);
			if (!row) throw new Error("Nepilnīgs ražošanas žurnāla atjauninājums.");
			return row;
		});
	}
	let mediaOnlyDays = base.mediaOnlyDays;
	if (delta.mediaOrder) {
		const days = new Map(base.mediaOnlyDays.map((day) => [day.key, day]));
		for (const key of delta.deletedMediaKeys) days.delete(key);
		for (const day of delta.changedMedia) days.set(day.key, day);
		mediaOnlyDays = delta.mediaOrder.map((key) => {
			const day = days.get(key);
			if (!day) throw new Error("Nepilnīgs foto atjauninājums.");
			return day;
		});
	} else if (delta.changedMedia.length || delta.deletedMediaKeys.length) {
		const days = new Map(base.mediaOnlyDays.map((day) => [day.key, day]));
		for (const key of delta.deletedMediaKeys) days.delete(key);
		for (const day of delta.changedMedia) days.set(day.key, day);
		mediaOnlyDays = [...days.values()];
	}
	const rowVersions = { ...base.sync.rows, ...delta.rowVersions };
	const mediaVersions = { ...base.sync.media, ...delta.mediaVersions };
	return {
		...base,
		rows,
		mediaOnlyDays,
		sync: {
			...delta.sync,
			rows: Object.fromEntries(
				rows.map((row) => [row.id as string, rowVersions[row.id as string]]),
			),
			media: Object.fromEntries(
				mediaOnlyDays.map((day) => [day.key, mediaVersions[day.key]]),
			),
		},
		...(delta.config ? { config: delta.config } : {}),
		...(delta.rates ? { rates: delta.rates } : {}),
		...(delta.projectOptions ? { projectOptions: delta.projectOptions } : {}),
	};
}
