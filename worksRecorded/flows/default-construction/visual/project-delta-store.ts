import { createHash } from "node:crypto";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import {
	getConfig,
	getLimeniDiarySnapshot,
} from "@/server/actions/site-diary-actions";
import { getDefaultConstructionForma2Results } from "../backend/forma2-analytics-actions";
import type { loadProjectManifest } from "./project-revision-store";
import { loadLimeniProjectAssets } from "./project-snapshot-store";
import type { ProjectDelta } from "./project-sync";

export const projectPartHash = (value: unknown) =>
	createHash("sha256")
		.update(JSON.stringify(value) ?? "null")
		.digest("hex");
export function diaryManifestVersion(
	manifest: Awaited<ReturnType<typeof loadProjectManifest>>,
) {
	return projectPartHash([
		manifest.diaryRowVersions,
		manifest.sourceVersions.media,
	]);
}
export async function loadLimeniProjectDelta(
	userId: string,
	siteId: string,
	manifest: Awaited<ReturnType<typeof loadProjectManifest>>,
	known: Record<string, string>,
	knownRows: Record<string, string>,
	sources: Record<string, string>,
	options: { visual?: boolean; diary?: typeof getLimeniDiarySnapshot } = {},
): Promise<ProjectDelta> {
	const changed = (...keys: string[]) =>
		["code", ...keys].some(
			(key) => sources[key] !== manifest.sourceVersions[key],
		);
	const visuals =
		options.visual !== false &&
		(!known.index ||
			changed(
				"site",
				"documents",
				"diary",
				"plans",
				"contacts",
				"sends",
				"sendItems",
				"users",
				"workers",
				"day",
			));
	const settings = !known.settings || changed("site", "bis", "language");
	const config = !known.config || changed("site");
	const forma2 =
		!known.forma2 ||
		changed(
			"site",
			"diary",
			"analytics",
			"materials",
			"documents",
			"workers",
			"users",
			"language",
			"day",
		);
	const ids = Object.keys(manifest.diaryRowVersions).filter(
		(id) => knownRows[id] !== manifest.diaryRowVersions[id],
	);
	const media = !known["diary-media"] || changed("media");
	const [assets, diary, configuration, results, language, bis] =
		await Promise.all([
			visuals
				? loadLimeniProjectAssets(userId, siteId, manifest.organizationId)
				: undefined,
			ids.length || media
				? (options.diary ?? getLimeniDiarySnapshot)(siteId, { ids, media })
				: undefined,
			config ? getConfig(siteId) : undefined,
			forma2 ? getDefaultConstructionForma2Results(siteId) : undefined,
			forma2 || settings ? getOrganizationLanguageByUserId(userId) : undefined,
			settings ? getDashboardBisStatus(userId, siteId, true) : undefined,
		]);
	const changes: ProjectDelta["changes"] = {};
	if (assets) changes.index = assets.index;
	if (configuration !== undefined) changes.config = configuration;
	if (results !== undefined && language !== undefined)
		changes.forma2 = { data: results, organizationLanguage: language };
	if (bis && language !== undefined)
		changes.settings = {
			siteId,
			userId,
			organizationId: manifest.organizationId,
			bisEnabled: bis.enabled,
			organizationLanguage: language,
		};
	const partVersions = { ...known };
	for (const [key, value] of Object.entries(changes)) {
		partVersions[key] = projectPartHash(value);
		if (known[key] === partVersions[key])
			delete changes[key as keyof typeof changes];
	}
	const drawings =
		assets?.drawings.filter(
			(item) => known[`drawing:${item.drawing.id}`] !== projectPartHash(item),
		) ?? [];
	if (assets) {
		for (const key of Object.keys(partVersions))
			if (key.startsWith("drawing:")) delete partVersions[key];
		for (const item of assets.drawings)
			partVersions[`drawing:${item.drawing.id}`] = projectPartHash(item);
	}
	partVersions.diary = diaryManifestVersion(manifest);
	if (diary && media)
		partVersions["diary-media"] = projectPartHash(diary.mediaPhotos);
	return {
		kind: "delta",
		revision: manifest.revision,
		version: projectPartHash([manifest.revision, partVersions]),
		partVersions,
		sourceVersions: manifest.sourceVersions,
		diaryRowVersions: manifest.diaryRowVersions,
		diaryRows: {
			changed: diary?.rows ?? [],
			order: Object.keys(manifest.diaryRowVersions),
			...(diary && media ? { mediaPhotos: diary.mediaPhotos } : {}),
		},
		changes,
		drawings,
		drawingOrder: assets
			? assets.drawings.map((item) => item.drawing.id)
			: Object.keys(known)
					.filter((key) => key.startsWith("drawing:"))
					.map((key) => key.slice(8)),
	};
}
