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
	return {
		...current,
		...delta.changes,
		revision: delta.revision,
		version: delta.version,
		partVersions: delta.partVersions,
		drawings: delta.drawingOrder
			.map((id) => drawings.get(id))
			.filter(
				(item): item is LimeniProjectSnapshot["drawings"][number] => !!item,
			),
	};
}

export function projectChanged(siteId: string) {
	if (typeof window !== "undefined")
		window.dispatchEvent(
			new CustomEvent(PROJECT_CHANGED, { detail: { siteId } }),
		);
}
