import type { LimeniProjectSnapshot } from "./project-snapshot-store";

export const PROJECT_CHANGED = "works-recorded:project-changed";
export const PROJECT_PATCH = "works-recorded:project-patch";
export type ProjectPatch = {
	siteId: string;
	apply: (snapshot: LimeniProjectSnapshot) => LimeniProjectSnapshot;
};
export function patchProject(siteId: string, apply: ProjectPatch["apply"]) {
	if (typeof window !== "undefined")
		window.dispatchEvent(
			new CustomEvent<ProjectPatch>(PROJECT_PATCH, {
				detail: { siteId, apply },
			}),
		);
}

export function applyLocalProjectPatch(
	current: LimeniProjectSnapshot,
	apply: ProjectPatch["apply"],
	version: string,
) {
	const next = apply(current);
	let partVersions = next.partVersions;
	if (partVersions) {
		partVersions = { ...partVersions };
		for (const section of projectSections)
			if (next[section] !== current[section]) delete partVersions[section];
		if (next.diary.mediaPhotos !== current.diary.mediaPhotos)
			delete partVersions["diary-media"];
		if (next.drawings !== current.drawings) {
			delete partVersions.index;
			const previous = new Map(
				current.drawings.map((item) => [item.drawing.id, item]),
			);
			for (const item of next.drawings)
				if (previous.get(item.drawing.id) !== item)
					delete partVersions[`drawing:${item.drawing.id}`];
		}
	}
	let diaryRowVersions = next.diaryRowVersions;
	if (diaryRowVersions && next.diary.rows !== current.diary.rows) {
		diaryRowVersions = { ...diaryRowVersions };
		const previous = new Map(current.diary.rows.map((row) => [row.id, row]));
		for (const row of next.diary.rows)
			if (previous.get(row.id) !== row) delete diaryRowVersions[row.id];
	}
	return {
		...next,
		revision: undefined,
		version: next.version === current.version ? version : next.version,
		partVersions,
		diaryRowVersions,
	};
}
export const projectSections = [
	"settings",
	"index",
	"diary",
	"config",
	"forma2",
] as const;
export type ProjectDelta = {
	kind: "delta";
	revision: string;
	version: string;
	partVersions: Record<string, string>;
	diaryRowVersions?: Record<string, string>;
	sourceVersions?: Record<string, string>;
	diaryRows?: {
		changed: LimeniProjectSnapshot["diary"]["rows"];
		order: string[];
		mediaPhotos?: LimeniProjectSnapshot["diary"]["mediaPhotos"];
	};
	changes: Partial<
		Pick<LimeniProjectSnapshot, (typeof projectSections)[number]>
	>;
	drawings: LimeniProjectSnapshot["drawings"];
	drawingOrder: string[];
};

export function mergeProjectDelta(
	current: LimeniProjectSnapshot,
	delta: ProjectDelta,
): LimeniProjectSnapshot {
	const drawings = new Map(
		current.drawings.map((item) => [item.drawing.id, item]),
	);
	for (const item of delta.drawings) drawings.set(item.drawing.id, item);
	const orderedDrawings = delta.drawingOrder.map((id) => {
		const item = drawings.get(id);
		if (!item) throw new Error("Project drawing cache is incomplete");
		return item;
	});
	let diary = delta.changes.diary ?? current.diary;
	if (delta.diaryRows) {
		const rows = new Map(diary.rows.map((row) => [row.id, row]));
		for (const row of delta.diaryRows.changed) rows.set(row.id, row);
		diary = {
			...diary,
			rows: delta.diaryRows.order.map((id) => {
				const row = rows.get(id);
				if (!row) throw new Error("Project journal cache is incomplete");
				return row;
			}),
			...(delta.diaryRows.mediaPhotos
				? { mediaPhotos: delta.diaryRows.mediaPhotos }
				: {}),
		};
	}
	return {
		...current,
		...delta.changes,
		revision: delta.revision,
		version: delta.version,
		partVersions: delta.partVersions,
		diaryRowVersions: delta.diaryRowVersions,
		sourceVersions: delta.sourceVersions,
		diary,
		drawings: orderedDrawings,
	};
}

export function projectChanged(siteId: string) {
	if (typeof window !== "undefined")
		window.dispatchEvent(
			new CustomEvent(PROJECT_CHANGED, { detail: { siteId } }),
		);
}
