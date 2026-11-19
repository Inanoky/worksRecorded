import { createHash } from "node:crypto";
import {
	getDefaultConstructionForma2WorkSyncManifest,
	normalizeForma2WorkOptionKey,
} from "../../lib/forma2-work-options-manifest";
import { createDefaultConstructionDiaryUnitResolver } from "../../lib/site-diary-productivity-settings";
import type { ConfigMap } from "./AIschemas";

export function buildDiaryPositionCatalog(config: ConfigMap) {
	const manifest = getDefaultConstructionForma2WorkSyncManifest(config);
	if (!manifest) return [];
	const positions = new Map(
		manifest.entries.map((entry) => [
			normalizeForma2WorkOptionKey(entry.work),
			entry.positionId,
		]),
	);
	const unitFor = createDefaultConstructionDiaryUnitResolver(config);
	return [...new Set(Object.values(config.Works?.DropDownOptions ?? {}))].map(
		(work) => ({
			positionId:
				positions.get(normalizeForma2WorkOptionKey(work)) ??
				`category:${createHash("sha256").update(work).digest("hex").slice(0, 20)}`,
			work,
			unit: unitFor(work) ?? null,
		}),
	);
}
