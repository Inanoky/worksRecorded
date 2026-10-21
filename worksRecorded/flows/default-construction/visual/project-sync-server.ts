import { createHash } from "node:crypto";
import type { LimeniProjectSnapshot } from "./project-snapshot-store";
import { type ProjectDelta, projectSections } from "./project-sync";

export function projectSyncPayload(
	snapshot: LimeniProjectSnapshot,
	revision: string,
	known?: Record<string, string>,
) {
	const hash = (value: unknown) =>
		createHash("sha256").update(JSON.stringify(value)).digest("hex");
	const partVersions: Record<string, string> = {};
	for (const key of projectSections) partVersions[key] = hash(snapshot[key]);
	for (const item of snapshot.drawings)
		partVersions[`drawing:${item.drawing.id}`] = hash(item);
	if (!known) return { ...snapshot, revision, partVersions };
	const changes: ProjectDelta["changes"] = {};
	for (const key of projectSections)
		if (known[key] !== partVersions[key])
			Object.assign(changes, { [key]: snapshot[key] });
	return {
		kind: "delta",
		revision,
		version: snapshot.version,
		partVersions,
		changes,
		drawings: snapshot.drawings.filter(
			(item) =>
				known[`drawing:${item.drawing.id}`] !==
				partVersions[`drawing:${item.drawing.id}`],
		),
		drawingOrder: snapshot.drawings.map((item) => item.drawing.id),
	} satisfies ProjectDelta;
}

export function readProjectParts(value: string | null) {
	if (!value || value.length > 12000) return undefined;
	try {
		const parsed = JSON.parse(value);
		if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
			return undefined;
		const entries = Object.entries(parsed);
		if (
			entries.length > 100 ||
			entries.some(
				([key, hash]) =>
					key.length > 150 ||
					typeof hash !== "string" ||
					!/^[a-f0-9]{64}$/.test(hash),
			)
		)
			return undefined;
		return parsed as Record<string, string>;
	} catch {
		return undefined;
	}
}
