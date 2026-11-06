import { createHash } from "node:crypto";
import type { LimeniProjectSnapshot } from "./project-snapshot-store";
import { type ProjectDelta, projectSections } from "./project-sync";

export function projectSyncPayload(
	snapshot: LimeniProjectSnapshot,
	revision: string,
	known?: Record<string, string>,
	knownRows?: Record<string, string>,
) {
	const hash = (value: unknown) =>
		createHash("sha256")
			.update(JSON.stringify(value) ?? "null")
			.digest("hex");
	const partVersions: Record<string, string> = {};
	for (const key of projectSections) partVersions[key] = hash(snapshot[key]);
	partVersions["diary-media"] = hash(snapshot.diary?.mediaPhotos ?? []);
	const diaryRowVersions = Object.fromEntries(
		(snapshot.diary?.rows ?? []).map((row) => [row.id, hash(row)]),
	);
	for (const item of snapshot.drawings)
		partVersions[`drawing:${item.drawing.id}`] = hash(item);
	if (!known) return { ...snapshot, revision, partVersions, diaryRowVersions };
	const changes: ProjectDelta["changes"] = {};
	for (const key of projectSections)
		if (known[key] !== partVersions[key])
			Object.assign(changes, { [key]: snapshot[key] });
	let diaryRows: ProjectDelta["diaryRows"];
	if (knownRows && changes.diary) {
		delete changes.diary;
		diaryRows = {
			changed: snapshot.diary.rows.filter(
				(row) => knownRows[row.id] !== diaryRowVersions[row.id],
			),
			order: snapshot.diary.rows.map((row) => row.id),
			...(known["diary-media"] !== partVersions["diary-media"]
				? { mediaPhotos: snapshot.diary.mediaPhotos }
				: {}),
		};
	}
	return {
		kind: "delta",
		revision,
		version: snapshot.version,
		partVersions,
		diaryRowVersions,
		...(diaryRows ? { diaryRows } : {}),
		changes,
		drawings: snapshot.drawings.filter(
			(item) =>
				known[`drawing:${item.drawing.id}`] !==
				partVersions[`drawing:${item.drawing.id}`],
		),
		drawingOrder: snapshot.drawings.map((item) => item.drawing.id),
	} satisfies ProjectDelta;
}

export function readProjectRowVersions(value: unknown) {
	if (!value || Array.isArray(value) || typeof value !== "object") return;
	const entries = Object.entries(value);
	if (
		entries.length > 10_000 ||
		entries.some(
			([id, hash]) =>
				!id ||
				id.length > 200 ||
				typeof hash !== "string" ||
				!/^[a-f0-9]{64}$/.test(hash),
		)
	)
		return;
	return Object.fromEntries(entries) as Record<string, string>;
}

export function readProjectParts(value: string | null, fromBody = false) {
	if (!value || value.length > (fromBody ? 2_000_000 : 12000)) return undefined;
	try {
		const parsed = JSON.parse(value);
		if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
			return undefined;
		const entries = Object.entries(parsed);
		if (
			entries.length > (fromBody ? 10_000 : 100) ||
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
